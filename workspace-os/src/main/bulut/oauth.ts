import { shell } from 'electron'
import { createHash, randomBytes } from 'crypto'
import http from 'http'
import type { AddressInfo } from 'net'

// Masaüstü uygulamaları için OAuth 2.0 yetkilendirme kodu akışı (RFC 8252):
// PKCE + yalnızca bu bilgisayardan erişilebilen geçici bir geri dönüş sunucusu (127.0.0.1/::1, rastgele port).
// Oturum açma, kullanıcının kendi tarayıcısında yapılır; parola uygulamaya hiç girmez.

export interface Tokenlar {
  access_token: string
  refresh_token?: string
  expires_in?: number
}

export interface OAuthYapilandirmasi {
  yetkiUrl: string
  tokenUrl: string
  istemciKimligi: string
  istemciSirri?: string
  kapsamlar: string[]
  /** Geri dönüş adresindeki ana makine adı (Microsoft "localhost", Google "127.0.0.1" bekler) */
  donusHost: 'localhost' | '127.0.0.1'
  ekParametreler?: Record<string, string>
}

const ZAMAN_ASIMI_MS = 5 * 60_000
const b64url = (b: Buffer) => b.toString('base64url')

/** Test ortamında tarayıcı yerine yetki adresi doğrudan çağrılır (WORKSPACE_BULUT_SAHTE_SUNUCU) */
async function tarayiciAc(url: string) {
  if (process.env.WORKSPACE_BULUT_SAHTE_SUNUCU) await fetch(url).catch(() => {})
  else await shell.openExternal(url)
}

const SAYFA = (baslik: string, metin: string) =>
  `<!doctype html><meta charset="utf-8"><title>Workspace OS</title><body style="font-family:Segoe UI,system-ui,sans-serif;display:grid;place-items:center;height:90vh;color:#1f2937"><div style="text-align:center"><h1>${baslik}</h1><p>${metin}</p></div></body>`

export async function yetkilendir(y: OAuthYapilandirmasi): Promise<Tokenlar> {
  const dogrulayici = b64url(randomBytes(32))
  const meydanOkuma = b64url(createHash('sha256').update(dogrulayici).digest())
  const durum = b64url(randomBytes(16))

  let coz!: (kod: string) => void
  let reddet!: (e: Error) => void
  const kodBekle = new Promise<string>((c, r) => ((coz = c), (reddet = r)))

  const isleyici: http.RequestListener = (istek, yanit) => {
    const u = new URL(istek.url ?? '/', 'http://127.0.0.1')
    if (u.pathname !== '/') return yanit.writeHead(404).end()
    const hata = u.searchParams.get('error')
    const kod = u.searchParams.get('code')
    yanit.writeHead(200, { 'content-type': 'text/html; charset=utf-8' })
    if (hata || !kod || u.searchParams.get('state') !== durum) {
      yanit.end(SAYFA('Bağlantı kurulamadı', 'Workspace OS\'e dönüp tekrar deneyebilirsin.'))
      reddet(new Error(hata === 'access_denied' ? 'Oturum açma iptal edildi.' : 'Oturum açma tamamlanamadı.'))
    } else {
      yanit.end(SAYFA('✓ Hesap bağlandı', 'Bu sekmeyi kapatıp Workspace OS\'e dönebilirsin.'))
      coz(kod)
    }
  }

  // Aynı portu IPv4 ve IPv6 geri döngü adresinde dinle ("localhost" tarayıcıya göre ikisinden birine çözülür)
  const sunucu4 = http.createServer(isleyici)
  await new Promise<void>((c, r) => sunucu4.once('error', r).listen(0, '127.0.0.1', c))
  const port = (sunucu4.address() as AddressInfo).port
  const sunucu6 = http.createServer(isleyici)
  await new Promise<void>((c) => sunucu6.once('error', () => c()).listen(port, '::1', c))
  const donus = `http://${y.donusHost}:${port}` // kayıtlı adresle eşleşmesi için sonda "/" yok

  const zamanlayici = setTimeout(() => reddet(new Error('Oturum açma zaman aşımına uğradı.')), ZAMAN_ASIMI_MS)
  try {
    const u = new URL(y.yetkiUrl)
    const p = {
      client_id: y.istemciKimligi,
      response_type: 'code',
      redirect_uri: donus,
      scope: y.kapsamlar.join(' '),
      state: durum,
      code_challenge: meydanOkuma,
      code_challenge_method: 'S256',
      ...y.ekParametreler,
    }
    for (const [k, v] of Object.entries(p)) u.searchParams.set(k, v)
    await tarayiciAc(u.toString())

    const kod = await kodBekle
    return await tokenIste(y, {
      grant_type: 'authorization_code',
      code: kod,
      redirect_uri: donus,
      code_verifier: dogrulayici,
    })
  } finally {
    clearTimeout(zamanlayici)
    sunucu4.close()
    sunucu6.close()
  }
}

export function yenile(y: OAuthYapilandirmasi, refreshToken: string): Promise<Tokenlar> {
  return tokenIste(y, { grant_type: 'refresh_token', refresh_token: refreshToken, scope: y.kapsamlar.join(' ') })
}

async function tokenIste(y: OAuthYapilandirmasi, govde: Record<string, string>): Promise<Tokenlar> {
  const form = new URLSearchParams({ client_id: y.istemciKimligi, ...govde })
  if (y.istemciSirri) form.set('client_secret', y.istemciSirri)
  const r = await fetch(y.tokenUrl, { method: 'POST', headers: { 'content-type': 'application/x-www-form-urlencoded' }, body: form })
  const veri = await r.json().catch(() => ({}))
  if (!r.ok || !veri.access_token) {
    const neden = veri.error_description || veri.error || r.statusText
    if (veri.error === 'invalid_grant') throw new OturumGecersiz('Oturumun süresi dolmuş. Hesabı yeniden bağla.')
    throw new Error(`Oturum anahtarı alınamadı: ${neden}`)
  }
  return veri
}

/** Yenileme anahtarı geçersiz — kullanıcının yeniden bağlanması gerekir */
export class OturumGecersiz extends Error {}
