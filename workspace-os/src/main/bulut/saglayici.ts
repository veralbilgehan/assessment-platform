import type { BulutOgesi } from '@shared/bulut'

// Her bulut sağlayıcısının uyguladığı ortak arayüz. Yeni sağlayıcı (Dropbox vb.) = bu arayüzün yeni bir uygulaması.
export interface SaglayiciApi {
  hesap(): Promise<{ ad?: string; eposta?: string; kota?: { kullanilan: number; toplam?: number } }>
  listele(klasorId: string | null): Promise<BulutOgesi[]>
  /** Çakışma denetimi için içerik sürümü */
  surum(id: string): Promise<string>
  /** Google'ın kendi biçimleri .docx/.xlsx/.pptx olarak dışa aktarılır; ad buna göre uzantı alır */
  indir(oge: BulutOgesi): Promise<{ veri: Buffer; ad: string }>
  yukleYeni(klasorId: string | null, ad: string, veri: Buffer): Promise<BulutOgesi & { surum: string }>
  guncelle(id: string, ad: string, veri: Buffer, googleBicimi?: BulutOgesi['googleBicimi']): Promise<string>
  klasorOlustur(ustId: string | null, ad: string): Promise<BulutOgesi>
  yenidenAdlandir(id: string, ad: string): Promise<BulutOgesi>
}

export const siralaBulut = (a: BulutOgesi, b: BulutOgesi) => Number(b.klasor) - Number(a.klasor) || a.ad.localeCompare(b.ad, 'tr', { numeric: true })
