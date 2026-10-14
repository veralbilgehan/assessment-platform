import type { AdimProps } from '../adimTipleri'

// Seçimler ileride modüllerin varsayılanlarını belirler (ör. "medya" → video klasörleri öne çıkar)
export const AMACLAR = [
  { id: 'ofis', ikon: '📄', ad: 'Ofis & Doküman', aciklama: 'Word, Excel, sunumlar' },
  { id: 'yazilim', ikon: '💻', ad: 'Yazılım', aciklama: 'Kod, JSON, proje klasörleri' },
  { id: 'medya', ikon: '🎬', ad: 'Medya', aciklama: 'Video, fotoğraf, ses' },
  { id: 'egitim', ikon: '🎓', ad: 'Eğitim', aciklama: 'Ders notları, ödevler, PDF' },
  { id: 'arsiv', ikon: '🗄️', ad: 'Arşiv & Yedek', aciklama: 'Harici diskler, bulut yedekleri' },
  { id: 'ai', ikon: '✨', ad: 'Yapay Zeka', aciklama: 'AI ile içerik üretimi' },
]

export default function KullanimAmaci({ taslak, profilGuncelle }: AdimProps) {
  const secili = taslak.profil.kullanimAmaci
  const degistir = (id: string) =>
    profilGuncelle({ kullanimAmaci: secili.includes(id) ? secili.filter((x) => x !== id) : [...secili, id] })

  return (
    <div className="adim">
      <h2>Bilgisayarını en çok ne için kullanıyorsun?</h2>
      <p className="alt-metin">Birden fazla seçebilirsin. Çalışma alanın buna göre düzenlenecek.</p>
      <div className="kart-izgara">
        {AMACLAR.map((a) => (
          <button
            key={a.id}
            className={`secim-kart ${secili.includes(a.id) ? 'secili' : ''}`}
            onClick={() => degistir(a.id)}
          >
            <span className="kart-ikon">{a.ikon}</span>
            <strong>{a.ad}</strong>
            <small>{a.aciklama}</small>
          </button>
        ))}
      </div>
    </div>
  )
}
