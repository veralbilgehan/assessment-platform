import type { Tema } from '@shared/tipler'
import type { AdimProps } from '../adimTipleri'

const TEMALAR: { id: Tema; ad: string }[] = [
  { id: 'acik', ad: 'Açık' },
  { id: 'koyu', ad: 'Koyu' },
  { id: 'sistem', ad: 'Sistem' },
]

export default function Tercihler({ taslak, guncelle }: AdimProps) {
  const t = taslak.tercihler
  const ayarla = (d: Partial<typeof t>) => guncelle({ tercihler: { ...t, ...d } })

  return (
    <div className="adim">
      <h2>Görünüm ve tercihler</h2>
      <p className="alt-metin">Bunları daha sonra Ayarlar'dan değiştirebilirsin.</p>

      <h3>Tema</h3>
      <div className="segment">
        {TEMALAR.map((x) => (
          <button key={x.id} className={t.tema === x.id ? 'secili' : ''} onClick={() => ayarla({ tema: x.id })}>
            {x.ad}
          </button>
        ))}
      </div>

      <h3>Dil</h3>
      <div className="segment">
        <button className={t.dil === 'tr' ? 'secili' : ''} onClick={() => ayarla({ dil: 'tr' })}>Türkçe</button>
        <button className={t.dil === 'en' ? 'secili' : ''} onClick={() => ayarla({ dil: 'en' })}>English</button>
      </div>

      <label className="anahtar-satir">
        <input
          type="checkbox"
          checked={t.aiOnerileriAcik}
          onChange={(e) => ayarla({ aiOnerileriAcik: e.target.checked })}
        />
        <span>
          <strong>Yapay zeka önerileri</strong>
          <small>Belgelerde çalışırken AI öneri sunsun</small>
        </span>
      </label>
    </div>
  )
}
