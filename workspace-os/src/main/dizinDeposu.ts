import { app } from 'electron'
import { promises as fs } from 'fs'
import path from 'path'
import type { DizinOzeti, DosyaKaydi, DosyaSorgusu } from '@shared/tipler'

// Taranan dosyaların dizini: bellekte tutulur, %APPDATA%/Workspace OS/dizin.json'a yazılır.
// Renderer'a tüm liste değil, yalnızca özet ve sayfalı sorgu sonuçları gönderilir.
// (Modül 3 bu kayıtlara proje statüsü ekleyecek.)

interface Dizin {
  olusturulma: string
  kokler: string[]
  kesildi: boolean
  dosyalar: DosyaKaydi[]
}

let dizin: Dizin | null = null
let yuklendi = false

const dosyaYolu = () => path.join(app.getPath('userData'), 'dizin.json')

async function yukle(): Promise<Dizin | null> {
  if (!yuklendi) {
    yuklendi = true
    try {
      dizin = JSON.parse(await fs.readFile(dosyaYolu(), 'utf-8'))
    } catch {
      dizin = null
    }
  }
  return dizin
}

async function kaydet() {
  if (!dizin) return
  const yol = dosyaYolu()
  await fs.mkdir(path.dirname(yol), { recursive: true })
  await fs.writeFile(`${yol}.tmp`, JSON.stringify(dizin), 'utf-8')
  await fs.rename(`${yol}.tmp`, yol)
}

function ozetCikar(d: Dizin): DizinOzeti {
  const kategoriler: DizinOzeti['kategoriler'] = {}
  let toplamBoyut = 0
  for (const f of d.dosyalar) {
    const k = (kategoriler[f.kategori] ??= { adet: 0, boyut: 0 })
    k.adet++
    k.boyut += f.boyut
    toplamBoyut += f.boyut
  }
  return { olusturulma: d.olusturulma, kokler: d.kokler, kesildi: d.kesildi, toplamDosya: d.dosyalar.length, toplamBoyut, kategoriler }
}

export async function dizinYaz(kokler: string[], dosyalar: DosyaKaydi[], kesildi: boolean): Promise<DizinOzeti> {
  dizin = { olusturulma: new Date().toISOString(), kokler, kesildi, dosyalar }
  yuklendi = true
  await kaydet()
  return ozetCikar(dizin)
}

export async function dizinOzeti(): Promise<DizinOzeti | null> {
  const d = await yukle()
  return d ? ozetCikar(d) : null
}

export async function dosyaSorgula(q: DosyaSorgusu): Promise<{ toplam: number; dosyalar: DosyaKaydi[] }> {
  const d = await yukle()
  if (!d) return { toplam: 0, dosyalar: [] }
  const arama = q.arama?.trim().toLocaleLowerCase('tr')
  const sonuc = d.dosyalar.filter(
    (f) => (!q.kategori || f.kategori === q.kategori) && (!arama || f.ad.toLocaleLowerCase('tr').includes(arama)),
  )
  const siralama = q.siralama ?? 'tarih'
  sonuc.sort((a, b) =>
    siralama === 'ad' ? a.ad.localeCompare(b.ad, 'tr', { numeric: true })
    : siralama === 'boyut' ? b.boyut - a.boyut
    : b.degistirilme - a.degistirilme,
  )
  return { toplam: sonuc.length, dosyalar: sonuc.slice(0, q.limit ?? 500) }
}

/** Taşıma/yeniden adlandırma sonrası dizindeki yolları günceller (yeniden tarama gerekmeden). */
export async function yollariGuncelle(degisiklikler: { eski: string; yeni: string }[]) {
  const d = await yukle()
  if (!d || degisiklikler.length === 0) return
  const win = process.platform === 'win32'
  const norm = (y: string) => (win ? y.toLowerCase() : y)
  for (const { eski, yeni } of degisiklikler) {
    const e = norm(eski)
    for (const f of d.dosyalar) {
      const y = norm(f.yol)
      if (y === e || y.startsWith(e + path.sep)) {
        f.yol = yeni + f.yol.slice(eski.length)
        f.ad = path.basename(f.yol)
      }
    }
  }
  await kaydet()
}
