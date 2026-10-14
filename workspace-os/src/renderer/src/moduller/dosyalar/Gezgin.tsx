import { useCallback, useEffect, useState, type DragEvent } from 'react'
import type { KlasorOgesi } from '@shared/tipler'
import { KATEGORI_HARITASI } from '@shared/kategoriler'
import { boyutBicimle, hataMesaji, tarihBicimle } from '@core/bicim'
import { ustKlasor, yolParcalari } from '@core/yol'
import { useKabuk } from '@core/kabukBaglami'
import AdGirdisi from './AdGirdisi'

const SURUKLEME_TURU = 'application/x-workspace-yollar'

type Duzenleme = { tur: 'yeni' } | { tur: 'ad'; yol: string } | null

// Klasör gezgini: gezinme, yeni klasör, yeniden adlandırma, taşıma (düğme veya sürükle-bırak), açma.
export default function Gezgin({ baslangic, kapat }: { baslangic: string; kapat: () => void }) {
  const { belgeAc } = useKabuk()
  const [yol, setYol] = useState(baslangic)
  const [gecmis, setGecmis] = useState<string[]>([])
  const [ogeler, setOgeler] = useState<KlasorOgesi[]>([])
  const [secili, setSecili] = useState<Set<string>>(new Set())
  const [duzenleme, setDuzenleme] = useState<Duzenleme>(null)
  const [birakmaHedefi, setBirakmaHedefi] = useState<string | null>(null)
  const [gizliGoster, setGizliGoster] = useState(false)
  const [hata, setHata] = useState<string | null>(null)
  const [yukleniyor, setYukleniyor] = useState(true)

  const yenile = useCallback(async () => {
    setYukleniyor(true)
    try {
      setOgeler(await window.workspace.klasorListele(yol, gizliGoster))
    } catch (e) {
      setOgeler([])
      setHata(hataMesaji(e))
    } finally {
      setYukleniyor(false)
    }
  }, [yol, gizliGoster])

  useEffect(() => {
    yenile()
  }, [yenile])

  const git = (yeni: string) => {
    setGecmis((g) => [...g, yol])
    setYol(yeni)
    setSecili(new Set())
    setDuzenleme(null)
    setHata(null)
  }
  const geri = () => {
    const onceki = gecmis[gecmis.length - 1]
    if (!onceki) return kapat()
    setGecmis((g) => g.slice(0, -1))
    setYol(onceki)
    setSecili(new Set())
    setHata(null)
  }

  // Tüm dosya işlemleri aynı kalıbı izler: çalıştır → hata göster → listeyi yenile
  const islem = async (fn: () => Promise<unknown>) => {
    try {
      await fn()
      setHata(null)
    } catch (e) {
      setHata(hataMesaji(e))
    }
    setDuzenleme(null)
    await yenile()
  }

  const ac = (o: KlasorOgesi) => (o.klasor ? git(o.yol) : islem(() => belgeAc(o.yol)))

  const tikla = (o: KlasorOgesi, e: React.MouseEvent) => {
    setSecili((s) => {
      if (!(e.ctrlKey || e.metaKey)) return new Set([o.yol])
      const y = new Set(s)
      y.has(o.yol) ? y.delete(o.yol) : y.add(o.yol)
      return y
    })
  }

  const seciliListe = [...secili]
  const tekSecili = seciliListe.length === 1 ? ogeler.find((o) => o.yol === seciliListe[0]) : undefined

  const tasiDiyalog = async () => {
    const hedef = await window.workspace.klasorSec()
    if (hedef) await islem(() => window.workspace.tasi(seciliListe, hedef))
    setSecili(new Set())
  }

  // ── Sürükle-bırak: öğeleri bir klasör satırına veya üst yol parçasına bırak ──
  const surukle = (o: KlasorOgesi, e: DragEvent) => {
    const yollar = secili.has(o.yol) ? seciliListe : [o.yol]
    e.dataTransfer.setData(SURUKLEME_TURU, JSON.stringify(yollar))
    e.dataTransfer.effectAllowed = 'move'
  }
  const birakmaProps = (hedef: string) => ({
    onDragOver: (e: DragEvent) => {
      if (!e.dataTransfer.types.includes(SURUKLEME_TURU)) return
      e.preventDefault()
      setBirakmaHedefi(hedef)
    },
    onDragLeave: () => setBirakmaHedefi((h) => (h === hedef ? null : h)),
    onDrop: (e: DragEvent) => {
      e.preventDefault()
      setBirakmaHedefi(null)
      const yollar: string[] = JSON.parse(e.dataTransfer.getData(SURUKLEME_TURU) || '[]').filter((y: string) => y !== hedef)
      if (yollar.length) islem(() => window.workspace.tasi(yollar, hedef)).then(() => setSecili(new Set()))
    },
  })

  const klavye = (e: React.KeyboardEvent) => {
    if (duzenleme) return
    if (e.key === 'F2' && tekSecili) setDuzenleme({ tur: 'ad', yol: tekSecili.yol })
    if (e.key === 'Enter' && tekSecili) ac(tekSecili)
    if (e.key === 'Backspace') {
      const ust = ustKlasor(yol)
      if (ust) git(ust)
    }
  }

  const ust = ustKlasor(yol)

  return (
    <section className="gezgin" tabIndex={0} onKeyDown={klavye}>
      <div className="arac-cubugu">
        <button className="dugme ikon" onClick={geri} title="Geri">←</button>
        <button className="dugme ikon" onClick={() => ust && git(ust)} disabled={!ust} title="Üst klasör">↑</button>
        <nav className="yol-cubugu">
          {yolParcalari(yol).map((p, i, dizi) => (
            <span key={p.yol}>
              <button
                className={`yol-parca ${birakmaHedefi === p.yol ? 'birakma' : ''}`}
                onClick={() => p.yol !== yol && git(p.yol)}
                {...birakmaProps(p.yol)}
              >
                {p.ad}
              </button>
              {i < dizi.length - 1 && <span className="yol-ayrac">›</span>}
            </span>
          ))}
        </nav>
        <button className="dugme ikon" onClick={yenile} title="Yenile">⟳</button>
      </div>

      <div className="arac-cubugu ikincil">
        <button className="dugme kucuk" onClick={() => setDuzenleme({ tur: 'yeni' })}>+ Yeni klasör</button>
        <button className="dugme kucuk" disabled={!tekSecili} onClick={() => tekSecili && setDuzenleme({ tur: 'ad', yol: tekSecili.yol })}>
          Yeniden adlandır
        </button>
        <button className="dugme kucuk" disabled={!secili.size} onClick={tasiDiyalog}>Taşı…</button>
        <button className="dugme kucuk" disabled={!tekSecili} onClick={() => tekSecili && ac(tekSecili)}>Aç</button>
        <button className="dugme kucuk" disabled={!tekSecili} onClick={() => tekSecili && window.workspace.klasordeGoster(tekSecili.yol)}>
          Gezginde göster
        </button>
        <label className="onay-kutusu">
          <input type="checkbox" checked={gizliGoster} onChange={(e) => setGizliGoster(e.target.checked)} />
          Gizli dosyalar
        </label>
      </div>

      {hata && <div className="hata" role="alert">{hata}</div>}

      <div className="dosya-tablo" onClick={(e) => e.target === e.currentTarget && setSecili(new Set())}>
        <div className="tablo-baslik">
          <span>Ad</span><span>Tür</span><span>Boyut</span><span>Değiştirilme</span>
        </div>

        {duzenleme?.tur === 'yeni' && (
          <div className="tablo-satir secili">
            <span className="hucre-ad">
              <span className="dosya-ikon">📁</span>
              <AdGirdisi
                baslangic="Yeni klasör"
                onay={(ad) => islem(() => window.workspace.klasorOlustur(yol, ad))}
                iptal={() => setDuzenleme(null)}
              />
            </span>
          </div>
        )}

        {ogeler.map((o) => {
          const kategori = o.kategori ? KATEGORI_HARITASI[o.kategori] : null
          const duzenleniyor = duzenleme?.tur === 'ad' && duzenleme.yol === o.yol
          return (
            <div
              key={o.yol}
              className={`tablo-satir ${secili.has(o.yol) ? 'secili' : ''} ${birakmaHedefi === o.yol ? 'birakma' : ''}`}
              draggable={!duzenleniyor}
              onDragStart={(e) => surukle(o, e)}
              onClick={(e) => tikla(o, e)}
              onDoubleClick={() => ac(o)}
              {...(o.klasor ? birakmaProps(o.yol) : {})}
            >
              <span className="hucre-ad">
                <span className="dosya-ikon">{o.klasor ? '📁' : kategori?.ikon}</span>
                {duzenleniyor ? (
                  <AdGirdisi
                    baslangic={o.ad}
                    dosya={!o.klasor}
                    onay={(ad) => islem(() => window.workspace.yenidenAdlandir(o.yol, ad))}
                    iptal={() => setDuzenleme(null)}
                  />
                ) : (
                  <span className="ad-metin">{o.ad}</span>
                )}
              </span>
              <span className="soluk">{o.klasor ? 'Klasör' : kategori?.ad}</span>
              <span className="soluk">{o.klasor ? '' : boyutBicimle(o.boyut)}</span>
              <span className="soluk">{tarihBicimle(o.degistirilme)}</span>
            </div>
          )
        })}

        {!yukleniyor && !hata && ogeler.length === 0 && duzenleme?.tur !== 'yeni' && (
          <p className="bos-durum">Bu klasör boş</p>
        )}
      </div>

      <footer className="durum-cubugu">
        {ogeler.length} öğe{secili.size > 0 && ` · ${secili.size} seçili`} · Öğeleri taşımak için bir klasöre sürükle
      </footer>
    </section>
  )
}
