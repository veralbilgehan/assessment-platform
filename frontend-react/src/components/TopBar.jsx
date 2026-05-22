import { useState } from 'react';

const SAYFA_ADLARI = {
  dashboard:       { etiket: 'Ana Sayfa',             simge: '🏠' },
  pozisyonlar:     { etiket: 'Pozisyonlar',            simge: '📋' },
  degerlendirmeler:{ etiket: 'Değerlendirmeler',       simge: '📝' },
  belge:           { etiket: 'Belge & Profil',         simge: '📄' },
  test:            { etiket: 'Test Modülü',            simge: '🧪' },
  kiyasla:         { etiket: 'Aday Kıyasla',           simge: '⚖️' },
  akis:            { etiket: 'Görev Akışı',            simge: '🔄' },
  rapor:           { etiket: 'Performans Raporu',      simge: '📊' },
  deneme:          { etiket: 'Ücretsiz Deneme Testi', simge: '🆓' },
  evrak:           { etiket: 'Evrak Kutusu',           simge: '📦' },
};

const ROL_RENK = { admin: '#ef4444', degerlendirici: '#6366f1', izleyici: '#8892a4' };

export default function TopBar({ activeTab, user, onCikis }) {
  const [bildirimAcik, setBildirimAcik] = useState(false);
  const [profilAcik,   setProfilAcik]   = useState(false);

  const sayfa = SAYFA_ADLARI[activeTab] || { etiket: activeTab, simge: '📌' };

  return (
    <header style={{
      height: 56,
      background: 'var(--surface)',
      borderBottom: '1px solid var(--border)',
      display: 'flex',
      alignItems: 'center',
      padding: '0 1.5rem',
      gap: 12,
      flexShrink: 0,
      position: 'relative',
      zIndex: 50,
    }}>
      {/* Sol — Sayfa başlığı */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, flex: 1 }}>
        <span style={{ fontSize: 16 }}>{sayfa.simge}</span>
        <h2 style={{ fontSize: '0.95rem', fontWeight: 600, color: 'var(--text)', margin: 0 }}>
          {sayfa.etiket}
        </h2>
        <span style={{
          fontSize: 11, color: 'var(--muted)',
          borderLeft: '1px solid var(--border)', paddingLeft: 10, marginLeft: 2,
        }}>
          Değerlendirme Sistemi
        </span>
      </div>

      {/* Sağ — Bildirim + Kullanıcı */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>

        {/* Bildirim ikonu */}
        <div style={{ position: 'relative' }}>
          <button
            onClick={() => { setBildirimAcik(v => !v); setProfilAcik(false); }}
            style={{
              width: 36, height: 36, borderRadius: 8,
              background: bildirimAcik ? 'var(--accent-dim)' : 'transparent',
              border: `1px solid ${bildirimAcik ? 'var(--accent)' : 'var(--border)'}`,
              color: bildirimAcik ? 'var(--accent)' : 'var(--muted)',
              fontSize: 16, cursor: 'pointer',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              transition: 'all 0.15s',
            }}
            title="Bildirimler"
          >
            🔔
          </button>
          {/* Bildirim baloncuğu */}
          <span style={{
            position: 'absolute', top: -3, right: -3,
            width: 14, height: 14, borderRadius: '50%',
            background: '#ef4444', fontSize: 9, color: '#fff',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontWeight: 700, border: '2px solid var(--surface)',
          }}>3</span>

          {bildirimAcik && (
            <div style={{
              position: 'absolute', top: 44, right: 0,
              width: 280, background: 'var(--surface)',
              border: '1px solid var(--border)', borderRadius: 10,
              boxShadow: '0 4px 16px rgba(30,40,80,0.10)',
              overflow: 'hidden',
            }}>
              <div style={{ padding: '0.75rem 1rem', borderBottom: '1px solid var(--border)', fontSize: 12, fontWeight: 600 }}>
                Bildirimler
              </div>
              {[
                { simge: '📊', metin: 'Yeni performans raporu oluşturuldu', zaman: '2 dk önce' },
                { simge: '📄', metin: 'Belge analizi tamamlandı', zaman: '15 dk önce' },
                { simge: '✅', metin: 'Test oturumu tamamlandı', zaman: '1 saat önce' },
              ].map((b, i) => (
                <div key={i} style={{
                  padding: '0.65rem 1rem', display: 'flex', gap: 10, alignItems: 'flex-start',
                  borderBottom: i < 2 ? '1px solid var(--border)' : 'none',
                  cursor: 'pointer', transition: 'background 0.1s',
                }}
                  onMouseEnter={e => e.currentTarget.style.background = 'var(--surface2)'}
                  onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
                >
                  <span style={{ fontSize: 16, marginTop: 1 }}>{b.simge}</span>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontSize: 12, color: 'var(--text)', lineHeight: 1.4 }}>{b.metin}</div>
                    <div style={{ fontSize: 11, color: 'var(--muted)', marginTop: 2 }}>{b.zaman}</div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Ayırıcı */}
        <div style={{ width: 1, height: 24, background: 'var(--border)' }} />

        {/* Kullanıcı profili */}
        {user && (
          <div style={{ position: 'relative' }}>
            <button
              onClick={() => { setProfilAcik(v => !v); setBildirimAcik(false); }}
              style={{
                display: 'flex', alignItems: 'center', gap: 8,
                padding: '0.3rem 0.6rem', borderRadius: 8,
                background: profilAcik ? 'var(--surface2)' : 'transparent',
                border: `1px solid ${profilAcik ? 'var(--border)' : 'transparent'}`,
                cursor: 'pointer', transition: 'all 0.15s',
              }}
            >
              <div style={{
                width: 30, height: 30, borderRadius: '50%',
                background: `linear-gradient(135deg, ${ROL_RENK[user.rol] || '#6366f1'}, #268d7c)`,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontSize: 13, fontWeight: 700, color: '#fff', flexShrink: 0,
              }}>
                {user.ad?.[0]?.toUpperCase() || '?'}
              </div>
              <div style={{ textAlign: 'left' }}>
                <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--text)', lineHeight: 1.2 }}>
                  {user.ad}
                </div>
                <div style={{ fontSize: 10, color: ROL_RENK[user.rol] || 'var(--muted)', lineHeight: 1.2 }}>
                  {user.rol}
                </div>
              </div>
              <span style={{ fontSize: 10, color: 'var(--muted)', marginLeft: 2 }}>▾</span>
            </button>

            {profilAcik && (
              <div style={{
                position: 'absolute', top: 44, right: 0,
                width: 180, background: 'var(--surface)',
                border: '1px solid var(--border)', borderRadius: 10,
                boxShadow: '0 4px 16px rgba(30,40,80,0.10)',
                overflow: 'hidden',
              }}>
                <div style={{ padding: '0.75rem 1rem', borderBottom: '1px solid var(--border)' }}>
                  <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--text)' }}>{user.ad}</div>
                  <div style={{ fontSize: 11, color: 'var(--muted)', marginTop: 2 }}>{user.eposta}</div>
                </div>
                {[
                  { simge: '⚙️', etiket: 'Ayarlar' },
                  { simge: '❓', etiket: 'Yardım' },
                ].map((m, i) => (
                  <button key={i} style={{
                    width: '100%', padding: '0.6rem 1rem',
                    background: 'transparent', border: 'none',
                    color: 'var(--muted)', fontSize: 12, textAlign: 'left',
                    cursor: 'pointer', display: 'flex', gap: 8, alignItems: 'center',
                    transition: 'all 0.1s',
                  }}
                    onMouseEnter={e => { e.currentTarget.style.background = 'var(--surface2)'; e.currentTarget.style.color = 'var(--text)'; }}
                    onMouseLeave={e => { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.color = 'var(--muted)'; }}
                  >
                    {m.simge} {m.etiket}
                  </button>
                ))}
                <div style={{ borderTop: '1px solid var(--border)' }}>
                  <button onClick={onCikis} style={{
                    width: '100%', padding: '0.6rem 1rem',
                    background: 'transparent', border: 'none',
                    color: '#ef4444', fontSize: 12, textAlign: 'left',
                    cursor: 'pointer', display: 'flex', gap: 8, alignItems: 'center',
                    transition: 'background 0.1s',
                  }}
                    onMouseEnter={e => e.currentTarget.style.background = 'rgba(239,68,68,0.08)'}
                    onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
                  >
                    ⏻ Çıkış Yap
                  </button>
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </header>
  );
}
