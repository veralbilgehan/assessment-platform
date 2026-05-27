import { useState } from 'react';

/* ─── Modül kartı tanımları ─────────────────────────── */
const MODULLER = [
  {
    tab: 'belge',
    baslik: 'Belge & Profil',
    aciklama: 'AI destekli doküman analizi, CV okuma ve aday profili oluşturma',
    simge: '📄',
    renk: '#6366f1',
    gradient: 'linear-gradient(135deg, #6366f1 0%, #4338ca 100%)',
    etiket: 'Doküman Analizi',
  },
  {
    tab: 'kiyasla',
    baslik: 'Aday Kıyasla',
    aciklama: 'Adayları yan yana karşılaştır, AI skorlamasıyla en uygun adayı seç',
    simge: '⚖️',
    renk: '#8b5cf6',
    gradient: 'linear-gradient(135deg, #8b5cf6 0%, #6d28d9 100%)',
    etiket: 'Karşılaştırma',
  },
  {
    tab: 'akis',
    baslik: 'Görev Akışı',
    aciklama: '4 adımlı süreç: görev tanımı, şablon, iş teslimi ve değerlendirme',
    simge: '🔄',
    renk: '#f97316',
    gradient: 'linear-gradient(135deg, #f97316 0%, #ea580c 100%)',
    etiket: 'İş Süreci',
  },
  {
    tab: 'rapor',
    baslik: 'Performans Raporu',
    aciklama: 'Test sonuçları, araç bazlı analiz, yol haritası ve AI yorumu',
    simge: '📊',
    renk: '#06b6d4',
    gradient: 'linear-gradient(135deg, #06b6d4 0%, #0284c7 100%)',
    etiket: 'Analiz & Rapor',
  },
  {
    tab: 'deneme',
    baslik: 'Ücretsiz Deneme',
    aciklama: 'Excel, CSV veya PDF test sonucunu yükle — AI saniyeler içinde analiz eder',
    simge: '🆓',
    renk: '#22c55e',
    gradient: 'linear-gradient(135deg, #22c55e 0%, #16a34a 100%)',
    etiket: 'Hemen Dene',
  },
  {
    tab: 'evrak',
    baslik: 'Evrak Kutusu',
    aciklama: 'Belgeler, testler ve raporların merkezi yönetimi, arama ve arşivleme',
    simge: '📦',
    renk: '#eab308',
    gradient: 'linear-gradient(135deg, #eab308 0%, #ca8a04 100%)',
    etiket: 'Dosya Yönetimi',
  },
];

const HIZLI_ERISIM = [
  { tab: 'belge',           etiket: '📄 Belge & Profil' },
  { tab: 'kiyasla',         etiket: '⚖️ Aday Kıyasla'  },
  { tab: 'akis',            etiket: '🔄 Görev Akışı'    },
  { tab: 'rapor',           etiket: '📊 Raporlar'        },
  { tab: 'test',            etiket: '🧪 Test Modülü'    },
  { tab: 'degerlendirmeler',etiket: '📝 Değerlendirmeler'},
];

/* ─── Modül Kartı ───────────────────────────────────── */
function ModulKarti({ m, onClick }) {
  const [hover, setHover] = useState(false);
  return (
    <button
      onClick={() => onClick(m.tab)}
      onMouseEnter={() => setHover(true)}
      onMouseLeave={() => setHover(false)}
      style={{
        background: 'var(--surface)',
        border: `1px solid ${hover ? m.renk + '66' : 'var(--border)'}`,
        borderRadius: 14,
        padding: 0,
        overflow: 'hidden',
        cursor: 'pointer',
        transition: 'all 0.2s',
        transform: hover ? 'translateY(-3px)' : 'none',
        boxShadow: hover ? `0 12px 32px ${m.renk}22` : '0 2px 8px rgba(0,0,0,0.2)',
        textAlign: 'left',
        display: 'flex',
        flexDirection: 'column',
      }}
    >
      {/* Üst renkli bölge */}
      <div style={{
        background: m.gradient,
        padding: '1.25rem 1.25rem 0.75rem',
        position: 'relative',
        overflow: 'hidden',
      }}>
        <GridDesen />
        <div style={{
          fontSize: 32,
          lineHeight: 1,
          filter: 'drop-shadow(0 2px 4px rgba(0,0,0,0.3))',
        }}>
          {m.simge}
        </div>
        <div style={{
          position: 'absolute', top: 12, right: 12,
          fontSize: 10, fontWeight: 700,
          background: 'rgba(255,255,255,0.2)',
          color: '#fff',
          padding: '2px 8px', borderRadius: 20,
          backdropFilter: 'blur(4px)',
        }}>
          {m.etiket}
        </div>
      </div>

      {/* Alt içerik bölgesi */}
      <div style={{ padding: '1rem 1.25rem 1.25rem', flex: 1 }}>
        <h3 style={{ fontSize: '0.95rem', fontWeight: 700, color: 'var(--text)', margin: '0 0 6px' }}>
          {m.baslik}
        </h3>
        <p style={{ fontSize: 12, color: 'var(--muted)', margin: 0, lineHeight: 1.6 }}>
          {m.aciklama}
        </p>
        <div style={{
          marginTop: 14,
          fontSize: 11, fontWeight: 600,
          color: m.renk,
          display: 'flex', alignItems: 'center', gap: 4,
          opacity: hover ? 1 : 0.7,
          transition: 'opacity 0.2s',
        }}>
          Açmak için tıkla →
        </div>
      </div>
    </button>
  );
}

/* ─── Ana bileşen ───────────────────────────────────── */
export default function Dashboard({ user: _user, onTabChange }) {
  const [aramaQ, setAramaQ] = useState('');

  function aramaGit(e) {
    e.preventDefault();
    onTabChange('evrak');
  }

  return (
    <div style={{ maxWidth: 1100, margin: '0 auto' }}>

      {/* ─── Arama Alanı ───────────────────────────────── */}
      <div style={{
        background: 'var(--surface)',
        border: '1px solid var(--border)',
        borderRadius: 14,
        padding: '1.5rem 1.75rem',
        marginBottom: '1.5rem',
      }}>
        <form onSubmit={aramaGit} style={{ display: 'flex', gap: 10, marginBottom: '1.25rem' }}>
          <div style={{ flex: 1, position: 'relative' }}>
            <span style={{
              position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)',
              fontSize: 16, color: 'var(--muted)',
            }}>🔍</span>
            <input
              value={aramaQ}
              onChange={e => setAramaQ(e.target.value)}
              placeholder="Aday adı, test, belge veya rapor ara..."
              style={{
                width: '100%',
                padding: '0.75rem 1rem 0.75rem 2.5rem',
                fontSize: 14,
                borderRadius: 10,
                border: '1px solid var(--border)',
                background: 'var(--surface2)',
                boxSizing: 'border-box',
              }}
            />
          </div>
          <button
            type="submit"
            style={{
              padding: '0.75rem 1.5rem',
              background: 'var(--accent)',
              color: '#fff', border: 'none', borderRadius: 10,
              fontWeight: 600, fontSize: 14, cursor: 'pointer',
              whiteSpace: 'nowrap', transition: 'opacity 0.2s',
            }}
            onMouseEnter={e => e.currentTarget.style.opacity = '0.85'}
            onMouseLeave={e => e.currentTarget.style.opacity = '1'}
          >
            Ara
          </button>
          <button
            type="button"
            onClick={() => onTabChange('evrak')}
            style={{
              padding: '0.75rem 1.25rem',
              background: 'transparent',
              color: 'var(--muted)',
              border: '1px solid var(--border)',
              borderRadius: 10,
              fontWeight: 500, fontSize: 13, cursor: 'pointer',
              whiteSpace: 'nowrap', transition: 'all 0.2s',
              display: 'flex', alignItems: 'center', gap: 6,
            }}
            onMouseEnter={e => { e.currentTarget.style.borderColor = 'var(--accent)'; e.currentTarget.style.color = 'var(--accent)'; }}
            onMouseLeave={e => { e.currentTarget.style.borderColor = 'var(--border)'; e.currentTarget.style.color = 'var(--muted)'; }}
          >
            📦 Evrak Kutusu
          </button>
        </form>

        {/* Hızlı erişim */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
          <span style={{ fontSize: 11, color: 'var(--muted)', whiteSpace: 'nowrap' }}>Hızlı Erişim:</span>
          <div style={{ width: 1, height: 16, background: 'var(--border)' }} />
          {HIZLI_ERISIM.map(h => (
            <button
              key={h.tab}
              onClick={() => onTabChange(h.tab)}
              style={{
                padding: '0.3rem 0.85rem',
                background: 'var(--surface2)',
                border: '1px solid var(--border)',
                color: 'var(--muted)',
                borderRadius: 20,
                fontSize: 12,
                cursor: 'pointer',
                transition: 'all 0.15s',
                whiteSpace: 'nowrap',
              }}
              onMouseEnter={e => {
                e.currentTarget.style.background = 'var(--accent-dim)';
                e.currentTarget.style.borderColor = 'var(--accent)';
                e.currentTarget.style.color = 'var(--accent)';
              }}
              onMouseLeave={e => {
                e.currentTarget.style.background = 'var(--surface2)';
                e.currentTarget.style.borderColor = 'var(--border)';
                e.currentTarget.style.color = 'var(--muted)';
              }}
            >
              {h.etiket}
            </button>
          ))}
        </div>
      </div>

      {/* ─── Modül Kartları ────────────────────────────── */}
      <div style={{ marginBottom: 8 }}>
        <h2 style={{ fontSize: '0.85rem', fontWeight: 600, color: 'var(--muted)', textTransform: 'uppercase', letterSpacing: '0.08em', margin: '0 0 1rem' }}>
          Modüller
        </h2>
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))',
          gap: 14,
        }}>
          {MODULLER.map(m => (
            <ModulKarti key={m.tab} m={m} onClick={onTabChange} />
          ))}
        </div>
      </div>

    </div>
  );
}
