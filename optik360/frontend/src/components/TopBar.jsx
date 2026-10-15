import { useQuery } from '@tanstack/react-query';
import { getDashboard } from '../api/index.js';

const TAB_LABELS = {
  dashboard:   '📊 Dashboard',
  urunler:     '👓 Ürünler',
  stok:        '📦 Stok Yönetimi',
  bayiler:     '🏪 Bayiler',
  cari:        '💳 Cari Hesaplar',
  siparisler:  '📋 Siparişler',
  faturalar:   '🧾 Faturalar',
  tahsilatlar: '💰 Tahsilatlar',
};

export default function TopBar({ activeTab }) {
  const { data } = useQuery({ queryKey: ['dashboard'], queryFn: getDashboard });
  const vadesiGecen = data?.vadesi_gecen > 0;

  return (
    <div style={{
      height: 52, borderBottom: '1px solid var(--border)',
      background: 'var(--surface)',
      display: 'flex', alignItems: 'center', justifyContent: 'space-between',
      padding: '0 1.5rem', flexShrink: 0,
    }}>
      <h2 style={{ fontWeight: 700, fontSize: 16 }}>{TAB_LABELS[activeTab] || ''}</h2>

      <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
        {vadesiGecen && (
          <div style={{
            display: 'flex', alignItems: 'center', gap: 5,
            background: 'rgba(220,38,38,.08)', color: 'var(--red)',
            borderRadius: 6, padding: '0.25rem 0.6rem', fontSize: 12, fontWeight: 600,
          }}>
            ⚠️ Vadesi geçen alacak: {Number(data.vadesi_gecen).toLocaleString('tr-TR', { style: 'currency', currency: 'TRY' })}
          </div>
        )}
      </div>
    </div>
  );
}
