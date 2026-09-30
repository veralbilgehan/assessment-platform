import { useEffect, useRef, useState } from 'react'
import type { DizinOzeti, DosyaSorgusu, TaramaIlerlemesi } from '@shared/tipler'
import { KATEGORI_HARITASI, KATEGORILER, type KategoriId } from '@shared/kategoriler'
import type { ModulProps } from '@core/modulKayit'
import { boyutBicimle, hataMesaji, tarihBicimle } from '@core/bicim'
import { sonParca } from '@core/yol'
import ProjeListesi from '../projeler/ProjeListesi'

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

  // Kategoriden dönünce özet (devam eden sayıları) yenilenir — statüler değişmiş olabilir
  const kategoridenDon = () => {
    setKategori(null)
    window.workspace.dizinOzeti().then(setOzet)
  }

  if (kategori) return <KategoriGorunumu kategori={kategori} geri={kategoridenDon} />

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
              {k.projeTakibi && b.yeni > 0 && <small className="devam-eden">● {b.yeni.toLocaleString('tr-TR')} devam eden</small>}
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
  const [siralama, setSiralama] = useState<NonNullable<DosyaSorgusu['siralama']>>(k.projeTakibi ? 'son' : 'tarih')

  return (
    <section>
      <div className="arac-cubugu">
        <button className="dugme ikon" onClick={geri} title="Geri">←</button>
        <h2 className="arac-baslik">{k.ikon} {k.ad}</h2>
        <input className="arama" placeholder="Dosya adında ara…" value={arama} onChange={(e) => setArama(e.target.value)} autoFocus />
        <select value={siralama} onChange={(e) => setSiralama(e.target.value as typeof siralama)}>
          <option value="son">Son çalışılan</option>
          <option value="tarih">En yeni</option>
          <option value="ad">Ada göre</option>
          <option value="boyut">En büyük</option>
        </select>
      </div>
      {/* Modül 3: proje takibi olan kategorilerde "Yeni Projeler / Tamamlananlar" sekmeleri */}
      <ProjeListesi sorgu={{ kategori, arama, siralama }} statuSekmeli={!!k.projeTakibi} />
    </section>
  )
}
