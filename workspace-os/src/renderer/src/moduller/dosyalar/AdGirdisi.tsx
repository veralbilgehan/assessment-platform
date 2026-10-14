import { useEffect, useRef } from 'react'

// Satır içi isim düzenleyici (Electron'da window.prompt yok).
// Enter/odak kaybı → onayla, Escape → iptal. Dosyalarda uzantı hariç kısım seçili gelir.
export default function AdGirdisi({ baslangic, dosya, onay, iptal }: {
  baslangic: string
  dosya?: boolean
  onay: (ad: string) => void
  iptal: () => void
}) {
  const ref = useRef<HTMLInputElement>(null)
  const bitti = useRef(false)

  useEffect(() => {
    const el = ref.current!
    el.focus()
    const nokta = baslangic.lastIndexOf('.')
    el.setSelectionRange(0, dosya && nokta > 0 ? nokta : baslangic.length)
  }, [])

  const bitir = (onayla: boolean) => {
    if (bitti.current) return
    bitti.current = true
    const ad = ref.current!.value.trim()
    if (onayla && ad && ad !== baslangic) onay(ad)
    else iptal()
  }

  return (
    <input
      ref={ref}
      className="ad-girdisi"
      defaultValue={baslangic}
      onClick={(e) => e.stopPropagation()}
      onDoubleClick={(e) => e.stopPropagation()}
      onKeyDown={(e) => {
        e.stopPropagation()
        if (e.key === 'Enter') bitir(true)
        if (e.key === 'Escape') bitir(false)
      }}
      onBlur={() => bitir(true)}
    />
  )
}
