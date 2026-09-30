import { useCallback, useEffect, useState } from 'react'
import type { DosyaSorgusu, ProjeStatusu, SorguSonucu } from '@shared/tipler'
import { KATEGORI_HARITASI } from '@shared/kategoriler'
import { goreliZaman, hataMesaji } from '@core/bicim'
import { sonParca, ustKlasor } from '@core/yol'
import { useKabuk } from '@core/kabukBaglami'

type Sekme = ProjeStatusu | 'tumu'

// Hem Projeler modülü hem Kütüphane kategori görünümü bu listeyi kullanır.
// statuSekmeli: "Yeni Projeler / Tamamlananlar / Tümü" sekmeleri ve statü işlemleri gösterilsin mi.
export default function ProjeListesi({ sorgu, statuSekmeli, degisti }: {
  sorgu: Omit<DosyaSorgusu, 'statu'>
  statuSekmeli: boolean
  degisti?: () => void
}) {
  const [sekme, setSekme] = useState<Sekme>(statuSekmeli ? 'yeni' : 'tumu')
  const [sonuc, setSonuc] = useState<SorguSonucu | null>(null)
  const [secili, setSecili] = useState<Set<string>>(new Set())
  const [hata, setHata] = useState<string | null>(null)
  const { belgeAc } = useKabuk()
  const sorguAnahtari = JSON.stringify(sorgu)

  const yukle = useCallback(
    () => window.workspace.dosyaSorgula({ ...sorgu, statu: sekme === 'tumu' ? undefined : sekme }).then(setSonuc),
    [sorguAnahtari, sekme],
  )

  useEffect(() => {
    const z = setTimeout(yukle, 150)
    return () => clearTimeout(z)
  }, [yukle])

  useEffect(() => setSecili(new Set()), [sorguAnahtari, sekme])

  const islem = async (fn: () => Promise<unknown>) => {
    try {
      await fn()
      setHata(null)
    } catch (e) {
      setHata(hataMesaji(e))
    }
    setSecili(new Set())
    await yukle()
    degisti?.()
  }

  const ac = (yol: string) => islem(() => belgeAc(yol))
  const statu = (yollar: string[], s: ProjeStatusu | null) => islem(() => window.workspace.statuAyarla(yollar, s))
  const koru = (yollar: string[], k: boolean) => islem(() => window.workspace.korumaAyarla(yollar, k))

  const tikla = (yol: string, e: React.MouseEvent) =>
    setSecili((s) => {
      if (!(e.ctrlKey || e.metaKey)) return new Set(s.has(yol) && s.size === 1 ? [] : [yol])
      const y = new Set(s)
      y.has(yol) ? y.delete(yol) : y.add(yol)
      return y
    })

  const seciliListe = [...secili]
  const sayilar = sonuc?.statuSayilari

  return (
    <div className="proje-listesi">
      {statuSekmeli && (
        <div className="sekmeler" role="tablist">
          {([
            ['yeni', 'Yeni Projeler', sayilar?.yeni],
            ['tamamlandi', 'Tamamlananlar', sayilar?.tamamlandi],
            ['tumu', 'Tümü', sayilar && sayilar.yeni + sayilar.tamamlandi],
          ] as const).map(([id, ad, n]) => (
            <button key={id} role="tab" aria-selected={sekme === id} className={sekme === id ? 'aktif' : ''} onClick={() => setSekme(id)}>
              {ad} {n !== undefined && <span className="sayac">{n.toLocaleString('tr-TR')}</span>}
            </button>
          ))}
        </div>
      )}

      {/* Çubuk her zaman yer kaplar: seçim değişince liste kaymasın (yoksa çift tık başka satıra düşer) */}
      {statuSekmeli && (
        <div className={`toplu-islem ${secili.size ? '' : 'bos'}`}>
          {secili.size > 0 ? (
            <>
              <span>{secili.size} seçili</span>
              <button className="dugme kucuk" onClick={() => statu(seciliListe, 'tamamlandi')}>✓ Tamamlandı</button>
              <button className="dugme kucuk" onClick={() => statu(seciliListe, 'yeni')}>↺ Yeni projelere al</button>
              <button className="dugme kucuk" onClick={() => statu(seciliListe, null)} title="Elle işaretlemeyi kaldır, tarihe göre belirlensin">Otomatik</button>
              <button className="dugme kucuk" onClick={() => koru(seciliListe, true)} title="Salt okunur yap">🔒 Koru</button>
              <button className="dugme kucuk" onClick={() => koru(seciliListe, false)}>🔓 Korumayı kaldır</button>
              <button className="dugme kucuk metin" onClick={() => setSecili(new Set())}>Temizle</button>
            </>
          ) : (
            <small>Çift tık: aç · Ctrl+tık: çoklu seçim · Seçip toplu olarak tamamla veya koru</small>
          )}
        </div>
      )}

      {hata && <div className="hata" role="alert">{hata}</div>}

      <div className={`dosya-tablo ${statuSekmeli ? 'proje-tablo' : ''}`}>
        <div className="tablo-baslik">
          <span>Ad</span><span>Klasör</span>{statuSekmeli && <span>Durum</span>}<span>Son iş</span><span />
        </div>
        {sonuc?.dosyalar.map((d) => {
          const k = KATEGORI_HARITASI[d.kategori]
          const sonIs = Math.max(d.sonAcilma ?? 0, d.degistirilme)
          return (
            <div
              key={d.yol}
              className={`tablo-satir ${secili.has(d.yol) ? 'secili' : ''}`}
              onClick={(e) => tikla(d.yol, e)}
              onDoubleClick={() => ac(d.yol)}
              title={d.yol}
            >
              <span className="hucre-ad">
                <span className="dosya-ikon">{k.ikon}</span>
                <span className="ad-metin">{d.ad}</span>
                {d.korumali && <span title="Korumalı (salt okunur)">🔒</span>}
              </span>
              <span className="soluk tek-satir">
                <button className="baglanti" onClick={(e) => { e.stopPropagation(); window.workspace.klasordeGoster(d.yol) }}>
                  {sonParca(ustKlasor(d.yol) ?? d.yol)}
                </button>
              </span>
              {statuSekmeli && (
                <span>
                  <span
                    className={`durum-hapi ${d.statu} ${d.statuOtomatik ? 'otomatik' : ''}`}
                    title={d.statuOtomatik ? 'Son değişiklik tarihine göre otomatik belirlendi' : 'Elle işaretlendi'}
                  >
                    {d.statu === 'yeni' ? 'Devam ediyor' : 'Tamamlandı'}
                  </span>
                </span>
              )}
              <span className="soluk">{goreliZaman(sonIs)}</span>
              <span className="satir-islemleri" onClick={(e) => e.stopPropagation()}>
                <button className="dugme kucuk" onClick={() => ac(d.yol)} title={d.statu === 'yeni' ? 'Kaldığın yerden devam et' : 'Aç'}>
                  {statuSekmeli && d.statu === 'yeni' ? '▶ Devam et' : 'Aç'}
                </button>
                {statuSekmeli &&
                  (d.statu === 'yeni' ? (
                    <button className="dugme kucuk" onClick={() => statu([d.yol], 'tamamlandi')} title="Tamamlandı olarak işaretle">✓</button>
                  ) : (
                    <button className="dugme kucuk" onClick={() => statu([d.yol], 'yeni')} title="Yeni projelere geri al">↺</button>
                  ))}
              </span>
            </div>
          )
        })}
        {sonuc && sonuc.toplam === 0 && (
          <p className="bos-durum">
            {sekme === 'yeni' ? 'Üzerinde çalışılan dosya yok' : sekme === 'tamamlandi' ? 'Henüz tamamlanan dosya yok' : 'Eşleşen dosya yok'}
          </p>
        )}
      </div>
      {sonuc && sonuc.toplam > sonuc.dosyalar.length && (
        <p className="ipucu">İlk {sonuc.dosyalar.length} / {sonuc.toplam.toLocaleString('tr-TR')} dosya gösteriliyor. Daraltmak için ara.</p>
      )}
    </div>
  )
}
