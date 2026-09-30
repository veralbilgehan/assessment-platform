import { app, BrowserWindow } from 'electron'
import { promises as fs } from 'fs'
import path from 'path'
import type { BulutOgesi, BulutSaglayici, SenkronOlayi } from '@shared/bulut'
import { yolAnahtari } from '../statuDeposu'
import { kayitGuncelle } from '../dizinDeposu'
import { google } from './google'
import { microsoft } from './microsoft'
import type { SaglayiciApi } from './saglayici'

// Bulut dosyası açılınca yerel önbelleğe (%APPDATA%/Workspace OS/bulut/…) indirilir ve eşlemesi saklanır.
// Workspace editöründe kaydedilen her değişiklik kısa bir beklemeden sonra buluta geri yüklenir.
// Yüklemeden önce buluttaki sürüm denetlenir: başka yerde değişmişse üzerine yazılmaz, kopya olarak yüklenir.

export const API: Record<BulutSaglayici, SaglayiciApi> = { google, microsoft }

interface Esleme {
  saglayici: BulutSaglayici
  id: string
  ad: string
  ustId: string | null
  surum: string
  googleBicimi?: BulutOgesi['googleBicimi']
}

const GECIKME_MS = 3000
const eslemeDosyasi = () => path.join(app.getPath('userData'), 'bulut-esleme.json')
let eslemeler: Record<string, Esleme> | null = null
const durumlar = new Map<string, SenkronOlayi>()
const bekleyenler = new Map<string, ReturnType<typeof setTimeout>>()
const calisanlar = new Map<string, Promise<void>>()

async function yukleEslemeler() {
  if (!eslemeler) {
    try {
      eslemeler = JSON.parse(await fs.readFile(eslemeDosyasi(), 'utf-8'))
    } catch {
      eslemeler = {}
    }
  }
  return eslemeler!
}
const eslemeleriKaydet = () => fs.writeFile(eslemeDosyasi(), JSON.stringify(eslemeler), 'utf-8')

function yayinla(o: SenkronOlayi) {
  durumlar.set(yolAnahtari(o.yol), o)
  for (const p of BrowserWindow.getAllWindows()) p.webContents.send('bulut:senkron', o)
}

const guvenliAd = (s: string) => s.replace(/[<>:"/\\|?*\u0000-\u001f]/g, '_').slice(0, 120)
const onbellekYolu = (s: BulutSaglayici, id: string, ad: string) =>
  path.join(app.getPath('userData'), 'bulut', s, guvenliAd(id), guvenliAd(ad))

/** Dosyayı indirip önbelleğe yazar; bekleyen yerel değişiklik varsa onu ezmez. */
export async function bulutDosyasiniAc(s: BulutSaglayici, oge: BulutOgesi, klasorId: string | null): Promise<string> {
  const api = API[s]
  const { veri, ad } = await api.indir(oge)
  const yol = onbellekYolu(s, oge.id, ad)
  const e = await yukleEslemeler()
  if (!bekleyenler.has(yolAnahtari(yol))) {
    await fs.mkdir(path.dirname(yol), { recursive: true })
    await fs.writeFile(yol, veri)
    e[yolAnahtari(yol)] = { saglayici: s, id: oge.id, ad, ustId: klasorId, surum: await api.surum(oge.id), googleBicimi: oge.googleBicimi }
    await eslemeleriKaydet()
    yayinla({ yol, durum: 'yuklendi', mesaj: 'Buluttaki son sürüm' })
  }
  await kayitGuncelle(yol)
  return yol
}

/** Yerelde oluşturulmuş yeni bir belgeyi buluta yükler ve eşler (Ofis → Google/OneDrive'da yeni belge). */
export async function yeniBulutBelgesi(s: BulutSaglayici, yerelYol: string): Promise<string> {
  const ad = path.basename(yerelYol)
  const f = await API[s].yukleYeni(null, ad, await fs.readFile(yerelYol))
  const yol = onbellekYolu(s, f.id, f.ad)
  await fs.mkdir(path.dirname(yol), { recursive: true })
  await fs.rename(yerelYol, yol)
  const e = await yukleEslemeler()
  e[yolAnahtari(yol)] = { saglayici: s, id: f.id, ad: f.ad, ustId: null, surum: f.surum }
  await eslemeleriKaydet()
  await kayitGuncelle(yol)
  yayinla({ yol, durum: 'yuklendi', mesaj: 'Bulutta oluşturuldu' })
  return yol
}

export async function bulutMu(yol: string) {
  return !!(await yukleEslemeler())[yolAnahtari(yol)]
}

/** Workspace'te kaydedilen dosya bulut kopyasıysa gecikmeli yüklemeyi planlar. */
export async function kaydedildi(yol: string) {
  const a = yolAnahtari(yol)
  if (!(await yukleEslemeler())[a]) return
  clearTimeout(bekleyenler.get(a))
  bekleyenler.set(a, setTimeout(() => void gonder(yol), GECIKME_MS))
  yayinla({ yol, durum: 'bekliyor' })
}

function gonder(yol: string): Promise<void> {
  const a = yolAnahtari(yol)
  clearTimeout(bekleyenler.get(a))
  bekleyenler.delete(a)
  // Aynı dosyanın yüklemeleri sırayla yapılır
  const onceki = calisanlar.get(a) ?? Promise.resolve()
  const is = onceki.then(() => yukle(yol)).finally(() => calisanlar.get(a) === is && calisanlar.delete(a))
  calisanlar.set(a, is)
  return is
}

async function yukle(yol: string) {
  const e = await yukleEslemeler()
  const a = yolAnahtari(yol)
  const m = e[a]
  if (!m) return
  const api = API[m.saglayici]
  yayinla({ yol, durum: 'yukleniyor' })
  try {
    const veri = await fs.readFile(yol)
    let uzak: string | null
    try {
      uzak = await api.surum(m.id)
    } catch {
      uzak = null // bulutta silinmiş/taşınmış
    }
    if (uzak === m.surum) {
      try {
        m.surum = await api.guncelle(m.id, m.ad, veri, m.googleBicimi)
        await eslemeleriKaydet()
        return yayinla({ yol, durum: 'yuklendi', mesaj: 'Buluta kaydedildi' })
      } catch (hata) {
        if (!m.googleBicimi) throw hata
        // Google biçimindeki dosya güncellenemediyse içerik kaybolmasın: .docx/.xlsx/.pptx kopyası olarak yükle
      }
    }
    const kopyaAdi = uzak === null ? m.ad : m.ad.replace(/(\.[^.]+)?$/, ' (Workspace kopyası)$1')
    const yeni = await api.yukleYeni(m.ustId, kopyaAdi, veri)
    e[a] = { saglayici: m.saglayici, id: yeni.id, ad: yeni.ad, ustId: m.ustId, surum: yeni.surum }
    await eslemeleriKaydet()
    yayinla({
      yol,
      durum: 'cakisma',
      mesaj:
        uzak === null
          ? `Dosya bulutta bulunamadı; "${yeni.ad}" olarak yeniden yüklendi.`
          : uzak === m.surum
            ? `Google biçiminde güncellenemedi; "${yeni.ad}" olarak yüklendi.`
            : `Dosya başka bir yerde değişmiş. Üzerine yazılmadı; değişikliklerin "${yeni.ad}" olarak kaydedildi.`,
    })
  } catch (hata) {
    yayinla({ yol, durum: 'hata', mesaj: hata instanceof Error ? hata.message : String(hata) })
  }
}

/** Uygulama kapanırken bekleyen yüklemeleri hemen gönderir. */
export async function bekleyenleriGonder() {
  // Anahtar, dosya yolunun kendisidir (Windows'ta küçük harfe çevrilmiş — dosya sistemi büyük/küçük harf duyarsız)
  await Promise.all([...[...bekleyenler.keys()].map(gonder), ...calisanlar.values()])
}
export const bekleyenVar = () => bekleyenler.size > 0 || calisanlar.size > 0

export const senkronDurumu = (yol: string) => durumlar.get(yolAnahtari(yol)) ?? null

/** Önbellekteki dosya Workspace'te yeniden adlandırılırsa buluttaki adı da değişir. */
export async function yolDegisti(eski: string, yeni: string) {
  const e = await yukleEslemeler()
  const m = e[yolAnahtari(eski)]
  if (!m) return
  delete e[yolAnahtari(eski)]
  e[yolAnahtari(yeni)] = m
  await eslemeleriKaydet()
  try {
    const o = await API[m.saglayici].yenidenAdlandir(m.id, path.basename(yeni))
    m.ad = o.ad
    await eslemeleriKaydet()
  } catch (hata) {
    yayinla({ yol: yeni, durum: 'hata', mesaj: `Bulutta yeniden adlandırılamadı: ${hata instanceof Error ? hata.message : hata}` })
  }
}
