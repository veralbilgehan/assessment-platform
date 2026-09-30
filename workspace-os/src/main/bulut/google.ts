import type { BulutOgesi } from '@shared/bulut'
import { adres, istek } from './oturum'
import { mimeBul } from './mime'
import { siralaBulut, type SaglayiciApi } from './saglayici'

// Google Drive API v3

const API = () => adres('https://www.googleapis.com/drive/v3')
const YUKLEME = () => adres('https://www.googleapis.com/upload/drive/v3')
const ALANLAR = 'id,name,mimeType,size,modifiedTime,webViewLink,version'
const KLASOR = 'application/vnd.google-apps.folder'
const TEK_ISTEK_SINIRI = 5 * 1024 * 1024 // üstü devam ettirilebilir (resumable) yüklemeyle gönderilir

const GOOGLE_TURLERI: Record<string, { bicim: 'belge' | 'tablo' | 'sunum'; uzanti: string }> = {
  'application/vnd.google-apps.document': { bicim: 'belge', uzanti: 'docx' },
  'application/vnd.google-apps.spreadsheet': { bicim: 'tablo', uzanti: 'xlsx' },
  'application/vnd.google-apps.presentation': { bicim: 'sunum', uzanti: 'pptx' },
}
const BICIM_UZANTISI = { belge: 'docx', tablo: 'xlsx', sunum: 'pptx' } as const

interface DriveDosyasi {
  id: string
  name: string
  mimeType: string
  size?: string
  modifiedTime?: string
  webViewLink?: string
  version?: string
}

function donustur(f: DriveDosyasi): BulutOgesi {
  const klasor = f.mimeType === KLASOR
  const yerel = GOOGLE_TURLERI[f.mimeType]
  return {
    id: f.id,
    ad: f.name,
    klasor,
    boyut: Number(f.size ?? 0),
    degistirilme: f.modifiedTime ? Date.parse(f.modifiedTime) : 0,
    webUrl: f.webViewLink,
    googleBicimi: yerel ? yerel.bicim : !klasor && f.mimeType.startsWith('application/vnd.google-apps.') ? 'diger' : undefined,
  }
}

const g = (url: string, init?: RequestInit) => istek('google', url, init)
const tirnakKacis = (s: string) => s.replace(/\\/g, '\\\\').replace(/'/g, "\\'")

async function yukle(yontem: 'POST' | 'PATCH', yol: string, metaveri: object, veri: Buffer, mime: string): Promise<DriveDosyasi> {
  const alanlar = `fields=${encodeURIComponent(ALANLAR)}`
  if (veri.length <= TEK_ISTEK_SINIRI) {
    const sinir = `workspace${Date.now().toString(36)}`
    const govde = Buffer.concat([
      Buffer.from(`--${sinir}\r\nContent-Type: application/json; charset=UTF-8\r\n\r\n${JSON.stringify(metaveri)}\r\n--${sinir}\r\nContent-Type: ${mime}\r\n\r\n`),
      veri,
      Buffer.from(`\r\n--${sinir}--`),
    ])
    const r = await g(`${YUKLEME()}${yol}?uploadType=multipart&${alanlar}`, {
      method: yontem,
      headers: { 'content-type': `multipart/related; boundary=${sinir}` },
      body: new Uint8Array(govde),
    })
    return r.json()
  }
  const oturum = await g(`${YUKLEME()}${yol}?uploadType=resumable&${alanlar}`, {
    method: yontem,
    headers: { 'content-type': 'application/json; charset=UTF-8', 'x-upload-content-type': mime, 'x-upload-content-length': String(veri.length) },
    body: JSON.stringify(metaveri),
  })
  const konum = oturum.headers.get('location')
  if (!konum) throw new Error('Google Drive yükleme oturumu açılamadı.')
  return (await g(konum, { method: 'PUT', headers: { 'content-type': mime }, body: new Uint8Array(veri) })).json()
}

export const google: SaglayiciApi = {
  async hesap() {
    const a = await (await g(`${API()}/about?fields=${encodeURIComponent('user(displayName,emailAddress),storageQuota(limit,usage)')}`)).json()
    return {
      ad: a.user?.displayName,
      eposta: a.user?.emailAddress,
      kota: a.storageQuota ? { kullanilan: Number(a.storageQuota.usage ?? 0), toplam: a.storageQuota.limit ? Number(a.storageQuota.limit) : undefined } : undefined,
    }
  },

  async listele(klasorId) {
    const ogeler: BulutOgesi[] = []
    let sayfa: string | undefined
    do {
      const p = new URLSearchParams({
        q: `'${tirnakKacis(klasorId ?? 'root')}' in parents and trashed = false`,
        fields: `nextPageToken,files(${ALANLAR})`,
        orderBy: 'folder,name',
        pageSize: '200',
      })
      if (sayfa) p.set('pageToken', sayfa)
      const v = await (await g(`${API()}/files?${p}`)).json()
      ogeler.push(...(v.files as DriveDosyasi[]).map(donustur))
      sayfa = v.nextPageToken
    } while (sayfa && ogeler.length < 2000)
    return ogeler.sort(siralaBulut)
  },

  async surum(id) {
    return String((await (await g(`${API()}/files/${encodeURIComponent(id)}?fields=version`)).json()).version)
  },

  async indir(oge) {
    if (oge.googleBicimi === 'diger') throw new Error('Bu Google dosyası türü indirilemiyor; web\'de açabilirsin.')
    if (oge.googleBicimi) {
      const uzanti = BICIM_UZANTISI[oge.googleBicimi]
      const r = await g(`${API()}/files/${encodeURIComponent(oge.id)}/export?mimeType=${encodeURIComponent(mimeBul(`x.${uzanti}`))}`)
      return { veri: Buffer.from(await r.arrayBuffer()), ad: oge.ad.toLowerCase().endsWith(`.${uzanti}`) ? oge.ad : `${oge.ad}.${uzanti}` }
    }
    const r = await g(`${API()}/files/${encodeURIComponent(oge.id)}?alt=media`)
    return { veri: Buffer.from(await r.arrayBuffer()), ad: oge.ad }
  },

  async yukleYeni(klasorId, ad, veri) {
    const f = await yukle('POST', '/files', { name: ad, parents: [klasorId ?? 'root'] }, veri, mimeBul(ad))
    return { ...donustur(f), surum: String(f.version) }
  },

  async guncelle(id, ad, veri, googleBicimi) {
    // Google'ın kendi biçimindeki dosyaya .docx/.xlsx/.pptx yüklemek içeriği dönüştürerek günceller
    const mime = googleBicimi && googleBicimi !== 'diger' ? mimeBul(`x.${BICIM_UZANTISI[googleBicimi]}`) : mimeBul(ad)
    const f = await yukle('PATCH', `/files/${encodeURIComponent(id)}`, {}, veri, mime)
    return String(f.version)
  },

  async klasorOlustur(ustId, ad) {
    const r = await g(`${API()}/files?fields=${encodeURIComponent(ALANLAR)}`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ name: ad, mimeType: KLASOR, parents: [ustId ?? 'root'] }),
    })
    return donustur(await r.json())
  },

  async yenidenAdlandir(id, ad) {
    const r = await g(`${API()}/files/${encodeURIComponent(id)}?fields=${encodeURIComponent(ALANLAR)}`, {
      method: 'PATCH',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ name: ad }),
    })
    return donustur(await r.json())
  },
}
