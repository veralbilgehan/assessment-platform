import { useEffect, useState } from 'react'
import type { AdimProps } from '../adimTipleri'

// Windows kurulumunun "Her şeyi senin için hazırlıyoruz" ekranı.
// Mesajlar kozmetik; kalıcı kayıt KurulumSihirbazi.tamamla() içinde yapılır.
const MESAJLAR = [
  'Profilin oluşturuluyor',
  'Kaynakların bağlanıyor',
  'Çalışma alanın hazırlanıyor',
  'Modüller yükleniyor',
  'Neredeyse hazır',
]

export default function Hazirlaniyor({ taslak, ileri }: AdimProps) {
  const [i, setI] = useState(0)

  useEffect(() => {
    if (i >= MESAJLAR.length) {
      ileri()
      return
    }
    const z = setTimeout(() => setI(i + 1), 900)
    return () => clearTimeout(z)
  }, [i])

  return (
    <div className="adim adim-ortala hazirlaniyor">
      <div className="donen-halka" />
      <h2>Merhaba {taslak.profil.ad}</h2>
      <p className="alt-metin gecis" key={i}>{MESAJLAR[Math.min(i, MESAJLAR.length - 1)]}…</p>
      <p className="ipucu">Bilgisayarını kapatma</p>
    </div>
  )
}
