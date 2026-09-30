// Modül 5: Yapay zeka — ortak tipler ve varsayılan istem (prompt) şablonları.
// Şablonlar kullanıcı tarafından Yapay Zeka ekranında düzenlenebilir; bu dosya yalnızca başlangıç setidir.
import type { EditorTuru, Slayt } from './ofis'

/** ekle: imlecin/seçimin ardına · degistir: seçimin yerine · yanit: yalnızca panelde göster */
export type AiCikti = 'ekle' | 'degistir' | 'yanit'

export interface IstemSablonu {
  id: string
  editor: EditorTuru
  ad: string
  ikon: string
  /** {girdi}: kullanıcının yazdığı metin · {secim}: belgede seçili metin/konum. Belge içeriği her zaman eklenir. */
  sablon: string
  cikti: AiCikti
  /** Doluysa şablon çalışmadan önce kullanıcıdan {girdi} istenir; metin kutusunun ipucu olur */
  girdiEtiketi?: string
}

export const AI_MODELLERI = [
  { id: 'claude-opus-5-5', ad: 'Claude Opus 5.5', aciklama: 'En yetenekli — varsayılan' },
  { id: 'claude-sonnet-5-5', ad: 'Claude Sonnet 5.5', aciklama: 'Daha hızlı ve ekonomik' },
] as const
export const VARSAYILAN_AI_MODELI = 'claude-opus-5-5'

export interface AiIstegi {
  id: string // iptal ve akış olaylarını eşlemek için
  editor: EditorTuru
  belgeAdi: string
  talimat: string // şablon doldurulmuş hali veya serbest istek
  belge: string // editörün metin içeriği (bağlam)
  secim?: string
  konum?: string // Excel: ekleme hücresi, PowerPoint: aktif slayt
  cikti: AiCikti
}

export interface AiSonucu {
  html?: string // Word
  metin?: string // Not Defteri ve 'yanit'
  tablo?: string[][] // Excel
  slaytlar?: Slayt[] // PowerPoint
  aciklama?: string
  model: string
}

export interface AiOnerisi {
  baslik: string
  aciklama: string
  talimat: string
  cikti: AiCikti
}

export interface AiDurumu {
  anahtarVar: boolean
  kaynak: 'kayitli' | 'ortam' | null // kayıtlı anahtar veya ANTHROPIC_API_KEY ortam değişkeni
  sifreli: boolean // işletim sistemi şifreli deposunda mı
}

export function sablonuDoldur(s: string, d: { girdi?: string; secim?: string }): string {
  return s.replace(/\{girdi\}/g, d.girdi?.trim() || '').replace(/\{secim\}/g, d.secim?.trim() || '(seçim yok)')
}

export const VARSAYILAN_ISTEMLER: IstemSablonu[] = [
  // Word
  { id: 'word-yaz', editor: 'word', ad: 'Yaz', ikon: '✍️', sablon: 'Şu konuda belgeye eklenecek içerik yaz: {girdi}', cikti: 'ekle', girdiEtiketi: 'Ne yazayım? (ör. proje hedefleri bölümü)' },
  { id: 'word-iyilestir', editor: 'word', ad: 'Seçimi iyileştir', ikon: '✨', sablon: 'Seçili metni anlamını koruyarak daha açık, akıcı ve hatasız hale getir.', cikti: 'degistir' },
  { id: 'word-resmi', editor: 'word', ad: 'Resmileştir', ikon: '👔', sablon: 'Seçili metni resmi, kurumsal bir dille yeniden yaz.', cikti: 'degistir' },
  { id: 'word-ozet', editor: 'word', ad: 'Özet ekle', ikon: '📋', sablon: 'Belgenin kısa bir yönetici özetini yaz (başlık + 3-5 madde).', cikti: 'ekle' },
  { id: 'word-tablo', editor: 'word', ad: 'Tablo oluştur', ikon: '▦', sablon: 'Şu bilgiyi düzenli bir tablo olarak hazırla: {girdi}', cikti: 'ekle', girdiEtiketi: 'Hangi tablo? (ör. 5 adımlı proje takvimi)' },
  { id: 'word-cevir', editor: 'word', ad: 'İngilizceye çevir', ikon: '🌐', sablon: 'Seçili metni İngilizceye çevir.', cikti: 'degistir' },
  { id: 'word-sor', editor: 'word', ad: 'Belgeye soru sor', ikon: '❓', sablon: 'Belgeye göre şu soruyu yanıtla: {girdi}', cikti: 'yanit', girdiEtiketi: 'Sorun nedir?' },
  // Excel
  { id: 'excel-tablo', editor: 'excel', ad: 'Tablo oluştur', ikon: '▦', sablon: 'Seçili hücreden başlayarak şu tabloyu oluştur (başlık satırı dahil, gerekiyorsa toplam formülleriyle): {girdi}', cikti: 'ekle', girdiEtiketi: 'Ne tablosu? (ör. aylık bütçe, 6 kalem)' },
  { id: 'excel-formul', editor: 'excel', ad: 'Formül öner', ikon: 'ƒ', sablon: 'Seçili hücreye şu hesabı yapan formülü yaz: {girdi}', cikti: 'ekle', girdiEtiketi: 'Ne hesaplansın? (ör. B sütununun ortalaması)' },
  { id: 'excel-analiz', editor: 'excel', ad: 'Veriyi yorumla', ikon: '🔍', sablon: 'Tablodaki verileri analiz et; öne çıkan eğilimleri, aykırı değerleri ve önerileri kısaca yaz.', cikti: 'yanit' },
  { id: 'excel-ornek', editor: 'excel', ad: 'Örnek veri üret', ikon: '🎲', sablon: 'Mevcut sütun başlıklarına uygun 10 satır gerçekçi örnek veri üret; başlık satırının hemen altından başla.', cikti: 'ekle' },
  // PowerPoint
  { id: 'sunum-taslak', editor: 'sunum', ad: 'Sunum taslağı', ikon: '📽️', sablon: 'Şu konuda 6-8 slaytlık bir sunum taslağı hazırla (kapak slaytı dahil, her slayta konuşmacı notu yaz): {girdi}', cikti: 'ekle', girdiEtiketi: 'Sunumun konusu?' },
  { id: 'sunum-genislet', editor: 'sunum', ad: 'Slaytı genişlet', ikon: '➕', sablon: 'Aktif slaytın konusunu 2-3 yeni destekleyici slaytla genişlet.', cikti: 'ekle' },
  { id: 'sunum-kapanis', editor: 'sunum', ad: 'Kapanış slaytı', ikon: '🏁', sablon: 'Sunumu özetleyen bir kapanış/sonuç slaytı ve bir "Sorular" slaytı hazırla.', cikti: 'ekle' },
  { id: 'sunum-geri-bildirim', editor: 'sunum', ad: 'Geri bildirim ver', ikon: '💬', sablon: 'Sunumun akışını, mesajın netliğini ve eksik noktaları değerlendir; somut öneriler ver.', cikti: 'yanit' },
  // Not Defteri
  { id: 'metin-devam', editor: 'metin', ad: 'Devam et', ikon: '➡️', sablon: 'Metni aynı üslupla doğal biçimde sürdür (bir-iki paragraf).', cikti: 'ekle' },
  { id: 'metin-duzelt', editor: 'metin', ad: 'Yazım düzelt', ikon: '✔️', sablon: 'Seçili metindeki yazım ve dilbilgisi hatalarını düzelt; başka bir şeyi değiştirme.', cikti: 'degistir' },
  { id: 'metin-ozet', editor: 'metin', ad: 'Özetle', ikon: '📋', sablon: 'Metni birkaç maddede özetle.', cikti: 'yanit' },
]
