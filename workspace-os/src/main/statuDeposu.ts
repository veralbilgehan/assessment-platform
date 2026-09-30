import { app } from 'electron'
import { promises as fs } from 'fs'
import path from 'path'
import type { DosyaKaydi, ProjeDosyasi, ProjeStatusu } from '@shared/tipler'

// Proje statüleri dizinden ayrı tutulur (%APPDATA%/Workspace OS/statuler.json):
// yeniden tarama dizini baştan yazsa da kullanıcının işaretlemeleri kaybolmaz.

interface StatuKaydi {
  statu?: ProjeStatusu // elle işaretlendiyse
  korumali?: boolean
  sonAcilma?: number
}

let kayitlar: Record<string, StatuKaydi> | null = null

const WIN = process.platform === 'win32'
export const yolAnahtari = (yol: string) => (WIN ? yol.toLowerCase() : yol)

const dosyaYolu = () => path.join(app.getPath('userData'), 'statuler.json')

async function yukle(): Promise<Record<string, StatuKaydi>> {
  if (!kayitlar) {
    try {
      kayitlar = JSON.parse(await fs.readFile(dosyaYolu(), 'utf-8'))
    } catch {
      kayitlar = {}
    }
  }
  return kayitlar!
}

async function kaydet() {
  const yol = dosyaYolu()
  await fs.mkdir(path.dirname(yol), { recursive: true })
  await fs.writeFile(`${yol}.tmp`, JSON.stringify(kayitlar), 'utf-8')
  await fs.rename(`${yol}.tmp`, yol)
}

async function guncelle(yollar: string[], degisiklik: (k: StatuKaydi) => void) {
  const r = await yukle()
  for (const yol of yollar) {
    const a = yolAnahtari(yol)
    const k = (r[a] ??= {})
    degisiklik(k)
    if (k.statu === undefined && !k.korumali && k.sonAcilma === undefined) delete r[a]
  }
  await kaydet()
}

export async function statuAyarla(yollar: string[], statu: ProjeStatusu | null) {
  await guncelle(yollar, (k) => {
    if (statu) k.statu = statu
    else delete k.statu
  })
}

/** Salt okunur özniteliği: Windows'ta yazma biti kaldırılınca dosya "Salt okunur" olur. */
export async function korumaAyarla(yollar: string[], korumali: boolean) {
  for (const yol of yollar) {
    const { mode } = await fs.stat(yol)
    await fs.chmod(yol, korumali ? mode & ~0o222 : mode | 0o200)
  }
  await guncelle(yollar, (k) => {
    if (korumali) k.korumali = true
    else delete k.korumali
  })
}

export async function acildiIsaretle(yol: string) {
  await guncelle([yol], (k) => {
    k.sonAcilma = Date.now()
  })
}

/** Taşıma/yeniden adlandırmada işaretlemeler dosyayla birlikte gider. */
export async function yollariTasi(degisiklikler: { eski: string; yeni: string }[]) {
  const r = await yukle()
  let degisti = false
  for (const { eski, yeni } of degisiklikler) {
    const e = yolAnahtari(eski)
    for (const a of Object.keys(r)) {
      if (a !== e && !a.startsWith(e + path.sep)) continue
      r[yolAnahtari(yeni + a.slice(e.length))] = r[a]
      delete r[a]
      degisti = true
    }
  }
  if (degisti) await kaydet()
}

/**
 * Dosya kaydına statü ekler. Elle işaretlenmemişse tahmin:
 * son `esikGun` gün içinde değiştiyse → üzerinde çalışılıyor ("yeni"), değilse → "tamamlandi".
 */
export function zenginlestirici(r: Record<string, StatuKaydi>, esikGun: number, simdi = Date.now()) {
  const esikMs = esikGun * 86_400_000
  return (f: DosyaKaydi): ProjeDosyasi => {
    const k = r[yolAnahtari(f.yol)]
    return {
      ...f,
      statu: k?.statu ?? (simdi - f.degistirilme < esikMs ? 'yeni' : 'tamamlandi'),
      statuOtomatik: !k?.statu,
      korumali: !!k?.korumali,
      sonAcilma: k?.sonAcilma,
    }
  }
}

export const statuKayitlari = yukle
