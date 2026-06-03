import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext.jsx';

export default function Login() {
  const [eposta, setEposta]   = useState('');
  const [sifre,  setSifre]    = useState('');
  const [hata,   setHata]     = useState('');
  const [yukleniyor, setYukleniyor] = useState(false);
  const { girisYap } = useAuth();
  const navigate = useNavigate();

  async function handleSubmit(e) {
    e.preventDefault();
    setHata('');
    setYukleniyor(true);
    try {
      await girisYap(eposta, sifre);
      navigate('/app');
    } catch (err) {
      setHata(err.message);
    } finally {
      setYukleniyor(false);
    }
  }

  return (
    <div style={{
      minHeight: '100vh', display: 'flex',
      background: 'linear-gradient(135deg, #0ea5e9 0%, #0284c7 50%, #0369a1 100%)',
    }}>
      {/* Sol panel */}
      <div style={{
        flex: 1, display: 'flex', flexDirection: 'column',
        alignItems: 'center', justifyContent: 'center',
        color: '#fff', padding: '3rem',
      }}>
        <div style={{ fontSize: 64, marginBottom: 16 }}>👓</div>
        <h1 style={{ fontSize: 36, fontWeight: 800, marginBottom: 8 }}>Optik360</h1>
        <p style={{ fontSize: 16, opacity: .85, textAlign: 'center', maxWidth: 320 }}>
          Gözlük sektörü için entegre ERP ve bayi yönetim platformu
        </p>
        <div style={{ display: 'flex', gap: 24, marginTop: 32, flexWrap: 'wrap', justifyContent: 'center' }}>
          {['Cari Hesap', 'Stok Takibi', 'Sipariş', 'Tahsilat'].map(f => (
            <div key={f} style={{
              background: 'rgba(255,255,255,.15)', borderRadius: 8,
              padding: '0.5rem 1rem', fontSize: 13, fontWeight: 600,
            }}>{f}</div>
          ))}
        </div>
      </div>

      {/* Sağ panel — login formu */}
      <div style={{
        width: 420, background: '#fff', display: 'flex',
        flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
        padding: '2.5rem',
      }}>
        <h2 style={{ fontWeight: 800, fontSize: 22, marginBottom: 4 }}>Giriş Yap</h2>
        <p style={{ color: 'var(--muted)', fontSize: 13, marginBottom: 28 }}>
          Hesabınıza erişin
        </p>

        <form onSubmit={handleSubmit} style={{ width: '100%', display: 'flex', flexDirection: 'column', gap: 14 }}>
          <div>
            <label style={{ fontWeight: 600, fontSize: 13, display: 'block', marginBottom: 5 }}>E-posta</label>
            <input
              type="email" value={eposta} onChange={e => setEposta(e.target.value)}
              placeholder="ornek@optik360.com" required
              style={{
                width: '100%', padding: '0.65rem 0.85rem', borderRadius: 8,
                border: '1.5px solid var(--border)', background: 'var(--surface2)',
                fontSize: 14, outline: 'none',
              }}
            />
          </div>
          <div>
            <label style={{ fontWeight: 600, fontSize: 13, display: 'block', marginBottom: 5 }}>Şifre</label>
            <input
              type="password" value={sifre} onChange={e => setSifre(e.target.value)}
              placeholder="••••••••" required
              style={{
                width: '100%', padding: '0.65rem 0.85rem', borderRadius: 8,
                border: '1.5px solid var(--border)', background: 'var(--surface2)',
                fontSize: 14, outline: 'none',
              }}
            />
          </div>

          {hata && (
            <div style={{
              background: 'rgba(220,38,38,.08)', color: 'var(--red)',
              borderRadius: 8, padding: '0.6rem 0.85rem', fontSize: 13,
            }}>{hata}</div>
          )}

          <button type="submit" disabled={yukleniyor} style={{
            padding: '0.75rem', borderRadius: 8, marginTop: 4,
            background: yukleniyor ? 'var(--muted)' : 'var(--accent)',
            color: '#fff', fontWeight: 700, fontSize: 15,
            cursor: yukleniyor ? 'not-allowed' : 'pointer',
          }}>
            {yukleniyor ? 'Giriş yapılıyor...' : 'Giriş Yap'}
          </button>
        </form>

        <p style={{ marginTop: 20, fontSize: 12, color: 'var(--muted)', textAlign: 'center' }}>
          Demo: admin@optik360.com / password
        </p>
      </div>
    </div>
  );
}
