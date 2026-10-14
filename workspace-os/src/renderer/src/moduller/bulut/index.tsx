import { useEffect, useState } from 'react'
import { SAGLAYICI_BILGISI, type BulutAyarlari, type BulutHesabi, type BulutSaglayici } from '@shared/bulut'
import { modulKaydet, type ModulProps } from '@core/modulKayit'
import { boyutBicimle, hataMesaji } from '@core/bicim'
import BulutGezgini from './BulutGezgini'

// Bulut Hesapları: Google Drive ve OneDrive'a doğrudan (API ile) bağlanma.
// Bilgisayarda senkron klasörü olmasa bile dosyalara erişilir, Workspace'te düzenlenip geri yüklenir.
function BulutHesaplari({ parametre }: ModulProps) {
  const [hesaplar, setHesaplar] = useState<BulutHesabi[] | null>(null)
  const [acik, setAcik] = useState<BulutSaglayici | null>((parametre as { saglayici?: BulutSaglayici } | undefined)?.saglayici ?? null)
  const [baglaniyor, setBaglaniyor] = useState<BulutSaglayici | null>(null)
  const [kurulum, setKurulum] = useState(false)
  const [hata, setHata] = useState<string | null>(null)

  const yukle = () => window.workspace.bulutHesaplar().then(setHesaplar)
  useEffect(() => {
    yukle()
  }, [])

  const guncelle = (h: BulutHesabi) => setHesaplar((l) => l?.map((x) => (x.saglayici === h.saglayici ? h : x)) ?? null)

  const baglan = async (s: BulutSaglayici) => {
    setBaglaniyor(s)
    setHata(null)
    try {
      guncelle(await window.workspace.bulutBaglan(s))
    } catch (e) {
      setHata(hataMesaji(e))
    } finally {
      setBaglaniyor(null)
    }
  }
  const baglantiKes = async (s: BulutSaglayici) => {
    if (confirm(`${SAGLAYICI_BILGISI[s].ad} bağlantısı kesilsin mi? Buluttaki dosyaların etkilenmez.`)) guncelle(await window.workspace.bulutBaglantiKes(s))
  }

  if (acik) return <BulutGezgini saglayici={acik} kapat={() => setAcik(null)} />

  return (
    <section className="ai-modul">
      <header className="modul-baslik">
        <div>
          <h1>Bulut Hesapları</h1>
          <p className="alt-metin">Google Drive ve OneDrive'daki dosyalarına doğrudan eriş; Workspace'te düzenle, değişiklikler otomatik geri yüklensin.</p>
        </div>
      </header>

      {hata && <div className="hata" role="alert">{hata}</div>}

      <div className="hesap-izgara">
        {hesaplar?.map((h) => {
          const b = SAGLAYICI_BILGISI[h.saglayici]
          const oran = h.kota?.toplam ? h.kota.kullanilan / h.kota.toplam : null
          return (
            <div key={h.saglayici} className="hesap-kart" style={{ '--hesap-renk': b.renk } as React.CSSProperties}>
              <div className="hesap-ust">
                <span className="hesap-ikon">{b.ikon}</span>
                <div>
                  <strong>{b.ad}</strong>
                  <small>{h.bagli ? h.eposta ?? 'Bağlı' : h.yapilandirildi ? 'Bağlı değil' : 'Kurulum gerekli'}</small>
                </div>
              </div>
              {h.bagli && h.kota && (
                <>
                  <span className="doluluk"><span style={{ width: `${(oran ?? 0) * 100}%` }} className={oran && oran > 0.9 ? 'kritik' : ''} /></span>
                  <small className="soluk">{boyutBicimle(h.kota.kullanilan)} kullanılıyor{h.kota.toplam ? ` · ${boyutBicimle(h.kota.toplam)}` : ''}</small>
                </>
              )}
              {h.bagli && h.sifreli === false && <small className="soluk">Oturum yalnızca bu açılış için hatırlanıyor (şifreli depo yok).</small>}
              <div className="ai-eylemler">
                {h.bagli ? (
                  <>
                    <button className="dugme kucuk birincil" onClick={() => setAcik(h.saglayici)}>Dosyalara göz at</button>
                    <button className="dugme kucuk" onClick={() => baglantiKes(h.saglayici)}>Bağlantıyı kes</button>
                  </>
                ) : h.yapilandirildi ? (
                  <button className="dugme kucuk birincil" disabled={!!baglaniyor} onClick={() => baglan(h.saglayici)}>
                    {baglaniyor === h.saglayici ? 'Tarayıcıda oturum açmanı bekliyor…' : 'Bağlan'}
                  </button>
                ) : (
                  <button className="dugme kucuk" onClick={() => setKurulum(true)}>Kurulumu yap</button>
                )}
              </div>
            </div>
          )
        })}
      </div>

      <details className="ayar-karti" open={kurulum || undefined}>
        <summary><strong>Kurulum: uygulama kimlikleri</strong></summary>
        <KurulumFormu kaydedildi={yukle} />
      </details>
    </section>
  )
}

function KurulumFormu({ kaydedildi }: { kaydedildi: () => void }) {
  const [a, setA] = useState<BulutAyarlari | null>(null)
  const [google, setGoogle] = useState('')
  const [sir, setSir] = useState('')
  const [ms, setMs] = useState('')
  const [durum, setDurum] = useState<string | null>(null)

  useEffect(() => {
    window.workspace.bulutAyarlar().then((x) => {
      setA(x)
      setGoogle(x.googleIstemciKimligi)
      setMs(x.microsoftIstemciKimligi)
    })
  }, [])

  const kaydet = async () => {
    const x = await window.workspace.bulutAyarlariKaydet({ googleIstemciKimligi: google, microsoftIstemciKimligi: ms, ...(sir ? { googleIstemciSirri: sir } : {}) })
    setA(x)
    setSir('')
    setDurum('✓ Kaydedildi')
    kaydedildi()
  }

  if (!a) return null
  return (
    <div className="kurulum-formu">
      <p className="ipucu">
        Google ve Microsoft, uygulamaların hesaplara erişmek için kayıtlı olmasını ister. Bir kez kendi ücretsiz uygulama kaydını oluşturup kimlikleri buraya gir
        (adım adım rehber: <code>workspace-os/docs/BULUT_KURULUM.md</code>). Parolan hiçbir zaman Workspace'e girmez; oturum kendi tarayıcında açılır.
      </p>
      <h4>Google Drive</h4>
      <p className="ipucu">Google Cloud Console → API'ler ve Hizmetler → Kimlik bilgileri → OAuth istemci kimliği → Uygulama türü: <strong>Masaüstü uygulaması</strong>. Drive API'yi etkinleştir.</p>
      <input value={google} disabled={a.ortamdan.google} onChange={(e) => setGoogle(e.target.value)} placeholder="İstemci kimliği (….apps.googleusercontent.com)" aria-label="Google istemci kimliği" />
      <input type="password" value={sir} disabled={a.ortamdan.google} onChange={(e) => setSir(e.target.value)} placeholder={a.googleIstemciSirriVar ? 'İstemci sırrı kayıtlı (değiştirmek için yaz)' : 'İstemci sırrı (GOCSPX-…)'} aria-label="Google istemci sırrı" />
      <h4>OneDrive</h4>
      <p className="ipucu">Azure portalı → Microsoft Entra ID → Uygulama kayıtları → Yeni kayıt → Hesap türü: <strong>tüm kuruluş dizinleri ve kişisel Microsoft hesapları</strong> → Platform: <strong>Mobil ve masaüstü</strong>, yönlendirme adresi <code>http://localhost</code>.</p>
      <input value={ms} disabled={a.ortamdan.microsoft} onChange={(e) => setMs(e.target.value)} placeholder="Uygulama (istemci) kimliği" aria-label="Microsoft uygulama kimliği" />
      <div className="ai-eylemler">
        <button className="dugme kucuk birincil" onClick={kaydet}>Kaydet</button>
        <span className="soluk">{durum}</span>
      </div>
    </div>
  )
}

modulKaydet({ id: 'bulut', ad: 'Bulut Hesapları', ikon: '☁️', sira: 12, grup: 'ana', bilesen: BulutHesaplari })
