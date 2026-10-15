import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { getUrunler, getMarkalar, getKategoriler, postUrun, putUrun, deleteUrun } from '../api/index.js';
import Badge from '../components/Badge.jsx';
import Modal from '../components/Modal.jsx';

const BOSH_FORM = {
  barkod: '', sku: '', ad: '', model: '', renk: '', cam_tipi: '', cerceve_tipi: '',
  marka_id: '', kategori_id: '', satin_alma_fiyati: '', bayi_fiyati: '',
  tavsiye_fiyati: '', kampanya_fiyati: '', minimum_stok: 0, raf_yeri: '',
};

function Para(v) { return v ? Number(v).toLocaleString('tr-TR', { style: 'currency', currency: 'TRY' }) : '—'; }

export default function Urunler() {
  const qc = useQueryClient();
  const [filtre,    setFiltre]    = useState({ marka_id: '', kategori_id: '', arama: '' });
  const [modal,     setModal]     = useState(null); // null | 'yeni' | { id, ...urun }
  const [form,      setForm]      = useState(BOSH_FORM);
  const [hata,      setHata]      = useState('');

  const { data: urunler = [], isLoading } = useQuery({
    queryKey: ['urunler', filtre],
    queryFn: () => getUrunler(Object.fromEntries(Object.entries(filtre).filter(([,v]) => v))),
  });
  const { data: markalar = [] } = useQuery({ queryKey: ['markalar'], queryFn: getMarkalar });
  const { data: kategoriler = [] } = useQuery({ queryKey: ['kategoriler'], queryFn: getKategoriler });

  const kaydet = useMutation({
    mutationFn: (f) => modal === 'yeni' ? postUrun(f) : putUrun(modal.id, f),
    onSuccess: () => { qc.invalidateQueries(['urunler']); setModal(null); setHata(''); },
    onError: e => setHata(e.response?.data?.hata || 'Hata oluştu'),
  });

  const pasifle = useMutation({
    mutationFn: deleteUrun,
    onSuccess: () => qc.invalidateQueries(['urunler']),
  });

  function acModal(urun = null) {
    setHata('');
    if (!urun) { setModal('yeni'); setForm(BOSH_FORM); }
    else { setModal(urun); setForm({ ...BOSH_FORM, ...urun }); }
  }

  const Input = ({ label, field, type = 'text', ...rest }) => (
    <div>
      <label style={{ fontWeight: 600, fontSize: 12, display: 'block', marginBottom: 4, color: 'var(--muted)' }}>{label}</label>
      <input type={type} value={form[field] || ''} onChange={e => setForm(f => ({ ...f, [field]: e.target.value }))}
        style={{ width: '100%', padding: '0.5rem 0.7rem', borderRadius: 7, border: '1.5px solid var(--border)', fontSize: 13 }}
        {...rest}
      />
    </div>
  );

  const Select = ({ label, field, options }) => (
    <div>
      <label style={{ fontWeight: 600, fontSize: 12, display: 'block', marginBottom: 4, color: 'var(--muted)' }}>{label}</label>
      <select value={form[field] || ''} onChange={e => setForm(f => ({ ...f, [field]: e.target.value }))}
        style={{ width: '100%', padding: '0.5rem 0.7rem', borderRadius: 7, border: '1.5px solid var(--border)', fontSize: 13 }}>
        <option value="">— Seçin —</option>
        {options.map(o => <option key={o.id} value={o.id}>{o.ad}</option>)}
      </select>
    </div>
  );

  return (
    <div style={{ padding: '1.5rem' }}>
      {/* Başlık + Filtreler */}
      <div style={{ display: 'flex', gap: 10, marginBottom: 16, flexWrap: 'wrap', alignItems: 'center' }}>
        <input
          placeholder="Ürün ara (ad, SKU, barkod)..."
          value={filtre.arama}
          onChange={e => setFiltre(f => ({ ...f, arama: e.target.value }))}
          style={{ flex: 1, minWidth: 200, padding: '0.5rem 0.75rem', borderRadius: 8, border: '1.5px solid var(--border)', fontSize: 13 }}
        />
        <select value={filtre.marka_id} onChange={e => setFiltre(f => ({ ...f, marka_id: e.target.value }))}
          style={{ padding: '0.5rem 0.75rem', borderRadius: 8, border: '1.5px solid var(--border)', fontSize: 13 }}>
          <option value="">Tüm Markalar</option>
          {markalar.map(m => <option key={m.id} value={m.id}>{m.ad}</option>)}
        </select>
        <select value={filtre.kategori_id} onChange={e => setFiltre(f => ({ ...f, kategori_id: e.target.value }))}
          style={{ padding: '0.5rem 0.75rem', borderRadius: 8, border: '1.5px solid var(--border)', fontSize: 13 }}>
          <option value="">Tüm Kategoriler</option>
          {kategoriler.map(k => <option key={k.id} value={k.id}>{k.ad}</option>)}
        </select>
        <button onClick={() => acModal()} style={{
          padding: '0.5rem 1rem', borderRadius: 8, background: 'var(--accent)',
          color: '#fff', fontWeight: 700, fontSize: 13,
        }}>+ Ürün Ekle</button>
      </div>

      {/* Tablo */}
      <div style={{ background: 'var(--surface)', borderRadius: 12, boxShadow: 'var(--shadow)', overflow: 'hidden' }}>
        {isLoading ? (
          <div style={{ padding: '3rem', textAlign: 'center', color: 'var(--muted)' }}>Yükleniyor...</div>
        ) : (
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead style={{ background: 'var(--surface2)' }}>
              <tr>
                {['SKU/Barkod', 'Ürün Adı', 'Marka', 'Kategori', 'Stok', 'Bayi Fiyatı', 'Durum', ''].map(h => (
                  <th key={h} style={{ padding: '0.65rem 1rem', textAlign: 'left', fontSize: 11, fontWeight: 700, color: 'var(--muted)', textTransform: 'uppercase', borderBottom: '1px solid var(--border)' }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {urunler.length === 0 ? (
                <tr><td colSpan={8} style={{ padding: '3rem', textAlign: 'center', color: 'var(--muted)' }}>Ürün bulunamadı</td></tr>
              ) : urunler.map(u => (
                <tr key={u.id} style={{ borderBottom: '1px solid var(--border)' }}>
                  <td style={{ padding: '0.7rem 1rem' }}>
                    <div style={{ fontFamily: 'monospace', fontSize: 12 }}>{u.sku}</div>
                    {u.barkod && <div style={{ fontSize: 10, color: 'var(--muted)' }}>{u.barkod}</div>}
                  </td>
                  <td style={{ padding: '0.7rem 1rem' }}>
                    <div style={{ fontWeight: 600 }}>{u.ad}</div>
                    {u.model && <div style={{ fontSize: 11, color: 'var(--muted)' }}>{u.model} {u.renk && `· ${u.renk}`}</div>}
                  </td>
                  <td style={{ padding: '0.7rem 1rem', fontSize: 13 }}>{u.marka || '—'}</td>
                  <td style={{ padding: '0.7rem 1rem', fontSize: 13 }}>{u.kategori || '—'}</td>
                  <td style={{ padding: '0.7rem 1rem', fontWeight: 700 }}>
                    <span style={{ color: Number(u.toplam_stok) <= u.minimum_stok ? 'var(--red)' : 'var(--green)' }}>
                      {u.toplam_stok}
                    </span>
                    <span style={{ fontSize: 10, color: 'var(--muted)', marginLeft: 4 }}>/ min {u.minimum_stok}</span>
                  </td>
                  <td style={{ padding: '0.7rem 1rem', fontWeight: 700 }}>{Para(u.bayi_fiyati)}</td>
                  <td style={{ padding: '0.7rem 1rem' }}>
                    <Badge variant={u.aktif ? 'green' : 'gray'}>{u.aktif ? 'Aktif' : 'Pasif'}</Badge>
                  </td>
                  <td style={{ padding: '0.7rem 1rem' }}>
                    <button onClick={() => acModal(u)} style={{ color: 'var(--accent)', background: 'none', fontWeight: 600, fontSize: 12 }}>Düzenle</button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {/* Modal */}
      {modal && (
        <Modal title={modal === 'yeni' ? 'Yeni Ürün Ekle' : 'Ürünü Düzenle'} onClose={() => setModal(null)} width={640}>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
            <Input label="SKU *" field="sku" required />
            <Input label="Barkod" field="barkod" />
            <div style={{ gridColumn: '1/-1' }}><Input label="Ürün Adı *" field="ad" required /></div>
            <Input label="Model" field="model" />
            <Input label="Renk" field="renk" />
            <Input label="Cam Tipi" field="cam_tipi" />
            <Input label="Çerçeve Tipi" field="cerceve_tipi" />
            <Select label="Marka" field="marka_id" options={markalar} />
            <Select label="Kategori" field="kategori_id" options={kategoriler} />
            <Input label="Satın Alma Fiyatı" field="satin_alma_fiyati" type="number" step="0.01" />
            <Input label="Bayi Fiyatı" field="bayi_fiyati" type="number" step="0.01" />
            <Input label="Tavsiye Fiyatı" field="tavsiye_fiyati" type="number" step="0.01" />
            <Input label="Kampanya Fiyatı" field="kampanya_fiyati" type="number" step="0.01" />
            <Input label="Minimum Stok" field="minimum_stok" type="number" />
            <Input label="Raf Yeri" field="raf_yeri" />
          </div>

          {hata && <div style={{ marginTop: 12, color: 'var(--red)', fontSize: 13, fontWeight: 600 }}>{hata}</div>}

          <div style={{ display: 'flex', gap: 8, marginTop: 20, justifyContent: 'flex-end' }}>
            <button onClick={() => setModal(null)} style={{ padding: '0.55rem 1.1rem', borderRadius: 8, background: 'var(--surface2)', color: 'var(--text)', fontWeight: 600, fontSize: 13 }}>
              İptal
            </button>
            <button onClick={() => kaydet.mutate(form)} disabled={kaydet.isPending} style={{
              padding: '0.55rem 1.25rem', borderRadius: 8,
              background: kaydet.isPending ? 'var(--muted)' : 'var(--accent)',
              color: '#fff', fontWeight: 700, fontSize: 13,
            }}>
              {kaydet.isPending ? 'Kaydediliyor...' : 'Kaydet'}
            </button>
          </div>
        </Modal>
      )}
    </div>
  );
}
