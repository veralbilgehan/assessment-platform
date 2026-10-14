// Modül 6: Google Drive ve OneDrive hesap bağlantısı (OAuth 2.0 + PKCE, Drive API v3 / Microsoft Graph).

export type BulutSaglayici = 'google' | 'microsoft'

export const SAGLAYICI_BILGISI: Record<BulutSaglayici, { ad: string; ikon: string; renk: string }> = {
  google: { ad: 'Google Drive', ikon: '🟢', renk: '#1fa463' },
  microsoft: { ad: 'OneDrive', ikon: '🔷', renk: '#0078d4' },
}

export interface BulutHesabi {
  saglayici: BulutSaglayici
  yapilandirildi: boolean // uygulama (istemci) kimliği girilmiş mi
  bagli: boolean
  ad?: string
  eposta?: string
  kota?: { kullanilan: number; toplam?: number }
  sifreli?: boolean // oturum diske şifreli mi yazıldı
}

export interface BulutOgesi {
  id: string
  ad: string
  klasor: boolean
  boyut: number
  degistirilme: number
  webUrl?: string
  /** Google'ın kendi biçimindeki dosyalar (.docx/.xlsx/.pptx olarak dışa aktarılıp düzenlenir) */
  googleBicimi?: 'belge' | 'tablo' | 'sunum' | 'diger'
}

export interface BulutAyarlari {
  googleIstemciKimligi: string
  googleIstemciSirriVar: boolean
  microsoftIstemciKimligi: string
  /** Kimlik dağıtımla gömülüyse (ortam değişkeni) arayüzden değiştirilemez */
  ortamdan: { google: boolean; microsoft: boolean }
}

export interface BulutAyarGirdisi {
  googleIstemciKimligi?: string
  googleIstemciSirri?: string
  microsoftIstemciKimligi?: string
}

export type SenkronDurumu = 'bekliyor' | 'yukleniyor' | 'yuklendi' | 'cakisma' | 'hata'

export interface SenkronOlayi {
  yol: string
  durum: SenkronDurumu
  mesaj?: string
}
