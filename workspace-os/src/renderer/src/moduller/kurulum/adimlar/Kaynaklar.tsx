import { useEffect, useState } from 'react'
import type { OnemliKlasor, Surucu } from '@shared/tipler'
import { SURUCU_IKONU } from '../../dosyalar/SurucuKarti'
import type { AdimProps } from '../adimTipleri'

// Hangi klasör/sürücülerin Kütüphane'ye taranacağını seçtirir.
// Varsayılan: bilinen kullanıcı klasörleri + bulut klasörleri (hızlı ve anlamlı).
export default function Kaynaklar({ taslak, guncelle }: AdimProps) {
  const [suruculer, setSuruculer] = useState<Surucu[]>([])
  const [onemli, setOnemli] = useState<OnemliKlasor[]>([])
  const [ekstra, setEkstra] = useState<string[]>([])
  const [yukleniyor, setYukleniyor] = useState(true)
  const secili = new Set(taslak.kaynaklar)

  useEffect(() => {
    Promise.all([window.workspace.suruculeriGetir(), window.workspace.onemliKlasorler()]).then(([s, o]) => {
      setSuruculer(s.filter((x) => x.tur !== 'bulut'))
      setOnemli(o)
      const bilinen = new Set([...s.map((x) => x.yol), ...o.map((x) => x.yol)])
      setEkstra(taslak.kaynaklar.filter((y) => !bilinen.has(y)))
      if (taslak.kaynaklar.length === 0) guncelle({ kaynaklar: o.filter((k) => k.kaynak !== 'surucu').map((k) => k.yol) })
      setYukleniyor(false)
    })
  }, [])

  const degistir = (yol: string) =>
    guncelle({ kaynaklar: secili.has(yol) ? taslak.kaynaklar.filter((y) => y !== yol) : [...taslak.kaynaklar, yol] })

  const klasorEkle = async () => {
    const yol = await window.workspace.klasorSec()
    if (!yol || secili.has(yol)) return
    setEkstra((e) => [...e, yol])
    guncelle({ kaynaklar: [...taslak.kaynaklar, yol] })
  }

  const Satir = ({ yol, ikon, ad, not }: { yol: string; ikon: string; ad: string; not?: string }) => (
    <label className="kaynak-satir">
      <input type="checkbox" checked={secili.has(yol)} onChange={() => degistir(yol)} />
      <span className="kaynak-ikon">{ikon}</span>
      <span className="kaynak-metin">
        <strong>{ad}</strong>
        <small>{yol}{not ? ` · ${not}` : ''}</small>
      </span>
    </label>
  )

  if (yukleniyor) return <div className="adim adim-ortala"><div className="donen-halka" /><p className="alt-metin">Sürücüler algılanıyor…</p></div>

  return (
    <div className="adim">
      <h2>Dosyaların nerede?</h2>
      <p className="alt-metin">
        Seçtiğin konumlar taranıp dosyaların türlerine göre ayrıştırılacak. Tüm diski taramak daha uzun sürer.
      </p>

      <h3>Önerilen klasörler</h3>
      <div className="kaynak-liste">
        {onemli.map((k) => <Satir key={k.yol} yol={k.yol} ikon={k.ikon} ad={k.ad} />)}
        {ekstra.map((y) => <Satir key={y} yol={y} ikon="📁" ad={y.split(/[\\/]/).filter(Boolean).pop() ?? y} />)}
      </div>
      <button className="dugme kucuk" onClick={klasorEkle}>+ Başka klasör ekle</button>

      <h3>Tüm sürücüler</h3>
      <div className="kaynak-liste">
        {suruculer.map((s) => <Satir key={s.yol} yol={s.yol} ikon={SURUCU_IKONU[s.tur]} ad={s.ad} not="tam tarama" />)}
      </div>
    </div>
  )
}
