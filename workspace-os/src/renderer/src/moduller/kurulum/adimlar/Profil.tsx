import type { AdimProps } from '../adimTipleri'

const RENKLER = ['#4f7cff', '#8b5cf6', '#10b981', '#f59e0b', '#ef4444', '#0ea5e9']

export default function Profil({ taslak, profilGuncelle, sistem, ileri }: AdimProps) {
  const { profil } = taslak
  const basHarf = (profil.ad[0] ?? '?').toLocaleUpperCase('tr')

  return (
    <div className="adim">
      <h2>Seni tanıyalım</h2>
      <p className="alt-metin">Bu bilgiler yalnızca bu bilgisayarda saklanır.</p>

      <div className="profil-satir">
        <div className="avatar" style={{ background: profil.avatarRenk }}>{basHarf}</div>
        <div className="renk-secici">
          {RENKLER.map((r) => (
            <button
              key={r}
              aria-label={`Renk ${r}`}
              className={`renk ${profil.avatarRenk === r ? 'secili' : ''}`}
              style={{ background: r }}
              onClick={() => profilGuncelle({ avatarRenk: r })}
            />
          ))}
        </div>
      </div>

      <form className="form" onSubmit={(e) => { e.preventDefault(); ileri() }}>
        <label>
          Adın *
          <input
            autoFocus
            value={profil.ad}
            placeholder={sistem?.kullaniciAdi ?? 'Adın'}
            onChange={(e) => profilGuncelle({ ad: e.target.value })}
          />
        </label>
        <label>
          Soyadın
          <input value={profil.soyad} onChange={(e) => profilGuncelle({ soyad: e.target.value })} />
        </label>
        <label>
          E-posta
          <input type="email" value={profil.eposta ?? ''} onChange={(e) => profilGuncelle({ eposta: e.target.value })} />
        </label>
        <label>
          Meslek / Rol
          <input
            value={profil.meslek ?? ''}
            placeholder="ör. Yazılım Geliştirici, Öğrenci, Muhasebeci"
            onChange={(e) => profilGuncelle({ meslek: e.target.value })}
          />
        </label>
        <button type="submit" hidden />
      </form>
    </div>
  )
}
