import { useEffect, useRef, useState } from 'react'
import type { MetinBelgesi } from '@shared/ofis'
import { editorKaydet } from '@core/editorKoprusu'
import type { EditorProps } from './tipler'

// Not Defteri: .txt / .md / .log için düz metin editörü.
export default function MetinEditor({ icerik, belgeAdi, degisti }: EditorProps<MetinBelgesi>) {
  const [metin, setMetin] = useState(icerik.metin)
  const alan = useRef<HTMLTextAreaElement>(null)

  const guncelle = (yeni: string) => {
    setMetin(yeni)
    degisti({ tur: 'metin', metin: yeni })
  }

  useEffect(
    () =>
      editorKaydet({
        tur: 'metin',
        belgeAdi,
        metinAl: () => alan.current?.value ?? '',
        seciliMetin: () => {
          const a = alan.current
          return a ? a.value.slice(a.selectionStart, a.selectionEnd) : ''
        },
        ekle: ({ metin: m, tablo }) => {
          const a = alan.current
          const ek = m ?? tablo?.map((s) => s.join('\t')).join('\n') ?? ''
          if (!a || !ek) return
          const yeni = a.value.slice(0, a.selectionStart) + ek + a.value.slice(a.selectionEnd)
          guncelle(yeni)
        },
      }),
    [belgeAdi],
  )

  const satir = metin.split('\n').length
  return (
    <div className="metin-editoru">
      <textarea
        ref={alan}
        value={metin}
        onChange={(e) => guncelle(e.target.value)}
        spellCheck={false}
        autoFocus
        aria-label="Metin"
        onKeyDown={(e) => {
          if (e.key !== 'Tab') return
          e.preventDefault()
          const a = e.currentTarget
          const s = a.selectionStart
          guncelle(a.value.slice(0, s) + '\t' + a.value.slice(a.selectionEnd))
          requestAnimationFrame(() => a.setSelectionRange(s + 1, s + 1))
        }}
      />
      <footer className="durum-cubugu">{satir.toLocaleString('tr-TR')} satır · {metin.length.toLocaleString('tr-TR')} karakter</footer>
    </div>
  )
}
