import { promises as fs } from 'fs'
import path from 'path'
import { kategoriBul } from '@shared/kategoriler'
import type { KlasorOgesi } from '@shared/tipler'

// Electron'a bağımlı değil — tarayıcı ve testler de kullanabilir.

const GIZLI_ADLAR = new Set(['desktop.ini', 'thumbs.db', '.ds_store', 'icon\r', 'system volume information'])

/** Sistem/gizli/geçici dosyalar: .dosya, $Recycle.Bin, ~$Office kilit dosyaları, desktop.ini, NTUSER.* */
export function gizliMi(ad: string): boolean {
  const k = ad.toLowerCase()
  return k.startsWith('.') || k.startsWith('$') || k.startsWith('~$') || k.startsWith('ntuser.') || GIZLI_ADLAR.has(k)
}

const GECERSIZ_KARAKTER = /[<>:"/\\|?*\u0000-\u001f]/
const AYRILMIS_AD = /^(con|prn|aux|nul|com\d|lpt\d)(\..*)?$/i

/** Windows dosya adı kurallarına göre doğrular, kırpılmış adı döndürür. */
export function adDogrula(ad: string): string {
  const t = ad.trim()
  if (!t) throw new Error('İsim boş olamaz')
  if (GECERSIZ_KARAKTER.test(t)) throw new Error('İsim şu karakterleri içeremez: < > : " / \\ | ? *')
  if (t === '.' || t === '..' || AYRILMIS_AD.test(t)) throw new Error(`"${t}" Windows'ta ayrılmış bir isim`)
  if (/[. ]$/.test(t)) throw new Error('İsim nokta veya boşlukla bitemez')
  if (t.length > 255) throw new Error('İsim çok uzun')
  return t
}

async function varMi(yol: string) {
  try {
    await fs.access(yol)
    return true
  } catch {
    return false
  }
}

const ayniYol = (a: string, b: string) =>
  process.platform === 'win32' ? path.resolve(a).toLowerCase() === path.resolve(b).toLowerCase() : path.resolve(a) === path.resolve(b)

export async function klasorListele(yol: string, gizliGoster = false): Promise<KlasorOgesi[]> {
  const girdiler = await fs.readdir(yol, { withFileTypes: true })
  const ogeler = await Promise.all(
    girdiler
      .filter((g) => gizliGoster || !gizliMi(g.name))
      .map(async (g): Promise<KlasorOgesi | null> => {
        const tam = path.join(yol, g.name)
        try {
          const s = await fs.stat(tam)
          const klasor = s.isDirectory()
          return { ad: g.name, yol: tam, klasor, boyut: klasor ? 0 : s.size, degistirilme: s.mtimeMs, kategori: klasor ? null : kategoriBul(g.name) }
        } catch {
          return null // erişim yok / kırık kısayol
        }
      }),
  )
  return ogeler
    .filter((o) => o !== null)
    .sort((a, b) => Number(b.klasor) - Number(a.klasor) || a.ad.localeCompare(b.ad, 'tr', { numeric: true }))
}

export async function klasorOlustur(ustYol: string, ad: string): Promise<string> {
  const hedef = path.join(ustYol, adDogrula(ad))
  if (await varMi(hedef)) throw new Error(`"${path.basename(hedef)}" zaten var`)
  await fs.mkdir(hedef)
  return hedef
}

export async function yenidenAdlandir(yol: string, yeniAd: string): Promise<string> {
  const hedef = path.join(path.dirname(yol), adDogrula(yeniAd))
  if (hedef === yol) return yol
  // Windows'ta yalnızca büyük/küçük harf değişikliği aynı dosyayı gösterir — izin ver
  if (!ayniYol(hedef, yol) && (await varMi(hedef))) throw new Error(`"${path.basename(hedef)}" zaten var`)
  await fs.rename(yol, hedef)
  return hedef
}

export interface TasimaSonucu {
  eski: string
  yeni: string
}

/** Öğeleri hedef klasöre taşır. Farklı sürücüler arasında kopyala+sil yapar. Üzerine yazmaz. */
export async function tasi(yollar: string[], hedefKlasor: string): Promise<TasimaSonucu[]> {
  const hedefStat = await fs.stat(hedefKlasor)
  if (!hedefStat.isDirectory()) throw new Error('Hedef bir klasör değil')

  // Önce tümünü doğrula — yarıda kalan toplu taşımayı önlemek için
  const plan: TasimaSonucu[] = []
  for (const kaynak of yollar) {
    const yeni = path.join(hedefKlasor, path.basename(kaynak))
    if (ayniYol(yeni, kaynak)) continue
    const k = path.resolve(kaynak)
    const h = path.resolve(hedefKlasor)
    if (ayniYol(k, h) || (process.platform === 'win32' ? h.toLowerCase() : h).startsWith((process.platform === 'win32' ? k.toLowerCase() : k) + path.sep))
      throw new Error(`"${path.basename(kaynak)}" kendi içine taşınamaz`)
    if (await varMi(yeni)) throw new Error(`Hedefte "${path.basename(kaynak)}" zaten var`)
    plan.push({ eski: kaynak, yeni })
  }

  for (const { eski, yeni } of plan) {
    try {
      await fs.rename(eski, yeni)
    } catch (e) {
      if ((e as NodeJS.ErrnoException).code !== 'EXDEV') throw e
      await fs.cp(eski, yeni, { recursive: true, errorOnExist: true, force: false, preserveTimestamps: true })
      await fs.rm(eski, { recursive: true, force: true })
    }
  }
  return plan
}
