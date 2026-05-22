import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext.jsx';

/* ─── Logo SVG ───────────────────────────────────────── */
function Logo({ size = 48 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 48 48" fill="none">
      <defs>
        <linearGradient id="lg1" x1="0" y1="0" x2="48" y2="48" gradientUnits="userSpaceOnUse">
          <stop offset="0%" stopColor="#6366f1" />
          <stop offset="100%" stopColor="#268d7c" />
        </linearGradient>
        <linearGradient id="lg2" x1="0" y1="0" x2="48" y2="48" gradientUnits="userSpaceOnUse">
          <stop offset="0%" stopColor="#818cf8" />
          <stop offset="100%" stopColor="#34d399" />
        </linearGradient>
      </defs>
      {/* Dış altıgen */}
      <path
        d="M24 3 L42 13.5 L42 34.5 L24 45 L6 34.5 L6 13.5 Z"
        fill="url(#lg1)"
        opacity="0.9"
      />
      {/* İç hexagon */}
      <path
        d="M24 10 L36 17 L36 31 L24 38 L12 31 L12 17 Z"
        fill="#0f1117"
        opacity="0.5"
      />
      {/* Grafik çubukları */}
      <rect x="16" y="26" width="4" height="7" rx="1.5" fill="url(#lg2)" />
      <rect x="22" y="21" width="4" height="12" rx="1.5" fill="url(#lg2)" opacity="0.9" />
      <rect x="28" y="17" width="4" height="16" rx="1.5" fill="url(#lg2)" opacity="0.8" />
    </svg>
  );
}

/* ─── Soyut arka plan desen noktaları ─────────────────── */
function DotPattern() {
  return (
    <svg style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', opacity: 0.05, pointerEvents: 'none' }}>
      <defs>
        <pattern id="dots" x="0" y="0" width="24" height="24" patternUnits="userSpaceOnUse">
          <circle cx="2" cy="2" r="1.5" fill="white" />
        </pattern>
      </defs>
      <rect width="100%" height="100%" fill="url(#dots)" />
    </svg>
  );
}

export default function Login() {
  const { girisYap } = useAuth();
  const navigate = useNavigate();
  const [eposta, setEposta] = useState('');
  const [sifre, setSifre] = useState('');
  const [hata, setHata] = useState('');
  const [yukleniyor, setYukleniyor] = useState(false);
  const [sifreGoster, setSifreGoster] = useState(false);

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
      minHeight: '100vh',
      display: 'flex',
      background: 'var(--bg)',
      fontFamily: "'Segoe UI', system-ui, sans-serif",
    }}>
      {/* ─── Sol Panel — Marka ─────────────────────────── */}
      <div style={{
        flex: '1 1 50%',
        background: 'linear-gradient(145deg, #0d0f18 0%, #12162a 50%, #0d1520 100%)',
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'center',
        alignItems: 'flex-start',
        padding: '4rem 3.5rem',
        position: 'relative',
        overflow: 'hidden',
        minHeight: '100vh',
      }}>
        <DotPattern />

        {/* Dekoratif ışık halkası */}
        <div style={{
          position: 'absolute',
          width: 400, height: 400,
          borderRadius: '50%',
          background: 'radial-gradient(circle, rgba(99,102,241,0.15) 0%, transparent 70%)',
          top: '10%', left: '-10%',
          pointerEvents: 'none',
        }} />
        <div style={{
          position: 'absolute',
          width: 300, height: 300,
          borderRadius: '50%',
          background: 'radial-gradient(circle, rgba(38,141,124,0.12) 0%, transparent 70%)',
          bottom: '15%', right: '5%',
          pointerEvents: 'none',
        }} />

        <div style={{ position: 'relative', maxWidth: 480 }}>
          {/* Logo + marka */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 16, marginBottom: '2.5rem' }}>
            <Logo size={52} />
            <div>
              <div style={{ fontSize: '1.05rem', fontWeight: 800, color: '#e2e8f0', lineHeight: 1.2 }}>
                Değerlendirme
              </div>
              <div style={{ fontSize: '1.05rem', fontWeight: 800, color: '#6366f1', lineHeight: 1.2 }}>
                Sistemi
              </div>
            </div>
          </div>

          {/* Başlık */}
          <h1 style={{
            fontSize: '2.2rem', fontWeight: 800,
            color: '#f1f5f9', lineHeight: 1.25,
            margin: '0 0 1rem',
          }}>
            AI Destekli<br />
            <span style={{
              background: 'linear-gradient(90deg, #818cf8, #34d399)',
              WebkitBackgroundClip: 'text',
              WebkitTextFillColor: 'transparent',
            }}>
              İşe Alım Platformu
            </span>
          </h1>
          <p style={{ color: '#8892a4', fontSize: 15, lineHeight: 1.7, margin: '0 0 2.5rem' }}>
            Adayları değerlendirin, performansı analiz edin ve en doğru kararı verin. Tüm süreç tek platformda.
          </p>

          {/* Özellik listesi */}
          {[
            { simge: '🧠', metin: 'Claude AI ile otomatik analiz' },
            { simge: '📊', metin: 'Detaylı performans raporları' },
            { simge: '⚖️',  metin: 'Aday karşılaştırma modülü'  },
            { simge: '📦', metin: 'Merkezi evrak yönetimi'       },
          ].map((o, i) => (
            <div key={i} style={{
              display: 'flex', alignItems: 'center', gap: 12,
              marginBottom: 12, color: '#cbd5e1',
            }}>
              <span style={{
                fontSize: 14,
                width: 32, height: 32,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                borderRadius: 8,
                background: 'rgba(99,102,241,0.15)',
                flexShrink: 0,
              }}>{o.simge}</span>
              <span style={{ fontSize: 13 }}>{o.metin}</span>
            </div>
          ))}
        </div>
      </div>

      {/* ─── Sağ Panel — Form ──────────────────────────── */}
      <div style={{
        flex: '0 0 420px',
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'center',
        padding: '3rem 3rem',
        background: 'var(--surface)',
        borderLeft: '1px solid var(--border)',
        position: 'relative',
      }}>
        <div style={{ width: '100%', maxWidth: 360, margin: '0 auto' }}>
          {/* Form başlığı */}
          <div style={{ marginBottom: '2rem' }}>
            <h2 style={{ fontSize: '1.4rem', fontWeight: 700, color: 'var(--text)', margin: '0 0 6px' }}>
              Giriş Yapın
            </h2>
            <p style={{ color: 'var(--muted)', fontSize: 13, margin: 0 }}>
              Hesabınıza erişmek için bilgilerinizi girin
            </p>
          </div>

          <form onSubmit={handleSubmit}>
            {/* E-posta */}
            <div style={{ marginBottom: '1.1rem' }}>
              <label style={{
                display: 'block', fontSize: 11, fontWeight: 700,
                color: 'var(--muted)', marginBottom: 6, letterSpacing: '0.06em',
              }}>
                E-POSTA ADRESİ
              </label>
              <input
                type="email"
                value={eposta}
                onChange={e => setEposta(e.target.value)}
                required
                placeholder="ornek@sirket.com"
                style={{
                  width: '100%', boxSizing: 'border-box',
                  padding: '0.7rem 0.9rem', fontSize: 14,
                  borderRadius: 8,
                }}
              />
            </div>

            {/* Şifre */}
            <div style={{ marginBottom: '1.75rem' }}>
              <label style={{
                display: 'block', fontSize: 11, fontWeight: 700,
                color: 'var(--muted)', marginBottom: 6, letterSpacing: '0.06em',
              }}>
                ŞİFRE
              </label>
              <div style={{ position: 'relative' }}>
                <input
                  type={sifreGoster ? 'text' : 'password'}
                  value={sifre}
                  onChange={e => setSifre(e.target.value)}
                  required
                  placeholder="••••••••"
                  style={{
                    width: '100%', boxSizing: 'border-box',
                    padding: '0.7rem 2.5rem 0.7rem 0.9rem', fontSize: 14,
                    borderRadius: 8,
                  }}
                />
                <button
                  type="button"
                  onClick={() => setSifreGoster(v => !v)}
                  style={{
                    position: 'absolute', right: 10, top: '50%', transform: 'translateY(-50%)',
                    background: 'none', border: 'none', cursor: 'pointer',
                    color: 'var(--muted)', fontSize: 14, padding: 4,
                  }}
                  title={sifreGoster ? 'Gizle' : 'Göster'}
                >
                  {sifreGoster ? '🙈' : '👁'}
                </button>
              </div>
            </div>

            {/* Hata mesajı */}
            {hata && (
              <div style={{
                background: 'rgba(239,68,68,0.10)',
                border: '1px solid rgba(239,68,68,0.3)',
                color: '#f87171',
                borderRadius: 8, padding: '0.65rem 0.9rem',
                fontSize: 13, marginBottom: '1.25rem',
                display: 'flex', gap: 8, alignItems: 'flex-start',
              }}>
                <span>⚠️</span> {hata}
              </div>
            )}

            {/* Giriş butonu */}
            <button
              type="submit"
              disabled={yukleniyor}
              style={{
                width: '100%', padding: '0.85rem',
                background: yukleniyor
                  ? 'var(--muted)'
                  : 'linear-gradient(135deg, #6366f1 0%, #4338ca 100%)',
                color: '#fff', border: 'none', borderRadius: 8,
                fontSize: 14, fontWeight: 700,
                cursor: yukleniyor ? 'wait' : 'pointer',
                letterSpacing: '0.02em',
                transition: 'opacity 0.2s, transform 0.1s',
                boxShadow: yukleniyor ? 'none' : '0 4px 16px rgba(99,102,241,0.4)',
              }}
              onMouseEnter={e => { if (!yukleniyor) e.currentTarget.style.opacity = '0.9'; }}
              onMouseLeave={e => e.currentTarget.style.opacity = '1'}
            >
              {yukleniyor ? '⏳ Giriş yapılıyor...' : 'Giriş Yap →'}
            </button>
          </form>

          {/* Demo bilgisi */}
          <div style={{
            marginTop: '1.5rem',
            padding: '0.75rem 1rem',
            background: 'var(--surface2)',
            border: '1px solid var(--border)',
            borderRadius: 8,
          }}>
            <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--muted)', marginBottom: 4, letterSpacing: '0.05em' }}>
              🔑 DEMO HESABI
            </div>
            <div style={{ fontSize: 12, color: 'var(--muted)', fontFamily: 'monospace' }}>
              admin@sirket.com / Admin2024!
            </div>
          </div>

          {/* Alt not */}
          <p style={{ textAlign: 'center', color: 'var(--muted)', fontSize: 11, marginTop: '1.5rem' }}>
            Hesabınız yok mu?{' '}
            <span style={{ color: 'var(--accent)', cursor: 'pointer' }}>
              Yöneticinizle iletişime geçin
            </span>
          </p>
        </div>
      </div>
    </div>
  );
}
