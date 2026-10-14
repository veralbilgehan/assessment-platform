import { useCallback, useEffect, useMemo, useState } from 'react'
import type { GuncellemeDurumu, UygulamaDurumu } from '@shared/tipler'
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

  // Güncelleme indirildiğinde her ekranda görünen şerit
  const [guncelleme, setGuncelleme] = useState<GuncellemeDurumu | null>(null)
  const [seritKapali, setSeritKapali] = useState(false)
  useEffect(() => {
    window.workspace.guncellemeDurumu().then(setGuncelleme)
    return window.workspace.olayDinle('guncelleme:durum', setGuncelleme)
  }, [])

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
          {guncelleme?.durum === 'hazir' && !seritKapali && (
            <div className="guncelleme-seridi" role="status">
              <span>✨ Workspace OS {guncelleme.yeniSurum} hazır.</span>
              <button className="dugme kucuk birincil" onClick={() => window.workspace.guncellemeKur()}>Yeniden başlat ve güncelle</button>
              <button className="dugme kucuk metin" onClick={() => setSeritKapali(true)}>Sonra</button>
            </div>
          )}
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
