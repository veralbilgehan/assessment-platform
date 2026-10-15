import { useAuth } from '../context/AuthContext.jsx';
import Badge from './Badge.jsx';

const TABS = [
  { id: 'dashboard',   label: 'Dashboard',        icon: '📊', roles: ['super_admin','toptanci','satis_temsilcisi','bayi'] },
  { id: 'urunler',     label: 'Ürünler',           icon: '👓', roles: ['super_admin','toptanci','satis_temsilcisi'] },
  { id: 'stok',        label: 'Stok',              icon: '📦', roles: ['super_admin','toptanci'] },
  { id: 'bayiler',     label: 'Bayiler',           icon: '🏪', roles: ['super_admin','toptanci','satis_temsilcisi'] },
  { id: 'cari',        label: 'Cari Hesaplar',     icon: '💳', roles: ['super_admin','toptanci','satis_temsilcisi','bayi'] },
  { id: 'siparisler',  label: 'Siparişler',        icon: '📋', roles: ['super_admin','toptanci','satis_temsilcisi','bayi'] },
  { id: 'faturalar',   label: 'Faturalar',         icon: '🧾', roles: ['super_admin','toptanci','bayi'] },
  { id: 'tahsilatlar', label: 'Tahsilatlar',       icon: '💰', roles: ['super_admin','toptanci','satis_temsilcisi','bayi'] },
];

const ROL_RENK = {
  super_admin:      'purple',
  toptanci:         'blue',
  satis_temsilcisi: 'green',
  bayi:             'orange',
};

const ROL_LABEL = {
  super_admin:      'Süper Admin',
  toptanci:         'Toptancı',
  satis_temsilcisi: 'Sat. Temsilcisi',
  bayi:             'Bayi',
};

export default function Sidebar({ activeTab, onTabChange }) {
  const { user, cikisYap } = useAuth();
  const tabs = TABS.filter(t => t.roles.includes(user?.rol));

  return (
    <div style={{
      width: 'var(--sidebar-w)', minHeight: '100vh', flexShrink: 0,
      background: 'var(--surface)', borderRight: '1px solid var(--border)',
      display: 'flex', flexDirection: 'column',
    }}>
      {/* Logo */}
      <div style={{ padding: '1.25rem 1rem', borderBottom: '1px solid var(--border)' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <span style={{ fontSize: 24 }}>👓</span>
          <div>
            <div style={{ fontWeight: 800, fontSize: 15, color: 'var(--accent)' }}>Optik360</div>
            <div style={{ fontSize: 10, color: 'var(--muted)', fontWeight: 500 }}>ERP Platform</div>
          </div>
        </div>
      </div>

      {/* Navigation */}
      <nav style={{ flex: 1, padding: '0.5rem 0.5rem', overflowY: 'auto' }}>
        {tabs.map(tab => {
          const active = tab.id === activeTab;
          return (
            <button key={tab.id} onClick={() => onTabChange(tab.id)} style={{
              display: 'flex', alignItems: 'center', gap: 8,
              width: '100%', padding: '0.55rem 0.75rem', borderRadius: 8,
              marginBottom: 2, textAlign: 'left',
              background: active ? 'var(--accent-dim)' : 'none',
              color: active ? 'var(--accent)' : 'var(--text)',
              fontWeight: active ? 600 : 400, fontSize: 13,
              transition: 'all .15s',
            }}>
              <span style={{ fontSize: 15 }}>{tab.icon}</span>
              {tab.label}
            </button>
          );
        })}
      </nav>

      {/* User */}
      <div style={{ padding: '0.75rem', borderTop: '1px solid var(--border)' }}>
        <div style={{ marginBottom: 6 }}>
          <div style={{ fontWeight: 600, fontSize: 13 }}>{user?.ad}</div>
          <Badge variant={ROL_RENK[user?.rol] || 'gray'} style={{ marginTop: 3 }}>
            {ROL_LABEL[user?.rol] || user?.rol}
          </Badge>
        </div>
        <button onClick={cikisYap} style={{
          width: '100%', padding: '0.4rem', borderRadius: 6,
          background: 'rgba(220,38,38,.08)', color: 'var(--red)',
          fontWeight: 600, fontSize: 12, marginTop: 4,
        }}>
          Çıkış Yap
        </button>
      </div>
    </div>
  );
}
