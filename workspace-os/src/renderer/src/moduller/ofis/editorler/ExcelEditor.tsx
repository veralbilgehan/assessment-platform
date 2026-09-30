import { useEffect, useMemo, useRef, useState } from 'react'
import type { TabloBelgesi } from '@shared/ofis'
import { adres, adresCoz, degerMetni, hataMi, hesapla, sutunHarfi } from '@shared/formul'
import { editorKaydet } from '@core/editorKoprusu'
import type { EditorProps } from './tipler'

interface Konum {
  satir: number
  sutun: number
}

// "Kendi Excel'imiz": hücre ızgarası + formül çubuğu. Formüller shared/formul.ts ile canlı hesaplanır.
export default function ExcelEditor({ icerik, belgeAdi, degisti }: EditorProps<TabloBelgesi>) {
  const [belge, setBelge] = useState(icerik)
  const [aktif, setAktif] = useState(0)
  const [secim, setSecim] = useState<Konum>({ satir: 0, sutun: 0 })
  const [taslak, setTaslak] = useState<string | null>(null) // düzenlenen hücrenin metni
  const [kaynak, setKaynak] = useState<'hucre' | 'cubuk'>('hucre')
  const [adDuzenle, setAdDuzenle] = useState<number | null>(null)
  const izgara = useRef<HTMLDivElement>(null)
  const onaylandi = useRef(false) // Enter/Tab ile onaylanınca ardından gelen blur yeniden onaylamasın

  const sayfa = belge.sayfalar[aktif] ?? belge.sayfalar[0]
  const degerler = useMemo(() => hesapla(sayfa.hucreler), [sayfa.hucreler])

  const { satirSayisi, sutunSayisi } = useMemo(() => {
    let ms = 0, mc = 0
    for (const a of Object.keys(sayfa.hucreler)) {
      const k = adresCoz(a)
      if (k) { ms = Math.max(ms, k.satir); mc = Math.max(mc, k.sutun) }
    }
    return { satirSayisi: Math.max(50, ms + 20, secim.satir + 10), sutunSayisi: Math.max(15, mc + 5, secim.sutun + 3) }
  }, [sayfa.hucreler, secim])

  const belgeGuncelle = (yeni: TabloBelgesi) => {
    setBelge(yeni)
    degisti(yeni)
  }

  const hucreleriAyarla = (degisiklikler: Record<string, string>) => {
    const h = { ...sayfa.hucreler }
    for (const [a, v] of Object.entries(degisiklikler)) {
      if (v === '') delete h[a]
      else h[a] = v
    }
    belgeGuncelle({ ...belge, sayfalar: belge.sayfalar.map((s, i) => (i === aktif ? { ...s, hucreler: h } : s)) })
  }

  const secAdres = adres(secim.satir, secim.sutun)

  const git = (ds: number, dc: number) =>
    setSecim((s) => ({ satir: Math.max(0, s.satir + ds), sutun: Math.max(0, s.sutun + dc) }))

  const duzenlemeBaslat = (baslangic: string | null, nereden: 'hucre' | 'cubuk' = 'hucre') => {
    onaylandi.current = false
    setKaynak(nereden)
    setTaslak(baslangic ?? sayfa.hucreler[secAdres] ?? '')
  }

  const onayla = (sonra?: 'asagi' | 'sag' | 'yukari' | 'sol') => {
    if (onaylandi.current) return
    onaylandi.current = true
    if (taslak !== null && taslak !== (sayfa.hucreler[secAdres] ?? '')) hucreleriAyarla({ [secAdres]: taslak })
    setTaslak(null)
    if (sonra === 'asagi') git(1, 0)
    if (sonra === 'yukari') git(-1, 0)
    if (sonra === 'sag') git(0, 1)
    if (sonra === 'sol') git(0, -1)
    // Odak hemen ızgaraya alınır: girdi kaldırılırken basılan bir sonraki tuş kaybolmasın
    izgara.current?.focus()
  }
  const iptal = () => {
    onaylandi.current = true
    setTaslak(null)
    izgara.current?.focus()
  }

  /** Sekmeyle ayrılmış metni (Excel/Sheets panosu, AI tablosu) seçili hücreden itibaren yerleştirir. */
  const tabloYerlestir = (tablo: string[][], baslangic: Konum = secim) => {
    const d: Record<string, string> = {}
    tablo.forEach((satir, r) => satir.forEach((v, c) => (d[adres(baslangic.satir + r, baslangic.sutun + c)] = v)))
    hucreleriAyarla(d)
  }
  const tsvCoz = (metin: string) => metin.replace(/\r/g, '').replace(/\n$/, '').split('\n').map((s) => s.split('\t'))

  const kullanilanAlan = () => {
    const tablo: string[][] = []
    for (const a of Object.keys(sayfa.hucreler)) {
      const k = adresCoz(a)
      if (k) (tablo[k.satir] ??= [])[k.sutun] = degerMetni(degerler[a])
    }
    return Array.from(tablo, (s = []) => Array.from(s, (v = '') => v).join('\t')).join('\n')
  }

  // AI köprüsü: tablo → seçili hücreden itibaren, metin → satır satır. Üzerine yazılan hücreler geri alınabilir.
  const kopruRef = useRef({ tabloYerlestir, kullanilanAlan, secAdres, secim, hucreleriAyarla, sayfa })
  kopruRef.current = { tabloYerlestir, kullanilanAlan, secAdres, secim, hucreleriAyarla, sayfa }
  useEffect(
    () =>
      editorKaydet({
        tur: 'excel',
        belgeAdi,
        metinAl: () => kopruRef.current.kullanilanAlan(),
        seciliMetin: () => kopruRef.current.sayfa.hucreler[kopruRef.current.secAdres] ?? '',
        konum: () => kopruRef.current.secAdres,
        ekle: ({ tablo, metin }) => {
          const t = tablo ?? (metin ? tsvCoz(metin) : null)
          if (!t?.length) return
          const k = kopruRef.current
          const onceki: Record<string, string> = {}
          t.forEach((satir, r) => satir.forEach((_, c) => {
            const a = adres(k.secim.satir + r, k.secim.sutun + c)
            onceki[a] = k.sayfa.hucreler[a] ?? ''
          }))
          k.tabloYerlestir(t)
          return () => kopruRef.current.hucreleriAyarla(onceki)
        },
      }),
    [belgeAdi],
  )

  const izgaraTusu = (e: React.KeyboardEvent) => {
    if (taslak !== null) return
    const ctrl = e.ctrlKey || e.metaKey
    const yon: Record<string, [number, number]> = { ArrowUp: [-1, 0], ArrowDown: [1, 0], ArrowLeft: [0, -1], ArrowRight: [0, 1] }
    if (yon[e.key]) {
      e.preventDefault()
      git(...yon[e.key])
    } else if (e.key === 'Tab') {
      e.preventDefault()
      git(0, e.shiftKey ? -1 : 1)
    } else if (e.key === 'Enter' || e.key === 'F2') {
      e.preventDefault()
      duzenlemeBaslat(null)
    } else if (e.key === 'Delete' || e.key === 'Backspace') {
      e.preventDefault()
      hucreleriAyarla({ [secAdres]: '' })
    } else if (ctrl && e.key.toLowerCase() === 'c') {
      navigator.clipboard.writeText(sayfa.hucreler[secAdres] ?? '')
    } else if (e.key.length === 1 && !ctrl && !e.altKey) {
      e.preventDefault()
      duzenlemeBaslat(e.key)
    }
  }

  const girdiTusu = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') { e.preventDefault(); onayla(e.shiftKey ? 'yukari' : 'asagi') }
    else if (e.key === 'Tab') { e.preventDefault(); onayla(e.shiftKey ? 'sol' : 'sag') }
    else if (e.key === 'Escape') { e.preventDefault(); iptal() }
  }

  // ── Sayfa sekmeleri ──
  const sayfaEkle = () => {
    let n = belge.sayfalar.length + 1
    while (belge.sayfalar.some((s) => s.ad === `Sayfa${n}`)) n++
    belgeGuncelle({ ...belge, sayfalar: [...belge.sayfalar, { ad: `Sayfa${n}`, hucreler: {} }] })
    setAktif(belge.sayfalar.length)
  }
  const sayfaAdlandir = (i: number, ad: string) => {
    ad = ad.trim().slice(0, 31).replace(/[\\/?*[\]:]/g, '') // Excel sayfa adı kuralları
    setAdDuzenle(null)
    if (!ad || belge.sayfalar.some((s, j) => j !== i && s.ad === ad)) return
    belgeGuncelle({ ...belge, sayfalar: belge.sayfalar.map((s, j) => (j === i ? { ...s, ad } : s)) })
  }
  const sayfaSil = (i: number) => {
    if (belge.sayfalar.length < 2 || !confirm(`"${belge.sayfalar[i].ad}" sayfası silinsin mi?`)) return
    belgeGuncelle({ ...belge, sayfalar: belge.sayfalar.filter((_, j) => j !== i) })
    setAktif((a) => Math.max(0, a >= i ? a - 1 : a))
  }

  useEffect(() => {
    izgara.current?.querySelector('.secili-hucre')?.scrollIntoView({ block: 'nearest', inline: 'nearest' })
  }, [secim])

  const secDeger = degerler[secAdres]

  return (
    <div className="excel">
      <div className="formul-cubugu">
        <span className="ad-kutusu">{secAdres}</span>
        <span className="fx">fx</span>
        <input
          aria-label="Formül çubuğu"
          value={taslak ?? sayfa.hucreler[secAdres] ?? ''}
          onFocus={() => taslak === null && duzenlemeBaslat(null, 'cubuk')}
          onChange={(e) => { onaylandi.current = false; setKaynak('cubuk'); setTaslak(e.target.value) }}
          onKeyDown={girdiTusu}
          onBlur={() => kaynak === 'cubuk' && taslak !== null && onayla()}
          placeholder="Değer veya =TOPLA(A1:A5) gibi formül"
        />
      </div>

      <div
        ref={izgara}
        className="izgara"
        tabIndex={0}
        onKeyDown={izgaraTusu}
        onPaste={(e) => {
          if (taslak !== null) return
          e.preventDefault()
          tabloYerlestir(tsvCoz(e.clipboardData.getData('text/plain')))
        }}
      >
        <table>
          <thead>
            <tr>
              <th className="kose" />
              {Array.from({ length: sutunSayisi }, (_, c) => (
                <th key={c} className={c === secim.sutun ? 'vurgulu' : ''}>{sutunHarfi(c)}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {Array.from({ length: satirSayisi }, (_, r) => (
              <tr key={r}>
                <th className={r === secim.satir ? 'vurgulu' : ''}>{r + 1}</th>
                {Array.from({ length: sutunSayisi }, (_, c) => {
                  const a = adres(r, c)
                  const secili = r === secim.satir && c === secim.sutun
                  const d = degerler[a]
                  if (secili && taslak !== null && kaynak === 'hucre') {
                    return (
                      <td key={c} className="secili-hucre duzenleniyor">
                        <input autoFocus value={taslak} onChange={(e) => setTaslak(e.target.value)} onKeyDown={girdiTusu} onBlur={() => onayla()} aria-label={`${a} hücresi`} />
                      </td>
                    )
                  }
                  return (
                    <td
                      key={c}
                      className={`${secili ? 'secili-hucre' : ''} ${typeof d === 'number' ? 'sayi' : ''} ${hataMi(d) ? 'hucre-hatasi' : ''}`}
                      onMouseDown={() => {
                        if (taslak !== null) onayla()
                        setSecim({ satir: r, sutun: c })
                      }}
                      onDoubleClick={() => duzenlemeBaslat(null)}
                    >
                      {secili && taslak !== null ? taslak : degerMetni(d)}
                    </td>
                  )
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="sayfa-sekmeleri">
        {belge.sayfalar.map((s, i) =>
          adDuzenle === i ? (
            <input key={i} autoFocus defaultValue={s.ad} className="sekme-girdi" onBlur={(e) => sayfaAdlandir(i, e.target.value)} onKeyDown={(e) => e.key === 'Enter' && (e.target as HTMLInputElement).blur()} />
          ) : (
            <button key={i} className={i === aktif ? 'aktif' : ''} onClick={() => { setAktif(i); setTaslak(null) }} onDoubleClick={() => setAdDuzenle(i)} title="Yeniden adlandırmak için çift tıkla">
              {s.ad}
              {belge.sayfalar.length > 1 && i === aktif && (
                <span className="sekme-sil" onClick={(e) => { e.stopPropagation(); sayfaSil(i) }} aria-label="Sayfayı sil">×</span>
              )}
            </button>
          ),
        )}
        <button onClick={sayfaEkle} title="Yeni sayfa">+</button>
        <span className="bosluk" />
        <span className="soluk">{secDeger !== undefined && secDeger !== '' ? degerMetni(secDeger) : ''}</span>
      </div>
    </div>
  )
}
