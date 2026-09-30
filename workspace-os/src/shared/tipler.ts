// Main ↔ Preload ↔ Renderer arasında paylaşılan sözleşmeler.
// Yeni modüller buraya kendi tiplerini ve IPC kanallarını ekler.
import type { KategoriId } from './kategoriler'
import type { AcikBelge, BelgeIcerigi, EditorTuru } from './ofis'

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
  /** Modül 3: son N gün içinde değişen dosyalar otomatik olarak "Yeni Proje" sayılır */
  projeEsikGun?: number
  /** Modül 4: desteklenen belgeler (docx, xlsx, pptx, txt…) Workspace'in kendi editörlerinde açılsın */
  dahiliEditor?: boolean
}

export const VARSAYILAN_PROJE_ESIK_GUN = 30

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

// ── Modül 3: Proje statüsü ─────────────────────────────────────

export type ProjeStatusu = 'yeni' | 'tamamlandi'

export interface ProjeDosyasi extends DosyaKaydi {
  statu: ProjeStatusu
  statuOtomatik: boolean // kullanıcı işaretlemediyse tarihe göre tahmin edildi
  korumali: boolean // tamamlanmış dosya salt okunur yapıldı
  sonAcilma?: number
}

export interface DizinOzeti {
  olusturulma: string
  kokler: string[]
  toplamDosya: number
  toplamBoyut: number
  kesildi: boolean // dosya limiti veya iptal nedeniyle yarım kaldıysa
  kategoriler: Partial<Record<KategoriId, { adet: number; boyut: number; yeni: number }>>
}

export interface DosyaSorgusu {
  kategori?: KategoriId
  kategoriler?: KategoriId[]
  statu?: ProjeStatusu
  arama?: string
  /** 'son' = son açılma veya son değişiklik (hangisi yeniyse) — "kaldığın yerden devam et" */
  siralama?: 'tarih' | 'ad' | 'boyut' | 'son'
  limit?: number
}

export interface SorguSonucu {
  toplam: number
  dosyalar: ProjeDosyasi[]
  statuSayilari: Record<ProjeStatusu, number> // statü filtresinden önceki sayılar (sekme rozetleri için)
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
  statuAyarla: 'proje:statu',
  korumaAyarla: 'proje:koruma',
  tercihleriKaydet: 'tercihler:kaydet',
  belgeAc: 'ofis:ac',
  belgeKaydet: 'ofis:kaydet',
  farkliKaydet: 'ofis:farkli-kaydet',
  yeniBelge: 'ofis:yeni',
  googleKisayolAc: 'ofis:google-kisayol',
  webAc: 'ofis:web',
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
  dosyaSorgula(sorgu: DosyaSorgusu): Promise<SorguSonucu>

  /** null → elle işaretlemeyi kaldır, otomatik tahmine dön */
  statuAyarla(yollar: string[], statu: ProjeStatusu | null): Promise<void>
  /** Salt okunur koruma — tamamlanmış dosyaların yanlışlıkla değişmesini önler */
  korumaAyarla(yollar: string[], korumali: boolean): Promise<void>
  tercihleriKaydet(tercihler: Tercihler): Promise<UygulamaDurumu>

  belgeAc(yol: string): Promise<AcikBelge>
  /** Kaydedilme zamanını döndürür */
  belgeKaydet(yol: string, icerik: BelgeIcerigi): Promise<number>
  farkliKaydet(icerik: BelgeIcerigi, onerilenYol: string): Promise<string | null>
  yeniBelge(tur: EditorTuru, konum?: 'belgeler' | 'google-drive' | 'onedrive'): Promise<string>
  googleKisayolAc(yol: string): Promise<void>
  webAc(url: string): Promise<void>

  olayDinle<K extends keyof OlayHaritasi>(kanal: K, dinleyici: (veri: OlayHaritasi[K]) => void): () => void
}
