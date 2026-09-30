import type { BulutSaglayici } from '@shared/bulut'
import { sifreliOku, sifreliSil, sifreliYaz, bellekteMi } from '../sifreliDepo'
import { istemciBilgisi } from './ayarlar'
import { OturumGecersiz, yenile, yetkilendir, type OAuthYapilandirmasi } from './oauth'

// Hesap başına oturum: yenileme anahtarı şifreli depoda, erişim anahtarı bellekte.

/** Test sunucusu için tüm sağlayıcı adresleri tek bir kökte toplanabilir (WORKSPACE_BULUT_SAHTE_SUNUCU) */
export function adres(gercek: string): string {
  const sahte = process.env.WORKSPACE_BULUT_SAHTE_SUNUCU
  if (!sahte) return gercek
  const u = new URL(gercek)
  return new URL(sahte).origin + u.pathname + u.search
}

async function yapilandirma(s: BulutSaglayici): Promise<OAuthYapilandirmasi> {
  const { kimlik, sir } = await istemciBilgisi(s)
  return s === 'google'
    ? {
        yetkiUrl: adres('https://accounts.google.com/o/oauth2/v2/auth'),
        tokenUrl: adres('https://oauth2.googleapis.com/token'),
        istemciKimligi: kimlik,
        istemciSirri: sir,
        kapsamlar: ['https://www.googleapis.com/auth/drive', 'openid', 'email'],
        donusHost: '127.0.0.1',
        ekParametreler: { access_type: 'offline', prompt: 'consent' }, // yenileme anahtarı her bağlanışta verilsin
      }
    : {
        yetkiUrl: adres('https://login.microsoftonline.com/common/oauth2/v2.0/authorize'),
        tokenUrl: adres('https://login.microsoftonline.com/common/oauth2/v2.0/token'),
        istemciKimligi: kimlik,
        kapsamlar: ['Files.ReadWrite', 'User.Read', 'offline_access'],
        donusHost: 'localhost',
        ekParametreler: { prompt: 'select_account' },
      }
}

const depoAdi = (s: BulutSaglayici) => `bulut-${s}-oturum`
const erisim = new Map<BulutSaglayici, { anahtar: string; bitis: number }>()

export async function baglan(s: BulutSaglayici) {
  const t = await yetkilendir(await yapilandirma(s))
  if (!t.refresh_token) throw new Error('Hesap kalıcı erişim izni vermedi. Tekrar dene.')
  erisim.set(s, { anahtar: t.access_token, bitis: Date.now() + (t.expires_in ?? 3600) * 1000 })
  await sifreliYaz(depoAdi(s), t.refresh_token)
}

export async function baglantiKes(s: BulutSaglayici) {
  const yenileme = await sifreliOku(depoAdi(s))
  erisim.delete(s)
  await sifreliSil(depoAdi(s))
  // Google'da izni de geri al (en iyi çaba); Microsoft için uygulama izni hesap ayarlarından kaldırılır
  if (s === 'google' && yenileme) await fetch(adres('https://oauth2.googleapis.com/revoke'), { method: 'POST', body: new URLSearchParams({ token: yenileme }) }).catch(() => {})
}

export const oturumVar = async (s: BulutSaglayici) => !!(await sifreliOku(depoAdi(s)))
export const oturumSifreli = (s: BulutSaglayici) => !bellekteMi(depoAdi(s))

const yenilemeler = new Map<BulutSaglayici, Promise<string>>()

/** Geçerli erişim anahtarı; aynı anda gelen istekler tek bir yenilemeyi paylaşır. */
function erisimAnahtari(s: BulutSaglayici, zorla = false): Promise<string> {
  const e = erisim.get(s)
  if (!zorla && e && e.bitis - 60_000 > Date.now()) return Promise.resolve(e.anahtar)
  let is = yenilemeler.get(s)
  if (!is) {
    is = anahtarYenile(s).finally(() => yenilemeler.delete(s))
    yenilemeler.set(s, is)
  }
  return is
}

async function anahtarYenile(s: BulutSaglayici): Promise<string> {
  const yenileme = await sifreliOku(depoAdi(s))
  if (!yenileme) throw new OturumGecersiz('Hesap bağlı değil.')
  const t = await yenile(await yapilandirma(s), yenileme)
  erisim.set(s, { anahtar: t.access_token, bitis: Date.now() + (t.expires_in ?? 3600) * 1000 })
  if (t.refresh_token && t.refresh_token !== yenileme) await sifreliYaz(depoAdi(s), t.refresh_token) // Microsoft anahtarı döndürür
  return t.access_token
}

/** Yetkili istek: 401'de anahtarı bir kez yenileyip tekrar dener; hataları Türkçe iletiye çevirir. */
export async function istek(s: BulutSaglayici, url: string, init: RequestInit = {}): Promise<Response> {
  const gonder = async (zorla: boolean) => {
    const basliklar = new Headers(init.headers)
    basliklar.set('authorization', `Bearer ${await erisimAnahtari(s, zorla)}`)
    try {
      return await fetch(url, { ...init, headers: basliklar })
    } catch {
      throw new Error(`${s === 'google' ? 'Google Drive' : 'OneDrive'}'a bağlanılamadı. İnternet bağlantını kontrol et.`)
    }
  }
  let r = await gonder(false)
  if (r.status === 401) r = await gonder(true)
  if (r.ok) return r
  const veri = await r.json().catch(() => ({}))
  const neden = veri?.error?.message ?? veri?.error_description ?? r.statusText
  if (r.status === 401) throw new OturumGecersiz('Oturumun süresi dolmuş. Hesabı yeniden bağla.')
  if (r.status === 403) throw new Error(`Bu işlem için izin yok: ${neden}`)
  if (r.status === 404) throw new Error('Dosya veya klasör bulunamadı (silinmiş ya da taşınmış olabilir).')
  if (r.status === 409) throw new Error('Aynı adla bir öğe zaten var.')
  if (r.status === 429) throw new Error('Çok fazla istek gönderildi. Biraz bekleyip tekrar dene.')
  throw new Error(`Bulut hatası (${r.status}): ${neden}`)
}
