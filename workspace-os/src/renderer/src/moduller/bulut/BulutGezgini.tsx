import { useCallback, useEffect, useState } from 'react'
import { SAGLAYICI_BILGISI, type BulutOgesi, type BulutSaglayici } from '@shared/bulut'
import { KATEGORI_HARITASI, kategoriBul } from '@shared/kategoriler'
import { editorBul } from '@shared/ofis'
import { boyutBicimle, hataMesaji, tarihBicimle } from '@core/bicim'
import { useKabuk } from '@core/kabukBaglami'
import AdGirdisi from '../dosyalar/AdGirdisi'

const GOOGLE_IKON = { belge: '📄', tablo: '📊', sunum: '📽️', diger: '🌐' } as const
type Duzenleme = { tur: 'yeni' } | { tur: 'ad'; id: string } | null

// Bulut hesabındaki klasörlerde gezinme: aç (Workspace editöründe, değişiklikler geri yüklenir),
// indir, yükle (düğme veya sürükle-bırak), yeni klasör, yeniden adlandır, web'de aç.
export default function BulutGezgini({ saglayici, kapat }: { saglayici: BulutSaglayici; kapat: () => void }) {
  const { belgeAc } = useKabuk()
  const [yol, setYol] = useState<{ id: string | null; ad: string }[]>([{ id: null, ad: SAGLAYICI_BILGISI[saglayici].ad }])
  const [ogeler, setOgeler] = useState<BulutOgesi[] | null>(null)
  const [secili, setSecili] = useState<string | null>(null)
  const [duzenleme, setDuzenleme] = useState<Duzenleme>(null)
  const [mesul, setMesul] = useState<string | null>(null) // devam eden işlem
  const [bilgi, setBilgi] = useState<string | null>(null)
  const [hata, setHata] = useState<string | null>(null)
  const [surukleniyor, setSurukleniyor] = useState(false)
  const klasorId = yol[yol.length - 1].id

  const yenile = useCallback(async () => {
    setOgeler(null)
    try {
      setOgeler(await window.workspace.bulutListele(saglayici, klasorId))
      setHata(null)
    } catch (e) {
      setOgeler([])
      setHata(hataMesaji(e))
    }
  }, [saglayici, klasorId])

  useEffect(() => {
    yenile()
    setSecili(null)
  }, [yenile])

  const islem = async (etiket: string, fn: () => Promise<unknown>, sonra = true) => {
    setMesul(etiket)
    setHata(null)
    setBilgi(null)
    try {
      await fn()
    } catch (e) {
      setHata(hataMesaji(e))
    } finally {
      setMesul(null)
      setDuzenleme(null)
    }
    if (sonra) await yenile()
  }

  const ac = (o: BulutOgesi) => {
    if (o.klasor) return setYol((y) => [...y, { id: o.id, ad: o.ad }])
    if (o.googleBicimi === 'diger') return o.webUrl && window.workspace.webAc(o.webUrl).catch((e) => setHata(hataMesaji(e)))
    islem(`"${o.ad}" açılıyor…`, async () => {
      const yerel = await window.workspace.bulutAc(saglayici, o, klasorId)
      // Workspace editöründe açılamayan türler sistem uygulamasında açılır (değişiklikleri buluta geri yüklenmez)
      if (editorBul(yerel)) await belgeAc(yerel)
      else await window.workspace.dosyaAc(yerel)
    }, false)
  }

  const indir = (o: BulutOgesi) =>
    islem(`"${o.ad}" indiriliyor…`, async () => {
      const yerel = await window.workspace.bulutIndir(saglayici, o)
      setBilgi(`İndirildi: ${yerel}`)
    }, false).then(() => undefined)

  const yukle = (yollar?: string[]) =>
    islem('Yükleniyor…', async () => {
      const r = await window.workspace.bulutYukle(saglayici, klasorId, yollar)
      if (r.length) setBilgi(`${r.length} dosya yüklendi`)
    })

  const seciliOge = ogeler?.find((o) => o.id === secili)

  return (
    <section className="gezgin">
      <div className="arac-cubugu">
        <button className="dugme ikon" onClick={() => (yol.length > 1 ? setYol((y) => y.slice(0, -1)) : kapat())} title="Geri">←</button>
        <nav className="yol-cubugu">
          {yol.map((p, i) => (
            <span key={`${p.id}-${i}`}>
              <button className="yol-parca" onClick={() => setYol((y) => y.slice(0, i + 1))}>
                {i === 0 && SAGLAYICI_BILGISI[saglayici].ikon} {p.ad}
              </button>
              {i < yol.length - 1 && <span className="yol-ayrac">›</span>}
            </span>
          ))}
        </nav>
        <button className="dugme ikon" onClick={yenile} title="Yenile">⟳</button>
      </div>

      <div className="arac-cubugu ikincil">
        <button className="dugme kucuk" onClick={() => yukle()}>⬆ Yükle…</button>
        <button className="dugme kucuk" onClick={() => setDuzenleme({ tur: 'yeni' })}>+ Yeni klasör</button>
        <button className="dugme kucuk" disabled={!seciliOge} onClick={() => seciliOge && setDuzenleme({ tur: 'ad', id: seciliOge.id })}>Yeniden adlandır</button>
        <button className="dugme kucuk" disabled={!seciliOge || seciliOge.klasor} onClick={() => seciliOge && indir(seciliOge)}>⬇ İndir</button>
        <button className="dugme kucuk" disabled={!seciliOge?.webUrl} onClick={() => seciliOge?.webUrl && window.workspace.webAc(seciliOge.webUrl).catch((e) => setHata(hataMesaji(e)))}>🌐 Web'de aç</button>
        {mesul && <span className="soluk"><span className="donen-halka kucuk satir-ici" /> {mesul}</span>}
      </div>

      {hata && <div className="hata" role="alert">{hata}</div>}
      {bilgi && <div className="bilgi-kutusu">{bilgi}</div>}

      <div
        className={`dosya-tablo ${surukleniyor ? 'birakma' : ''}`}
        onDragOver={(e) => {
          if (!e.dataTransfer.types.includes('Files')) return
          e.preventDefault()
          setSurukleniyor(true)
        }}
        onDragLeave={() => setSurukleniyor(false)}
        onDrop={(e) => {
          e.preventDefault()
          setSurukleniyor(false)
          const yollar = [...e.dataTransfer.files].map((f) => window.workspace.dosyaYolu(f)).filter(Boolean)
          if (yollar.length) yukle(yollar)
        }}
      >
        <div className="tablo-baslik"><span>Ad</span><span>Tür</span><span>Boyut</span><span>Değiştirilme</span></div>

        {duzenleme?.tur === 'yeni' && (
          <div className="tablo-satir secili">
            <span className="hucre-ad">
              <span className="dosya-ikon">📁</span>
              <AdGirdisi baslangic="Yeni klasör" onay={(ad) => islem('Klasör oluşturuluyor…', () => window.workspace.bulutKlasorOlustur(saglayici, klasorId, ad))} iptal={() => setDuzenleme(null)} />
            </span>
          </div>
        )}

        {ogeler === null && <p className="bos-durum"><span className="donen-halka kucuk satir-ici" /> Yükleniyor…</p>}
        {ogeler?.map((o) => {
          const kategori = o.klasor ? null : KATEGORI_HARITASI[kategoriBul(o.ad)]
          const ikon = o.klasor ? '📁' : o.googleBicimi ? GOOGLE_IKON[o.googleBicimi] : kategori!.ikon
          return (
            <div
              key={o.id}
              className={`tablo-satir ${secili === o.id ? 'secili' : ''}`}
              onClick={() => setSecili(o.id)}
              onDoubleClick={() => ac(o)}
              title={o.klasor ? undefined : 'Çift tık: aç'}
            >
              <span className="hucre-ad">
                <span className="dosya-ikon">{ikon}</span>
                {duzenleme?.tur === 'ad' && duzenleme.id === o.id ? (
                  <AdGirdisi baslangic={o.ad} dosya={!o.klasor} onay={(ad) => islem('Yeniden adlandırılıyor…', () => window.workspace.bulutYenidenAdlandir(saglayici, o.id, ad))} iptal={() => setDuzenleme(null)} />
                ) : (
                  <span className="ad-metin">{o.ad}</span>
                )}
              </span>
              <span className="soluk">{o.klasor ? 'Klasör' : o.googleBicimi ? 'Google biçimi' : kategori!.ad}</span>
              <span className="soluk">{o.klasor || o.googleBicimi ? '' : boyutBicimle(o.boyut)}</span>
              <span className="soluk">{o.degistirilme ? tarihBicimle(o.degistirilme) : ''}</span>
            </div>
          )
        })}
        {ogeler?.length === 0 && !hata && <p className="bos-durum">Bu klasör boş — dosyaları buraya sürükleyerek yükleyebilirsin</p>}
      </div>
      <footer className="durum-cubugu">
        Word, Excel, PowerPoint ve metin dosyaları Workspace'te açılır; kaydettiğin değişiklikler otomatik olarak buluta geri yüklenir.
      </footer>
    </section>
  )
}
