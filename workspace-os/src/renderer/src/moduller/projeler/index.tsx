import { useEffect, useState } from 'react'
import { KATEGORI_HARITASI, PROJE_KATEGORILERI, type KategoriId } from '@shared/kategoriler'
import { VARSAYILAN_PROJE_ESIK_GUN } from '@shared/tipler'
import { modulKaydet, type ModulProps } from '@core/modulKayit'
import ProjeListesi from './ProjeListesi'

const ESIKLER = [7, 14, 30, 60, 90]

function Projeler({ durum, durumGuncelle, modulAc }: ModulProps) {
  const [kategori, setKategori] = useState<KategoriId | null>(null)
  const [arama, setArama] = useState('')
  const [dizinVar, setDizinVar] = useState<boolean | null>(null)
  const esik = durum.tercihler.projeEsikGun ?? VARSAYILAN_PROJE_ESIK_GUN

  useEffect(() => {
    window.workspace.dizinOzeti().then((o) => setDizinVar(!!o))
  }, [])

  const esikDegistir = async (gun: number) =>
    durumGuncelle(await window.workspace.tercihleriKaydet({ ...durum.tercihler, projeEsikGun: gun }))

  return (
    <section>
      <header className="modul-baslik">
        <div>
          <h1>Projeler</h1>
          <p className="alt-metin">
            Üzerinde çalıştığın dosyalar <strong>Yeni Projeler</strong>'de, bitenler <strong>Tamamlananlar</strong>'da.
          </p>
        </div>
        <label className="esik-secici" title="Elle işaretlenmemiş dosyalar için">
          Otomatik: son
          <select value={esik} onChange={(e) => esikDegistir(Number(e.target.value))}>
            {ESIKLER.map((g) => <option key={g} value={g}>{g} gün</option>)}
          </select>
          içinde değişenler devam ediyor
        </label>
      </header>

      {dizinVar === false ? (
        <div className="bos-durum">
          <p>Projelerin listelenmesi için önce dosyaların taranmalı.</p>
          <button className="dugme birincil" onClick={() => modulAc('kutuphane')}>Kütüphane'ye git</button>
        </div>
      ) : (
        <>
          <div className="arac-cubugu">
            <div className="filtre-cipleri">
              <button className={`cip ${kategori === null ? 'secili' : ''}`} onClick={() => setKategori(null)}>Tümü</button>
              {PROJE_KATEGORILERI.map((id) => (
                <button key={id} className={`cip ${kategori === id ? 'secili' : ''}`} onClick={() => setKategori(id)}>
                  {KATEGORI_HARITASI[id].ikon} {KATEGORI_HARITASI[id].ad}
                </button>
              ))}
            </div>
            <input className="arama" placeholder="Dosya adında ara…" value={arama} onChange={(e) => setArama(e.target.value)} />
          </div>
          <ProjeListesi
            key={esik}
            statuSekmeli
            sorgu={kategori ? { kategori, arama, siralama: 'son' } : { kategoriler: PROJE_KATEGORILERI, arama, siralama: 'son' }}
          />
        </>
      )}
    </section>
  )
}

modulKaydet({ id: 'projeler', ad: 'Projeler', ikon: '📂', sira: 15, grup: 'ana', bilesen: Projeler })
