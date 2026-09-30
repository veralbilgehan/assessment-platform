// Main ↔ Preload ↔ Renderer arasında paylaşılan sözleşmeler.
// Yeni modüller buraya kendi tiplerini ve IPC kanallarını ekler.
import type { KategoriId } from './kategoriler'

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
  kaynaklar: string[] // Kütüphaneye taranacak klasör/sürücü yolları
  kurulumTarihi?: string
}

export interface SistemBilgisi {
  kullaniciAdi: string // OS kullanıcı adı — isim alanına öneri olarak kullanılır
  platform: string
  bilgisayarAdi: string
}

// ── Modül 2: Sürücüler ve dosyalar ─────────────────────────────

export type SurucuTuru = 'sistem' | 'yerel' | 'usb' | 'harici' | 'ag' | 'optik' | 'bulut'

export interface Surucu {
  id: string
  ad: string
  yol: string
  tur: SurucuTuru
  saglayici?: 'google-drive' | 'onedrive'
  toplamBayt?: number
  bosBayt?: number
}

export interface OnemliKlasor {
  ad: string
  yol: string
  ikon: string
  kaynak: 'sistem' | 'bulut' | 'surucu'
}

export interface KlasorOgesi {
  ad: string
  yol: string
  klasor: boolean
  boyut: number
  degistirilme: number
  kategori: KategoriId | null
}

export interface DosyaKaydi {
  yol: string
  ad: string
  uzanti: string
  kategori: KategoriId
  boyut: number
  degistirilme: number
}

export interface DizinOzeti {
  olusturulma: string
  kokler: string[]
  toplamDosya: number
  toplamBoyut: number
  kesildi: boolean // dosya limiti veya iptal nedeniyle yarım kaldıysa
  kategoriler: Partial<Record<KategoriId, { adet: number; boyut: number }>>
}

export interface DosyaSorgusu {
  kategori?: KategoriId
  arama?: string
  siralama?: 'tarih' | 'ad' | 'boyut'
  limit?: number
}

export interface TaramaIlerlemesi {
  taranan: number
  bulunan: number
  aktifKlasor: string
  bitti: boolean
}

export interface OlayHaritasi {
  'tarama:ilerleme': TaramaIlerlemesi
  'suruculer:degisti': null
}
export const OLAY_KANALLARI: (keyof OlayHaritasi)[] = ['tarama:ilerleme', 'suruculer:degisti']

export const IPC = {
  durumGetir: 'durum:getir',
  kurulumTamamla: 'kurulum:tamamla',
  kurulumSifirla: 'kurulum:sifirla',
  kaynaklariKaydet: 'kurulum:kaynaklar',
  sistemBilgisi: 'sistem:bilgi',
  suruculeriGetir: 'surucu:liste',
  onemliKlasorler: 'surucu:onemli',
  klasorListele: 'dosya:liste',
  klasorOlustur: 'dosya:klasor-olustur',
  yenidenAdlandir: 'dosya:yeniden-adlandir',
  tasi: 'dosya:tasi',
  dosyaAc: 'dosya:ac',
  klasordeGoster: 'dosya:klasorde-goster',
  klasorSec: 'dosya:klasor-sec',
  taramaBaslat: 'dizin:tara',
  taramaIptal: 'dizin:iptal',
  dizinOzeti: 'dizin:ozet',
  dosyaSorgula: 'dizin:sorgula',
} as const

export interface WorkspaceApi {
  durumGetir(): Promise<UygulamaDurumu>
  kurulumTamamla(profil: KullaniciProfili, tercihler: Tercihler, kaynaklar: string[]): Promise<UygulamaDurumu>
  kurulumSifirla(): Promise<UygulamaDurumu>
  kaynaklariKaydet(kaynaklar: string[]): Promise<UygulamaDurumu>
  sistemBilgisi(): Promise<SistemBilgisi>

  suruculeriGetir(): Promise<Surucu[]>
  onemliKlasorler(): Promise<OnemliKlasor[]>
  klasorListele(yol: string, gizliGoster?: boolean): Promise<KlasorOgesi[]>
  klasorOlustur(ustYol: string, ad: string): Promise<string>
  yenidenAdlandir(yol: string, yeniAd: string): Promise<string>
  tasi(yollar: string[], hedefKlasor: string): Promise<string[]>
  dosyaAc(yol: string): Promise<void>
  klasordeGoster(yol: string): Promise<void>
  klasorSec(): Promise<string | null>

  taramaBaslat(kokler?: string[]): Promise<DizinOzeti>
  taramaIptal(): Promise<void>
  dizinOzeti(): Promise<DizinOzeti | null>
  dosyaSorgula(sorgu: DosyaSorgusu): Promise<{ toplam: number; dosyalar: DosyaKaydi[] }>

  olayDinle<K extends keyof OlayHaritasi>(kanal: K, dinleyici: (veri: OlayHaritasi[K]) => void): () => void
}
