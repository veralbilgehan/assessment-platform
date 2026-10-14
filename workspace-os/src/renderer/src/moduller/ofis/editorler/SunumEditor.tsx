import { useEffect, useRef, useState } from 'react'
import { SUNUM_TEMALARI, type Slayt, type SunumBelgesi, type SunumTemaId } from '@shared/ofis'
import { editorKaydet } from '@core/editorKoprusu'
import type { EditorProps } from './tipler'

// "Kendi PowerPoint'imiz": başlık + madde yapısında slaytlar, 4 tema, konuşmacı notları, tam ekran sunum.
export default function SunumEditor({ icerik, belgeAdi, degisti }: EditorProps<SunumBelgesi>) {
  const [belge, setBelge] = useState(icerik)
  const [aktif, setAktif] = useState(0)
  const [sunuyor, setSunuyor] = useState(false)
  const slayt = belge.slaytlar[aktif] ?? belge.slaytlar[0]
  const tema = SUNUM_TEMALARI[belge.tema]

  const guncelle = (yeni: SunumBelgesi) => {
    setBelge(yeni)
    degisti(yeni)
  }
  const slaytGuncelle = (d: Partial<Slayt>) =>
    guncelle({ ...belge, slaytlar: belge.slaytlar.map((s, i) => (i === aktif ? { ...s, ...d } : s)) })

  const slaytEkle = (yeniler: Slayt[] = [{ baslik: '', maddeler: [] }]) => {
    const s = [...belge.slaytlar]
    s.splice(aktif + 1, 0, ...yeniler)
    guncelle({ ...belge, slaytlar: s })
    setAktif(aktif + 1)
  }
  const slaytSil = () => {
    if (belge.slaytlar.length < 2) return
    guncelle({ ...belge, slaytlar: belge.slaytlar.filter((_, i) => i !== aktif) })
    setAktif(Math.max(0, aktif - 1))
  }
  const tasi = (yon: -1 | 1) => {
    const h = aktif + yon
    if (h < 0 || h >= belge.slaytlar.length) return
    const s = [...belge.slaytlar]
    ;[s[aktif], s[h]] = [s[h], s[aktif]]
    guncelle({ ...belge, slaytlar: s })
    setAktif(h)
  }

  // AI köprüsü: slaytlar aktif slaytın ardına eklenir, düz metin aktif slayta madde olur
  const kopruRef = useRef({ belge, aktif, slaytEkle, slaytGuncelle, slayt, guncelle })
  kopruRef.current = { belge, aktif, slaytEkle, slaytGuncelle, slayt, guncelle }
  useEffect(
    () =>
      editorKaydet({
        tur: 'sunum',
        belgeAdi,
        metinAl: () =>
          kopruRef.current.belge.slaytlar
            .map((s, i) => `Slayt ${i + 1}: ${s.baslik}\n${s.maddeler.map((m) => `- ${m}`).join('\n')}${s.notlar ? `\nNotlar: ${s.notlar}` : ''}`)
            .join('\n\n'),
        seciliMetin: () => '',
        konum: () => `Aktif slayt ${kopruRef.current.aktif + 1}: ${kopruRef.current.slayt.baslik || '(başlıksız)'}`,
        ekle: ({ slaytlar, metin }) => {
          const k = kopruRef.current
          const onceki = k.belge
          const tekBosSlayt = k.belge.slaytlar.length === 1 && !k.belge.slaytlar[0].baslik.trim() && !k.belge.slaytlar[0].maddeler.some((m) => m.trim())
          if (slaytlar?.length && tekBosSlayt) k.guncelle({ ...k.belge, slaytlar }) // yeni sunumun boş kapağını yer değiştir
          else if (slaytlar?.length) k.slaytEkle(slaytlar)
          else if (metin) k.slaytGuncelle({ maddeler: [...k.slayt.maddeler, ...metin.split('\n').map((m) => m.replace(/^[-•*]\s*/, '')).filter(Boolean)] })
          else return
          return () => kopruRef.current.guncelle(onceki)
        },
      }),
    [belgeAdi],
  )

  if (sunuyor) return <SunumModu belge={belge} baslangic={aktif} kapat={(i) => { setSunuyor(false); setAktif(i) }} />

  return (
    <div className="sunum">
      <div className="sunum-arac-cubugu">
        <button className="dugme kucuk" onClick={() => slaytEkle()}>+ Yeni slayt</button>
        <button className="dugme kucuk" onClick={() => tasi(-1)} disabled={aktif === 0} title="Yukarı taşı">↑</button>
        <button className="dugme kucuk" onClick={() => tasi(1)} disabled={aktif === belge.slaytlar.length - 1} title="Aşağı taşı">↓</button>
        <button className="dugme kucuk" onClick={slaytSil} disabled={belge.slaytlar.length < 2}>Sil</button>
        <span className="ayrac" />
        <label className="onay-kutusu">
          Tema
          <select value={belge.tema} onChange={(e) => guncelle({ ...belge, tema: e.target.value as SunumTemaId })}>
            {Object.entries(SUNUM_TEMALARI).map(([id, t]) => <option key={id} value={id}>{t.ad}</option>)}
          </select>
        </label>
        <span className="bosluk" />
        <button className="dugme kucuk birincil" onClick={() => setSunuyor(true)}>▶ Sun</button>
      </div>

      <div className="sunum-govde">
        <ol className="slayt-listesi">
          {belge.slaytlar.map((s, i) => (
            <li key={i}>
              <span className="slayt-no">{i + 1}</span>
              <button className={`slayt-kucuk ${i === aktif ? 'aktif' : ''}`} onClick={() => setAktif(i)} aria-label={`Slayt ${i + 1}`}>
                <SlaytGorunumu slayt={s} tema={belge.tema} />
              </button>
            </li>
          ))}
        </ol>

        <div className="slayt-calisma">
          <div className="slayt-tuval" style={temaStili(belge.tema)}>
            <span className="slayt-vurgu" style={{ background: `#${tema.vurgu}` }} />
            <input
              className="slayt-baslik-girdi"
              value={slayt.baslik}
              placeholder="Başlık eklemek için tıkla"
              onChange={(e) => slaytGuncelle({ baslik: e.target.value })}
              aria-label="Slayt başlığı"
            />
            <textarea
              className="slayt-madde-girdi"
              value={slayt.maddeler.join('\n')}
              placeholder="Madde eklemek için yaz — her satır bir madde. Boş bırakılırsa kapak slaytı olur."
              onChange={(e) => slaytGuncelle({ maddeler: e.target.value.split('\n') })}
              aria-label="Slayt maddeleri"
            />
          </div>
          <textarea
            className="slayt-notlari"
            value={slayt.notlar ?? ''}
            placeholder="Konuşmacı notları"
            onChange={(e) => slaytGuncelle({ notlar: e.target.value })}
            aria-label="Konuşmacı notları"
          />
        </div>
      </div>
    </div>
  )
}

const temaStili = (id: SunumTemaId): React.CSSProperties => {
  const t = SUNUM_TEMALARI[id]
  return { background: `#${t.arka}`, '--slayt-baslik': `#${t.baslik}`, '--slayt-metin': `#${t.metin}` } as React.CSSProperties
}

/** Salt görüntüleme: küçük resimler ve sunum modu. Yazı boyutları kapsayıcı genişliğine göre ölçeklenir (cqw). */
function SlaytGorunumu({ slayt, tema }: { slayt: Slayt; tema: SunumTemaId }) {
  const maddeler = slayt.maddeler.filter((m) => m.trim())
  const kapak = maddeler.length === 0
  return (
    <div className={`slayt-gorunum ${kapak ? 'kapak' : ''}`} style={temaStili(tema)}>
      <span className="slayt-vurgu" style={{ background: `#${SUNUM_TEMALARI[tema].vurgu}` }} />
      <div className="sg-baslik">{slayt.baslik}</div>
      {!kapak && <ul className="sg-maddeler">{maddeler.map((m, i) => <li key={i}>{m}</li>)}</ul>}
    </div>
  )
}

function SunumModu({ belge, baslangic, kapat }: { belge: SunumBelgesi; baslangic: number; kapat: (i: number) => void }) {
  const [i, setI] = useState(baslangic)
  const son = belge.slaytlar.length - 1

  useEffect(() => {
    document.documentElement.requestFullscreen?.().catch(() => {})
    const tus = (e: KeyboardEvent) => {
      if (['ArrowRight', 'ArrowDown', ' ', 'PageDown', 'Enter'].includes(e.key)) setI((x) => Math.min(son, x + 1))
      if (['ArrowLeft', 'ArrowUp', 'PageUp', 'Backspace'].includes(e.key)) setI((x) => Math.max(0, x - 1))
      if (e.key === 'Escape') setI((x) => (kapat(x), x))
    }
    window.addEventListener('keydown', tus)
    return () => {
      window.removeEventListener('keydown', tus)
      if (document.fullscreenElement) document.exitFullscreen().catch(() => {})
    }
  }, [])

  return (
    <div className="sunum-modu" onClick={() => setI((x) => Math.min(son, x + 1))}>
      <div className="sunum-modu-slayt">
        <SlaytGorunumu slayt={belge.slaytlar[i]} tema={belge.tema} />
      </div>
      <div className="sunum-modu-alt" onClick={(e) => e.stopPropagation()}>
        {i + 1} / {belge.slaytlar.length} · ← → gezin · Esc çıkış
        <button className="dugme kucuk" onClick={() => kapat(i)}>Çık</button>
      </div>
    </div>
  )
}
