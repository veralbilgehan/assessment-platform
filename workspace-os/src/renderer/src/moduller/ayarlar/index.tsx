import { useEffect, useState } from 'react'
import type { GuncellemeDurumu, Tema } from '@shared/tipler'
import { modulKaydet, type ModulProps } from '@core/modulKayit'
import { hataMesaji } from '@core/bicim'

const TEMALAR: { id: Tema; ad: string }[] = [
  { id: 'acik', ad: 'Açık' },
  { id: 'koyu', ad: 'Koyu' },
  { id: 'sistem', ad: 'Sistem' },
]

export const GUNCELLEME_METNI: Record<GuncellemeDurumu['durum'], string> = {
  gelistirme: 'Geliştirme sürümü — güncellemeler kurulum dosyasıyla yüklenen uygulamada denetlenir.',
  bekliyor: 'Güncellemeler birazdan denetlenecek.',
  kontrol: 'Güncellemeler denetleniyor…',
  guncel: '✓ En güncel sürümü kullanıyorsun.',
  indiriliyor: 'Yeni sürüm indiriliyor…',
  hazir: 'Yeni sürüm indirildi ve kurulmaya hazır.',
  hata: 'Güncelleme denetlenemedi.',
}

function Ayarlar({ durum, durumGuncelle }: ModulProps) {
  const t = durum.tercihler
  const [g, setG] = useState<GuncellemeDurumu | null>(null)
  const [hata, setHata] = useState<string | null>(null)
  const tercih = async (d: Partial<typeof t>) => durumGuncelle(await window.workspace.tercihleriKaydet({ ...t, ...d }))

  useEffect(() => {
    window.workspace.guncellemeDurumu().then(setG)
    return window.workspace.olayDinle('guncelleme:durum', setG)
  }, [])

  const denetle = async () => {
    setHata(null)
    try {
      setG(await window.workspace.guncellemeKontrol())
    } catch (e) {
      setHata(hataMesaji(e))
    }
  }

  return (
    <section className="ai-modul">
      <header className="modul-baslik">
        <div>
          <h1>Ayarlar</h1>
          <p className="alt-metin">Görünüm, güncellemeler ve uygulama bilgileri.</p>
        </div>
      </header>

      <div className="ayar-karti">
        <h3>Görünüm</h3>
        <div className="segment">
          {TEMALAR.map((x) => (
            <button key={x.id} className={t.tema === x.id ? 'secili' : ''} onClick={() => tercih({ tema: x.id })}>{x.ad}</button>
          ))}
        </div>
      </div>

      <div className="ayar-karti">
        <h3>Güncellemeler</h3>
        {g && (
          <>
            <p className={`ai-durum ${g.durum === 'guncel' ? 'iyi' : ''}`}>
              {GUNCELLEME_METNI[g.durum]}
              {g.yeniSurum && g.durum !== 'guncel' && ` (sürüm ${g.yeniSurum})`}
              {g.durum === 'indiriliyor' && g.yuzde !== undefined && ` %${g.yuzde}`}
            </p>
            {g.durum === 'indiriliyor' && <span className="doluluk"><span style={{ width: `${g.yuzde ?? 0}%` }} /></span>}
            {g.mesaj && <small className="soluk">{g.mesaj}</small>}
          </>
        )}
        {hata && <div className="hata">{hata}</div>}
        <div className="ai-eylemler">
          {g?.durum === 'hazir' ? (
            <button className="dugme kucuk birincil" onClick={() => window.workspace.guncellemeKur()}>Yeniden başlat ve güncelle</button>
          ) : (
            <button className="dugme kucuk" disabled={g?.durum === 'kontrol' || g?.durum === 'indiriliyor'} onClick={denetle}>Şimdi denetle</button>
          )}
        </div>
        <label className="anahtar-satir">
          <input type="checkbox" checked={t.otomatikGuncelleme !== false} onChange={(e) => tercih({ otomatikGuncelleme: e.target.checked })} />
          <span>
            <strong>Güncellemeleri otomatik denetle ve indir</strong>
            <small>Açılışta ve 4 saatte bir denetlenir. İndirilen sürüm, uygulamayı kapattığında ya da "Yeniden başlat" dediğinde kurulur.</small>
          </span>
        </label>
      </div>

      <div className="ayar-karti">
        <h3>Hakkında</h3>
        <p className="ai-durum">Workspace OS {g?.surum}</p>
        <div className="ai-eylemler">
          <button className="dugme kucuk" onClick={() => window.workspace.veriKlasoruAc()}>Veri klasörünü aç</button>
        </div>
        <small className="soluk">Ayarlar, dosya dizini, yedekler ve bulut önbelleği bu klasörde tutulur.</small>
      </div>
    </section>
  )
}

modulKaydet({ id: 'ayarlar', ad: 'Ayarlar', ikon: '⚙️', sira: 90, grup: 'sistem', bilesen: Ayarlar })
