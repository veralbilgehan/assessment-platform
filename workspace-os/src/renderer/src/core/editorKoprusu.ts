import type { EditorTuru, Slayt } from '@shared/ofis'

// Açık editör ile dış dünya arasındaki köprü. Modül 5 (AI) aktif belgenin içeriğini buradan okur
// ve ürettiği içeriği doğrudan belgeye yapıştırır. Her editör açıldığında kendini kaydeder.

export interface EkIcerik {
  html?: string // Word
  metin?: string // tüm editörler (düz metin yedeği)
  tablo?: string[][] // Excel; Word'de tabloya çevrilir
  slaytlar?: Slayt[] // PowerPoint
}

export interface EditorKoprusu {
  tur: EditorTuru
  belgeAdi: string
  metinAl(): string
  seciliMetin(): string
  ekle(icerik: EkIcerik): void
}

let aktif: EditorKoprusu | null = null
const dinleyiciler = new Set<(k: EditorKoprusu | null) => void>()

export function editorKaydet(kopru: EditorKoprusu): () => void {
  aktif = kopru
  dinleyiciler.forEach((d) => d(aktif))
  return () => {
    if (aktif !== kopru) return
    aktif = null
    dinleyiciler.forEach((d) => d(null))
  }
}

export const aktifEditor = () => aktif

export function editorDinle(dinleyici: (k: EditorKoprusu | null) => void): () => void {
  dinleyiciler.add(dinleyici)
  return () => dinleyiciler.delete(dinleyici)
}

const kacis = (s: string) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')

export function metniHtmleCevir(metin: string): string {
  return metin
    .split(/\n{2,}/)
    .map((p) => `<p>${kacis(p).replace(/\n/g, '<br>')}</p>`)
    .join('')
}

export function tabloyuHtmleCevir(tablo: string[][]): string {
  const [baslik, ...satirlar] = tablo
  const hucre = (e: string, v: string) => `<${e}><p>${kacis(v)}</p></${e}>`
  return `<table><tr>${(baslik ?? []).map((v) => hucre('th', v)).join('')}</tr>${satirlar
    .map((s) => `<tr>${s.map((v) => hucre('td', v)).join('')}</tr>`)
    .join('')}</table>`
}
