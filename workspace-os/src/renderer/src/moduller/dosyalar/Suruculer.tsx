import { useCallback, useEffect, useState } from 'react'
import type { OnemliKlasor, Surucu, SurucuTuru } from '@shared/tipler'
import type { ModulProps } from '@core/modulKayit'
import SurucuKarti from './SurucuKarti'
import Gezgin from './Gezgin'

const GRUPLAR: { ad: string; turler: SurucuTuru[] }[] = [
  { ad: 'Yerel Diskler', turler: ['sistem', 'yerel'] },
  { ad: 'USB ve Harici Diskler', turler: ['usb', 'harici'] },
  { ad: 'Bulut', turler: ['bulut'] },
  { ad: 'Ağ ve Diğer', turler: ['ag', 'optik'] },
]

export default function Suruculer({ parametre }: ModulProps) {
  const [suruculer, setSuruculer] = useState<Surucu[] | null>(null)
  const [onemli, setOnemli] = useState<OnemliKlasor[]>([])
  const [acikYol, setAcikYol] = useState<string | null>((parametre as { yol?: string } | undefined)?.yol ?? null)

  const yukle = useCallback(async () => {
    const s = await window.workspace.suruculeriGetir()
    setSuruculer(s)
    setOnemli(await window.workspace.onemliKlasorler())
  }, [])

  // USB takılınca/çıkarılınca liste kendiliğinden yenilenir
  useEffect(() => {
    yukle()
    return window.workspace.olayDinle('suruculer:degisti', yukle)
  }, [yukle])

  if (acikYol) return <Gezgin baslangic={acikYol} kapat={() => setAcikYol(null)} />

  return (
    <section>
      <header className="modul-baslik">
        <div>
          <h1>Sürücüler</h1>
          <p className="alt-metin">Diskler, USB bellekler, harici diskler ve bulut klasörlerin.</p>
        </div>
        <button className="dugme" onClick={yukle}>Yenile</button>
      </header>

      {!suruculer && <p className="alt-metin">Sürücüler algılanıyor…</p>}
      {suruculer &&
        GRUPLAR.map((g) => {
          const liste = suruculer.filter((s) => g.turler.includes(s.tur))
          if (!liste.length && g.turler[0] !== 'usb') return null
          return (
            <div key={g.ad}>
              <h3>{g.ad}</h3>
              {liste.length ? (
                <div className="surucu-izgara">
                  {liste.map((s) => <SurucuKarti key={s.id} surucu={s} ac={() => setAcikYol(s.yol)} />)}
                </div>
              ) : (
                <p className="ipucu">Takılı USB bellek veya harici disk yok. Taktığında burada otomatik görünür.</p>
              )}
            </div>
          )
        })}

      {onemli.length > 0 && (
        <>
          <h3>Önemli Klasörler</h3>
          <div className="klasor-izgara">
            {onemli.map((k) => (
              <button key={k.yol} className="klasor-kisayol" onClick={() => setAcikYol(k.yol)} title={k.yol}>
                <span>{k.ikon}</span>
                {k.ad}
              </button>
            ))}
          </div>
        </>
      )}
    </section>
  )
}
