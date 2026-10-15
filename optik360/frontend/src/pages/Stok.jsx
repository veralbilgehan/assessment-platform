import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { getStok, postStokHareket, getUrunler, getBayiler } from '../api/index.js';
import Modal from '../components/Modal.jsx';

export default function Stok() {
  const qc = useQueryClient();
  const [modal, setModal] = useState(false);
  const [form,  setForm]  = useState({ urun_id: '', depo_id: '', tip: 'giris', miktar: 1, notlar: '' });
  const [hata,  setHata]  = useState('');

  const { data: stoklar = [], isLoading } = useQuery({ queryKey: ['stok'], queryFn: getStok });
  const { data: urunler = [] } = useQuery({ queryKey: ['urunler', {}], queryFn: () => getStok() });

  // Depo listesini stok datasından türet
  const depolar = [...new Set(stoklar.map(s => JSON.stringify({ id: s.depo_id, ad: s.depo })))].map(d => JSON.parse(d));

  const kaydet = useMutation({
    mutationFn: postStokHareket,
    onSuccess: () => { qc.invalidateQueries(['stok']); setModal(false); setHata(''); },
    onError: e => setHata(e.response?.data?.hata || 'Hata oluştu'),
  });

  // Unique ürünler
  const urunSet = {};
  stoklar.forEach(s => { if (!urunSet[s.urun_id]) urunSet[s.urun_id] = { id: s.urun_id, ad: s.urun_adi, sku: s.sku }; });
  const urunListesi = Object.values(urunSet);

  return (
    <div style={{ padding: '1.5rem' }}>
      <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: 16 }}>
        <button onClick={() => setModal(true)} style={{
          padding: '0.5rem 1rem', borderRadius: 8, background: 'var(--accent)',
          color: '#fff', fontWeight: 700, fontSize: 13,
        }}>+ Stok Hareketi</button>
      </div>

      <div style={{ background: 'var(--surface)', borderRadius: 12, boxShadow: 'var(--shadow)', overflow: 'hidden' }}>
        {isLoading ? (
          <div style={{ padding: '3rem', textAlign: 'center', color: 'var(--muted)' }}>Yükleniyor...</div>
        ) : (
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead style={{ background: 'var(--surface2)' }}>
              <tr>
                {['SKU','Ürün','Marka','Depo','Stok','Min. Stok','Durum'].map(h => (
                  <th key={h} style={{ padding: '0.65rem 1rem', textAlign: 'left', fontSize: 11, fontWeight: 700, color: 'var(--muted)', textTransform: 'uppercase', borderBottom: '1px solid var(--border)' }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {stoklar.map((s, i) => {
                const kritik = s.miktar <= s.minimum_stok;
                return (
                  <tr key={i} style={{ borderBottom: '1px solid var(--border)', background: kritik ? 'rgba(220,38,38,.03)' : 'none' }}>
                    <td style={{ padding: '0.65rem 1rem', fontFamily: 'monospace', fontSize: 12 }}>{s.sku}</td>
                    <td style={{ padding: '0.65rem 1rem', fontWeight: 600, fontSize: 13 }}>{s.urun_adi}</td>
                    <td style={{ padding: '0.65rem 1rem', fontSize: 13, color: 'var(--muted)' }}>{s.marka}</td>
                    <td style={{ padding: '0.65rem 1rem', fontSize: 13 }}>{s.depo}</td>
                    <td style={{ padding: '0.65rem 1rem', fontWeight: 700, fontSize: 16, color: kritik ? 'var(--red)' : 'var(--green)' }}>
                      {s.miktar}
                    </td>
                    <td style={{ padding: '0.65rem 1rem', fontSize: 12, color: 'var(--muted)' }}>{s.minimum_stok}</td>
                    <td style={{ padding: '0.65rem 1rem' }}>
                      <span style={{
                        fontSize: 11, fontWeight: 600, padding: '0.2rem 0.5rem', borderRadius: 12,
                        background: kritik ? 'rgba(220,38,38,.12)' : 'rgba(22,163,74,.12)',
                        color: kritik ? 'var(--red)' : 'var(--green)',
                      }}>
                        {kritik ? '⚠️ Kritik' : '✓ Normal'}
                      </span>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </div>

      {modal && (
        <Modal title="Stok Hareketi Kaydet" onClose={() => setModal(false)}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            {[
              { label: 'Ürün', key: 'urun_id', el: (
                <select value={form.urun_id} onChange={e => setForm(f => ({ ...f, urun_id: e.target.value }))}
                  style={{ width: '100%', padding: '0.5rem', borderRadius: 7, border: '1.5px solid var(--border)' }}>
                  <option value="">Ürün seçin</option>
                  {urunListesi.map(u => <option key={u.id} value={u.id}>{u.ad} ({u.sku})</option>)}
                </select>
              )},
              { label: 'Depo', key: 'depo_id', el: (
                <select value={form.depo_id} onChange={e => setForm(f => ({ ...f, depo_id: e.target.value }))}
                  style={{ width: '100%', padding: '0.5rem', borderRadius: 7, border: '1.5px solid var(--border)' }}>
                  <option value="">Depo seçin</option>
                  {depolar.map(d => <option key={d.id} value={d.id}>{d.ad}</option>)}
                </select>
              )},
              { label: 'İşlem Tipi', key: 'tip', el: (
                <select value={form.tip} onChange={e => setForm(f => ({ ...f, tip: e.target.value }))}
                  style={{ width: '100%', padding: '0.5rem', borderRadius: 7, border: '1.5px solid var(--border)' }}>
                  <option value="giris">Giriş</option>
                  <option value="cikis">Çıkış</option>
                  <option value="sayim">Sayım (Düzeltme)</option>
                </select>
              )},
            ].map(({ label, key, el }) => (
              <div key={key}>
                <label style={{ fontWeight: 600, fontSize: 12, display: 'block', marginBottom: 4, color: 'var(--muted)' }}>{label}</label>
                {el}
              </div>
            ))}

            <div>
              <label style={{ fontWeight: 600, fontSize: 12, display: 'block', marginBottom: 4, color: 'var(--muted)' }}>Miktar</label>
              <input type="number" min="1" value={form.miktar} onChange={e => setForm(f => ({ ...f, miktar: e.target.value }))}
                style={{ width: '100%', padding: '0.5rem', borderRadius: 7, border: '1.5px solid var(--border)' }} />
            </div>
            <div>
              <label style={{ fontWeight: 600, fontSize: 12, display: 'block', marginBottom: 4, color: 'var(--muted)' }}>Not</label>
              <textarea value={form.notlar} onChange={e => setForm(f => ({ ...f, notlar: e.target.value }))} rows={2}
                style={{ width: '100%', padding: '0.5rem', borderRadius: 7, border: '1.5px solid var(--border)', resize: 'vertical' }} />
            </div>

            {hata && <div style={{ color: 'var(--red)', fontSize: 13, fontWeight: 600 }}>{hata}</div>}

            <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end', marginTop: 4 }}>
              <button onClick={() => setModal(false)} style={{ padding: '0.55rem 1rem', borderRadius: 8, background: 'var(--surface2)', fontWeight: 600, fontSize: 13 }}>İptal</button>
              <button onClick={() => kaydet.mutate(form)} disabled={kaydet.isPending} style={{
                padding: '0.55rem 1.25rem', borderRadius: 8,
                background: kaydet.isPending ? 'var(--muted)' : 'var(--accent)',
                color: '#fff', fontWeight: 700, fontSize: 13,
              }}>
                {kaydet.isPending ? 'Kaydediliyor...' : 'Kaydet'}
              </button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
}
