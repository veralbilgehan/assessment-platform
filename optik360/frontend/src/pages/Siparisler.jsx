import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { getSiparisler, getSiparis, postSiparis, putSiparisDurum, getBayiler, getUrunler } from '../api/index.js';
import Badge from '../components/Badge.jsx';
import Modal from '../components/Modal.jsx';

const DURUM_RENK   = { taslak:'gray', onay_bekliyor:'yellow', hazirlaniyor:'blue', kargoda:'purple', teslim_edildi:'green', tamamlandi:'green', iptal:'red' };
const DURUM_SIRADAKI = { taslak: 'onay_bekliyor', onay_bekliyor: 'hazirlaniyor', hazirlaniyor: 'kargoda', kargoda: 'teslim_edildi', teslim_edildi: 'tamamlandi' };
const DURUM_LABEL  = { taslak:'Taslak', onay_bekliyor:'Onay Bekliyor', hazirlaniyor:'Hazırlanıyor', kargoda:'Kargoda', teslim_edildi:'Teslim Edildi', tamamlandi:'Tamamlandı', iptal:'İptal' };

function Para(v) { return Number(v || 0).toLocaleString('tr-TR', { style: 'currency', currency: 'TRY' }); }

const BOSH_KALEM = { urun_id: '', miktar: 1, birim_fiyat: '', iskonto_yuzdesi: 0, kdv_yuzdesi: 20 };

export default function Siparisler() {
  const qc = useQueryClient();
  const [filtre,  setFiltre]  = useState({ durum: '' });
  const [detay,   setDetay]   = useState(null);
  const [yeniModal, setYeniModal] = useState(false);
  const [form,    setForm]    = useState({ bayi_id: '', vade_gun: 30, notlar: '', kalemler: [{ ...BOSH_KALEM }] });
  const [hata,    setHata]    = useState('');

  const { data: siparisler = [], isLoading } = useQuery({
    queryKey: ['siparisler', filtre],
    queryFn: () => getSiparisler(Object.fromEntries(Object.entries(filtre).filter(([,v]) => v))),
  });
  const { data: sipDetay } = useQuery({ queryKey: ['siparis', detay], queryFn: () => getSiparis(detay), enabled: !!detay });
  const { data: bayiler  = [] } = useQuery({ queryKey: ['bayiler'], queryFn: getBayiler });
  const { data: urunler  = [] } = useQuery({ queryKey: ['urunler',{}], queryFn: () => getUrunler({}) });

  const olustur = useMutation({
    mutationFn: postSiparis,
    onSuccess: () => { qc.invalidateQueries(['siparisler']); setYeniModal(false); setHata(''); },
    onError: e => setHata(e.response?.data?.hata || 'Hata'),
  });

  const durumGuncelle = useMutation({
    mutationFn: ({ id, durum }) => putSiparisDurum(id, durum),
    onSuccess: () => { qc.invalidateQueries(['siparisler']); qc.invalidateQueries(['siparis', detay]); },
  });

  function kalemGuncelle(i, field, val) {
    setForm(f => {
      const k = [...f.kalemler];
      k[i] = { ...k[i], [field]: val };
      if (field === 'urun_id') {
        const u = urunler.find(u => String(u.id) === String(val));
        if (u) k[i].birim_fiyat = u.bayi_fiyati || '';
      }
      return { ...f, kalemler: k };
    });
  }

  const toplamHesapla = () => form.kalemler.reduce((acc, k) => {
    if (!k.miktar || !k.birim_fiyat) return acc;
    const brut = k.miktar * k.birim_fiyat * (1 - (k.iskonto_yuzdesi || 0) / 100);
    return acc + brut * (1 + (k.kdv_yuzdesi || 20) / 100);
  }, 0);

  return (
    <div style={{ padding: '1.5rem' }}>
      <div style={{ display: 'flex', gap: 10, marginBottom: 16, alignItems: 'center' }}>
        <select value={filtre.durum} onChange={e => setFiltre(f => ({ ...f, durum: e.target.value }))}
          style={{ padding: '0.5rem 0.75rem', borderRadius: 8, border: '1.5px solid var(--border)', fontSize: 13 }}>
          <option value="">Tüm Durumlar</option>
          {Object.entries(DURUM_LABEL).map(([v, l]) => <option key={v} value={v}>{l}</option>)}
        </select>
        <div style={{ flex: 1 }} />
        <button onClick={() => setYeniModal(true)} style={{ padding: '0.5rem 1rem', borderRadius: 8, background: 'var(--accent)', color: '#fff', fontWeight: 700, fontSize: 13 }}>
          + Yeni Sipariş
        </button>
      </div>

      <div style={{ background: 'var(--surface)', borderRadius: 12, boxShadow: 'var(--shadow)', overflow: 'hidden' }}>
        {isLoading ? (
          <div style={{ padding: '3rem', textAlign: 'center', color: 'var(--muted)' }}>Yükleniyor...</div>
        ) : (
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead style={{ background: 'var(--surface2)' }}>
              <tr>
                {['Sipariş No','Bayi','Tutar','Vade','Durum','Tarih',''].map(h => (
                  <th key={h} style={{ padding: '0.65rem 1rem', textAlign: 'left', fontSize: 11, fontWeight: 700, color: 'var(--muted)', textTransform: 'uppercase', borderBottom: '1px solid var(--border)' }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {siparisler.length === 0 ? (
                <tr><td colSpan={7} style={{ padding: '3rem', textAlign: 'center', color: 'var(--muted)' }}>Sipariş bulunamadı</td></tr>
              ) : siparisler.map(s => (
                <tr key={s.id} style={{ borderBottom: '1px solid var(--border)', cursor: 'pointer' }} onClick={() => setDetay(s.id)}>
                  <td style={{ padding: '0.7rem 1rem', fontWeight: 700, fontFamily: 'monospace', fontSize: 13 }}>{s.siparis_no}</td>
                  <td style={{ padding: '0.7rem 1rem', fontSize: 13 }}>{s.bayi}</td>
                  <td style={{ padding: '0.7rem 1rem', fontWeight: 700 }}>{Para(s.genel_toplam)}</td>
                  <td style={{ padding: '0.7rem 1rem', fontSize: 12, color: 'var(--muted)' }}>{s.vade_gun} gün</td>
                  <td style={{ padding: '0.7rem 1rem' }}><Badge variant={DURUM_RENK[s.durum]}>{DURUM_LABEL[s.durum]}</Badge></td>
                  <td style={{ padding: '0.7rem 1rem', fontSize: 12, color: 'var(--muted)' }}>{new Date(s.olusturuldu).toLocaleDateString('tr-TR')}</td>
                  <td style={{ padding: '0.7rem 1rem' }}>
                    {DURUM_SIRADAKI[s.durum] && (
                      <button onClick={e => { e.stopPropagation(); durumGuncelle.mutate({ id: s.id, durum: DURUM_SIRADAKI[s.durum] }); }}
                        style={{ fontSize: 11, color: 'var(--accent)', background: 'none', fontWeight: 600, borderBottom: '1px dashed var(--accent)' }}>
                        → {DURUM_LABEL[DURUM_SIRADAKI[s.durum]]}
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {/* Detay Modal */}
      {detay && sipDetay && (
        <Modal title={`${sipDetay.siparis_no} — Detay`} onClose={() => setDetay(null)} width={640}>
          <div style={{ display: 'flex', gap: 12, background: 'var(--surface2)', borderRadius: 10, padding: '0.85rem', marginBottom: 14 }}>
            {[['Bayi', sipDetay.bayi], ['Toplam', Para(sipDetay.genel_toplam)], ['Vade', `${sipDetay.vade_gun} gün`], ['Durum', DURUM_LABEL[sipDetay.durum]]].map(([l, v]) => (
              <div key={l} style={{ flex: 1 }}>
                <div style={{ fontSize: 10, fontWeight: 700, color: 'var(--muted)', textTransform: 'uppercase' }}>{l}</div>
                <div style={{ fontWeight: 700, fontSize: 14 }}>{v}</div>
              </div>
            ))}
          </div>

          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
            <thead>
              <tr style={{ borderBottom: '2px solid var(--border)' }}>
                {['Ürün','Miktar','Birim Fiyat','İskonto','KDV','Toplam'].map(h => (
                  <th key={h} style={{ padding: '0.4rem 0.6rem', textAlign: 'left', fontSize: 11, fontWeight: 700, color: 'var(--muted)' }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {sipDetay.kalemler?.map(k => (
                <tr key={k.id} style={{ borderBottom: '1px solid var(--border)' }}>
                  <td style={{ padding: '0.5rem 0.6rem', fontWeight: 600 }}>{k.urun_adi}</td>
                  <td style={{ padding: '0.5rem 0.6rem' }}>{k.miktar}</td>
                  <td style={{ padding: '0.5rem 0.6rem' }}>{Para(k.birim_fiyat)}</td>
                  <td style={{ padding: '0.5rem 0.6rem' }}>%{k.iskonto_yuzdesi}</td>
                  <td style={{ padding: '0.5rem 0.6rem' }}>%{k.kdv_yuzdesi}</td>
                  <td style={{ padding: '0.5rem 0.6rem', fontWeight: 700 }}>{Para(k.toplam)}</td>
                </tr>
              ))}
            </tbody>
          </table>

          {DURUM_SIRADAKI[sipDetay.durum] && (
            <div style={{ marginTop: 16, textAlign: 'right' }}>
              <button onClick={() => durumGuncelle.mutate({ id: sipDetay.id, durum: DURUM_SIRADAKI[sipDetay.durum] })} style={{
                padding: '0.55rem 1.1rem', borderRadius: 8, background: 'var(--accent)', color: '#fff', fontWeight: 700, fontSize: 13,
              }}>
                → {DURUM_LABEL[DURUM_SIRADAKI[sipDetay.durum]]}
              </button>
            </div>
          )}
        </Modal>
      )}

      {/* Yeni Sipariş Modal */}
      {yeniModal && (
        <Modal title="Yeni Sipariş Oluştur" onClose={() => setYeniModal(false)} width={680}>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 16 }}>
            <div>
              <label style={{ fontWeight: 600, fontSize: 12, display: 'block', marginBottom: 4, color: 'var(--muted)' }}>Bayi *</label>
              <select value={form.bayi_id} onChange={e => setForm(f => ({ ...f, bayi_id: e.target.value }))}
                style={{ width: '100%', padding: '0.5rem', borderRadius: 7, border: '1.5px solid var(--border)', fontSize: 13 }}>
                <option value="">Bayi seçin</option>
                {bayiler.map(b => <option key={b.id} value={b.id}>{b.unvan} ({b.kod})</option>)}
              </select>
            </div>
            <div>
              <label style={{ fontWeight: 600, fontSize: 12, display: 'block', marginBottom: 4, color: 'var(--muted)' }}>Vade (gün)</label>
              <input type="number" value={form.vade_gun} onChange={e => setForm(f => ({ ...f, vade_gun: e.target.value }))}
                style={{ width: '100%', padding: '0.5rem', borderRadius: 7, border: '1.5px solid var(--border)', fontSize: 13 }} />
            </div>
          </div>

          <div style={{ fontWeight: 700, fontSize: 13, marginBottom: 8 }}>Sipariş Kalemleri</div>
          {form.kalemler.map((k, i) => (
            <div key={i} style={{ display: 'grid', gridTemplateColumns: '2fr 0.7fr 1fr 0.7fr 0.7fr auto', gap: 6, marginBottom: 6, alignItems: 'center' }}>
              <select value={k.urun_id} onChange={e => kalemGuncelle(i, 'urun_id', e.target.value)}
                style={{ padding: '0.45rem', borderRadius: 7, border: '1.5px solid var(--border)', fontSize: 12 }}>
                <option value="">Ürün</option>
                {urunler.map(u => <option key={u.id} value={u.id}>{u.ad} ({u.sku})</option>)}
              </select>
              {['miktar','birim_fiyat','iskonto_yuzdesi','kdv_yuzdesi'].map(field => (
                <input key={field} type="number" step={field === 'birim_fiyat' ? '0.01' : '1'}
                  value={k[field] || ''} onChange={e => kalemGuncelle(i, field, e.target.value)}
                  placeholder={field === 'miktar' ? 'Adet' : field === 'birim_fiyat' ? 'Fiyat' : field === 'iskonto_yuzdesi' ? 'İsk%' : 'KDV%'}
                  style={{ padding: '0.45rem', borderRadius: 7, border: '1.5px solid var(--border)', fontSize: 12 }} />
              ))}
              <button onClick={() => setForm(f => ({ ...f, kalemler: f.kalemler.filter((_, j) => j !== i) }))}
                style={{ color: 'var(--red)', background: 'none', fontSize: 18 }}>×</button>
            </div>
          ))}

          <button onClick={() => setForm(f => ({ ...f, kalemler: [...f.kalemler, { ...BOSH_KALEM }] }))}
            style={{ color: 'var(--accent)', background: 'none', fontWeight: 600, fontSize: 13, marginBottom: 12 }}>
            + Kalem Ekle
          </button>

          <div style={{ fontWeight: 800, fontSize: 16, textAlign: 'right', color: 'var(--accent)', marginBottom: 12 }}>
            Toplam: {Para(toplamHesapla())}
          </div>

          {hata && <div style={{ color: 'var(--red)', fontSize: 13, fontWeight: 600, marginBottom: 8 }}>{hata}</div>}

          <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
            <button onClick={() => setYeniModal(false)} style={{ padding: '0.55rem 1rem', borderRadius: 8, background: 'var(--surface2)', fontWeight: 600, fontSize: 13 }}>İptal</button>
            <button onClick={() => olustur.mutate(form)} disabled={olustur.isPending} style={{ padding: '0.55rem 1.25rem', borderRadius: 8, background: olustur.isPending ? 'var(--muted)' : 'var(--accent)', color: '#fff', fontWeight: 700, fontSize: 13 }}>
              {olustur.isPending ? 'Oluşturuluyor...' : 'Sipariş Oluştur'}
            </button>
          </div>
        </Modal>
      )}
    </div>
  );
}
