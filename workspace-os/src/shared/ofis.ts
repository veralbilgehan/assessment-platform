// Modül 4: Dahili ofis belgelerinin ortak modelleri.
// Main süreç dosyaları bu modellere çevirir (okuma) ve geri yazar; editörler yalnızca modelle çalışır.
import { uzantiAl } from './kategoriler'

export type EditorTuru = 'word' | 'excel' | 'sunum' | 'metin'

/** Workspace içinde düzenlenebilen uzantılar. .doc/.xls/.xlsm gibi eski/makrolu biçimler harici programda açılır. */
export const DAHILI_UZANTILAR: Record<string, EditorTuru> = {
  docx: 'word',
  xlsx: 'excel',
  csv: 'excel',
  pptx: 'sunum',
  txt: 'metin',
  md: 'metin',
  markdown: 'metin',
  log: 'metin',
}

/** Google Drive for Desktop'un çevrimiçi belge kısayolları (JSON içinde URL taşır) */
export const GOOGLE_KISAYOL_UZANTILARI = ['gdoc', 'gsheet', 'gslides', 'gdraw', 'gform']

export const editorBul = (dosyaAdi: string): EditorTuru | null => DAHILI_UZANTILAR[uzantiAl(dosyaAdi)] ?? null

export interface WordBelgesi {
  tur: 'word'
  html?: string // okuma: mammoth çıktısı
  json?: unknown // yazma: TipTap belge ağacı
}

export interface MetinBelgesi {
  tur: 'metin'
  metin: string
}

export interface Sayfa {
  ad: string
  kaynakAd?: string // dosyadaki özgün ad — yeniden adlandırmada biçimi korumak için
  hucreler: Record<string, string> // 'A1' → kullanıcının yazdığı ham girdi ('=TOPLA(A1:A3)' dahil)
  sonuclar?: Record<string, string | number | boolean> // yazarken formül sonuçları (Excel önbelleği için)
}

export interface TabloBelgesi {
  tur: 'excel'
  sayfalar: Sayfa[]
  csvAyirici?: ',' | ';' | '\t'
}

export interface Slayt {
  baslik: string
  maddeler: string[]
  notlar?: string
}

export interface SunumBelgesi {
  tur: 'sunum'
  slaytlar: Slayt[]
  tema: SunumTemaId
}

export type BelgeIcerigi = WordBelgesi | MetinBelgesi | TabloBelgesi | SunumBelgesi

export interface AcikBelge {
  yol: string
  ad: string
  icerik: BelgeIcerigi
  /** Başka bir programla oluşturulmuş: ilk kayıtta orijinal yedeklenir, karmaşık biçim sadeleşebilir */
  iceAktarildi: boolean
  korumali: boolean
}

export type SunumTemaId = 'acik' | 'koyu' | 'kurumsal' | 'canli'

export const SUNUM_TEMALARI: Record<SunumTemaId, { ad: string; arka: string; baslik: string; metin: string; vurgu: string }> = {
  acik: { ad: 'Açık', arka: 'FFFFFF', baslik: '1F2937', metin: '374151', vurgu: '4F7CFF' },
  koyu: { ad: 'Koyu', arka: '111827', baslik: 'F9FAFB', metin: 'D1D5DB', vurgu: '818CF8' },
  kurumsal: { ad: 'Kurumsal', arka: 'F8FAFC', baslik: '1E3A8A', metin: '334155', vurgu: '0EA5E9' },
  canli: { ad: 'Canlı', arka: 'FFF7ED', baslik: '9A3412', metin: '431407', vurgu: 'F97316' },
}

export const BOS_BELGELER: Record<EditorTuru, { ad: string; uzanti: string; icerik: BelgeIcerigi }> = {
  word: { ad: 'Adsız belge', uzanti: 'docx', icerik: { tur: 'word', json: { type: 'doc', content: [{ type: 'paragraph' }] } } },
  excel: { ad: 'Adsız tablo', uzanti: 'xlsx', icerik: { tur: 'excel', sayfalar: [{ ad: 'Sayfa1', hucreler: {} }] } },
  sunum: { ad: 'Adsız sunum', uzanti: 'pptx', icerik: { tur: 'sunum', tema: 'acik', slaytlar: [{ baslik: '', maddeler: [] }] } },
  metin: { ad: 'Yeni not', uzanti: 'txt', icerik: { tur: 'metin', metin: '' } },
}
