import { promises as fs, type Dirent } from 'fs'
import path from 'path'
import { kategoriBul, uzantiAl } from '@shared/kategoriler'
import type { DosyaKaydi, TaramaIlerlemesi } from '@shared/tipler'
import { gizliMi } from './dosyaIslemleri'

// Taranmayan klasörler: sistem, bağımlılık ve önbellek klasörleri (binlerce anlamsız dosya içerir)
const ATLANAN = new Set([
  'windows', 'program files', 'program files (x86)', 'programdata', 'appdata', 'system volume information',
  'node_modules', 'bower_components', '__pycache__', '.venv', 'venv', 'site-packages', 'vendor',
  'bin', 'obj', 'build', 'dist', 'out', 'target', '.gradle', '.idea', '.vs', '.cache', 'cache', 'temp', 'tmp',
  'library', 'proc', 'sys', 'dev', 'usr', 'snap', 'lost+found',
])

export interface TaramaSecenekleri {
  maxDosya?: number
  maxDerinlik?: number
  ilerleme?: (i: TaramaIlerlemesi) => void
  iptalEdildi?: () => boolean
}

export interface TaramaSonucu {
  dosyalar: DosyaKaydi[]
  kesildi: boolean
  taranan: number
}

const anahtar = (yol: string) => (process.platform === 'win32' ? path.resolve(yol).toLowerCase() : path.resolve(yol))

/** Kök klasörleri iteratif (yığın tabanlı) tarar; her dosyayı uzantısına göre sınıflandırır. */
export async function tara(kokler: string[], s: TaramaSecenekleri = {}): Promise<TaramaSonucu> {
  const maxDosya = s.maxDosya ?? 200_000
  const maxDerinlik = s.maxDerinlik ?? 16
  const dosyalar: DosyaKaydi[] = []
  const gorulen = new Set<string>() // çakışan kökler (ör. C:\ ve Belgeler) aynı klasörü iki kez taramasın
  const yigin = [...kokler].reverse().map((yol) => ({ yol, derinlik: 0 }))
  let taranan = 0
  let kesildi = false
  let sonBildirim = 0

  while (yigin.length) {
    if (s.iptalEdildi?.()) {
      kesildi = true
      break
    }
    const { yol, derinlik } = yigin.pop()!
    const k = anahtar(yol)
    if (gorulen.has(k)) continue
    gorulen.add(k)

    let girdiler: Dirent[]
    try {
      girdiler = await fs.readdir(yol, { withFileTypes: true })
    } catch {
      continue // erişim izni yok
    }
    taranan++

    const dosyaYollari: string[] = []
    for (const g of girdiler) {
      if (g.isSymbolicLink() || gizliMi(g.name)) continue
      const tam = path.join(yol, g.name)
      if (g.isDirectory()) {
        if (derinlik < maxDerinlik && !ATLANAN.has(g.name.toLowerCase())) yigin.push({ yol: tam, derinlik: derinlik + 1 })
      } else if (g.isFile()) {
        dosyaYollari.push(tam)
      }
    }

    const kayitlar = await Promise.all(
      dosyaYollari.map(async (tam): Promise<DosyaKaydi | null> => {
        try {
          const st = await fs.stat(tam)
          const ad = path.basename(tam)
          return { yol: tam, ad, uzanti: uzantiAl(ad), kategori: kategoriBul(ad), boyut: st.size, degistirilme: st.mtimeMs }
        } catch {
          return null
        }
      }),
    )
    for (const kayit of kayitlar) if (kayit) dosyalar.push(kayit)

    if (dosyalar.length >= maxDosya) {
      kesildi = true
      break
    }
    const simdi = Date.now()
    if (simdi - sonBildirim > 200) {
      sonBildirim = simdi
      s.ilerleme?.({ taranan, bulunan: dosyalar.length, aktifKlasor: yol, bitti: false })
    }
  }

  s.ilerleme?.({ taranan, bulunan: dosyalar.length, aktifKlasor: '', bitti: true })
  return { dosyalar, kesildi, taranan }
}
