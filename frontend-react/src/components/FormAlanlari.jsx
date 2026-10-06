import { useState } from 'react';

/* Giriş, kayıt, şifre sıfırlama ve davet ekranlarının ortak form parçaları */

const etiketStil = {
  display: 'block', fontSize: 11, fontWeight: 700,
  color: 'var(--muted)', marginBottom: 6, letterSpacing: '0.06em',
};
const girdiStil = {
  width: '100%', boxSizing: 'border-box',
  padding: '0.7rem 0.9rem', fontSize: 14, borderRadius: 8,
};

export function Alan({ etiket, zorunlu, style, ...props }) {
  return (
    <div style={{ marginBottom: '1.1rem', ...style }}>
      <label style={etiketStil}>
        {etiket}{zorunlu && <span style={{ color: '#ef4444', marginLeft: 3 }}>*</span>}
      </label>
      <input required={zorunlu} style={girdiStil} {...props} />
    </div>
  );
}

export function SifreAlani({ etiket = 'ŞİFRE', zorunlu = true, style, ...props }) {
  const [goster, setGoster] = useState(false);
  return (
    <div style={{ marginBottom: '1.1rem', ...style }}>
      <label style={etiketStil}>
        {etiket}{zorunlu && <span style={{ color: '#ef4444', marginLeft: 3 }}>*</span>}
      </label>
      <div style={{ position: 'relative' }}>
        <input
          type={goster ? 'text' : 'password'}
          required={zorunlu}
          placeholder="••••••••"
          style={{ ...girdiStil, padding: '0.7rem 2.5rem 0.7rem 0.9rem' }}
          {...props}
        />
        <button
          type="button"
          onClick={() => setGoster(v => !v)}
          style={{
            position: 'absolute', right: 10, top: '50%', transform: 'translateY(-50%)',
            background: 'none', border: 'none', cursor: 'pointer',
            color: 'var(--muted)', fontSize: 14, padding: 4,
          }}
          title={goster ? 'Gizle' : 'Göster'}
        >
          {goster ? '🙈' : '👁'}
        </button>
      </div>
    </div>
  );
}

export function Uyari({ tur = 'hata', children }) {
  if (!children) return null;
  const hata = tur === 'hata';
  return (
    <div style={{
      background: hata ? 'rgba(239,68,68,0.10)' : 'rgba(34,197,94,0.10)',
      border: `1px solid ${hata ? 'rgba(239,68,68,0.3)' : 'rgba(34,197,94,0.3)'}`,
      color: hata ? '#dc2626' : 'var(--green)',
      borderRadius: 8, padding: '0.65rem 0.9rem',
      fontSize: 13, marginBottom: '1.25rem',
      display: 'flex', gap: 8, alignItems: 'flex-start',
    }}>
      <span>{hata ? '⚠️' : '✅'}</span> <span>{children}</span>
    </div>
  );
}

export function AnaDugme({ yukleniyor, yukleniyorMetni, children, ...props }) {
  return (
    <button
      type="submit"
      disabled={yukleniyor}
      style={{
        width: '100%', padding: '0.85rem',
        background: yukleniyor ? 'var(--muted)' : 'linear-gradient(135deg, #6366f1 0%, #4338ca 100%)',
        color: '#fff', border: 'none', borderRadius: 8,
        fontSize: 14, fontWeight: 700,
        cursor: yukleniyor ? 'wait' : 'pointer',
        letterSpacing: '0.02em',
        boxShadow: yukleniyor ? 'none' : '0 4px 16px rgba(99,102,241,0.4)',
      }}
      {...props}
    >
      {yukleniyor ? `⏳ ${yukleniyorMetni}` : children}
    </button>
  );
}

export function Baglanti({ children, ...props }) {
  return (
    <button
      type="button"
      style={{ background: 'none', border: 'none', padding: 0, color: 'var(--accent)', cursor: 'pointer', fontSize: 'inherit', fontWeight: 600 }}
      {...props}
    >
      {children}
    </button>
  );
}

/* Tek kartlı ortalanmış sayfa (şifre sıfırlama, davet kabul) */
export function OrtaKart({ baslik, altBaslik, children, alt }) {
  return (
    <div style={{
      minHeight: '100vh', display: 'flex', flexDirection: 'column',
      alignItems: 'center', justifyContent: 'center',
      background: 'var(--bg)', padding: '2rem 1rem',
    }}>
      <div style={{
        width: '100%', maxWidth: 420, background: 'var(--surface)',
        border: '1px solid var(--border)', borderRadius: 14,
        boxShadow: 'var(--shadow)', padding: '2.25rem 2rem',
      }}>
        <div style={{ textAlign: 'center', marginBottom: '1.75rem' }}>
          <h2 style={{ fontSize: '1.4rem', fontWeight: 700, color: 'var(--text)', margin: '0 0 6px' }}>{baslik}</h2>
          {altBaslik && <p style={{ color: 'var(--muted)', fontSize: 13, margin: 0 }}>{altBaslik}</p>}
        </div>
        {children}
      </div>
      {alt && <div style={{ marginTop: '1.25rem', fontSize: 13 }}>{alt}</div>}
    </div>
  );
}
