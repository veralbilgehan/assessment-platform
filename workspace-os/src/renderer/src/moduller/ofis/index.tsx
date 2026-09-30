import { useEffect, useState } from 'react'
import type { ProjeDosyasi, Surucu } from '@shared/tipler'
import { KATEGORI_HARITASI } from '@shared/kategoriler'
import { editorBul } from '@shared/ofis'
import { modulKaydet, type ModulProps } from '@core/modulKayit'
import { useKabuk } from '@core/kabukBaglami'
import { goreliZaman, hataMesaji } from '@core/bicim'
import { sonParca, ustKlasor } from '@core/yol'
import { GRUPLAR, OFIS_UYGULAMALARI, type OfisUygulamasi, type UygulamaGrubu } from './uygulamalar'
import BelgeEditoru from './BelgeEditoru'

function Ofis(props: ModulProps) {
  const yol = (props.parametre as { yol?: string } | undefined)?.yol
  const { modulAc } = useKabuk()
  return yol ? <BelgeEditoru yol={yol} kapat={() => modulAc('ofis')} /> : <OfisAnaEkrani {...props} />
}

function OfisAnaEkrani({ durum, durumGuncelle }: ModulProps) {
  const { modulAc, belgeAc } = useKabuk()
  const [sonBelgeler, setSonBelgeler] = useState<ProjeDosyasi[]>([])
  const [bulut, setBulut] = useState<Surucu[]>([])
  const [mesaj, setMesaj] = useState<string | null>(null)
  const [hata, setHata] = useState<string | null>(null)
  const dahiliEditor = durum.tercihler.dahiliEditor !== false
  const googleDrive = bulut.find((b) => b.saglayici === 'google-drive')

  useEffect(() => {
    window.workspace
      .dosyaSorgula({ kategoriler: ['word', 'excel', 'sunum', 'metin'], siralama: 'son', limit: 60 })
      .then((r) => setSonBelgeler(r.dosyalar.filter((d) => editorBul(d.ad)).slice(0, 10)))
    window.workspace.suruculeriGetir().then((s) => setBulut(s.filter((x) => x.tur === 'bulut')))
  }, [])

  const calistir = async (fn: () => Promise<unknown>) => {
    setHata(null)
    setMesaj(null)
    try {
      await fn()
    } catch (e) {
      setHata(hataMesaji(e))
    }
  }

  const uygulamaAc = (u: OfisUygulamasi) =>
    calistir(async () => {
      if (u.eylem === 'drive') {
        if (googleDrive) modulAc('suruculer', { yol: googleDrive.yol })
        else await window.workspace.webAc(u.web!)
        return
      }
      if (u.eylem === 'ajan') {
        setMesaj('Office Agent, Modül 5 (Yapay Zeka) ile etkinleşecek. Açık belgeye doğrudan içerik yazabilecek.')
        return
      }
      if (!u.editor) return
      const konum = u.grup === 'google' && googleDrive ? 'google-drive' : 'belgeler'
      const yol = await window.workspace.yeniBelge(u.editor, konum)
      modulAc('ofis', { yol }) // yeni belge her zaman kendi editörümüzde açılır
    })

  const dahiliDegistir = async (acik: boolean) =>
    durumGuncelle(await window.workspace.tercihleriKaydet({ ...durum.tercihler, dahiliEditor: acik }))

  return (
    <section>
      <header className="modul-baslik">
        <div>
          <h1>Ofis</h1>
          <p className="alt-metin">Word, Excel ve PowerPoint'i açmadan belge oluştur ve düzenle.</p>
        </div>
        <label className="onay-kutusu">
          <input type="checkbox" checked={dahiliEditor} onChange={(e) => dahiliDegistir(e.target.checked)} />
          Belgeleri Workspace içinde aç
        </label>
      </header>

      {hata && <div className="hata" role="alert">{hata}</div>}
      {mesaj && <div className="bilgi-kutusu">{mesaj}</div>}

      {(Object.keys(GRUPLAR) as UygulamaGrubu[]).map((g) => (
        <div key={g} className="uygulama-grubu">
          <h3 lang="en">{GRUPLAR[g].ad}</h3>
          <p className="ipucu">
            {g === 'google' && !googleDrive
              ? 'Google Drive for Desktop bulunamadı — belgeler Belgeler klasörüne kaydedilir.'
              : GRUPLAR[g].aciklama}
          </p>
          <div className="uygulama-izgara">
            {OFIS_UYGULAMALARI.filter((u) => u.grup === g).map((u) => (
              <div key={u.id} className="uygulama-kart" style={{ '--uygulama-renk': u.renk } as React.CSSProperties}>
                <button className="uygulama-ana" onClick={() => uygulamaAc(u)} title={u.editor ? `Yeni ${u.ad} belgesi` : u.ad}>
                  <span className="uygulama-ikon">{u.ikon}</span>
                  <strong>{u.ad}</strong>
                  <small>{u.editor ? `+ Yeni · ${u.aciklama}` : u.aciklama}</small>
                </button>
                {u.web && u.eylem !== 'drive' && (
                  <button className="uygulama-web" onClick={() => calistir(() => window.workspace.webAc(u.web!))} title="Çevrimiçi sürümü tarayıcıda aç">
                    🌐
                  </button>
                )}
              </div>
            ))}
          </div>
        </div>
      ))}

      <h3>Son belgeler</h3>
      {sonBelgeler.length === 0 ? (
        <p className="ipucu">Henüz belge yok. Yukarıdan yeni bir belge oluştur.</p>
      ) : (
        <div className="son-belgeler">
          {sonBelgeler.map((d) => (
            <button key={d.yol} className="son-belge" onClick={() => calistir(() => belgeAc(d.yol))} title={d.yol}>
              <span className="dosya-ikon">{KATEGORI_HARITASI[d.kategori].ikon}</span>
              <span className="devam-ad">
                <strong>{d.ad}</strong>
                <small>{sonParca(ustKlasor(d.yol) ?? '')} · {goreliZaman(Math.max(d.sonAcilma ?? 0, d.degistirilme))}</small>
              </span>
            </button>
          ))}
        </div>
      )}
    </section>
  )
}

modulKaydet({ id: 'ofis', ad: 'Ofis', ikon: '📝', sira: 25, grup: 'ofis', bilesen: Ofis })
