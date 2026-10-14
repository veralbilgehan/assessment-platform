import type { Surucu, SurucuTuru } from '@shared/tipler'
import { boyutBicimle } from '@core/bicim'

export const SURUCU_IKONU: Record<SurucuTuru, string> = {
  sistem: '🖥️',
  yerel: '💽',
  usb: '🔌',
  harici: '🧳',
  ag: '🌐',
  optik: '💿',
  bulut: '☁️',
}

export default function SurucuKarti({ surucu, ac }: { surucu: Surucu; ac: () => void }) {
  const { toplamBayt, bosBayt } = surucu
  const dolu = toplamBayt && bosBayt !== undefined ? (toplamBayt - bosBayt) / toplamBayt : null
  const ikon = surucu.saglayici === 'onedrive' ? '🔷' : surucu.saglayici === 'google-drive' ? '🟢' : SURUCU_IKONU[surucu.tur]

  return (
    <button className="surucu-kart" onClick={ac} title={surucu.yol}>
      <span className="surucu-ikon">{ikon}</span>
      <span className="surucu-bilgi">
        <strong>{surucu.ad}</strong>
        {dolu !== null ? (
          <>
            <span className="doluluk">
              <span style={{ width: `${dolu * 100}%` }} className={dolu > 0.9 ? 'kritik' : ''} />
            </span>
            <small>{boyutBicimle(bosBayt!)} boş · {boyutBicimle(toplamBayt!)}</small>
          </>
        ) : (
          <small>{surucu.yol}</small>
        )}
      </span>
    </button>
  )
}
