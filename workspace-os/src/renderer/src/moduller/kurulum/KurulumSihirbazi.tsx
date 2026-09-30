import { useEffect, useMemo, useState } from 'react'
import type { KullaniciProfili, SistemBilgisi, UygulamaDurumu } from '@shared/tipler'
import { temaUygula } from '@core/tema'
import type { KurulumTaslagi } from './adimTipleri'
import { KURULUM_ADIMLARI } from './adimlar'

const ilkTaslak = (): KurulumTaslagi => ({
  profil: { ad: '', soyad: '', eposta: '', meslek: '', kullanimAmaci: [], avatarRenk: '#4f7cff' },
  tercihler: { tema: 'sistem', dil: 'tr', aiOnerileriAcik: true },
})

export default function KurulumSihirbazi({ tamamlandi }: { tamamlandi: (d: UygulamaDurumu) => void }) {
  const [taslak, setTaslak] = useState<KurulumTaslagi>(ilkTaslak)
  const [konum, setKonum] = useState(0)
  const [hata, setHata] = useState<string | null>(null)
  const [sistem, setSistem] = useState<SistemBilgisi | null>(null)

  useEffect(() => {
    window.workspace.sistemBilgisi().then(setSistem)
  }, [])

  // Tema seçimi kurulum sırasında canlı önizlenir
  useEffect(() => temaUygula(taslak.tercihler.tema), [taslak.tercihler.tema])

  // Koşullu adımlar taslak değiştikçe yeniden hesaplanır
  const adimlar = useMemo(() => KURULUM_ADIMLARI.filter((a) => a.goster?.(taslak) ?? true), [taslak])
  const adim = adimlar[Math.min(konum, adimlar.length - 1)]
  const sonAdim = konum >= adimlar.length - 1
  const ilerlemeAdimlari = adimlar.filter((a) => !a.navigasyonGizli)

  const guncelle = (d: Partial<KurulumTaslagi>) => {
    setHata(null)
    setTaslak((t) => ({ ...t, ...d }))
  }
  const profilGuncelle = (d: Partial<KullaniciProfili>) => {
    setHata(null)
    setTaslak((t) => ({ ...t, profil: { ...t.profil, ...d } }))
  }

  const tamamla = async () => {
    try {
      tamamlandi(await window.workspace.kurulumTamamla(taslak.profil, taslak.tercihler))
    } catch (e) {
      setHata(e instanceof Error ? e.message : 'Kurulum kaydedilemedi')
    }
  }

  const ileri = () => {
    const mesaj = adim.dogrula?.(taslak)
    if (mesaj) return setHata(mesaj)
    if (sonAdim) return void tamamla()
    setKonum((k) => k + 1)
  }
  const geri = () => {
    setHata(null)
    setKonum((k) => Math.max(0, k - 1))
  }

  const Bilesen = adim.bilesen

  return (
    <div className="kurulum">
      <div className="kurulum-panel">
        {!adim.navigasyonGizli && (
          <ol className="ilerleme">
            {ilerlemeAdimlari.map((a) => {
              const sira = adimlar.indexOf(a)
              return (
                <li key={a.id} className={sira < konum ? 'bitti' : sira === konum ? 'aktif' : ''}>
                  {a.baslik}
                </li>
              )
            })}
          </ol>
        )}

        <div className="kurulum-icerik" key={adim.id}>
          <Bilesen taslak={taslak} guncelle={guncelle} profilGuncelle={profilGuncelle} sistem={sistem} ileri={ileri} />
        </div>

        {hata && <div className="hata">{hata}</div>}

        {!adim.navigasyonGizli && (
          <div className="kurulum-alt">
            <button className="dugme" onClick={geri} disabled={konum === 0}>Geri</button>
            <button className="dugme birincil" onClick={ileri}>İleri</button>
          </div>
        )}
      </div>
    </div>
  )
}
