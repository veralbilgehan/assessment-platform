import { useEffect, useState } from 'react'
import type { ProjeDosyasi } from '@shared/tipler'
import { KATEGORI_HARITASI, PROJE_KATEGORILERI } from '@shared/kategoriler'
import { modulKaydet, type ModulProps } from '@core/modulKayit'
import { goreliZaman, hataMesaji } from '@core/bicim'

const KISAYOLLAR = [
  { ikon: '💽', ad: 'Sürücüler', aciklama: 'Diskler, USB ve bulut', modul: 'suruculer' },
  { ikon: '📂', ad: 'Projeler', aciklama: 'Devam eden ve tamamlananlar', modul: 'projeler' },
  { ikon: '🗂️', ad: 'Kütüphane', aciklama: 'Türe göre ayrışmış dosyalar', modul: 'kutuphane' },
  { ikon: '📝', ad: 'Ofis', aciklama: 'Yakında' },
  { ikon: '✨', ad: 'AI', aciklama: 'Yakında' },
]

function AnaSayfa({ durum, durumGuncelle, modulAc }: ModulProps) {
  const saat = new Date().getHours()
  const selam = saat < 12 ? 'Günaydın' : saat < 18 ? 'İyi günler' : 'İyi akşamlar'
  const [sonProjeler, setSonProjeler] = useState<ProjeDosyasi[]>([])
  const [hata, setHata] = useState<string | null>(null)

  useEffect(() => {
    window.workspace
      .dosyaSorgula({ kategoriler: PROJE_KATEGORILERI, statu: 'yeni', siralama: 'son', limit: 5 })
      .then((r) => setSonProjeler(r.dosyalar))
  }, [])

  const devamEt = (yol: string) => window.workspace.dosyaAc(yol).catch((e) => setHata(hataMesaji(e)))

  const sifirla = async () => {
    if (confirm('Kurulum sıfırlanacak ve karşılama ekranı yeniden açılacak. Emin misin?'))
      durumGuncelle(await window.workspace.kurulumSifirla())
  }

  return (
    <section className="ana-sayfa">
      <h1>{selam}, {durum.profil?.ad}</h1>
      <p className="alt-metin">Çalışma alanın hazır.</p>

      {sonProjeler.length > 0 && (
        <div className="devam-paneli">
          <div className="panel-baslik">
            <h3>Kaldığın yerden devam et</h3>
            <button className="dugme kucuk metin" onClick={() => modulAc('projeler')}>Tüm projeler →</button>
          </div>
          {sonProjeler.map((p) => (
            <div key={p.yol} className="devam-satir" title={p.yol}>
              <span className="dosya-ikon">{KATEGORI_HARITASI[p.kategori].ikon}</span>
              <span className="devam-ad">
                <strong>{p.ad}</strong>
                <small>{goreliZaman(Math.max(p.sonAcilma ?? 0, p.degistirilme))}</small>
              </span>
              <button className="dugme kucuk birincil" onClick={() => devamEt(p.yol)}>▶ Devam et</button>
            </div>
          ))}
          {hata && <div className="hata">{hata}</div>}
        </div>
      )}

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
