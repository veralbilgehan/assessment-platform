import { app } from 'electron'
import { promises as fs } from 'fs'
import path from 'path'
import type { BulutAyarGirdisi, BulutAyarlari, BulutSaglayici } from '@shared/bulut'
import { sifreliOku, sifreliSil, sifreliYaz } from '../sifreliDepo'

// OAuth uygulama kimlikleri. Dağıtım sırasında ortam değişkeniyle gömülebilir (WORKSPACE_GOOGLE_CLIENT_ID,
// WORKSPACE_GOOGLE_CLIENT_SECRET, WORKSPACE_MS_CLIENT_ID); yoksa kullanıcı Bulut Hesapları ekranından girer.
// Google "masaüstü uygulaması" istemci sırrı gerçek bir sır sayılmaz ama yine de şifreli depoda tutulur.

const dosya = () => path.join(app.getPath('userData'), 'bulut-ayar.json')
const SIR = 'bulut-google-sir'

async function oku(): Promise<{ googleIstemciKimligi?: string; microsoftIstemciKimligi?: string }> {
  try {
    return JSON.parse(await fs.readFile(dosya(), 'utf-8'))
  } catch {
    return {}
  }
}

export async function ayarlariGetir(): Promise<BulutAyarlari> {
  const a = await oku()
  return {
    googleIstemciKimligi: process.env.WORKSPACE_GOOGLE_CLIENT_ID || a.googleIstemciKimligi || '',
    googleIstemciSirriVar: !!(process.env.WORKSPACE_GOOGLE_CLIENT_SECRET || (await sifreliOku(SIR))),
    microsoftIstemciKimligi: process.env.WORKSPACE_MS_CLIENT_ID || a.microsoftIstemciKimligi || '',
    ortamdan: { google: !!process.env.WORKSPACE_GOOGLE_CLIENT_ID, microsoft: !!process.env.WORKSPACE_MS_CLIENT_ID },
  }
}

export async function ayarlariKaydet(g: BulutAyarGirdisi): Promise<BulutAyarlari> {
  const a = await oku()
  const temiz = (v?: string) => v?.trim().slice(0, 300)
  if (g.googleIstemciKimligi !== undefined) a.googleIstemciKimligi = temiz(g.googleIstemciKimligi)
  if (g.microsoftIstemciKimligi !== undefined) a.microsoftIstemciKimligi = temiz(g.microsoftIstemciKimligi)
  await fs.writeFile(dosya(), JSON.stringify(a, null, 2), 'utf-8')
  if (g.googleIstemciSirri !== undefined) {
    if (g.googleIstemciSirri.trim()) await sifreliYaz(SIR, g.googleIstemciSirri.trim())
    else await sifreliSil(SIR)
  }
  return ayarlariGetir()
}

export async function istemciBilgisi(s: BulutSaglayici): Promise<{ kimlik: string; sir?: string }> {
  const a = await ayarlariGetir()
  if (s === 'google') {
    if (!a.googleIstemciKimligi) throw new Error('Google bağlantısı için önce uygulama kimliğini gir (Bulut Hesapları → Kurulum).')
    return { kimlik: a.googleIstemciKimligi, sir: process.env.WORKSPACE_GOOGLE_CLIENT_SECRET || (await sifreliOku(SIR)) || undefined }
  }
  if (!a.microsoftIstemciKimligi) throw new Error('OneDrive bağlantısı için önce uygulama kimliğini gir (Bulut Hesapları → Kurulum).')
  return { kimlik: a.microsoftIstemciKimligi }
}
