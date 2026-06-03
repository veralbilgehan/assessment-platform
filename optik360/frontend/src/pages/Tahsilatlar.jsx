import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { getTahsilatlar, getTahsilat, postTahsilat, getBayiler, getFaturalar } from '../api/index.js';
import Badge from '../components/Badge.jsx';
import Modal from '../components/Modal.jsx';

function Para(v) { return Number(v || 0).toLocaleString('tr-TR', { style: 'currency', currency: 'TRY' }); }

const ODEME_LABEL = { kredi_karti: 'Kredi Kartı', havale: 'Havale', nakit: 'Nakit', cek: 'Çek', senet: 'Senet' };
const DURUM_RENK  = { bekliyor: 'yellow', tamamlandi: 'green', iptal: 'red', iade: 'orange' };

export default function Tahsilatlar() {
  const qc = useQueryClient();
  const [modal,   setModal]   = useState(false);
  const [fisModal, setFisModal] = useState(null);
  const [pos,     setPos]     = useState(null); // { asamasi: 'islem' | 'onay', tahsilat }
  const [form,    setForm]    = useState({ bayi_id: '', fatura_id: '', tutar: '', odeme_yontemi: 'kredi_karti', taksit_sayisi: 1, komisyon_yuzdesi: 0, aciklama: '' });
  const [hata,    setHata]    = useState('');

  const { data: tahsilatlar = [], isLoading } = useQuery({ queryKey: ['tahsilatlar'], queryFn: getTahsilatlar });
  const { data: bayiler = [] } = useQuery({ queryKey: ['bayiler'], queryFn: getBayiler });
  const { data: acikFaturalar = [] } = useQuery({
    queryKey: ['faturalar-acik', form.bayi_id],
    queryFn: () => getFaturalar({ bayi_id: form.bayi_id, durum: 'acik' }),
    enabled: !!form.bayi_id,
  });
  const { data: fisMeta } = useQuery({ queryKey: ['tahsilat-fis', fisModal], queryFn: () => getTahsilat(fisModal), enabled: !!fisModal });

  const kaydet = useMutation({
    mutationFn: async (f) => {
      if (f.odeme_yontemi === 'kredi_karti') {
        setPos({ asamasi: 'islem' });
        await new Promise(r => setTimeout(r, 1500));
        setPos({ asamasi: 'onay' });
        await new Promise(r => setTimeout(r, 600));
      }
      return postTahsilat(f);
    },
    onSuccess: (data) => {
      qc.invalidateQueries(['tahsilatlar']);
      qc.invalidateQueries(['cari-hesaplar']);
      setModal(false); setPos(null); setFisModal(data.id); setHata('');
    },
    onError: e => { setPos(null); setHata(e.response?.data?.hata || 'Hata'); },
  });

  return (
    <div style={{ padding: '1.5rem' }}>
      <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: 16 }}>
        <button onClick={() => setModal(true)} style={{ padding: '0.5rem 1rem', borderRadius: 8, background: 'var(--accent)', color: '#fff', fontWeight: 700, fontSize: 13 }}>
          + Tahsilat Kaydet
        </button>
      </div>

      <div style={{ background: 'var(--surface)', borderRadius: 12, boxShadow: 'var(--shadow)', overflow: 'hidden' }}>
        {isLoading ? (
          <div style={{ padding: '3rem', textAlign: 'center', color: 'var(--muted)' }}>Yükleniyor...</div>
        ) : (
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead style={{ background: 'var(--surface2)' }}>
              <tr>
                {['Tahsilat No','Bayi','Fatura','Tutar','Ödeme','Durum','Tarih','Fiş'].map(h => (
                  <th key={h} style={{ padding: '0.65rem 1rem', textAlign: 'left', fontSize: 11, fontWeight: 700, color: 'var(--muted)', textTransform: 'uppercase', borderBottom: '1px solid var(--border)' }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {tahsilatlar.length === 0 ? (
                <tr><td colSpan={8} style={{ padding: '3rem', textAlign: 'center', color: 'var(--muted)' }}>Tahsilat bulunamadı</td></tr>
              ) : tahsilatlar.map(t => (
                <tr key={t.id} style={{ borderBottom: '1px solid var(--border)' }}>
                  <td style={{ padding: '0.7rem 1rem', fontWeight: 700, fontFamily: 'monospace', fontSize: 12 }}>{t.tahsilat_no}</td>
                  <td style={{ padding: '0.7rem 1rem', fontSize: 13 }}>{t.bayi}</td>
                  <td style={{ padding: '0.7rem 1rem', fontSize: 12, color: 'var(--muted)' }}>{t.fatura_no || '—'}</td>
                  <td style={{ padding: '0.7rem 1rem', fontWeight: 700 }}>{Para(t.tutar)}</td>
                  <td style={{ padding: '0.7rem 1rem', fontSize: 12 }}>{ODEME_LABEL[t.odeme_yontemi]} {t.taksit_sayisi > 1 ? `(${t.taksit_sayisi}x)` : ''}</td>
                  <td style={{ padding: '0.7rem 1rem' }}><Badge variant={DURUM_RENK[t.durum]}>{t.durum}</Badge></td>
                  <td style={{ padding: '0.7rem 1rem', fontSize: 12, color: 'var(--muted)' }}>{new Date(t.olusturuldu).toLocaleDateString('tr-TR')}</td>
                  <td style={{ padding: '0.7rem 1rem' }}>
                    <button onClick={() => setFisModal(t.id)} style={{ fontSize: 12, color: 'var(--accent)', background: 'none', fontWeight: 600 }}>🖨️ Fiş</button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {/* POS Simülatör Overlay */}
      {pos && (
        <div style={{ position: 'fixed', inset: 0, zIndex: 2000, background: 'rgba(0,0,0,.6)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <div style={{ background: '#fff', borderRadius: 16, padding: '2.5rem', textAlign: 'center', minWidth: 300, boxShadow: '0 8px 40px rgba(0,0,0,.25)' }}>
            {pos.asamasi === 'islem' ? (
              <>
                <div style={{ fontSize: 48, animation: 'pulse 1s infinite' }}>💳</div>
                <div style={{ fontWeight: 700, fontSize: 17, marginTop: 16 }}>POS İşlemi Gerçekleşiyor</div>
                <div style={{ color: 'var(--muted)', marginTop: 8, fontSize: 13 }}>Lütfen bekleyin...</div>
                <div style={{ marginTop: 20, height: 4, background: 'var(--surface2)', borderRadius: 2, overflow: 'hidden' }}>
                  <div style={{ height: '100%', background: 'var(--accent)', borderRadius: 2, animation: 'slideIn 1.5s ease' }} />
                </div>
              </>
            ) : (
              <>
                <div style={{ fontSize: 56 }}>✅</div>
                <div style={{ fontWeight: 800, fontSize: 18, marginTop: 12, color: 'var(--green)' }}>İşlem Onaylandı!</div>
                <div style={{ color: 'var(--muted)', marginTop: 6, fontSize: 13 }}>Tahsilat kaydediliyor...</div>
              </>
            )}
          </div>
        </div>
      )}

      {/* Tahsilat Formu */}
      {modal && (
        <Modal title="Tahsilat Kaydet" onClose={() => setModal(false)} width={520}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            <div>
              <label style={{ fontWeight: 600, fontSize: 12, display: 'block', marginBottom: 4, color: 'var(--muted)' }}>Bayi *</label>
              <select value={form.bayi_id} onChange={e => setForm(f => ({ ...f, bayi_id: e.target.value, fatura_id: '' }))}
                style={{ width: '100%', padding: '0.5rem', borderRadius: 7, border: '1.5px solid var(--border)', fontSize: 13 }}>
                <option value="">Bayi seçin</option>
                {bayiler.map(b => <option key={b.id} value={b.id}>{b.unvan} — Bakiye: {Para(b.guncel_bakiye)}</option>)}
              </select>
            </div>

            {form.bayi_id && (
              <div>
                <label style={{ fontWeight: 600, fontSize: 12, display: 'block', marginBottom: 4, color: 'var(--muted)' }}>Fatura (opsiyonel)</label>
                <select value={form.fatura_id} onChange={e => {
                  const f = acikFaturalar.find(f => String(f.id) === e.target.value);
                  setForm(ff => ({ ...ff, fatura_id: e.target.value, tutar: f ? f.kalan_tutar : ff.tutar }));
                }}
                  style={{ width: '100%', padding: '0.5rem', borderRadius: 7, border: '1.5px solid var(--border)', fontSize: 13 }}>
                  <option value="">Seçilmedi (genel ödeme)</option>
                  {acikFaturalar.map(f => <option key={f.id} value={f.id}>{f.fatura_no} — Kalan: {Para(f.kalan_tutar)}</option>)}
                </select>
              </div>
            )}

            <div>
              <label style={{ fontWeight: 600, fontSize: 12, display: 'block', marginBottom: 4, color: 'var(--muted)' }}>Tutar (TRY) *</label>
              <input type="number" step="0.01" value={form.tutar} onChange={e => setForm(f => ({ ...f, tutar: e.target.value }))}
                style={{ width: '100%', padding: '0.5rem', borderRadius: 7, border: '1.5px solid var(--border)', fontSize: 13 }} />
            </div>

            <div>
              <label style={{ fontWeight: 600, fontSize: 12, display: 'block', marginBottom: 4, color: 'var(--muted)' }}>Ödeme Yöntemi</label>
              <select value={form.odeme_yontemi} onChange={e => setForm(f => ({ ...f, odeme_yontemi: e.target.value }))}
                style={{ width: '100%', padding: '0.5rem', borderRadius: 7, border: '1.5px solid var(--border)', fontSize: 13 }}>
                {Object.entries(ODEME_LABEL).map(([v, l]) => <option key={v} value={v}>{l}</option>)}
              </select>
            </div>

            {form.odeme_yontemi === 'kredi_karti' && (
              <div>
                <label style={{ fontWeight: 600, fontSize: 12, display: 'block', marginBottom: 4, color: 'var(--muted)' }}>Taksit Sayısı</label>
                <select value={form.taksit_sayisi} onChange={e => setForm(f => ({ ...f, taksit_sayisi: e.target.value }))}
                  style={{ width: '100%', padding: '0.5rem', borderRadius: 7, border: '1.5px solid var(--border)', fontSize: 13 }}>
                  {[1,2,3,6,9,12].map(t => <option key={t} value={t}>{t === 1 ? 'Tek Çekim' : `${t} Taksit`}</option>)}
                </select>
              </div>
            )}

            <div>
              <label style={{ fontWeight: 600, fontSize: 12, display: 'block', marginBottom: 4, color: 'var(--muted)' }}>Açıklama</label>
              <input type="text" value={form.aciklama} onChange={e => setForm(f => ({ ...f, aciklama: e.target.value }))}
                style={{ width: '100%', padding: '0.5rem', borderRadius: 7, border: '1.5px solid var(--border)', fontSize: 13 }} />
            </div>

            {hata && <div style={{ color: 'var(--red)', fontSize: 13, fontWeight: 600 }}>{hata}</div>}

            <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end', marginTop: 4 }}>
              <button onClick={() => setModal(false)} style={{ padding: '0.55rem 1rem', borderRadius: 8, background: 'var(--surface2)', fontWeight: 600, fontSize: 13 }}>İptal</button>
              <button onClick={() => kaydet.mutate(form)} disabled={kaydet.isPending} style={{
                padding: '0.55rem 1.25rem', borderRadius: 8,
                background: kaydet.isPending ? 'var(--muted)' : 'var(--green)',
                color: '#fff', fontWeight: 700, fontSize: 13,
              }}>
                {kaydet.isPending ? 'İşlem Yapılıyor...' : '💳 Tahsilat Yap'}
              </button>
            </div>
          </div>
        </Modal>
      )}

      {/* Dijital Fiş Modal */}
      {fisModal && fisMeta && (
        <Modal title="Dijital Tahsilat Fişi" onClose={() => setFisModal(null)} width={400}>
          <div style={{ border: '2px dashed var(--border)', borderRadius: 10, padding: '1.5rem', textAlign: 'center' }}>
            <div style={{ fontSize: 28, marginBottom: 8 }}>🧾</div>
            <div style={{ fontWeight: 800, fontSize: 16, marginBottom: 4 }}>TAHSILAT FİŞİ</div>
            <div style={{ fontFamily: 'monospace', fontSize: 13, color: 'var(--muted)', marginBottom: 16 }}>{fisMeta.tahsilat_no}</div>
            <div style={{ textAlign: 'left', borderTop: '1px solid var(--border)', paddingTop: 12 }}>
              {[
                ['Bayi', fisMeta.bayi],
                ['Tutar', Para(fisMeta.tutar)],
                ['Ödeme', ODEME_LABEL[fisMeta.odeme_yontemi]],
                ['Taksit', fisMeta.taksit_sayisi > 1 ? `${fisMeta.taksit_sayisi} taksit` : 'Tek çekim'],
                ['Onay Kodu', fisMeta.onay_kodu || '—'],
                ['Tarih', new Date(fisMeta.olusturuldu).toLocaleString('tr-TR')],
                ['Kasiyer', fisMeta.kullanici || '—'],
              ].map(([l, v]) => (
                <div key={l} style={{ display: 'flex', justifyContent: 'space-between', padding: '0.35rem 0', fontSize: 13, borderBottom: '1px solid var(--border)' }}>
                  <span style={{ color: 'var(--muted)', fontWeight: 600 }}>{l}</span>
                  <span style={{ fontWeight: 700 }}>{v}</span>
                </div>
              ))}
            </div>
            <div style={{ marginTop: 16, padding: '0.6rem', background: 'rgba(22,163,74,.08)', borderRadius: 8, color: 'var(--green)', fontWeight: 700, fontSize: 13 }}>
              ✓ İşlem Başarılı
            </div>
          </div>
          <div style={{ textAlign: 'center', marginTop: 12 }}>
            <button onClick={() => window.print()} style={{ padding: '0.5rem 1.2rem', borderRadius: 8, background: 'var(--accent)', color: '#fff', fontWeight: 700, fontSize: 13 }}>
              🖨️ Yazdır
            </button>
          </div>
        </Modal>
      )}
    </div>
  );
}
