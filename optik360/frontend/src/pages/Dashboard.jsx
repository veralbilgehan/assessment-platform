import { useQuery } from '@tanstack/react-query';
import { getDashboard } from '../api/index.js';
import Badge from '../components/Badge.jsx';

const DURUM_RENK = {
  taslak: 'gray', onay_bekliyor: 'yellow', hazirlaniyor: 'blue',
  kargoda: 'purple', teslim_edildi: 'green', tamamlandi: 'green', iptal: 'red',
};

function KPIKart({ baslik, deger, renk = 'var(--accent)', alt, icon }) {
  return (
    <div style={{
      background: 'var(--surface)', borderRadius: 12, padding: '1.25rem',
      boxShadow: 'var(--shadow)', flex: '1 1 180px',
    }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 8 }}>
        <span style={{ fontSize: 11, fontWeight: 600, color: 'var(--muted)', textTransform: 'uppercase', letterSpacing: .5 }}>{baslik}</span>
        <span style={{ fontSize: 22 }}>{icon}</span>
      </div>
      <div style={{ fontSize: 24, fontWeight: 800, color: renk }}>{deger}</div>
      {alt && <div style={{ fontSize: 11, color: 'var(--muted)', marginTop: 4 }}>{alt}</div>}
    </div>
  );
}

function Para(val) {
  return Number(val || 0).toLocaleString('tr-TR', { style: 'currency', currency: 'TRY', maximumFractionDigits: 0 });
}

export default function Dashboard() {
  const { data, isLoading } = useQuery({ queryKey: ['dashboard'], queryFn: getDashboard });

  if (isLoading) return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: 300, color: 'var(--muted)' }}>
      <div style={{ textAlign: 'center' }}>
        <div style={{ fontSize: 32, animation: 'spin 1s linear infinite', display: 'inline-block' }}>⚙️</div>
        <div style={{ marginTop: 8 }}>Veriler yükleniyor...</div>
      </div>
    </div>
  );

  const hafta = data?.haftalik_satis || [];
  const maxTutar = Math.max(...hafta.map(h => Number(h.tutar)), 1);

  return (
    <div style={{ padding: '1.5rem', animation: 'fadeIn .25s ease' }}>
      {/* KPI Kartları */}
      <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap', marginBottom: 20 }}>
        <KPIKart icon="💸" baslik="Günlük Satış" deger={Para(data?.bugun_satis?.tutar)}
          alt={`${data?.bugun_satis?.adet || 0} sipariş`} />
        <KPIKart icon="📈" baslik="Aylık Satış" deger={Para(data?.aylik_satis?.tutar)}
          alt={`${data?.aylik_satis?.adet || 0} sipariş`} renk="var(--green)" />
        <KPIKart icon="📌" baslik="Tahsil Edilecek" deger={Para(data?.tahsil_edilecek)}
          renk="var(--yellow)" />
        <KPIKart icon="⚠️" baslik="Vadesi Geçen" deger={Para(data?.vadesi_gecen)}
          renk={data?.vadesi_gecen > 0 ? 'var(--red)' : 'var(--green)'} />
        <KPIKart icon="🏪" baslik="Toplam Bayi" deger={data?.toplam_bayi || 0} />
        <KPIKart icon="📦" baslik="Kritik Stok" deger={data?.kritik_stok?.length || 0}
          renk={data?.kritik_stok?.length > 0 ? 'var(--orange)' : 'var(--green)'} />
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
        {/* Haftalık Satış Grafiği */}
        <div style={{ background: 'var(--surface)', borderRadius: 12, padding: '1.25rem', boxShadow: 'var(--shadow)' }}>
          <h3 style={{ fontWeight: 700, marginBottom: 16, fontSize: 14 }}>Son 7 Gün Satış Trendi</h3>
          {hafta.length === 0 ? (
            <div style={{ color: 'var(--muted)', textAlign: 'center', padding: '2rem' }}>Henüz satış verisi yok</div>
          ) : (
            <div style={{ display: 'flex', alignItems: 'flex-end', gap: 8, height: 120 }}>
              {hafta.map((h, i) => {
                const yukseklik = Math.max((Number(h.tutar) / maxTutar) * 100, 4);
                const gun = new Date(h.gun).toLocaleDateString('tr-TR', { weekday: 'short', day: 'numeric' });
                return (
                  <div key={i} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4 }}>
                    <div style={{ fontSize: 9, color: 'var(--muted)', fontWeight: 600 }}>
                      {Para(h.tutar).replace('₺','').trim()}
                    </div>
                    <div style={{
                      width: '100%', height: `${yukseklik}%`,
                      background: 'linear-gradient(to top, var(--accent), var(--accent-dim))',
                      borderRadius: '4px 4px 0 0', minHeight: 4,
                    }} title={`${gun}: ${Para(h.tutar)}`} />
                    <div style={{ fontSize: 9, color: 'var(--muted)' }}>{gun}</div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Kritik Stok */}
        <div style={{ background: 'var(--surface)', borderRadius: 12, padding: '1.25rem', boxShadow: 'var(--shadow)' }}>
          <h3 style={{ fontWeight: 700, marginBottom: 12, fontSize: 14 }}>⚠️ Kritik Stok Uyarıları</h3>
          {!data?.kritik_stok?.length ? (
            <div style={{ color: 'var(--green)', fontWeight: 600, padding: '1rem 0' }}>✓ Tüm ürünler yeterli stokta</div>
          ) : data.kritik_stok.map(u => (
            <div key={u.urun_id} style={{
              display: 'flex', justifyContent: 'space-between', alignItems: 'center',
              padding: '0.5rem 0', borderBottom: '1px solid var(--border)',
            }}>
              <div>
                <div style={{ fontWeight: 600, fontSize: 13 }}>{u.urun_adi}</div>
                <div style={{ fontSize: 11, color: 'var(--muted)' }}>{u.sku}</div>
              </div>
              <div style={{ textAlign: 'right' }}>
                <div style={{ fontWeight: 700, color: 'var(--red)', fontSize: 15 }}>{u.toplam_stok}</div>
                <div style={{ fontSize: 10, color: 'var(--muted)' }}>Min: {u.minimum_stok}</div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Son Siparişler */}
      <div style={{ background: 'var(--surface)', borderRadius: 12, padding: '1.25rem', boxShadow: 'var(--shadow)', marginTop: 16 }}>
        <h3 style={{ fontWeight: 700, marginBottom: 12, fontSize: 14 }}>Son Siparişler</h3>
        {!data?.son_siparisler?.length ? (
          <div style={{ color: 'var(--muted)', textAlign: 'center', padding: '1rem' }}>Henüz sipariş yok</div>
        ) : (
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ borderBottom: '2px solid var(--border)' }}>
                {['Sipariş No','Bayi','Tutar','Durum','Tarih'].map(h => (
                  <th key={h} style={{ textAlign: 'left', padding: '0.4rem 0.75rem', fontSize: 11, fontWeight: 700, color: 'var(--muted)', textTransform: 'uppercase' }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {data.son_siparisler.map(s => (
                <tr key={s.id} style={{ borderBottom: '1px solid var(--border)' }}>
                  <td style={{ padding: '0.55rem 0.75rem', fontWeight: 600, fontSize: 13 }}>{s.siparis_no}</td>
                  <td style={{ padding: '0.55rem 0.75rem', fontSize: 13 }}>{s.bayi}</td>
                  <td style={{ padding: '0.55rem 0.75rem', fontWeight: 700 }}>{Para(s.genel_toplam)}</td>
                  <td style={{ padding: '0.55rem 0.75rem' }}>
                    <Badge variant={DURUM_RENK[s.durum] || 'gray'}>{s.durum}</Badge>
                  </td>
                  <td style={{ padding: '0.55rem 0.75rem', fontSize: 12, color: 'var(--muted)' }}>
                    {new Date(s.olusturuldu).toLocaleDateString('tr-TR')}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
