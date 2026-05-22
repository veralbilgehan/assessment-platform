import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { getSektorHiyerarsi } from '../api/index.js';

/* ─── Nav Grubu Tanımları ───────────────────────────── */
const NAV_GRUPLARI = [
  {
    baslik: 'GENEL',
    oğeler: [
      { tab: 'dashboard',        simge: '🏠', etiket: 'Ana Sayfa'        },
      { tab: 'pozisyonlar',      simge: '📋', etiket: 'Pozisyonlar'      },
      { tab: 'degerlendirmeler', simge: '📝', etiket: 'Değerlendirmeler' },
    ],
  },
  {
    baslik: 'ANALİZ & TEST',
    oğeler: [
      { tab: 'belge',   simge: '📄', etiket: 'Belge & Profil' },
      { tab: 'test',    simge: '🧪', etiket: 'Test Modülü'    },
      { tab: 'kiyasla', simge: '⚖️', etiket: 'Aday Kıyasla'  },
      { tab: 'rapor',   simge: '📊', etiket: 'Perf. Raporu'  },
    ],
  },
  {
    baslik: 'ARAÇLAR',
    oğeler: [
      { tab: 'deneme', simge: '🆓', etiket: 'Deneme Testi'  },
      { tab: 'evrak',  simge: '📦', etiket: 'Evrak Kutusu'  },
    ],
  },
];

/* ─── Tek Nav Düğmesi ───────────────────────────────── */
function NavBtn({ simge, etiket, active, onClick }) {
  const [hover, setHover] = useState(false);
  return (
    <button
      onClick={onClick}
      onMouseEnter={() => setHover(true)}
      onMouseLeave={() => setHover(false)}
      style={{
        width: '100%',
        display: 'flex',
        alignItems: 'center',
        gap: 10,
        padding: '0.55rem 0.85rem',
        border: 'none',
        borderRadius: 8,
        background: active
          ? 'var(--accent-dim)'
          : hover ? 'var(--surface2)' : 'transparent',
        color: active ? 'var(--accent)' : hover ? 'var(--text)' : 'var(--muted)',
        fontSize: 13,
        fontWeight: active ? 600 : 400,
        textAlign: 'left',
        cursor: 'pointer',
        transition: 'all 0.13s',
        position: 'relative',
      }}
    >
      {/* Sol aktif çizgi */}
      {active && (
        <span style={{
          position: 'absolute',
          left: 0, top: '20%', bottom: '20%',
          width: 3, borderRadius: '0 3px 3px 0',
          background: 'var(--accent)',
        }} />
      )}
      <span style={{ fontSize: 15, lineHeight: 1, flexShrink: 0 }}>{simge}</span>
      <span style={{ flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
        {etiket}
      </span>
    </button>
  );
}

/* ─── Sektör Ağacı Düğümleri ────────────────────────── */
function SektorNode({ sektor, selectedId, onSelect }) {
  const [open, setOpen] = useState(false);
  return (
    <div>
      <button
        onClick={() => setOpen(o => !o)}
        style={{
          width: '100%', textAlign: 'left',
          padding: '0.42rem 0.65rem',
          background: 'transparent',
          color: open ? 'var(--text)' : 'var(--muted)',
          borderRadius: 6, border: 'none',
          display: 'flex', alignItems: 'center', gap: 6,
          fontSize: 12.5, cursor: 'pointer', transition: 'background 0.1s',
        }}
        onMouseEnter={e => (e.currentTarget.style.background = 'var(--surface2)')}
        onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
      >
        {sektor.nace_kod && (
          <span style={{
            fontSize: 9, color: 'var(--accent)',
            background: 'var(--accent-dim)',
            padding: '1px 5px', borderRadius: 3, flexShrink: 0,
          }}>
            {sektor.nace_kod}
          </span>
        )}
        <span style={{ flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
          {sektor.ad}
        </span>
        <span style={{ fontSize: 9, transform: open ? 'rotate(90deg)' : 'none', transition: 'transform 0.2s' }}>▶</span>
      </button>
      {open && (
        <div style={{ paddingLeft: 10 }}>
          {(sektor.departmanlar || []).map(d => (
            <DeptNode key={d.id} dept={d} selectedId={selectedId} onSelect={onSelect} />
          ))}
        </div>
      )}
    </div>
  );
}

function DeptNode({ dept, selectedId, onSelect }) {
  const [open, setOpen] = useState(false);
  return (
    <div>
      <button
        onClick={() => setOpen(o => !o)}
        style={{
          width: '100%', textAlign: 'left',
          padding: '0.32rem 0.6rem',
          background: 'transparent', border: 'none',
          color: open ? 'var(--text)' : 'var(--muted)',
          borderRadius: 5, display: 'flex', alignItems: 'center', gap: 5,
          fontSize: 12, cursor: 'pointer', transition: 'background 0.1s',
        }}
        onMouseEnter={e => (e.currentTarget.style.background = 'var(--surface2)')}
        onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
      >
        <span style={{ flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{dept.ad}</span>
        <span style={{ fontSize: 8, transform: open ? 'rotate(90deg)' : 'none', transition: 'transform 0.2s' }}>▶</span>
      </button>
      {open && (
        <div style={{ paddingLeft: 10 }}>
          {(dept.pozisyonlar || []).map(p => (
            <button
              key={p.id}
              onClick={() => onSelect(p.id)}
              style={{
                width: '100%', textAlign: 'left',
                padding: '0.25rem 0.55rem',
                background: selectedId === p.id ? 'var(--accent-dim)' : 'transparent',
                color: selectedId === p.id ? 'var(--accent)' : 'var(--muted)',
                border: 'none', borderRadius: 5,
                fontSize: 11.5, display: 'flex', alignItems: 'center', gap: 5,
                cursor: 'pointer', transition: 'all 0.1s',
              }}
              onMouseEnter={e => { if (selectedId !== p.id) e.currentTarget.style.background = 'var(--surface2)'; }}
              onMouseLeave={e => { if (selectedId !== p.id) e.currentTarget.style.background = 'transparent'; }}
            >
              <span style={{ color: 'var(--border)', fontSize: 14 }}>·</span> {p.ad}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

const ROL_RENK = { admin: '#dc2626', degerlendirici: '#6366f1', izleyici: '#6b7591' };

/* ─── Ana Sidebar ───────────────────────────────────── */
export default function Sidebar({ activeTab, onTabChange, selectedId, onSelect, user }) {
  const [q, setQ] = useState('');
  const { data = [], isLoading } = useQuery({
    queryKey: ['hiyerarsi'],
    queryFn: getSektorHiyerarsi,
  });

  const filtered = q
    ? data.filter(s => s.ad.toLowerCase().includes(q.toLowerCase()))
    : data;

  return (
    <aside style={{
      width: 240,
      minWidth: 240,
      background: 'var(--surface)',
      borderRight: '1px solid var(--border)',
      display: 'flex',
      flexDirection: 'column',
      height: '100vh',
      boxShadow: '2px 0 8px rgba(30,40,80,0.05)',
    }}>

      {/* ── Logo / Başlık ── */}
      <div style={{
        padding: '1.1rem 1rem 0.9rem',
        borderBottom: '1px solid var(--border)',
        display: 'flex', alignItems: 'center', gap: 10,
      }}>
        {/* Mini logo */}
        <div style={{
          width: 34, height: 34, borderRadius: 9, flexShrink: 0,
          background: 'linear-gradient(135deg, #6366f1 0%, #268d7c 100%)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          boxShadow: '0 2px 8px rgba(99,102,241,0.35)',
        }}>
          <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
            <rect x="2" y="10" width="3.5" height="6" rx="1" fill="white" opacity="0.9" />
            <rect x="7.25" y="7"  width="3.5" height="9" rx="1" fill="white" opacity="0.85"/>
            <rect x="12.5" y="3" width="3.5" height="13" rx="1" fill="white" opacity="0.8"/>
          </svg>
        </div>
        <div>
          <div style={{ fontSize: 13, fontWeight: 800, color: 'var(--text)', lineHeight: 1.2 }}>
            Değerlendirme
          </div>
          <div style={{ fontSize: 11, fontWeight: 600, color: 'var(--accent)', lineHeight: 1.2 }}>
            Sistemi
          </div>
        </div>
      </div>

      {/* ── Navigasyon listesi ── */}
      <div style={{ overflowY: 'auto', flex: 1 }}>
        {NAV_GRUPLARI.map(grup => (
          <div key={grup.baslik} style={{ padding: '0.75rem 0.6rem 0.25rem' }}>
            {/* Grup başlığı */}
            <div style={{
              fontSize: 10, fontWeight: 700, letterSpacing: '0.08em',
              color: 'var(--muted)', padding: '0 0.5rem',
              marginBottom: 4, opacity: 0.7,
            }}>
              {grup.baslik}
            </div>

            {/* Düğmeler */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
              {grup.oğeler.map(o => (
                <NavBtn
                  key={o.tab}
                  simge={o.simge}
                  etiket={o.etiket}
                  active={activeTab === o.tab}
                  onClick={() => onTabChange(o.tab)}
                />
              ))}
            </div>
          </div>
        ))}

        {/* ── Sektör Ağacı ── */}
        <div style={{
          margin: '0.75rem 0.6rem 0',
          borderTop: '1px solid var(--border)',
          paddingTop: '0.75rem',
        }}>
          <div style={{
            fontSize: 10, fontWeight: 700, letterSpacing: '0.08em',
            color: 'var(--muted)', padding: '0 0.5rem',
            marginBottom: 6, opacity: 0.7,
          }}>
            SEKTÖRLER
          </div>
          <div style={{ padding: '0 0.2rem' }}>
            <input
              value={q}
              onChange={e => setQ(e.target.value)}
              placeholder="Sektör ara..."
              style={{ width: '100%', marginBottom: 6, fontSize: 12, boxSizing: 'border-box' }}
            />
          </div>
          {isLoading ? (
            <div style={{ padding: '1rem', textAlign: 'center', color: 'var(--muted)', fontSize: 12 }}>
              Yükleniyor...
            </div>
          ) : (
            filtered.map(s => (
              <SektorNode key={s.id} sektor={s} selectedId={selectedId} onSelect={onSelect} />
            ))
          )}
        </div>
      </div>

      {/* ── Alt kullanıcı çubuğu ── */}
      <div style={{
        borderTop: '1px solid var(--border)',
        padding: '0.6rem 0.85rem',
        display: 'flex', alignItems: 'center', gap: 8,
        background: 'var(--surface2)',
      }}>
        <div style={{ width: 8, height: 8, borderRadius: '50%', background: '#22c55e', flexShrink: 0 }} />
        <span style={{ fontSize: 12, color: 'var(--text)', fontWeight: 500, flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
          {user?.ad || 'Kullanıcı'}
        </span>
        <span style={{
          fontSize: 10,
          color: ROL_RENK[user?.rol] || 'var(--muted)',
          background: (ROL_RENK[user?.rol] || '#6b7591') + '18',
          padding: '2px 7px', borderRadius: 4, fontWeight: 600, flexShrink: 0,
        }}>
          {user?.rol || ''}
        </span>
      </div>
    </aside>
  );
}
