import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { getCariHesaplar, getCariHesap, postCariHareket } from '../api/index.js';
import Modal from '../components/Modal.jsx';

function Para(v) { return Number(v || 0).toLocaleString('tr-TR', { style: 'currency', currency: 'TRY', maximumFractionDigits: 0 }); }

function RiskBar({ yuzdesi }) {
  const pct  = Math.min(Number(yuzdesi || 0), 100);
  const renk = pct >= 90 ? 'var(--red)' : pct >= 70 ? 'var(--orange)' : 'var(--green)';
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
      <div style={{ flex: 1, height: 6, background: 'var(--surface2)', borderRadius: 3 }}>
        <div style={{ width: `${pct}%`, height: '100%', background: renk, borderRadius: 3, transition: 'width .3s' }} />
      </div>
      <span style={{ fontSize: 11, fontWeight: 700, color: renk, width: 32 }}>{pct}%</span>
    </div>
  );
}

export default function CariHesaplar() {
  const qc = useQueryClient();
  const [detayId, setDetayId] = useState(null);
  const [hareket, setHareket] = useState(null); // bayiId
  const [form,    setForm]    = useState({ tip: 'odeme', tutar: '', vade_tarihi: '', aciklama: '' });
  const [hata,    setHata]    = useState('');

  const { data: hesaplar = [], isLoading } = useQuery({ queryKey: ['cari-hesaplar'], queryFn: getCariHesaplar });
  const { data: detay } = useQuery({
    queryKey: ['cari-detay', detayId], queryFn: () => getCariHesap(detayId), enabled: !!detayId,
  });

  const kaydet = useMutation({
    mutationFn: () => postCariHareket(hareket, form),
    onSuccess: () => {
      qc.invalidateQueries(['cari-hesaplar']);
      qc.invalidateQueries(['cari-detay', hareket]);
      setHareket(null); setHata('');
    },
    onError: e => setHata(e.response?.data?.hata || 'Hata'),
  });

  const TIP_RENK  = { borclanma: 'red', odeme: 'green', iade: 'blue', iskonto: 'yellow' };
  const TIP_ISARET = { borclanma: '+', odeme: '−', iade: '−', iskonto: '−' };

  return (
    <div style={{ padding: '1.5rem' }}>
      <div style={{ background: 'var(--surface)', borderRadius: 12, boxShadow: 'var(--shadow)', overflow: 'hidden' }}>
        {isLoading ? (
          <div style={{ padding: '3rem', textAlign: 'center', color: 'var(--muted)' }}>Yükleniyor...</div>
        ) : (
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead style={{ background: 'var(--surface2)' }}>
              <tr>
                {['Bayi','Şehir','Bakiye','Risk Limiti','Kullanım','Sonraki Vade',''].map(h => (
                  <th key={h} style={{ padding: '0.65rem 1rem', textAlign: 'left', fontSize: 11, fontWeight: 700, color: 'var(--muted)', textTransform: 'uppercase', borderBottom: '1px solid var(--border)' }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {hesaplar.length === 0 ? (
                <tr><td colSpan={7} style={{ padding: '3rem', textAlign: 'center', color: 'var(--muted)' }}>Cari hesap bulunamadı</td></tr>
              ) : hesaplar.map(h => {
                const vadesi = h.sonraki_vade && new Date(h.sonraki_vade) < new Date(Date.now() + 7*86400000);
                return (
                  <tr key={h.bayi_id} style={{ borderBottom: '1px solid var(--border)', cursor: 'pointer' }}
                    onClick={() => setDetayId(h.bayi_id)}>
                    <td style={{ padding: '0.7rem 1rem' }}>
                      <div style={{ fontWeight: 700, fontSize: 13 }}>{h.unvan}</div>
                      <div style={{ fontSize: 11, color: 'var(--muted)', fontFamily: 'monospace' }}>{h.kod}</div>
                    </td>
                    <td style={{ padding: '0.7rem 1rem', fontSize: 13, color: 'var(--muted)' }}>{h.il || '—'}</td>
                    <td style={{ padding: '0.7rem 1rem', fontWeight: 800, fontSize: 15,
                      color: Number(h.guncel_bakiye) > 0 ? 'var(--orange)' : 'var(--green)' }}>
                      {Para(h.guncel_bakiye)}
                    </td>
                    <td style={{ padding: '0.7rem 1rem', fontSize: 13 }}>{Para(h.risk_limiti)}</td>
                    <td style={{ padding: '0.7rem 1rem', width: 140 }}><RiskBar yuzdesi={h.risk_yuzdesi} /></td>
                    <td style={{ padding: '0.7rem 1rem', fontSize: 12,
                      color: vadesi ? 'var(--red)' : 'var(--text)', fontWeight: vadesi ? 700 : 400 }}>
                      {h.sonraki_vade ? new Date(h.sonraki_vade).toLocaleDateString('tr-TR') : '—'}
                      {vadesi && ' ⚠️'}
                    </td>
                    <td style={{ padding: '0.7rem 1rem' }}>
                      <button onClick={e => { e.stopPropagation(); setHareket(h.bayi_id); setForm({ tip:'odeme', tutar:'', vade_tarihi:'', aciklama:'' }); }}
                        style={{ fontSize: 12, color: 'var(--accent)', background: 'none', fontWeight: 600 }}>
                        Tahsilat
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </div>

      {/* Detay Modal */}
      {detayId && detay && (
        <Modal title={`${detay.unvan} — Cari Hesap`} onClose={() => setDetayId(null)} width={640}>
          <div style={{ display: 'flex', gap: 12, background: 'var(--surface2)', borderRadius: 10, padding: '0.85rem', marginBottom: 16 }}>
            {[['Bakiye', detay.guncel_bakiye, 'var(--orange)'], ['Limit', detay.risk_limiti, 'var(--muted)'], ['Vade', `${detay.varsayilan_vade} gün`, 'var(--text)']].map(([l, v, c]) => (
              <div key={l} style={{ flex: 1, textAlign: 'center' }}>
                <div style={{ fontSize: 10, fontWeight: 700, color: 'var(--muted)', textTransform: 'uppercase' }}>{l}</div>
                <div style={{ fontWeight: 800, fontSize: 18, color: c }}>{typeof v === 'number' ? Para(v) : v}</div>
              </div>
            ))}
          </div>

          {detay.yaklasan_vadeler?.length > 0 && (
            <div style={{ background: 'rgba(234,88,12,.06)', borderRadius: 8, padding: '0.75rem', marginBottom: 12, border: '1px solid rgba(234,88,12,.2)' }}>
              <div style={{ fontWeight: 700, color: 'var(--orange)', fontSize: 12, marginBottom: 6 }}>⚠️ Yaklaşan Vadeler (7 gün)</div>
              {detay.yaklasan_vadeler.map(v => (
                <div key={v.id} style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13 }}>
                  <span>{new Date(v.vade_tarihi).toLocaleDateString('tr-TR')}</span>
                  <span style={{ fontWeight: 700 }}>{Para(v.tutar)}</span>
                </div>
              ))}
            </div>
          )}

          <div style={{ fontWeight: 700, fontSize: 13, marginBottom: 8 }}>Hareket Geçmişi</div>
          <div style={{ maxHeight: 280, overflowY: 'auto' }}>
            {detay.hareketler?.length === 0 ? (
              <div style={{ color: 'var(--muted)', textAlign: 'center', padding: '1rem' }}>Hareket bulunamadı</div>
            ) : detay.hareketler?.map(h => (
              <div key={h.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '0.5rem 0', borderBottom: '1px solid var(--border)' }}>
                <div>
                  <div style={{ fontSize: 12, color: 'var(--muted)' }}>{new Date(h.olusturuldu).toLocaleDateString('tr-TR')}</div>
                  <div style={{ fontSize: 12 }}>{h.aciklama || h.referans_tip || '—'}</div>
                </div>
                <div style={{ textAlign: 'right' }}>
                  <span style={{ fontWeight: 700, color: TIP_RENK[h.tip] === 'red' ? 'var(--red)' : 'var(--green)' }}>
                    {TIP_ISARET[h.tip]}{Para(h.tutar)}
                  </span>
                  {h.vade_tarihi && (
                    <div style={{ fontSize: 10, color: 'var(--muted)' }}>Vade: {new Date(h.vade_tarihi).toLocaleDateString('tr-TR')}</div>
                  )}
                </div>
              </div>
            ))}
          </div>

          <div style={{ display: 'flex', gap: 8, marginTop: 12, justifyContent: 'flex-end' }}>
            <button onClick={() => { setDetayId(null); setHareket(detay.bayi_id); }} style={{ padding: '0.5rem 1rem', borderRadius: 8, background: 'var(--accent)', color: '#fff', fontWeight: 600, fontSize: 13 }}>
              Hareket Ekle
            </button>
          </div>
        </Modal>
      )}

      {/* Hareket Modal */}
      {hareket && (
        <Modal title="Cari Hareket Ekle" onClose={() => setHareket(null)}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            {[
              { label: 'Hareket Tipi', field: 'tip', options: [
                { v: 'odeme', l: 'Ödeme' }, { v: 'borclanma', l: 'Borçlandırma' },
                { v: 'iade', l: 'İade' }, { v: 'iskonto', l: 'İskonto' },
              ]},
            ].map(({ label, field, options }) => (
              <div key={field}>
                <label style={{ fontWeight: 600, fontSize: 12, display: 'block', marginBottom: 4, color: 'var(--muted)' }}>{label}</label>
                <select value={form[field]} onChange={e => setForm(f => ({ ...f, [field]: e.target.value }))}
                  style={{ width: '100%', padding: '0.5rem', borderRadius: 7, border: '1.5px solid var(--border)', fontSize: 13 }}>
                  {options.map(o => <option key={o.v} value={o.v}>{o.l}</option>)}
                </select>
              </div>
            ))}
            {[['Tutar (TRY) *', 'tutar', 'number'], ['Vade Tarihi', 'vade_tarihi', 'date'], ['Açıklama', 'aciklama', 'text']].map(([l, f, t]) => (
              <div key={f}>
                <label style={{ fontWeight: 600, fontSize: 12, display: 'block', marginBottom: 4, color: 'var(--muted)' }}>{l}</label>
                <input type={t} value={form[f] || ''} onChange={e => setForm(ff => ({ ...ff, [f]: e.target.value }))}
                  style={{ width: '100%', padding: '0.5rem', borderRadius: 7, border: '1.5px solid var(--border)', fontSize: 13 }} />
              </div>
            ))}

            {hata && <div style={{ color: 'var(--red)', fontSize: 13, fontWeight: 600 }}>{hata}</div>}

            <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end', marginTop: 4 }}>
              <button onClick={() => setHareket(null)} style={{ padding: '0.5rem 1rem', borderRadius: 8, background: 'var(--surface2)', fontWeight: 600, fontSize: 13 }}>İptal</button>
              <button onClick={() => kaydet.mutate()} disabled={kaydet.isPending} style={{ padding: '0.5rem 1.25rem', borderRadius: 8, background: kaydet.isPending ? 'var(--muted)' : 'var(--accent)', color: '#fff', fontWeight: 700, fontSize: 13 }}>
                {kaydet.isPending ? 'Kaydediliyor...' : 'Kaydet'}
              </button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
}
