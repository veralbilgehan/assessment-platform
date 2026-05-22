import { useState, useRef } from 'react';
import { useQuery, useMutation } from '@tanstack/react-query';
import { getDegerlendirme, putPuanlar, AI_STREAM_URL } from '../api/index.js';
import Badge from './Badge.jsx';

const zorlukMap = { 1: ['Kolay', 'green'], 2: ['Orta', 'yellow'], 3: ['Zor', 'red'] };

export default function DegerlendirmeModal({ id, onClose }) {
  const [puanlar, setPuanlar] = useState({});
  const [makale, setMakale] = useState('');
  const [streaming, setStreaming] = useState(false);
  const [aiDone, setAiDone] = useState(false);
  const abortRef = useRef(null);

  const { data: d, isLoading } = useQuery({
    queryKey: ['degerlendirme', id],
    queryFn: () => getDegerlendirme(id),
    enabled: !!id,
    onSuccess: (data) => {
      if (data.uretilen_makale) {
        setMakale(data.uretilen_makale);
        setAiDone(true);
      }
    },
  });

  const puanMut = useMutation({
    mutationFn: ({ id, puanlar }) => putPuanlar(id, puanlar),
  });

  const yetkinlikler = [...new Set((d?.sorular || []).map(s => s.yetkinlik).filter(Boolean))];

  async function aiUret() {
    setMakale('');
    setStreaming(true);
    setAiDone(false);
    let text = '';

    try {
      const controller = new AbortController();
      abortRef.current = controller;
      const res = await fetch(AI_STREAM_URL(id), { signal: controller.signal });
      const reader = res.body.getReader();
      const decoder = new TextDecoder();

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        const chunk = decoder.decode(value, { stream: true });
        for (const line of chunk.split('\n')) {
          if (!line.startsWith('data: ')) continue;
          const payload = line.slice(6).trim();
          if (payload === '[DONE]') break;
          try {
            const { text: delta } = JSON.parse(payload);
            text += delta;
            setMakale(text);
          } catch {}
        }
      }
      setAiDone(true);
    } catch (e) {
      if (e.name !== 'AbortError') setMakale('Hata: ' + e.message);
    } finally {
      setStreaming(false);
    }
  }

  function setPuan(yetkinlik, val) {
    setPuanlar(p => ({ ...p, [yetkinlik]: val }));
  }

  function kaydet() {
    const eksik = yetkinlikler.filter(y => !puanlar[y]);
    if (eksik.length) { alert(`Eksik puan: ${eksik.join(', ')}`); return; }
    const liste = yetkinlikler.map((y, i) => ({ yetkinlik_id: i + 1, puan: puanlar[y], not: y }));
    puanMut.mutate({ id, puanlar: liste });
  }

  return (
    <div
      onClick={e => { if (e.target === e.currentTarget) onClose(); }}
      style={{
        position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.65)',
        zIndex: 100, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '1.5rem',
      }}
    >
      <div style={{
        background: 'var(--surface)', border: '1px solid var(--border)',
        borderRadius: 'var(--radius)', width: '100%', maxWidth: 780,
        maxHeight: '90vh', overflowY: 'auto', padding: '1.75rem', position: 'relative',
        animation: 'fadeIn 0.15s',
      }}>
        <button onClick={onClose} style={{
          position: 'absolute', top: 14, right: 14, background: 'transparent',
          color: 'var(--muted)', fontSize: 18, lineHeight: 1,
        }}>✕</button>

        {isLoading ? (
          <div style={{ padding: '2rem', color: 'var(--muted)' }}>Yükleniyor...</div>
        ) : (
          <>
            {/* Başlık */}
            <div style={{ marginBottom: '1.25rem' }}>
              <div style={{ fontSize: 11, color: 'var(--muted)', marginBottom: 4 }}>
                {d?.pozisyon_adi} · ID #{id}
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <h2 style={{ fontSize: '1.15rem', fontWeight: 700 }}>{d?.aday_ad || 'İsimsiz Aday'}</h2>
                <Badge variant={d?.durum === 'tamamlandi' ? 'green' : 'yellow'}>{d?.durum || 'beklemede'}</Badge>
              </div>
              {d?.aday_eposta && <div style={{ fontSize: 12, color: 'var(--muted)', marginTop: 3 }}>{d.aday_eposta}</div>}
            </div>

            {/* AI MAKALE */}
            <Section label="AI Değerlendirme Makalesi">
              <div style={{ display: 'flex', gap: 8, alignItems: 'center', marginBottom: 10 }}>
                <button
                  onClick={aiUret}
                  disabled={streaming}
                  style={{
                    padding: '0.45rem 1.1rem',
                    background: 'linear-gradient(135deg, #6366f1, #8b5cf6)',
                    color: '#fff', borderRadius: 6, fontSize: 13, fontWeight: 600,
                    opacity: streaming ? 0.6 : 1, transition: 'opacity 0.15s',
                  }}
                >
                  {streaming ? '✦ Üretiliyor...' : '✦ AI ile Makale Üret'}
                </button>
                {aiDone && <span style={{ fontSize: 12, color: 'var(--green)' }}>✓ Tamamlandı</span>}
              </div>
              <div style={{
                background: 'var(--surface2)', border: `1px solid ${streaming ? 'var(--accent)' : 'var(--border)'}`,
                borderRadius: 8, padding: '1rem 1.1rem', minHeight: 100,
                fontSize: 13.5, lineHeight: 1.75, whiteSpace: 'pre-wrap',
                transition: 'border-color 0.2s',
              }}>
                {makale || d?.uretilen_makale || <span style={{ color: 'var(--muted)' }}>Henüz makale üretilmedi.</span>}
                {streaming && <span style={{ display: 'inline-block', width: 2, height: 14, background: 'var(--accent)', marginLeft: 2, verticalAlign: 'middle', animation: 'blink 1s infinite' }} />}
              </div>
            </Section>

            {/* PUANLAMA */}
            {yetkinlikler.length > 0 && (
              <Section label="Yetkinlik Puanlama">
                <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                  {yetkinlikler.map(y => (
                    <div key={y} style={{
                      display: 'flex', alignItems: 'center', gap: 12,
                      background: 'var(--surface2)', border: '1px solid var(--border)',
                      borderRadius: 6, padding: '0.6rem 0.875rem',
                    }}>
                      <span style={{ flex: 1, fontSize: 13 }}>{y}</span>
                      <div style={{ display: 'flex', gap: 3 }}>
                        {[1,2,3,4,5].map(n => (
                          <span
                            key={n}
                            onClick={() => setPuan(y, n)}
                            style={{
                              fontSize: 20, cursor: 'pointer',
                              color: (puanlar[y] || 0) >= n ? 'var(--yellow)' : 'var(--border)',
                              transition: 'color 0.1s',
                            }}
                          >★</span>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
                <div style={{ marginTop: 10 }}>
                  <button
                    onClick={kaydet}
                    disabled={puanMut.isPending}
                    style={{
                      padding: '0.45rem 1.1rem', background: 'var(--accent)', color: '#fff',
                      borderRadius: 6, fontSize: 13, fontWeight: 600,
                      opacity: puanMut.isPending ? 0.6 : 1,
                    }}
                  >
                    {puanMut.isPending ? 'Kaydediliyor...' : 'Puanları Kaydet'}
                  </button>
                  {puanMut.isSuccess && <span style={{ marginLeft: 10, color: 'var(--green)', fontSize: 13 }}>✓ Kaydedildi</span>}
                </div>
              </Section>
            )}

            {/* SORULAR */}
            <Section label={`Atanan Sorular (${(d?.sorular || []).length})`}>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                {(d?.sorular || []).map((s, i) => {
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
            </Section>
          </>
        )}
      </div>
    </div>
  );
}

function Section({ label, children }) {
  return (
    <div style={{ marginBottom: '1.5rem' }}>
      <div style={{ fontSize: 11, textTransform: 'uppercase', letterSpacing: '0.05em', color: 'var(--muted)', marginBottom: 8 }}>
        {label}
      </div>
      {children}
    </div>
  );
}
