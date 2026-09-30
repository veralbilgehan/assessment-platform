import { useState } from 'react'
import type { UygulamaDurumu } from '@shared/tipler'
import { modulleriGetir } from '@core/modulKayit'

// Kurulum sonrası ana pencere: kenar çubuğu + aktif modül. Menü tamamen kayıt defterinden gelir.
export default function Kabuk({ durum, durumGuncelle }: { durum: UygulamaDurumu; durumGuncelle: (d: UygulamaDurumu) => void }) {
  const moduller = modulleriGetir()
  const [aktifId, setAktifId] = useState(moduller[0]?.id)
  const aktif = moduller.find((m) => m.id === aktifId)
  const profil = durum.profil!

  return (
    <div className="kabuk">
      <aside className="kenar">
        <div className="kenar-profil">
          <div className="avatar kucuk" style={{ background: profil.avatarRenk }}>
            {profil.ad[0]?.toLocaleUpperCase('tr')}
          </div>
          <span>{profil.ad}</span>
        </div>
        <nav>
          {moduller.map((m) => (
            <button key={m.id} className={m.id === aktifId ? 'aktif' : ''} onClick={() => setAktifId(m.id)}>
              <span className="nav-ikon">{m.ikon}</span>
              {m.ad}
            </button>
          ))}
        </nav>
      </aside>
      <main className="icerik">{aktif && <aktif.bilesen durum={durum} durumGuncelle={durumGuncelle} />}</main>
    </div>
  )
}
