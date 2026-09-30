import { useCallback, useEffect, useRef, useState } from 'react'
import type { AcikBelge, BelgeIcerigi, SunumBelgesi, TabloBelgesi, WordBelgesi } from '@shared/ofis'
import { uzantiAl } from '@shared/kategoriler'
import { formulIngilizce, hesapla, hataMi } from '@shared/formul'
import { hataMesaji } from '@core/bicim'
import WordEditor from './editorler/WordEditor'
import ExcelEditor from './editorler/ExcelEditor'
import SunumEditor from './editorler/SunumEditor'
import MetinEditor from './editorler/MetinEditor'
import AiPaneli from './AiPaneli'
import type { Tercihler } from '@shared/tipler'

type KayitDurumu = 'kayitli' | 'kirli' | 'kaydediliyor' | 'hata'

const OTOMATIK_KAYIT_MS = 1500

// Tüm editörlerin ortak çerçevesi: yükleme, otomatik kaydetme, adlandırma, farklı kaydet, proje statüsü.
export default function BelgeEditoru({ yol: ilkYol, kapat, tercihler, aiIstem }: {
  yol: string
  kapat: () => void
  tercihler: Tercihler
  /** Office Agent: belge açılınca AI paneli bu istemle otomatik çalışır */
  aiIstem?: string
}) {
  const [aiAcik, setAiAcik] = useState(!!aiIstem)
  const [belge, setBelge] = useState<AcikBelge | null>(null)
  const [yol, setYol] = useState(ilkYol)
  const [kayit, setKayit] = useState<KayitDurumu>('kayitli')
  const [hata, setHata] = useState<string | null>(null)
  const [tamamlandi, setTamamlandi] = useState(false)

  const yolRef = useRef(yol)
  const icerikRef = useRef<BelgeIcerigi | null>(null)
  const kirliRef = useRef(false)
  const zamanlayici = useRef<ReturnType<typeof setTimeout>>(undefined)
  const zincir = useRef<Promise<void>>(Promise.resolve()) // kayıtlar sırayla yapılsın
  const korumaliRef = useRef(false)

  useEffect(() => {
    window.workspace
      .belgeAc(ilkYol)
      .then((b) => {
        icerikRef.current = b.icerik
        korumaliRef.current = b.korumali
        setBelge(b)
      })
      .catch((e) => setHata(hataMesaji(e)))
  }, [ilkYol])

  const kaydet = useCallback((): Promise<void> => {
    clearTimeout(zamanlayici.current)
    zincir.current = zincir.current.then(async () => {
      if (!kirliRef.current || !icerikRef.current) return
      kirliRef.current = false
      setKayit('kaydediliyor')
      try {
        await window.workspace.belgeKaydet(yolRef.current, await kaydetmeyeHazirla(icerikRef.current))
        setHata(null)
        setKayit(kirliRef.current ? 'kirli' : 'kayitli')
        setBelge((b) => b && { ...b, iceAktarildi: false })
      } catch (e) {
        kirliRef.current = true
        setKayit('hata')
        setHata(hataMesaji(e))
      }
    })
    return zincir.current
  }, [])

  // Editörden çıkarken (modül değişse bile) bekleyen değişiklikler kaydedilir
  useEffect(() => () => void kaydet(), [kaydet])

  const degisti = useCallback(
    (icerik: BelgeIcerigi) => {
      icerikRef.current = icerik
      kirliRef.current = true
      setKayit('kirli')
      clearTimeout(zamanlayici.current)
      if (!korumaliRef.current) zamanlayici.current = setTimeout(kaydet, OTOMATIK_KAYIT_MS)
    },
    [kaydet],
  )

  // Ctrl+S
  useEffect(() => {
    const tus = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'j') {
        e.preventDefault()
        setAiAcik((a) => !a)
      }
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 's') {
        e.preventDefault()
        if (korumaliRef.current) farkliKaydet()
        else kaydet()
      }
    }
    window.addEventListener('keydown', tus)
    return () => window.removeEventListener('keydown', tus)
  }, [kaydet])

  const yolDegisti = (yeni: string) => {
    yolRef.current = yeni
    setYol(yeni)
  }

  const farkliKaydet = async () => {
    if (!icerikRef.current) return
    try {
      const yeni = await window.workspace.farkliKaydet(await kaydetmeyeHazirla(icerikRef.current), yolRef.current)
      if (!yeni) return
      kirliRef.current = false
      korumaliRef.current = false
      yolDegisti(yeni)
      setBelge((b) => b && { ...b, korumali: false, iceAktarildi: false })
      setKayit('kayitli')
      setHata(null)
    } catch (e) {
      setHata(hataMesaji(e))
    }
  }

  const uzanti = uzantiAl(yol)
  const adKismi = yolAdi(yol).slice(0, -(uzanti.length + 1))

  const yenidenAdlandir = async (yeniAd: string) => {
    yeniAd = yeniAd.trim()
    if (!yeniAd || yeniAd === adKismi) return
    try {
      await kaydet()
      yolDegisti(await window.workspace.yenidenAdlandir(yolRef.current, `${yeniAd}.${uzanti}`))
    } catch (e) {
      setHata(hataMesaji(e))
    }
  }

  const tamamla = async () => {
    await kaydet()
    await window.workspace.statuAyarla([yolRef.current], 'tamamlandi')
    setTamamlandi(true)
  }

  const kapatVeKaydet = async () => {
    await kaydet()
    kapat()
  }

  if (!belge) {
    return (
      <section className="belge-editoru">
        {hata ? (
          <div className="bos-durum">
            <div className="hata">{hata}</div>
            <button className="dugme" onClick={kapat}>Geri</button>
          </div>
        ) : (
          <div className="bos-durum"><div className="donen-halka" /></div>
        )}
      </section>
    )
  }

  const ortak = { belgeAdi: yolAdi(yol), degisti }

  return (
    <section className="belge-editoru">
      <header className="belge-ust">
        <button className="dugme ikon" onClick={kapatVeKaydet} title="Ofis'e dön">←</button>
        <input
          key={adKismi}
          className="belge-adi"
          defaultValue={adKismi}
          size={Math.max(8, adKismi.length + 1)}
          aria-label="Belge adı"
          onBlur={(e) => yenidenAdlandir(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && (e.target as HTMLInputElement).blur()}
        />
        <span className="soluk">.{uzanti}</span>
        <span className={`kayit-durumu ${kayit}`}>
          {belge.korumali ? '🔒 Salt okunur' : { kayitli: '✓ Kaydedildi', kirli: 'Kaydedilmemiş değişiklik', kaydediliyor: 'Kaydediliyor…', hata: '⚠ Kaydedilemedi' }[kayit]}
        </span>
        <span className="bosluk" />
        <button className={`dugme kucuk ${aiAcik ? 'birincil' : ''}`} onClick={() => setAiAcik((a) => !a)} title="Yapay zeka paneli (Ctrl+J)">✨ AI</button>
        <button className="dugme kucuk" onClick={() => (belge.korumali ? farkliKaydet() : kaydet())}>Kaydet</button>
        <button className="dugme kucuk" onClick={farkliKaydet}>Farklı kaydet…</button>
        <button className="dugme kucuk" onClick={tamamla} disabled={tamamlandi} title="Projeler'de Tamamlananlar'a taşı">
          {tamamlandi ? '✓ Tamamlandı' : '✓ Tamamla'}
        </button>
        <button
          className="dugme kucuk"
          title="Sistemdeki varsayılan uygulamada aç (ör. Microsoft Word)"
          onClick={async () => {
            await kaydet()
            window.workspace.dosyaAc(yolRef.current).catch((e) => setHata(hataMesaji(e)))
          }}
        >
          ↗
        </button>
      </header>

      {belge.korumali && (
        <div className="bilgi-kutusu uyari">
          Bu dosya korumalı (salt okunur). Değişiklikler otomatik kaydedilmez — <button className="baglanti" onClick={farkliKaydet}>kopya olarak kaydet</button>.
        </div>
      )}
      {belge.iceAktarildi && !belge.korumali && (
        <div className="bilgi-kutusu">
          {belge.icerik.tur === 'excel'
            ? 'Bu tablo başka bir programla oluşturulmuş. Hücre biçimleri korunur; grafik ve makrolar kaydedilmez.'
            : belge.icerik.tur === 'metin'
              ? 'Bu dosya başka bir programla oluşturulmuş.'
              : 'Bu belge başka bir programla oluşturulmuş. Karmaşık biçimlendirme (yazı tipleri, renkler, düzen) sadeleşebilir.'}{' '}
          İlk kayıtta orijinali yedeklenir.
        </div>
      )}
      {hata && <div className="hata" role="alert">{hata}</div>}

      <div className={`belge-alan ${aiAcik ? 'ai-acik' : ''}`}>
        <div className="belge-govde">
          {belge.icerik.tur === 'word' && <WordEditor icerik={belge.icerik} {...ortak} />}
          {belge.icerik.tur === 'excel' && <ExcelEditor icerik={belge.icerik} {...ortak} />}
          {belge.icerik.tur === 'sunum' && <SunumEditor icerik={belge.icerik} {...ortak} />}
          {belge.icerik.tur === 'metin' && <MetinEditor icerik={belge.icerik} {...ortak} />}
        </div>
        {aiAcik && <AiPaneli tur={belge.icerik.tur} tercihler={tercihler} baslangicIstemi={aiIstem} kapat={() => setAiAcik(false)} />}
      </div>
    </section>
  )
}

const yolAdi = (yol: string) => yol.split(/[\\/]/).pop() ?? yol

// ── Kaydetmeden önce model dönüşümleri ─────────────────────────
async function kaydetmeyeHazirla(icerik: BelgeIcerigi): Promise<BelgeIcerigi> {
  switch (icerik.tur) {
    case 'excel':
      return tabloHazirla(icerik)
    case 'word':
      return { tur: 'word', json: await resimBoyutlariEkle((icerik as WordBelgesi).json) }
    case 'sunum':
      return sunumHazirla(icerik)
    default:
      return icerik
  }
}

/** Formüller Excel dosya biçimine (İngilizce ad, ',' ayırıcı) çevrilir; sonuçlar önbellek olarak eklenir. */
function tabloHazirla(t: TabloBelgesi): TabloBelgesi {
  return {
    ...t,
    sayfalar: t.sayfalar.map((s) => {
      const degerler = hesapla(s.hucreler)
      const hucreler: Record<string, string> = {}
      const sonuclar: Record<string, string | number | boolean> = {}
      for (const [a, ham] of Object.entries(s.hucreler)) {
        hucreler[a] = ham.startsWith('=') ? '=' + formulIngilizce(ham.slice(1)) : ham
        const d = degerler[a]
        if (ham.startsWith('=') && d !== undefined && !hataMi(d)) sonuclar[a] = d
      }
      return { ...s, hucreler, sonuclar }
    }),
  }
}

function sunumHazirla(s: SunumBelgesi): SunumBelgesi {
  return { ...s, slaytlar: s.slaytlar.map((sl) => ({ ...sl, maddeler: sl.maddeler.map((m) => m.trim()).filter(Boolean) })) }
}

/** docx'e gömülen resimlerin piksel boyutu gerekir — tarayıcıda ölçülüp düğüme eklenir. */
async function resimBoyutlariEkle(json: unknown): Promise<unknown> {
  const olc = (src: string) =>
    new Promise<{ w: number; h: number } | null>((coz) => {
      const img = new Image()
      img.onload = () => coz({ w: img.naturalWidth, h: img.naturalHeight })
      img.onerror = () => coz(null)
      img.src = src
    })
  const gez = async (d: { type?: string; attrs?: Record<string, unknown>; content?: unknown[] }): Promise<unknown> => {
    if (d.type === 'image' && typeof d.attrs?.src === 'string' && !d.attrs.width) {
      const b = await olc(d.attrs.src)
      return b ? { ...d, attrs: { ...d.attrs, width: b.w, height: b.h } } : d
    }
    return d.content ? { ...d, content: await Promise.all(d.content.map((c) => gez(c as typeof d))) } : d
  }
  return json ? gez(json as Parameters<typeof gez>[0]) : json
}
