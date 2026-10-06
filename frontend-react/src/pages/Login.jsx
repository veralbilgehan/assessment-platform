import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext.jsx';
import { apiSifremiUnuttum, apiKayitOl, hataMesaji } from '../api/index.js';
import { Alan, SifreAlani, Uyari, AnaDugme, Baglanti } from '../components/FormAlanlari.jsx';

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
  // 'giris' | 'unuttum' | 'kayit'
  const [mod, setMod] = useState('giris');
  const [form, setForm] = useState({ ad: '', soyad: '', sirket: '', eposta: '', sifre: '', sifre2: '' });
  const [hata, setHata] = useState('');
  const [bilgi, setBilgi] = useState('');
  const [yukleniyor, setYukleniyor] = useState(false);

  const alan = (k) => ({ value: form[k], onChange: e => setForm(f => ({ ...f, [k]: e.target.value })) });

  function modDegistir(yeni) {
    setMod(yeni);
    setHata('');
    setBilgi('');
    setForm(f => ({ ...f, sifre: '', sifre2: '' }));
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setHata('');
    setBilgi('');
    if (mod === 'kayit' && form.sifre !== form.sifre2) {
      setHata('Şifreler eşleşmiyor');
      return;
    }
    setYukleniyor(true);
    try {
      if (mod === 'giris') {
        await girisYap(form.eposta, form.sifre);
        navigate('/app');
      } else if (mod === 'unuttum') {
        const d = await apiSifremiUnuttum(form.eposta);
        setBilgi(d.mesaj);
      } else {
        const d = await apiKayitOl({
          ad: form.ad, soyad: form.soyad, sirket: form.sirket,
          eposta: form.eposta, sifre: form.sifre,
        });
        modDegistir('giris');
        setBilgi(d.mesaj);
      }
    } catch (err) {
      setHata(mod === 'giris' ? err.message : hataMesaji(err));
    } finally {
      setYukleniyor(false);
    }
  }

  const basliklar = {
    giris:   ['Giriş Yapın', 'Hesabınıza erişmek için bilgilerinizi girin'],
    unuttum: ['Şifremi Unuttum', 'E-posta adresinizi girin, size şifre sıfırlama bağlantısı gönderelim'],
    kayit:   ['Kayıt Olun', 'Talebiniz yönetici onayından sonra aktifleşir'],
  };
  const dugmeMetni = {
    giris:   ['Giriş Yap →', 'Giriş yapılıyor...'],
    unuttum: ['Sıfırlama Bağlantısı Gönder', 'Gönderiliyor...'],
    kayit:   ['Kayıt Ol', 'Kaydediliyor...'],
  };

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
        overflowY: 'auto',
      }}>
        <div style={{ width: '100%', maxWidth: 360, margin: '0 auto' }}>
          {/* Form başlığı */}
          <div style={{ marginBottom: '2rem' }}>
            <h2 style={{ fontSize: '1.4rem', fontWeight: 700, color: 'var(--text)', margin: '0 0 6px' }}>
              {basliklar[mod][0]}
            </h2>
            <p style={{ color: 'var(--muted)', fontSize: 13, margin: 0 }}>
              {basliklar[mod][1]}
            </p>
          </div>

          <form onSubmit={handleSubmit}>
            {mod === 'kayit' && (
              <>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
                  <Alan etiket="AD" zorunlu {...alan('ad')} />
                  <Alan etiket="SOYAD" zorunlu {...alan('soyad')} />
                </div>
                <Alan etiket="ŞİRKET" placeholder="İsteğe bağlı" {...alan('sirket')} />
              </>
            )}

            <Alan etiket="E-POSTA ADRESİ" type="email" zorunlu placeholder="ornek@sirket.com" {...alan('eposta')} />

            {mod !== 'unuttum' && (
              <SifreAlani etiket="ŞİFRE" minLength={mod === 'kayit' ? 6 : undefined} {...alan('sifre')}
                style={{ marginBottom: mod === 'giris' ? '0.5rem' : '1.1rem' }} />
            )}
            {mod === 'kayit' && (
              <SifreAlani etiket="ŞİFRE (TEKRAR)" minLength={6} {...alan('sifre2')} />
            )}

            {mod === 'giris' && (
              <div style={{ textAlign: 'right', fontSize: 12, marginBottom: '1.5rem' }}>
                <Baglanti onClick={() => modDegistir('unuttum')}>Şifremi Unuttum</Baglanti>
              </div>
            )}

            <Uyari tur="hata">{hata}</Uyari>
            <Uyari tur="bilgi">{bilgi}</Uyari>

            <AnaDugme yukleniyor={yukleniyor} yukleniyorMetni={dugmeMetni[mod][1]}>
              {dugmeMetni[mod][0]}
            </AnaDugme>
          </form>

          {mod === 'giris' && (
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
          )}

          {/* Alt not */}
          <p style={{ textAlign: 'center', color: 'var(--muted)', fontSize: 12, marginTop: '1.5rem' }}>
            {mod === 'giris' ? (
              <>Hesabınız yok mu? <Baglanti onClick={() => modDegistir('kayit')}>Kayıt Ol</Baglanti></>
            ) : (
              <Baglanti onClick={() => modDegistir('giris')}>← Giriş ekranına dön</Baglanti>
            )}
          </p>
        </div>
      </div>
    </div>
  );
}
