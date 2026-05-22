import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { getPozisyon, getPozisyonSorular, postDegerlendirme } from '../api/index.js';
import Badge from './Badge.jsx';

const seviyeMap = { junior: 'Junior', mid: 'Mid-Level', uzman: 'Uzman', kıdemli: 'Kıdemli', yönetici: 'Yönetici', direktör: 'Direktör' };
const zorlukMap = { 1: ['Kolay', 'green'], 2: ['Orta', 'yellow'], 3: ['Zor', 'red'] };

export default function PozisyonDetay({ pozisyonId, breadcrumb, onDegerlendirmeOlustur }) {
  const [adAd, setAdAd] = useState('');
  const [eposta, setEposta] = useState('');

  const { data: poz, isLoading: lPoz } = useQuery({
    queryKey: ['pozisyon', pozisyonId],
    queryFn: () => getPozisyon(pozisyonId),
    enabled: !!pozisyonId,
  });

  const { data: sorularData, isLoading: lSor } = useQuery({
    queryKey: ['pozisyon-sorular', pozisyonId],
    queryFn: () => getPozisyonSorular(pozisyonId),
    enabled: !!pozisyonId,
  });

  const mut = useMutation({
    mutationFn: postDegerlendirme,
    onSuccess: (data) => {
      setAdAd('');
      setEposta('');
      onDegerlendirmeOlustur(data.id);
    },
  });

  if (!pozisyonId) {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '70vh', gap: 12, color: 'var(--muted)' }}>
        <span style={{ fontSize: 40, opacity: 0.25 }}>⬅</span>
        <p style={{ fontSize: 15 }}>Sol panelden bir pozisyon seçin</p>
      </div>
    );
  }

  if (lPoz || lSor) {
    return <div style={{ padding: '2rem', color: 'var(--muted)' }}>Yükleniyor...</div>;
  }

  const sorular = sorularData?.sorular || [];
  const yetkinlikler = [...new Set(sorular.map(s => s.yetkinlik).filter(Boolean))];

  return (
    <div style={{ animation: 'fadeIn 0.2s' }}>
      {/* HEADER */}
      <div style={{
        background: 'var(--surface)', border: '1px solid var(--border)',
        borderRadius: 'var(--radius)', padding: '1.25rem 1.5rem', marginBottom: 12,
      }}>
        <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 12 }}>
          <div>
            <div style={{ fontSize: 11, color: 'var(--muted)', marginBottom: 4 }}>{breadcrumb}</div>
            <h2 style={{ fontSize: '1.2rem', fontWeight: 700 }}>{poz?.ad}</h2>
          </div>
          <div style={{ display: 'flex', gap: 6, flexShrink: 0 }}>
            <Badge variant="blue">{seviyeMap[poz?.seviye] || poz?.seviye}</Badge>
            {poz?.kod && <Badge variant="gray">{poz.kod}</Badge>}
          </div>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginTop: 12 }}>
          <div>
            <Label>Pozisyon Bilgisi</Label>
            {[
              ['Min. Deneyim', poz?.min_deneyim_yil ? `${poz.min_deneyim_yil} yıl` : '-'],
              ['Min. Eğitim', poz?.min_egitim || '-'],
            ].map(([l, v]) => (
              <div key={l} style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
                <span style={{ color: 'var(--muted)', fontSize: 13 }}>{l}</span>
                <span style={{ fontWeight: 500, fontSize: 13 }}>{v}</span>
              </div>
            ))}
          </div>

          <div>
            <Label>Yetkinlikler</Label>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 5 }}>
              {yetkinlikler.length
                ? yetkinlikler.map(y => (
                    <span key={y} style={{
                      padding: '2px 9px', background: 'var(--surface2)',
                      border: '1px solid var(--border)', borderRadius: 20,
                      fontSize: 12, color: 'var(--muted)',
                    }}>{y}</span>
                  ))
                : <span style={{ color: 'var(--muted)', fontSize: 13 }}>-</span>}
            </div>
          </div>
        </div>
      </div>

      {/* ÖRNEK SORULAR */}
      <div style={{
        background: 'var(--surface)', border: '1px solid var(--border)',
        borderRadius: 'var(--radius)', padding: '1.25rem 1.5rem', marginBottom: 12,
      }}>
        <Label>Örnek Sorular ({sorular.length})</Label>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 6, marginTop: 8 }}>
          {sorular.slice(0, 6).map((s, i) => {
            const [zlabel, zvar] = zorlukMap[s.zorluk] || ['-', 'gray'];
            return (
              <div key={i} style={{
                background: 'var(--surface2)', border: '1px solid var(--border)',
                borderRadius: 6, padding: '0.6rem 0.875rem',
              }}>
                <div style={{ display: 'flex', gap: 5, marginBottom: 5, alignItems: 'center' }}>
                  <Badge variant="blue" style={{ fontSize: 10 }}>{s.soru_tipi}</Badge>
                  <Badge variant={zvar} style={{ fontSize: 10 }}>{zlabel}</Badge>
                  {s.yetkinlik && <span style={{ marginLeft: 'auto', fontSize: 11, color: 'var(--muted)' }}>{s.yetkinlik}</span>}
                </div>
                <div style={{ fontSize: 13 }}>{s.soru_metni}</div>
              </div>
            );
          })}
        </div>
      </div>

      {/* FORM */}
      <div style={{
        background: 'var(--surface)', border: '1px solid var(--border)',
        borderRadius: 'var(--radius)', padding: '1.25rem 1.5rem',
      }}>
        <Label>Yeni Değerlendirme Oluştur</Label>
        <div style={{ display: 'flex', gap: 8, marginTop: 10, flexWrap: 'wrap' }}>
          <input value={adAd} onChange={e => setAdAd(e.target.value)} placeholder="Aday adı soyadı (opsiyonel)" style={{ flex: 1, minWidth: 180 }} />
          <input value={eposta} onChange={e => setEposta(e.target.value)} placeholder="E-posta (opsiyonel)" type="email" style={{ flex: 1, minWidth: 180 }} />
          <button
            onClick={() => mut.mutate({ pozisyon_id: pozisyonId, ...(adAd && { aday_ad: adAd }), ...(eposta && { aday_eposta: eposta }) })}
            disabled={mut.isPending}
            style={{
              padding: '0.45rem 1.1rem', background: 'var(--accent)', color: '#fff',
              borderRadius: 6, fontSize: 13, fontWeight: 600,
              opacity: mut.isPending ? 0.6 : 1, transition: 'background 0.15s',
            }}
          >
            {mut.isPending ? 'Oluşturuluyor...' : 'Değerlendirme Oluştur'}
          </button>
        </div>
        {mut.isError && <div style={{ color: 'var(--red)', fontSize: 12, marginTop: 6 }}>{mut.error?.message}</div>}
      </div>
    </div>
  );
}

function Label({ children }) {
  return <div style={{ fontSize: 11, textTransform: 'uppercase', letterSpacing: '0.05em', color: 'var(--muted)', marginBottom: 6 }}>{children}</div>;
}
