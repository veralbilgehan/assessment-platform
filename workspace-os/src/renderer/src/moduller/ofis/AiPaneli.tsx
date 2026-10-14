import { useCallback, useEffect, useRef, useState } from 'react'
import type { EditorTuru } from '@shared/ofis'
import { AI_MODELLERI, VARSAYILAN_AI_MODELI, sablonuDoldur, type AiCikti, type AiDurumu, type AiOnerisi, type AiSonucu, type IstemSablonu } from '@shared/ai'
import type { Tercihler } from '@shared/tipler'
import { aktifEditor, editorDinle, type EditorKoprusu, type GeriAl } from '@core/editorKoprusu'
import { etiketsiz } from '@core/htmlTemizle'
import { hataMesaji } from '@core/bicim'
import { useKabuk } from '@core/kabukBaglami'

interface Calisma {
  id: string
  cikti: AiCikti
  akis: string
  sonuc?: AiSonucu
  eklendi?: boolean
  geriAl?: GeriAl
}

const CIKTI_ETIKETI: Record<AiCikti, string> = { ekle: 'Belgeye ekler', degistir: 'Seçimin yerine koyar', yanit: 'Panelde yanıtlar' }

// Editörün sağındaki yapay zeka paneli. İçerik editör köprüsü üzerinden okunur ve belgeye yazılır.
export default function AiPaneli({ tur, tercihler, baslangicIstemi, kapat }: {
  tur: EditorTuru
  tercihler: Tercihler
  baslangicIstemi?: string
  kapat: () => void
}) {
  const { modulAc } = useKabuk()
  const [durum, setDurum] = useState<AiDurumu | null>(null)
  const [sablonlar, setSablonlar] = useState<IstemSablonu[]>([])
  const [oneriler, setOneriler] = useState<AiOnerisi[] | null>(null)
  const [oneriYukleniyor, setOneriYukleniyor] = useState(false)
  const [secilen, setSecilen] = useState<IstemSablonu | null>(null)
  const [girdi, setGirdi] = useState('')
  const [calisma, setCalisma] = useState<Calisma | null>(null)
  const [hata, setHata] = useState<string | null>(null)
  const [kopru, setKopru] = useState<EditorKoprusu | null>(aktifEditor())
  const girdiRef = useRef<HTMLTextAreaElement>(null)
  const baslangicCalisti = useRef(false)
  const otomatikYapistir = tercihler.aiOtomatikYapistir !== false
  const model = AI_MODELLERI.find((m) => m.id === (tercihler.aiModel || VARSAYILAN_AI_MODELI))

  // Editör köprüsünü panelden önce kaydetmiş olabilir: abone olurken mevcut durumu da oku
  useEffect(() => {
    const kapat = editorDinle(setKopru)
    setKopru(aktifEditor())
    return kapat
  }, [])
  useEffect(() => {
    window.workspace.aiDurum().then(setDurum)
    window.workspace.aiIstemler().then((l) => setSablonlar(l.filter((s) => s.editor === tur)))
  }, [tur])

  // Akış parçaları
  useEffect(
    () =>
      window.workspace.olayDinle('ai:parca', ({ id, metin }) =>
        setCalisma((c) => (c && c.id === id && !c.sonuc ? { ...c, akis: c.akis + metin } : c)),
      ),
    [],
  )

  const baglam = (k: EditorKoprusu) => ({ editor: tur, belgeAdi: k.belgeAdi, belge: k.metinAl(), secim: k.seciliMetin() || undefined, konum: k.konum?.() })

  const onerileriGetir = useCallback(async () => {
    const k = aktifEditor()
    if (!k) return
    setOneriYukleniyor(true)
    try {
      setOneriler(await window.workspace.aiOneriler(baglam(k)))
    } catch (e) {
      setHata(hataMesaji(e))
    } finally {
      setOneriYukleniyor(false)
    }
  }, [tur])

  // Öneriler açıksa panel açıldığında bir kez getirilir (Office Agent ile açıldıysa gerek yok)
  useEffect(() => {
    if (durum?.anahtarVar && kopru && tercihler.aiOnerileriAcik && oneriler === null && !baslangicIstemi) onerileriGetir()
  }, [durum, kopru])

  const uygula = (k: EditorKoprusu, sonuc: AiSonucu, cikti: AiCikti): GeriAl | undefined => {
    const icerik = { html: sonuc.html, metin: sonuc.metin, tablo: sonuc.tablo, slaytlar: sonuc.slaytlar }
    return (cikti === 'degistir' && k.degistir ? k.degistir(icerik) : k.ekle(icerik)) || undefined
  }

  const calistir = async (talimat: string, cikti: AiCikti) => {
    const k = aktifEditor()
    if (!k || !talimat.trim()) return
    const b = baglam(k)
    if (cikti === 'degistir' && !b.secim) cikti = 'ekle' // seçim yoksa imlecin olduğu yere eklenir
    const id = crypto.randomUUID()
    setHata(null)
    setCalisma({ id, cikti, akis: '' })
    try {
      const sonuc = await window.workspace.aiUret({ id, talimat, cikti, ...b })
      const otomatik = otomatikYapistir && cikti !== 'yanit'
      const geriAl = otomatik ? uygula(k, sonuc, cikti) : undefined
      setCalisma({ id, cikti, akis: '', sonuc, eklendi: otomatik, geriAl })
      setSecilen(null)
      setGirdi('')
    } catch (e) {
      const m = hataMesaji(e)
      setCalisma(null)
      if (m !== 'İptal edildi') setHata(m)
    }
  }

  // Office Agent: yeni belge bir istemle açıldıysa editör hazır olunca otomatik çalıştır
  useEffect(() => {
    if (!baslangicIstemi || baslangicCalisti.current || !kopru || !durum?.anahtarVar) return
    baslangicCalisti.current = true
    calistir(baslangicIstemi, 'ekle')
  }, [kopru, durum])

  const sablonSec = (s: IstemSablonu) => {
    if (s.girdiEtiketi || s.sablon.includes('{girdi}')) {
      setSecilen(s)
      requestAnimationFrame(() => girdiRef.current?.focus())
    } else {
      calistir(sablonuDoldur(s.sablon, { secim: aktifEditor()?.seciliMetin() }), s.cikti)
    }
  }

  const gonder = () => {
    if (secilen) calistir(sablonuDoldur(secilen.sablon, { girdi, secim: aktifEditor()?.seciliMetin() }), secilen.cikti)
    else calistir(girdi, 'ekle')
  }

  const calisiyor = !!calisma && !calisma.sonuc

  if (durum && !durum.anahtarVar) {
    return (
      <aside className="ai-paneli">
        <PanelBaslik kapat={kapat} />
        <div className="ai-bos">
          <p>Yapay zekayı kullanmak için bir Claude API anahtarı ekle.</p>
          <button className="dugme birincil" onClick={() => modulAc('ai')}>Yapay Zeka ayarları</button>
        </div>
      </aside>
    )
  }

  return (
    <aside className="ai-paneli" aria-label="Yapay zeka paneli">
      <PanelBaslik kapat={kapat} model={model?.ad} />

      {tercihler.aiOnerileriAcik && (
        <section className="ai-bolum">
          <div className="ai-bolum-baslik">
            <h4>💡 Öneriler</h4>
            <button className="dugme kucuk metin" onClick={onerileriGetir} disabled={oneriYukleniyor || calisiyor}>
              {oneriYukleniyor ? 'Düşünüyor…' : oneriler ? 'Yenile' : 'Öneri al'}
            </button>
          </div>
          {oneriler?.map((o, i) => (
            <button key={i} className="ai-oneri" disabled={calisiyor} onClick={() => calistir(o.talimat, o.cikti)} title={o.talimat}>
              <strong>{o.baslik}</strong>
              <small>{o.aciklama}</small>
            </button>
          ))}
          {oneriler?.length === 0 && <p className="ipucu">Şu an öneri yok.</p>}
        </section>
      )}

      <section className="ai-bolum">
        <h4>Hızlı işlemler</h4>
        <div className="ai-sablonlar">
          {sablonlar.map((s) => (
            <button
              key={s.id}
              className={`cip ${secilen?.id === s.id ? 'secili' : ''}`}
              disabled={calisiyor}
              onClick={() => sablonSec(s)}
              title={`${s.sablon}\n→ ${CIKTI_ETIKETI[s.cikti]}`}
            >
              {s.ikon} {s.ad}
            </button>
          ))}
        </div>
      </section>

      <section className="ai-bolum">
        {secilen && (
          <div className="ai-secilen">
            {secilen.ikon} {secilen.ad}
            <button className="baglanti" onClick={() => setSecilen(null)}>vazgeç</button>
          </div>
        )}
        <textarea
          ref={girdiRef}
          className="ai-girdi"
          rows={3}
          value={girdi}
          disabled={calisiyor}
          placeholder={secilen?.girdiEtiketi ?? 'Ne yapmamı istersin? (ör. "Giriş paragrafı yaz")'}
          onChange={(e) => setGirdi(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter' && !e.shiftKey) {
              e.preventDefault()
              gonder()
            }
          }}
          aria-label="Yapay zeka isteği"
        />
        <div className="ai-gonder">
          <small className="soluk">{secilen ? CIKTI_ETIKETI[secilen.cikti] : 'Enter: gönder · Shift+Enter: yeni satır'}</small>
          {calisiyor ? (
            <button className="dugme kucuk" onClick={() => window.workspace.aiIptal(calisma!.id)}>■ Durdur</button>
          ) : (
            <button className="dugme kucuk birincil" onClick={gonder} disabled={!girdi.trim()}>Gönder</button>
          )}
        </div>
      </section>

      {hata && <div className="hata" role="alert">{hata}</div>}

      {calisma && (
        <section className="ai-bolum ai-sonuc">
          {calisiyor ? (
            <>
              <div className="ai-yaziyor"><span className="donen-halka kucuk" /> Yazıyor…</div>
              <AkisOnizleme tur={tur} cikti={calisma.cikti} akis={calisma.akis} />
            </>
          ) : (
            <SonucGorunumu
              tur={tur}
              calisma={calisma}
              ekle={(cikti) => {
                const k = aktifEditor()
                if (k && calisma.sonuc) setCalisma({ ...calisma, eklendi: true, geriAl: uygula(k, calisma.sonuc, cikti) })
              }}
              geriAl={() => {
                calisma.geriAl?.()
                setCalisma({ ...calisma, eklendi: false, geriAl: undefined })
              }}
            />
          )}
        </section>
      )}
    </aside>
  )
}

function PanelBaslik({ kapat, model }: { kapat: () => void; model?: string }) {
  return (
    <header className="ai-baslik">
      <strong>✨ Yapay Zeka</strong>
      {model && <small className="soluk">{model}</small>}
      <span className="bosluk" />
      <button className="dugme ikon" onClick={kapat} title="Paneli kapat (Ctrl+J)">×</button>
    </header>
  )
}

function AkisOnizleme({ tur, cikti, akis }: { tur: EditorTuru; cikti: AiCikti; akis: string }) {
  const yapisal = cikti !== 'yanit' && (tur === 'excel' || tur === 'sunum')
  if (yapisal) return <p className="ipucu">{tur === 'excel' ? 'Tablo' : 'Slaytlar'} hazırlanıyor… ({akis.length.toLocaleString('tr-TR')} karakter)</p>
  return <div className="ai-akis">{cikti !== 'yanit' && tur === 'word' ? etiketsiz(akis) : akis}</div>
}

function SonucGorunumu({ tur, calisma, ekle, geriAl }: {
  tur: EditorTuru
  calisma: Calisma
  ekle: (cikti: AiCikti) => void
  geriAl: () => void
}) {
  const s = calisma.sonuc!
  const ozet = s.slaytlar
    ? `${s.slaytlar.length} slayt`
    : s.tablo
      ? `${s.tablo.length} satır × ${Math.max(...s.tablo.map((r) => r.length))} sütun`
      : null
  const kopyala = () => navigator.clipboard.writeText(s.metin ?? (s.html ? etiketsiz(s.html) : s.tablo?.map((r) => r.join('\t')).join('\n') ?? ''))

  return (
    <>
      {calisma.eklendi ? (
        <div className="ai-eklendi">
          ✓ {calisma.cikti === 'degistir' ? 'Seçimin yerine konuldu' : 'Belgeye eklendi'}
          {ozet && <span className="soluk"> · {ozet}</span>}
          {calisma.geriAl && <button className="dugme kucuk" onClick={geriAl}>↶ Geri al</button>}
        </div>
      ) : (
        <>
          {s.metin && <div className="ai-akis">{s.metin}</div>}
          {s.html && <div className="ai-akis">{etiketsiz(s.html)}</div>}
          {s.slaytlar && <ol className="ai-liste">{s.slaytlar.map((x, i) => <li key={i}>{x.baslik}</li>)}</ol>}
          {s.tablo && (
            <table className="ai-tablo"><tbody>{s.tablo.slice(0, 8).map((r, i) => <tr key={i}>{r.map((v, j) => <td key={j}>{v}</td>)}</tr>)}</tbody></table>
          )}
          <div className="ai-eylemler">
            <button className="dugme kucuk birincil" onClick={() => ekle('ekle')}>Belgeye ekle</button>
            {(tur === 'word' || tur === 'metin') && calisma.cikti !== 'yanit' && (
              <button className="dugme kucuk" onClick={() => ekle('degistir')}>Seçimin yerine koy</button>
            )}
            <button className="dugme kucuk" onClick={kopyala}>Kopyala</button>
          </div>
        </>
      )}
      {s.aciklama && <p className="ipucu">{s.aciklama}</p>}
    </>
  )
}
