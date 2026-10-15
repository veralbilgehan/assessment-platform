import { useQuery } from '@tanstack/react-query';
import { getFaturalar } from '../api/index.js';
import Badge from '../components/Badge.jsx';
import { useState } from 'react';

const DURUM_RENK = { acik: 'blue', kismi_odendi: 'yellow', odendi: 'green', gecikti: 'red' };
const DURUM_LABEL = { acik: 'Açık', kismi_odendi: 'Kısmi Ödendi', odendi: 'Ödendi', gecikti: 'Gecikti' };

function Para(v) { return Number(v || 0).toLocaleString('tr-TR', { style: 'currency', currency: 'TRY', maximumFractionDigits: 0 }); }

export default function Faturalar() {
  const [filtre, setFiltre] = useState({ durum: '' });
  const { data: faturalar = [], isLoading } = useQuery({
    queryKey: ['faturalar', filtre],
    queryFn: () => getFaturalar(Object.fromEntries(Object.entries(filtre).filter(([, v]) => v))),
  });

  return (
    <div style={{ padding: '1.5rem' }}>
      <div style={{ display: 'flex', gap: 10, marginBottom: 16 }}>
        <select value={filtre.durum} onChange={e => setFiltre(f => ({ ...f, durum: e.target.value }))}
          style={{ padding: '0.5rem 0.75rem', borderRadius: 8, border: '1.5px solid var(--border)', fontSize: 13 }}>
          <option value="">Tüm Durumlar</option>
          {Object.entries(DURUM_LABEL).map(([v, l]) => <option key={v} value={v}>{l}</option>)}
        </select>
      </div>

      <div style={{ background: 'var(--surface)', borderRadius: 12, boxShadow: 'var(--shadow)', overflow: 'hidden' }}>
        {isLoading ? (
          <div style={{ padding: '3rem', textAlign: 'center', color: 'var(--muted)' }}>Yükleniyor...</div>
        ) : (
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead style={{ background: 'var(--surface2)' }}>
              <tr>
                {['Fatura No', 'Bayi', 'Toplam', 'Ödenen', 'Kalan', 'Vade Tarihi', 'Durum'].map(h => (
                  <th key={h} style={{ padding: '0.65rem 1rem', textAlign: 'left', fontSize: 11, fontWeight: 700, color: 'var(--muted)', textTransform: 'uppercase', borderBottom: '1px solid var(--border)' }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {faturalar.length === 0 ? (
                <tr><td colSpan={7} style={{ padding: '3rem', textAlign: 'center', color: 'var(--muted)' }}>Fatura bulunamadı</td></tr>
              ) : faturalar.map(f => {
                const gecikti = f.gecikti;
                return (
                  <tr key={f.id} style={{ borderBottom: '1px solid var(--border)', background: gecikti ? 'rgba(220,38,38,.02)' : 'none' }}>
                    <td style={{ padding: '0.7rem 1rem', fontWeight: 700, fontFamily: 'monospace', fontSize: 13 }}>{f.fatura_no}</td>
                    <td style={{ padding: '0.7rem 1rem', fontSize: 13 }}>{f.bayi}</td>
                    <td style={{ padding: '0.7rem 1rem', fontWeight: 700 }}>{Para(f.toplam_tutar)}</td>
                    <td style={{ padding: '0.7rem 1rem', color: 'var(--green)', fontWeight: 700 }}>{Para(f.odenen_tutar)}</td>
                    <td style={{ padding: '0.7rem 1rem', color: Number(f.kalan_tutar) > 0 ? 'var(--orange)' : 'var(--green)', fontWeight: 700 }}>{Para(f.kalan_tutar)}</td>
                    <td style={{ padding: '0.7rem 1rem', fontSize: 12, color: gecikti ? 'var(--red)' : 'var(--text)', fontWeight: gecikti ? 700 : 400 }}>
                      {new Date(f.vade_tarihi).toLocaleDateString('tr-TR')}
                      {gecikti && ' ⚠️'}
                    </td>
                    <td style={{ padding: '0.7rem 1rem' }}>
                      <Badge variant={DURUM_RENK[f.durum]}>{DURUM_LABEL[f.durum]}</Badge>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
