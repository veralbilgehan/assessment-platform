import { modulKaydet, type ModulProps } from '@core/modulKayit'

const KISAYOLLAR = [
  { ikon: '💽', ad: 'Sürücüler', aciklama: 'Diskler, USB ve bulut', modul: 'suruculer' },
  { ikon: '🗂️', ad: 'Kütüphane', aciklama: 'Türe göre ayrışmış dosyalar', modul: 'kutuphane' },
  { ikon: '📂', ad: 'Projeler', aciklama: 'Yakında' },
  { ikon: '📝', ad: 'Ofis', aciklama: 'Yakında' },
  { ikon: '✨', ad: 'AI', aciklama: 'Yakında' },
]

function AnaSayfa({ durum, durumGuncelle, modulAc }: ModulProps) {
  const saat = new Date().getHours()
  const selam = saat < 12 ? 'Günaydın' : saat < 18 ? 'İyi günler' : 'İyi akşamlar'

  const sifirla = async () => {
    if (confirm('Kurulum sıfırlanacak ve karşılama ekranı yeniden açılacak. Emin misin?'))
      durumGuncelle(await window.workspace.kurulumSifirla())
  }

  return (
    <section className="ana-sayfa">
      <h1>{selam}, {durum.profil?.ad}</h1>
      <p className="alt-metin">Çalışma alanın hazır.</p>
      <div className="kart-izgara">
        {KISAYOLLAR.map((k) => (
          <button
            key={k.ad}
            className={`secim-kart ${k.modul ? '' : 'pasif'}`}
            disabled={!k.modul}
            onClick={() => k.modul && modulAc(k.modul)}
          >
            <span className="kart-ikon">{k.ikon}</span>
            <strong>{k.ad}</strong>
            <small>{k.aciklama}</small>
          </button>
        ))}
      </div>
      <button className="dugme" onClick={sifirla}>Kurulumu sıfırla</button>
    </section>
  )
}

modulKaydet({ id: 'ana-sayfa', ad: 'Ana Sayfa', ikon: '🏠', sira: 0, grup: 'ana', bilesen: AnaSayfa })
