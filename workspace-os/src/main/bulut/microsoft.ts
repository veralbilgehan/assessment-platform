import type { BulutOgesi } from '@shared/bulut'
import { adres, istek } from './oturum'
import { siralaBulut, type SaglayiciApi } from './saglayici'

// Microsoft Graph — OneDrive (kişisel ve iş hesapları)

const GRAPH = () => adres('https://graph.microsoft.com/v1.0')
const SECIM = 'id,name,size,lastModifiedDateTime,folder,file,webUrl,cTag'
const TEK_ISTEK_SINIRI = 4 * 1024 * 1024 // üstü yükleme oturumuyla parça parça gönderilir
const PARCA = 320 * 1024 * 16 // 5 MiB — Graph parçaların 320 KiB'ın katı olmasını ister

interface DriveItem {
  id: string
  name: string
  size?: number
  lastModifiedDateTime?: string
  folder?: object
  webUrl?: string
  cTag?: string
}

const donustur = (i: DriveItem): BulutOgesi => ({
  id: i.id,
  ad: i.name,
  klasor: !!i.folder,
  boyut: i.size ?? 0,
  degistirilme: i.lastModifiedDateTime ? Date.parse(i.lastModifiedDateTime) : 0,
  webUrl: i.webUrl,
})

const m = (url: string, init?: RequestInit) => istek('microsoft', url, init)
const ogeYolu = (id: string | null) => (id ? `/me/drive/items/${encodeURIComponent(id)}` : '/me/drive/root')

/** Yükleme oturumu adresine parça parça gönderim (bu adres önceden yetkilidir; Authorization başlığı gönderilmez) */
async function parcaliYukle(yuklemeAdresi: string, veri: Buffer): Promise<DriveItem> {
  let son: Response | undefined
  for (let bas = 0; bas < veri.length; bas += PARCA) {
    const bit = Math.min(bas + PARCA, veri.length)
    son = await fetch(yuklemeAdresi, {
      method: 'PUT',
      headers: { 'content-length': String(bit - bas), 'content-range': `bytes ${bas}-${bit - 1}/${veri.length}` },
      body: new Uint8Array(veri.subarray(bas, bit)),
    })
    if (!son.ok && son.status !== 202) throw new Error(`OneDrive yüklemesi başarısız (${son.status}).`)
  }
  return son!.json()
}

async function oturumlaYukle(yol: string, cakisma: 'rename' | 'replace', veri: Buffer): Promise<DriveItem> {
  const r = await m(`${GRAPH()}${yol}/createUploadSession`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ item: { '@microsoft.graph.conflictBehavior': cakisma } }),
  })
  return parcaliYukle((await r.json()).uploadUrl, veri)
}

export const microsoft: SaglayiciApi = {
  async hesap() {
    const [ben, surucu] = await Promise.all([
      m(`${GRAPH()}/me?$select=displayName,mail,userPrincipalName`).then((r) => r.json()),
      m(`${GRAPH()}/me/drive?$select=quota`).then((r) => r.json()),
    ])
    return {
      ad: ben.displayName,
      eposta: ben.mail || ben.userPrincipalName,
      kota: surucu.quota ? { kullanilan: surucu.quota.used ?? 0, toplam: surucu.quota.total } : undefined,
    }
  },

  async listele(klasorId) {
    const ogeler: BulutOgesi[] = []
    let url: string | undefined = `${GRAPH()}${ogeYolu(klasorId)}/children?$select=${SECIM}&$top=200`
    while (url && ogeler.length < 2000) {
      const v: { value: DriveItem[]; '@odata.nextLink'?: string } = await (await m(url)).json()
      ogeler.push(...v.value.map(donustur))
      url = v['@odata.nextLink']
    }
    return ogeler.sort(siralaBulut)
  },

  async surum(id) {
    return String((await (await m(`${GRAPH()}${ogeYolu(id)}?$select=cTag`)).json()).cTag)
  },

  async indir(oge) {
    const r = await m(`${GRAPH()}${ogeYolu(oge.id)}/content`)
    return { veri: Buffer.from(await r.arrayBuffer()), ad: oge.ad }
  },

  async yukleYeni(klasorId, ad, veri) {
    const yol = `${ogeYolu(klasorId)}:/${encodeURIComponent(ad)}:`
    const i: DriveItem =
      veri.length <= TEK_ISTEK_SINIRI
        ? await (await m(`${GRAPH()}${yol}/content?@microsoft.graph.conflictBehavior=rename`, { method: 'PUT', body: new Uint8Array(veri) })).json()
        : await oturumlaYukle(yol, 'rename', veri)
    return { ...donustur(i), surum: String(i.cTag) }
  },

  async guncelle(id, _ad, veri) {
    const i: DriveItem =
      veri.length <= TEK_ISTEK_SINIRI
        ? await (await m(`${GRAPH()}${ogeYolu(id)}/content`, { method: 'PUT', body: new Uint8Array(veri) })).json()
        : await oturumlaYukle(ogeYolu(id), 'replace', veri)
    return String(i.cTag)
  },

  async klasorOlustur(ustId, ad) {
    const r = await m(`${GRAPH()}${ogeYolu(ustId)}/children`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ name: ad, folder: {}, '@microsoft.graph.conflictBehavior': 'fail' }),
    })
    return donustur(await r.json())
  },

  async yenidenAdlandir(id, ad) {
    const r = await m(`${GRAPH()}${ogeYolu(id)}`, { method: 'PATCH', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ name: ad }) })
    return donustur(await r.json())
  },
}
