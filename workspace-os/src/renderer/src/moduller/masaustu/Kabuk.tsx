import { useCallback, useMemo, useState } from 'react'
import type { UygulamaDurumu } from '@shared/tipler'
import { uzantiAl } from '@shared/kategoriler'
import { GOOGLE_KISAYOL_UZANTILARI, editorBul } from '@shared/ofis'
import { modulleriGetir } from '@core/modulKayit'
import { KabukContext, type KabukBaglami } from '@core/kabukBaglami'

interface AktifModul {
  id: string
  parametre?: unknown
  surum: number // aynı modül yeni parametreyle açılınca yeniden kurulsun
}

// Kurulum sonrası ana pencere: kenar çubuğu + aktif modül. Menü tamamen kayıt defterinden gelir.
export default function Kabuk({ durum, durumGuncelle }: { durum: UygulamaDurumu; durumGuncelle: (d: UygulamaDurumu) => void }) {
  const moduller = modulleriGetir()
  const [aktif, setAktif] = useState<AktifModul>({ id: moduller[0]?.id, surum: 0 })
  const modul = moduller.find((m) => m.id === aktif.id)
  const profil = durum.profil!
  const dahiliEditor = durum.tercihler.dahiliEditor !== false

  const modulAc = useCallback((id: string, parametre?: unknown) => setAktif((a) => ({ id, parametre, surum: a.surum + 1 })), [])

  const belgeAc = useCallback(
    async (yol: string) => {
      if (GOOGLE_KISAYOL_UZANTILARI.includes(uzantiAl(yol))) return window.workspace.googleKisayolAc(yol)
      if (dahiliEditor && editorBul(yol)) return modulAc('ofis', { yol })
      return window.workspace.dosyaAc(yol)
    },
    [dahiliEditor, modulAc],
  )

  const baglam = useMemo<KabukBaglami>(() => ({ modulAc, belgeAc }), [modulAc, belgeAc])

  return (
    <KabukContext.Provider value={baglam}>
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
              <button key={m.id} className={m.id === aktif.id ? 'aktif' : ''} onClick={() => modulAc(m.id)}>
                <span className="nav-ikon">{m.ikon}</span>
                {m.ad}
              </button>
            ))}
          </nav>
        </aside>
        <main className="icerik">
          {modul && (
            <modul.bilesen
              key={`${modul.id}:${aktif.parametre ? aktif.surum : ''}`}
              durum={durum}
              durumGuncelle={durumGuncelle}
              modulAc={modulAc}
              parametre={aktif.parametre}
            />
          )}
        </main>
      </div>
    </KabukContext.Provider>
  )
}
