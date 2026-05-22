import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { getDegerlendirmeler } from '../api/index.js';
import Badge from '../components/Badge.jsx';
import DegerlendirmeModal from '../components/DegerlendirmeModal.jsx';

export default function Degerlendirmeler() {
  const [durum, setDurum] = useState('');
  const [sektor, setSektor] = useState('');
  const [modalId, setModalId] = useState(null);

  const { data = [], isLoading, refetch } = useQuery({
    queryKey: ['degerlendirmeler', durum, sektor],
    queryFn: () => getDegerlendirmeler({ ...(durum && { durum }), ...(sektor && { sektor }) }),
  });

  function formatDate(iso) {
    if (!iso) return '';
    return new Date(iso).toLocaleDateString('tr-TR', { day: '2-digit', month: 'short', year: 'numeric' });
  }

  return (
    <>
      <div style={{ animation: 'fadeIn 0.2s' }}>
        {/* HEADER */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
          <h2 style={{ fontSize: '1.2rem', fontWeight: 700 }}>Değerlendirmeler</h2>
          <div style={{ display: 'flex', gap: 8 }}>
            <select value={durum} onChange={e => setDurum(e.target.value)}>
              <option value="">Tüm Durumlar</option>
              <option value="beklemede">Beklemede</option>
              <option value="tamamlandi">Tamamlandı</option>
            </select>
            <input
              value={sektor}
              onChange={e => setSektor(e.target.value)}
              placeholder="Sektör filtrele..."
              style={{ width: 160 }}
            />
          </div>
        </div>

        {/* LIST */}
        {isLoading ? (
          <div style={{ color: 'var(--muted)', padding: '2rem' }}>Yükleniyor...</div>
        ) : data.length === 0 ? (
          <div style={{ color: 'var(--muted)', padding: '3rem', textAlign: 'center' }}>
            Henüz değerlendirme yok.
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {data.map(d => (
              <div
                key={d.degerlendirme_id}
                onClick={() => setModalId(d.degerlendirme_id)}
                style={{
                  background: 'var(--surface)', border: '1px solid var(--border)',
                  borderRadius: 'var(--radius)', padding: '1rem 1.25rem',
                  display: 'flex', alignItems: 'center', gap: 12,
                  cursor: 'pointer', transition: 'border-color 0.15s',
                }}
                onMouseEnter={e => (e.currentTarget.style.borderColor = 'var(--accent)')}
                onMouseLeave={e => (e.currentTarget.style.borderColor = 'var(--border)')}
              >
                <div style={{ flex: 1 }}>
                  <div style={{ fontWeight: 600, marginBottom: 3 }}>
                    {d.aday_ad || 'İsimsiz Aday'} — {d.pozisyon_adi}
                  </div>
                  <div style={{ fontSize: 12, color: 'var(--muted)' }}>
                    {d.sektor_adi} › {d.departman_adi}
                  </div>
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 5 }}>
                  <Badge variant={d.durum === 'tamamlandi' ? 'green' : 'yellow'}>
                    {d.durum || 'beklemede'}
                  </Badge>
                  <span style={{ fontSize: 11, color: 'var(--muted)' }}>{formatDate(d.olusturma)}</span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {modalId && (
        <DegerlendirmeModal
          id={modalId}
          onClose={() => { setModalId(null); refetch(); }}
        />
      )}
    </>
  );
}
