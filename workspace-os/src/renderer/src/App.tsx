import { useEffect, useState } from 'react'
import type { UygulamaDurumu } from '@shared/tipler'
import { temaUygula } from '@core/tema'
import KurulumSihirbazi from './moduller/kurulum/KurulumSihirbazi'
import Kabuk from './moduller/masaustu/Kabuk'

export default function App() {
  const [durum, setDurum] = useState<UygulamaDurumu | null>(null)

  useEffect(() => {
    window.workspace.durumGetir().then(setDurum)
  }, [])

  useEffect(() => {
    if (durum) return temaUygula(durum.tercihler.tema)
  }, [durum?.tercihler.tema])

  if (!durum) return <div className="yukleniyor" />

  return durum.kurulumTamamlandi ? (
    <Kabuk durum={durum} durumGuncelle={setDurum} />
  ) : (
    <KurulumSihirbazi tamamlandi={setDurum} />
  )
}
