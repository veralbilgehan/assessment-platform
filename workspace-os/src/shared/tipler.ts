// Main ↔ Preload ↔ Renderer arasında paylaşılan sözleşmeler.
// Yeni modüller buraya kendi tiplerini ve IPC kanallarını ekler.
import type { KategoriId } from './kategoriler'
import type { AcikBelge, BelgeIcerigi, EditorTuru } from './ofis'
import type { AiDurumu, AiIstegi, AiOnerisi, AiSonucu, IstemSablonu } from './ai'
import type { BulutAyarGirdisi, BulutAyarlari, BulutHesabi, BulutOgesi, BulutSaglayici, SenkronOlayi } from './bulut'

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
  /** Modül 5 */
  aiModel?: string
  aiOtomatikYapistir?: boolean // AI içeriği bitince doğrudan belgeye yazılsın
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
  'ai:parca': { id: string; metin: string }
  'bulut:senkron': SenkronOlayi
}
export const OLAY_KANALLARI: (keyof OlayHaritasi)[] = ['tarama:ilerleme', 'suruculer:degisti', 'ai:parca', 'bulut:senkron']

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
  aiDurum: 'ai:durum',
  aiAnahtarKaydet: 'ai:anahtar-kaydet',
  aiAnahtarSil: 'ai:anahtar-sil',
  aiIstemler: 'ai:istemler',
  aiIstemleriKaydet: 'ai:istemleri-kaydet',
  aiUret: 'ai:uret',
  aiIptal: 'ai:iptal',
  aiOneriler: 'ai:oneriler',
  bulutHesaplar: 'bulut:hesaplar',
  bulutAyarlar: 'bulut:ayarlar',
  bulutAyarlariKaydet: 'bulut:ayarlari-kaydet',
  bulutBaglan: 'bulut:baglan',
  bulutBaglantiKes: 'bulut:baglanti-kes',
  bulutListele: 'bulut:listele',
  bulutAc: 'bulut:ac',
  bulutIndir: 'bulut:indir',
  bulutYukle: 'bulut:yukle',
  bulutKlasorOlustur: 'bulut:klasor-olustur',
  bulutYenidenAdlandir: 'bulut:yeniden-adlandir',
  bulutSenkronDurumu: 'bulut:senkron-durumu',
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

  aiDurum(): Promise<AiDurumu>
  /** Anahtarı doğrular (API'ye ücretsiz bir model sorgusu) ve şifreli olarak saklar */
  aiAnahtarKaydet(anahtar: string): Promise<AiDurumu>
  aiAnahtarSil(): Promise<AiDurumu>
  aiIstemler(): Promise<IstemSablonu[]>
  /** null → varsayılan şablonlara dön */
  aiIstemleriKaydet(istemler: IstemSablonu[] | null): Promise<IstemSablonu[]>
  /** Akış parçaları 'ai:parca' olayıyla gelir; sonuç tamamlanınca döner */
  aiUret(istek: AiIstegi): Promise<AiSonucu>
  aiIptal(id: string): Promise<void>
  aiOneriler(istek: Omit<AiIstegi, 'id' | 'talimat' | 'cikti'>): Promise<AiOnerisi[]>

  bulutHesaplar(): Promise<BulutHesabi[]>
  bulutAyarlar(): Promise<BulutAyarlari>
  bulutAyarlariKaydet(girdi: BulutAyarGirdisi): Promise<BulutAyarlari>
  /** Sistem tarayıcısında oturum açma sayfasını açar, kullanıcı onaylayınca döner */
  bulutBaglan(s: BulutSaglayici): Promise<BulutHesabi>
  bulutBaglantiKes(s: BulutSaglayici): Promise<BulutHesabi>
  /** klasorId null → kök klasör */
  bulutListele(s: BulutSaglayici, klasorId: string | null): Promise<BulutOgesi[]>
  /** Dosyayı yerel önbelleğe indirir ve yolunu döndürür; kaydedilen değişiklikler buluta geri yüklenir */
  bulutAc(s: BulutSaglayici, oge: BulutOgesi, klasorId: string | null): Promise<string>
  /** İndirilenler klasörüne kopya indirir */
  bulutIndir(s: BulutSaglayici, oge: BulutOgesi): Promise<string>
  /** yollar verilmezse dosya seçme penceresi açılır */
  bulutYukle(s: BulutSaglayici, klasorId: string | null, yollar?: string[]): Promise<BulutOgesi[]>
  bulutKlasorOlustur(s: BulutSaglayici, ustId: string | null, ad: string): Promise<BulutOgesi>
  bulutYenidenAdlandir(s: BulutSaglayici, id: string, ad: string): Promise<BulutOgesi>
  bulutSenkronDurumu(yol: string): Promise<SenkronOlayi | null>
  /** Sürükle-bırak ile gelen dosyanın diskteki yolu */
  dosyaYolu(dosya: File): string

  olayDinle<K extends keyof OlayHaritasi>(kanal: K, dinleyici: (veri: OlayHaritasi[K]) => void): () => void
}
