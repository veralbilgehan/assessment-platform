import { useEffect, useRef, useState } from 'react'
import type { DizinOzeti, DosyaKaydi, DosyaSorgusu, TaramaIlerlemesi } from '@shared/tipler'
import { KATEGORI_HARITASI, KATEGORILER, type KategoriId } from '@shared/kategoriler'
import type { ModulProps } from '@core/modulKayit'
import { boyutBicimle, hataMesaji, tarihBicimle } from '@core/bicim'
import { sonParca, ustKlasor } from '@core/yol'

// Kurulumda seçilen kullanım amacına göre ilgili kategoriler öne alınır
const AMAC_KATEGORILERI: Record<string, KategoriId[]> = {
  ofis: ['word', 'excel', 'sunum', 'pdf', 'metin'],
  yazilim: ['kod', 'veri'],
  medya: ['video', 'gorsel', 'ses'],
  egitim: ['pdf', 'ekitap', 'word'],
  arsiv: ['arsiv'],
  ai: ['metin', 'veri'],
}

export default function Kutuphane({ durum, durumGuncelle }: ModulProps) {
  const [ozet, setOzet] = useState<DizinOzeti | null | undefined>(undefined)
  const [ilerleme, setIlerleme] = useState<TaramaIlerlemesi | null>(null)
  const [kategori, setKategori] = useState<KategoriId | null>(null)
  const [hata, setHata] = useState<string | null>(null)
  const otomatikTarandi = useRef(false)
  // İlerleme olayları IPC yanıtından sonra da gelebilir — bayrak, bitmiş taramanın paneli yeniden açmasını önler
  const taraniyor = useRef(false)

  const tara = async () => {
    taraniyor.current = true
    setHata(null)
    setIlerleme({ taranan: 0, bulunan: 0, aktifKlasor: '', bitti: false })
    try {
      setOzet(await window.workspace.taramaBaslat())
    } catch (e) {
      setHata(hataMesaji(e))
    } finally {
      taraniyor.current = false
      setIlerleme(null)
    }
  }

  useEffect(() => {
    const kapat = window.workspace.olayDinle('tarama:ilerleme', (i) => taraniyor.current && !i.bitti && setIlerleme(i))
    window.workspace.dizinOzeti().then((o) => {
      setOzet(o)
      // İlk açılışta dizin yoksa otomatik tara
      if (!o && !otomatikTarandi.current) {
        otomatikTarandi.current = true
        tara()
      }
    })
    return kapat
  }, [])

  const kaynakEkle = async () => {
    const yol = await window.workspace.klasorSec()
    if (yol && !durum.kaynaklar.includes(yol)) durumGuncelle(await window.workspace.kaynaklariKaydet([...durum.kaynaklar, yol]))
  }
  const kaynakCikar = async (yol: string) =>
    durumGuncelle(await window.workspace.kaynaklariKaydet(durum.kaynaklar.filter((k) => k !== yol)))

  if (kategori) return <KategoriGorunumu kategori={kategori} geri={() => setKategori(null)} />

  const oncelikli = new Set((durum.profil?.kullanimAmaci ?? []).flatMap((a) => AMAC_KATEGORILERI[a] ?? []))
  const kartlar = KATEGORILER.filter((k) => ozet?.kategoriler[k.id]?.adet).sort(
    (a, b) =>
      Number(oncelikli.has(b.id)) - Number(oncelikli.has(a.id)) ||
      ozet!.kategoriler[b.id]!.adet - ozet!.kategoriler[a.id]!.adet,
  )

  return (
    <section>
      <header className="modul-baslik">
        <div>
          <h1>Kütüphane</h1>
          <p className="alt-metin">
            {ozet
              ? `${ozet.toplamDosya.toLocaleString('tr-TR')} dosya · ${boyutBicimle(ozet.toplamBoyut)} · son tarama ${tarihBicimle(Date.parse(ozet.olusturulma))}`
              : 'Dosyaların türlerine göre otomatik ayrıştırılır.'}
          </p>
        </div>
        {ilerleme ? (
          <button className="dugme" onClick={() => window.workspace.taramaIptal()}>Durdur</button>
        ) : (
          <button className="dugme birincil" onClick={tara}>{ozet ? 'Yeniden tara' : 'Tara'}</button>
        )}
      </header>

      <div className="kaynak-cipleri">
        {durum.kaynaklar.map((k) => (
          <span key={k} className="cip" title={k}>
            {sonParca(k)}
            <button onClick={() => kaynakCikar(k)} aria-label={`${k} kaynağını çıkar`}>×</button>
          </span>
        ))}
        {durum.kaynaklar.length === 0 && <span className="ipucu">Kaynak seçilmedi — önemli klasörler taranır.</span>}
        <button className="cip ekle" onClick={kaynakEkle}>+ Kaynak ekle</button>
      </div>

      {ilerleme && (
        <div className="tarama-paneli">
          <div className="ilerleme-cubugu belirsiz"><span /></div>
          <p>
            {ilerleme.taranan.toLocaleString('tr-TR')} klasör tarandı · {ilerleme.bulunan.toLocaleString('tr-TR')} dosya bulundu
          </p>
          <small className="ipucu tek-satir">{ilerleme.aktifKlasor}</small>
        </div>
      )}

      {hata && <div className="hata">{hata}</div>}
      {ozet?.kesildi && !ilerleme && (
        <p className="ipucu">Tarama tamamlanmadı (durduruldu veya dosya limiti aşıldı). Sonuçlar kısmi olabilir.</p>
      )}

      <div className="kategori-izgara">
        {kartlar.map((k) => {
          const b = ozet!.kategoriler[k.id]!
          return (
            <button key={k.id} className="kategori-kart" style={{ '--kategori-renk': k.renk } as React.CSSProperties} onClick={() => setKategori(k.id)}>
              <span className="kategori-ikon">{k.ikon}</span>
              <strong>{k.ad}</strong>
              <small>{b.adet.toLocaleString('tr-TR')} dosya · {boyutBicimle(b.boyut)}</small>
              {oncelikli.has(k.id) && <span className="rozet">Senin için</span>}
            </button>
          )
        })}
      </div>
      {ozet && kartlar.length === 0 && !ilerleme && <p className="bos-durum">Seçili kaynaklarda dosya bulunamadı.</p>}
    </section>
  )
}

function KategoriGorunumu({ kategori, geri }: { kategori: KategoriId; geri: () => void }) {
  const k = KATEGORI_HARITASI[kategori]
  const [arama, setArama] = useState('')
  const [siralama, setSiralama] = useState<NonNullable<DosyaSorgusu['siralama']>>('tarih')
  const [sonuc, setSonuc] = useState<{ toplam: number; dosyalar: DosyaKaydi[] } | null>(null)
  const [hata, setHata] = useState<string | null>(null)

  useEffect(() => {
    const z = setTimeout(() => window.workspace.dosyaSorgula({ kategori, arama, siralama }).then(setSonuc), 150)
    return () => clearTimeout(z)
  }, [kategori, arama, siralama])

  const ac = (yol: string) => window.workspace.dosyaAc(yol).catch((e) => setHata(hataMesaji(e)))

  return (
    <section>
      <div className="arac-cubugu">
        <button className="dugme ikon" onClick={geri} title="Geri">←</button>
        <h2 className="arac-baslik">{k.ikon} {k.ad}</h2>
        <input className="arama" placeholder="Dosya adında ara…" value={arama} onChange={(e) => setArama(e.target.value)} autoFocus />
        <select value={siralama} onChange={(e) => setSiralama(e.target.value as typeof siralama)}>
          <option value="tarih">En yeni</option>
          <option value="ad">Ada göre</option>
          <option value="boyut">En büyük</option>
        </select>
      </div>
      {hata && <div className="hata">{hata}</div>}

      <div className="dosya-tablo">
        <div className="tablo-baslik">
          <span>Ad</span><span>Klasör</span><span>Boyut</span><span>Değiştirilme</span>
        </div>
        {sonuc?.dosyalar.map((d) => (
          <div key={d.yol} className="tablo-satir" onDoubleClick={() => ac(d.yol)} title={d.yol}>
            <span className="hucre-ad">
              <span className="dosya-ikon">{k.ikon}</span>
              <span className="ad-metin">{d.ad}</span>
            </span>
            <span className="soluk tek-satir">
              <button className="baglanti" onClick={() => window.workspace.klasordeGoster(d.yol)}>
                {sonParca(ustKlasor(d.yol) ?? d.yol)}
              </button>
            </span>
            <span className="soluk">{boyutBicimle(d.boyut)}</span>
            <span className="soluk">{tarihBicimle(d.degistirilme)}</span>
          </div>
        ))}
        {sonuc && sonuc.toplam === 0 && <p className="bos-durum">Eşleşen dosya yok</p>}
      </div>
      {sonuc && sonuc.toplam > sonuc.dosyalar.length && (
        <p className="ipucu">İlk {sonuc.dosyalar.length} / {sonuc.toplam.toLocaleString('tr-TR')} dosya gösteriliyor. Daraltmak için ara.</p>
      )}
    </section>
  )
}
