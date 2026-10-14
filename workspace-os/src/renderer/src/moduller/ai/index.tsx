import { useEffect, useState } from 'react'
import { AI_MODELLERI, VARSAYILAN_AI_MODELI, type AiCikti, type AiDurumu, type IstemSablonu } from '@shared/ai'
import type { EditorTuru } from '@shared/ofis'
import { modulKaydet, type ModulProps } from '@core/modulKayit'
import { hataMesaji } from '@core/bicim'

const EDITOR_ADLARI: Record<EditorTuru, string> = { word: 'Word', excel: 'Excel', sunum: 'PowerPoint', metin: 'Not Defteri' }
const CIKTI_ADLARI: Record<AiCikti, string> = { ekle: 'Belgeye ekle', degistir: 'Seçimin yerine koy', yanit: 'Panelde yanıtla' }

// Yapay Zeka modülü: Office Agent (AI ile yeni belge), API anahtarı, model/davranış ve istem şablonları.
function YapayZeka({ durum: uygulama, durumGuncelle, modulAc }: ModulProps) {
  const [ai, setAi] = useState<AiDurumu | null>(null)
  const t = uygulama.tercihler
  const tercih = async (d: Partial<typeof t>) => durumGuncelle(await window.workspace.tercihleriKaydet({ ...t, ...d }))

  useEffect(() => {
    window.workspace.aiDurum().then(setAi)
  }, [])

  return (
    <section className="ai-modul">
      <header className="modul-baslik">
        <div>
          <h1>Yapay Zeka</h1>
          <p className="alt-metin">Claude ile belge hazırla; Word, Excel ve PowerPoint'te çalışırken öneri al.</p>
        </div>
      </header>

      <OfficeAgent hazir={!!ai?.anahtarVar} modulAc={modulAc} />
      <AnahtarAyari ai={ai} setAi={setAi} />

      <div className="ayar-karti">
        <h3>Model ve davranış</h3>
        <label className="ayar-satir">
          <span>Model</span>
          <select value={t.aiModel || VARSAYILAN_AI_MODELI} onChange={(e) => tercih({ aiModel: e.target.value })}>
            {AI_MODELLERI.map((m) => <option key={m.id} value={m.id}>{m.ad} — {m.aciklama}</option>)}
          </select>
        </label>
        <label className="anahtar-satir">
          <input type="checkbox" checked={t.aiOtomatikYapistir !== false} onChange={(e) => tercih({ aiOtomatikYapistir: e.target.checked })} />
          <span>
            <strong>Sonucu belgeye otomatik yapıştır</strong>
            <small>Kapalıysa sonuç önce panelde gösterilir, "Belgeye ekle" ile yapıştırılır. Her ekleme geri alınabilir.</small>
          </span>
        </label>
        <label className="anahtar-satir">
          <input type="checkbox" checked={t.aiOnerileriAcik} onChange={(e) => tercih({ aiOnerileriAcik: e.target.checked })} />
          <span>
            <strong>Belge açıkken öneri sun</strong>
            <small>AI paneli açıldığında belgeye özel 3 öneri getirir (küçük bir API kullanımı).</small>
          </span>
        </label>
      </div>

      <SablonDuzenleyici />
    </section>
  )
}

function OfficeAgent({ hazir, modulAc }: { hazir: boolean; modulAc: ModulProps['modulAc'] }) {
  const [tur, setTur] = useState<Exclude<EditorTuru, 'metin'>>('word')
  const [istem, setIstem] = useState('')
  const [hata, setHata] = useState<string | null>(null)

  const olustur = async () => {
    if (!istem.trim()) return
    try {
      const yol = await window.workspace.yeniBelge(tur)
      const talimat =
        tur === 'word' ? `Şu belgeyi baştan sona yaz: ${istem}`
        : tur === 'excel' ? `A1 hücresinden başlayarak şu tabloyu oluştur (başlık satırı ve gerekiyorsa formüllerle): ${istem}`
        : `Şu konuda eksiksiz bir sunum hazırla (kapak slaytı dahil, konuşmacı notlarıyla): ${istem}`
      modulAc('ofis', { yol, aiIstem: talimat })
    } catch (e) {
      setHata(hataMesaji(e))
    }
  }

  return (
    <div className="ayar-karti agent">
      <h3>🤖 Office Agent</h3>
      <p className="ipucu">Ne istediğini yaz; yeni bir belge açılır ve yapay zeka içeriği doğrudan içine yazar.</p>
      <div className="segment">
        {(['word', 'excel', 'sunum'] as const).map((x) => (
          <button key={x} className={tur === x ? 'secili' : ''} onClick={() => setTur(x)}>{EDITOR_ADLARI[x]}</button>
        ))}
      </div>
      <textarea
        className="ai-girdi"
        rows={3}
        value={istem}
        onChange={(e) => setIstem(e.target.value)}
        placeholder={
          tur === 'word' ? 'ör. Kafe açmak için 2 sayfalık bir iş planı'
          : tur === 'excel' ? 'ör. 12 aylık kişisel bütçe tablosu, gelir-gider ve toplamlar'
          : 'ör. Yeni ürün lansmanı için yönetim sunumu'
        }
        aria-label="Office Agent isteği"
      />
      {hata && <div className="hata">{hata}</div>}
      <button className="dugme birincil" disabled={!hazir || !istem.trim()} onClick={olustur}>
        {hazir ? 'Oluştur' : 'Önce API anahtarı ekle'}
      </button>
    </div>
  )
}

function AnahtarAyari({ ai, setAi }: { ai: AiDurumu | null; setAi: (d: AiDurumu) => void }) {
  const [anahtar, setAnahtar] = useState('')
  const [calisiyor, setCalisiyor] = useState(false)
  const [hata, setHata] = useState<string | null>(null)

  const kaydet = async () => {
    setCalisiyor(true)
    setHata(null)
    try {
      setAi(await window.workspace.aiAnahtarKaydet(anahtar))
      setAnahtar('')
    } catch (e) {
      setHata(hataMesaji(e))
    } finally {
      setCalisiyor(false)
    }
  }

  return (
    <div className="ayar-karti">
      <h3>Claude API anahtarı</h3>
      {ai?.anahtarVar ? (
        <p className="ai-durum iyi">
          ✓ {ai.kaynak === 'ortam' ? 'ANTHROPIC_API_KEY ortam değişkeni kullanılıyor.' : ai.sifreli ? 'Anahtar kayıtlı ve işletim sisteminin şifreli deposunda saklanıyor.' : 'Anahtar yalnızca bu oturum için bellekte (bu sistemde şifreli depo yok).'}
        </p>
      ) : (
        <p className="ai-durum">Anahtar yok. Anahtarını Claude Console'dan alabilirsin.</p>
      )}
      <div className="anahtar-girdi">
        <input
          type="password"
          value={anahtar}
          onChange={(e) => setAnahtar(e.target.value)}
          placeholder="sk-ant-…"
          autoComplete="off"
          spellCheck={false}
          aria-label="Claude API anahtarı"
          onKeyDown={(e) => e.key === 'Enter' && anahtar && kaydet()}
        />
        <button className="dugme birincil" disabled={!anahtar || calisiyor} onClick={kaydet}>{calisiyor ? 'Doğrulanıyor…' : 'Kaydet ve doğrula'}</button>
        {ai?.kaynak === 'kayitli' && (
          <button className="dugme" onClick={async () => setAi(await window.workspace.aiAnahtarSil())}>Sil</button>
        )}
      </div>
      <button className="baglanti ipucu" onClick={() => window.workspace.webAc('https://platform.claude.com/settings/keys')}>Anahtar al → Claude Console</button>
      {hata && <div className="hata">{hata}</div>}
    </div>
  )
}

function SablonDuzenleyici() {
  const [liste, setListe] = useState<IstemSablonu[]>([])
  const [editor, setEditor] = useState<EditorTuru>('word')
  const [acik, setAcik] = useState<string | null>(null)
  const [kaydedildi, setKaydedildi] = useState(false)

  useEffect(() => {
    window.workspace.aiIstemler().then(setListe)
  }, [])

  const kaydet = async (yeni: IstemSablonu[] | null) => {
    setListe(await window.workspace.aiIstemleriKaydet(yeni))
    setKaydedildi(true)
    setTimeout(() => setKaydedildi(false), 1500)
  }
  const guncelle = (id: string, d: Partial<IstemSablonu>) => setListe((l) => l.map((s) => (s.id === id ? { ...s, ...d } : s)))
  const ekle = () => {
    const yeni: IstemSablonu = { id: `ozel-${Date.now()}`, editor, ad: 'Yeni şablon', ikon: '⭐', sablon: '{girdi}', cikti: 'ekle', girdiEtiketi: 'Ne yapılsın?' }
    setListe((l) => [...l, yeni])
    setAcik(yeni.id)
  }

  return (
    <div className="ayar-karti">
      <div className="panel-baslik">
        <h3>İstem şablonları</h3>
        <span className="soluk">{kaydedildi && '✓ Kaydedildi'}</span>
      </div>
      <p className="ipucu">
        Editörlerdeki "Hızlı işlemler". <code>{'{girdi}'}</code> kullanıcının yazdığı metinle, <code>{'{secim}'}</code> belgede seçili metinle değiştirilir; belge içeriği her zaman bağlam olarak gönderilir.
      </p>
      <div className="sekmeler">
        {(Object.keys(EDITOR_ADLARI) as EditorTuru[]).map((e) => (
          <button key={e} className={editor === e ? 'aktif' : ''} onClick={() => setEditor(e)}>
            {EDITOR_ADLARI[e]} <span className="sayac">{liste.filter((s) => s.editor === e).length}</span>
          </button>
        ))}
      </div>
      {liste.filter((s) => s.editor === editor).map((s) => (
        <div key={s.id} className={`sablon-satir ${acik === s.id ? 'acik' : ''}`}>
          <button className="sablon-ozet" onClick={() => setAcik(acik === s.id ? null : s.id)}>
            <span>{s.ikon}</span>
            <strong>{s.ad}</strong>
            <small className="soluk">{CIKTI_ADLARI[s.cikti]}</small>
          </button>
          {acik === s.id && (
            <div className="sablon-form">
              <div className="sablon-ust">
                <input value={s.ikon} onChange={(e) => guncelle(s.id, { ikon: e.target.value })} aria-label="İkon" className="ikon-girdi" />
                <input value={s.ad} onChange={(e) => guncelle(s.id, { ad: e.target.value })} aria-label="Şablon adı" />
                <select value={s.cikti} onChange={(e) => guncelle(s.id, { cikti: e.target.value as AiCikti })} aria-label="Çıktı">
                  {(Object.keys(CIKTI_ADLARI) as AiCikti[]).map((c) => <option key={c} value={c}>{CIKTI_ADLARI[c]}</option>)}
                </select>
              </div>
              <textarea rows={3} value={s.sablon} onChange={(e) => guncelle(s.id, { sablon: e.target.value })} aria-label="Şablon metni" />
              <input
                value={s.girdiEtiketi ?? ''}
                onChange={(e) => guncelle(s.id, { girdiEtiketi: e.target.value || undefined })}
                placeholder="Kullanıcıdan girdi istenecekse ipucu metni (boşsa doğrudan çalışır)"
                aria-label="Girdi ipucu"
              />
              <div className="ai-eylemler">
                <button className="dugme kucuk birincil" onClick={() => kaydet(liste)}>Kaydet</button>
                <button className="dugme kucuk" onClick={() => { const y = liste.filter((x) => x.id !== s.id); setListe(y); kaydet(y) }}>Sil</button>
              </div>
            </div>
          )}
        </div>
      ))}
      <div className="ai-eylemler">
        <button className="dugme kucuk" onClick={ekle}>+ Yeni şablon</button>
        <button className="dugme kucuk metin" onClick={() => confirm('Tüm şablonlar varsayılana dönsün mü?') && kaydet(null)}>Varsayılanlara dön</button>
      </div>
    </div>
  )
}

modulKaydet({ id: 'ai', ad: 'Yapay Zeka', ikon: '✨', sira: 30, grup: 'ofis', bilesen: YapayZeka })
