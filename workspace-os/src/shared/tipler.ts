// Main ↔ Preload ↔ Renderer arasında paylaşılan sözleşmeler.
// Yeni modüller buraya kendi tiplerini ve IPC kanallarını ekler.

export type Tema = 'acik' | 'koyu' | 'sistem'
export type Dil = 'tr' | 'en'

export interface KullaniciProfili {
  ad: string
  soyad: string
  eposta?: string
  meslek?: string
  kullanimAmaci: string[] // ör. ['yazilim', 'ofis', 'medya']
  avatarRenk: string
}

export interface Tercihler {
  tema: Tema
  dil: Dil
  aiOnerileriAcik: boolean
}

export interface UygulamaDurumu {
  kurulumTamamlandi: boolean
  surum: number // şema sürümü — ileride migration için
  profil: KullaniciProfili | null
  tercihler: Tercihler
  kurulumTarihi?: string
}

export const IPC = {
  durumGetir: 'durum:getir',
  kurulumTamamla: 'kurulum:tamamla',
  kurulumSifirla: 'kurulum:sifirla',
  sistemBilgisi: 'sistem:bilgi',
} as const

export interface SistemBilgisi {
  kullaniciAdi: string // OS kullanıcı adı — isim alanına öneri olarak kullanılır
  platform: string
  bilgisayarAdi: string
}

export interface WorkspaceApi {
  durumGetir(): Promise<UygulamaDurumu>
  kurulumTamamla(profil: KullaniciProfili, tercihler: Tercihler): Promise<UygulamaDurumu>
  kurulumSifirla(): Promise<UygulamaDurumu>
  sistemBilgisi(): Promise<SistemBilgisi>
}
