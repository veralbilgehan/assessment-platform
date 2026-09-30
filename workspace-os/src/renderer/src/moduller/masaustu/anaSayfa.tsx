import { modulKaydet, type ModulProps } from '@core/modulKayit'

function AnaSayfa({ durum, durumGuncelle }: ModulProps) {
  const saat = new Date().getHours()
  const selam = saat < 12 ? 'Günaydın' : saat < 18 ? 'İyi günler' : 'İyi akşamlar'

  const sifirla = async () => {
    if (confirm('Kurulum sıfırlanacak ve karşılama ekranı yeniden açılacak. Emin misin?'))
      durumGuncelle(await window.workspace.kurulumSifirla())
  }

  return (
    <section className="ana-sayfa">
      <h1>{selam}, {durum.profil?.ad}</h1>
      <p className="alt-metin">Çalışma alanın hazır. Dosya, proje, ofis ve AI modülleri sırayla buraya eklenecek.</p>
      <div className="kart-izgara">
        {['💽 Sürücüler', '📂 Projeler', '📝 Ofis', '✨ AI'].map((x) => (
          <div key={x} className="secim-kart pasif">
            <strong>{x}</strong>
            <small>Yakında</small>
          </div>
        ))}
      </div>
      <button className="dugme" onClick={sifirla}>Kurulumu sıfırla</button>
    </section>
  )
}

modulKaydet({ id: 'ana-sayfa', ad: 'Ana Sayfa', ikon: '🏠', sira: 0, grup: 'ana', bilesen: AnaSayfa })
