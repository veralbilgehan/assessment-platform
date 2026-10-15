import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { getBayiler, getBayi, postBayi, putBayi } from '../api/index.js';
import Badge from '../components/Badge.jsx';
import Modal from '../components/Modal.jsx';

const SEVIYE_RENK = { platinum: 'purple', gold: 'yellow', silver: 'gray', standart: 'blue' };

const BOSH_FORM = {
  kod: '', unvan: '', eposta: '', telefon: '', adres: '', il: '', ilce: '',
  vergi_no: '', vergi_dairesi: '', seviye: 'standart',
  risk_limiti: 50000, varsayilan_vade: 30,
};

function Para(v) { return Number(v || 0).toLocaleString('tr-TR', { style: 'currency', currency: 'TRY', maximumFractionDigits: 0 }); }

export default function Bayiler() {
  const qc = useQueryClient();
  const [modal,   setModal]   = useState(null); // null | 'yeni' | bayi_id
  const [detay,   setDetay]   = useState(null); // bayi_id
  const [form,    setForm]    = useState(BOSH_FORM);
  const [hata,    setHata]    = useState('');

  const { data: bayiler = [], isLoading } = useQuery({ queryKey: ['bayiler'], queryFn: getBayiler });
  const { data: bayiDetay } = useQuery({
    queryKey: ['bayi', detay], queryFn: () => getBayi(detay), enabled: !!detay,
  });

  const kaydet = useMutation({
    mutationFn: f => modal === 'yeni' ? postBayi(f) : putBayi(modal, f),
    onSuccess: () => { qc.invalidateQueries(['bayiler']); setModal(null); setHata(''); },
    onError: e => setHata(e.response?.data?.hata || 'Hata'),
  });

  function acModal(bayi = null) {
    setHata('');
    if (!bayi) { setModal('yeni'); setForm(BOSH_FORM); }
    else { setModal(bayi.id); setForm({ ...BOSH_FORM, ...bayi }); }
  }

  const F = ({ label, field, type = 'text', options }) => (
    <div>
      <label style={{ fontWeight: 600, fontSize: 12, display: 'block', marginBottom: 4, color: 'var(--muted)' }}>{label}</label>
      {options ? (
        <select value={form[field] || ''} onChange={e => setForm(f => ({ ...f, [field]: e.target.value }))}
          style={{ width: '100%', padding: '0.5rem', borderRadius: 7, border: '1.5px solid var(--border)', fontSize: 13 }}>
          {options.map(o => <option key={o.v} value={o.v}>{o.l}</option>)}
        </select>
      ) : (
        <input type={type} value={form[field] || ''} onChange={e => setForm(f => ({ ...f, [field]: e.target.value }))}
          style={{ width: '100%', padding: '0.5rem', borderRadius: 7, border: '1.5px solid var(--border)', fontSize: 13 }} />
      )}
    </div>
  );

  return (
    <div style={{ padding: '1.5rem' }}>
      <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: 16 }}>
        <button onClick={() => acModal()} style={{ padding: '0.5rem 1rem', borderRadius: 8, background: 'var(--accent)', color: '#fff', fontWeight: 700, fontSize: 13 }}>
          + Yeni Bayi
        </button>
      </div>

      {/* Kart Grid */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: 12 }}>
        {isLoading ? (
          <div style={{ color: 'var(--muted)', gridColumn: '1/-1', textAlign: 'center', padding: '3rem' }}>Yükleniyor...</div>
        ) : bayiler.map(b => (
          <div key={b.id} style={{
            background: 'var(--surface)', borderRadius: 12, padding: '1.1rem',
            boxShadow: 'var(--shadow)', cursor: 'pointer', border: '1.5px solid var(--border)',
          }} onClick={() => setDetay(b.id)}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 8 }}>
              <div>
                <div style={{ fontWeight: 700, fontSize: 14 }}>{b.unvan}</div>
                <div style={{ fontSize: 11, color: 'var(--muted)', fontFamily: 'monospace' }}>{b.kod}</div>
              </div>
              <Badge variant={SEVIYE_RENK[b.seviye]}>{b.seviye.toUpperCase()}</Badge>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 10 }}>
              <div>
                <div style={{ fontSize: 10, color: 'var(--muted)', fontWeight: 600 }}>BAKİYE</div>
                <div style={{ fontWeight: 800, fontSize: 16, color: Number(b.guncel_bakiye) > 0 ? 'var(--orange)' : 'var(--green)' }}>
                  {Para(b.guncel_bakiye)}
                </div>
              </div>
              <div style={{ textAlign: 'right' }}>
                <div style={{ fontSize: 10, color: 'var(--muted)', fontWeight: 600 }}>LİMİT</div>
                <div style={{ fontWeight: 700, color: 'var(--muted)', fontSize: 14 }}>{Para(b.risk_limiti)}</div>
              </div>
            </div>
            {b.temsilci_ad && (
              <div style={{ fontSize: 11, color: 'var(--muted)', marginTop: 8 }}>👤 {b.temsilci_ad}</div>
            )}
          </div>
        ))}
      </div>

      {/* Detay Paneli */}
      {detay && bayiDetay && (
        <Modal title={`${bayiDetay.unvan} — Detay`} onClose={() => setDetay(null)} width={580}>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 16 }}>
            {[['Kod', bayiDetay.kod], ['Seviye', bayiDetay.seviye?.toUpperCase()],
              ['Tel', bayiDetay.telefon || '—'], ['E-posta', bayiDetay.eposta || '—'],
              ['Vergi No', bayiDetay.vergi_no || '—'], ['Vergi Dairesi', bayiDetay.vergi_dairesi || '—'],
              ['Şehir', bayiDetay.il || '—'], ['İlçe', bayiDetay.ilce || '—'],
            ].map(([l, v]) => (
              <div key={l}>
                <div style={{ fontSize: 10, fontWeight: 700, color: 'var(--muted)', textTransform: 'uppercase', marginBottom: 2 }}>{l}</div>
                <div style={{ fontSize: 13, fontWeight: 600 }}>{v}</div>
              </div>
            ))}
          </div>

          <div style={{ display: 'flex', gap: 12, background: 'var(--surface2)', borderRadius: 10, padding: '0.85rem', marginBottom: 16 }}>
            {[['Bakiye', bayiDetay.guncel_bakiye, 'var(--orange)'], ['Limit', bayiDetay.risk_limiti, 'var(--muted)']].map(([l, v, c]) => (
              <div key={l} style={{ flex: 1 }}>
                <div style={{ fontSize: 10, fontWeight: 700, color: 'var(--muted)', textTransform: 'uppercase' }}>{l}</div>
                <div style={{ fontWeight: 800, fontSize: 18, color: c }}>{Para(v)}</div>
              </div>
            ))}
          </div>

          {bayiDetay.son_siparisler?.length > 0 && (
            <div>
              <div style={{ fontWeight: 700, fontSize: 13, marginBottom: 8 }}>Son Siparişler</div>
              {bayiDetay.son_siparisler.map(s => (
                <div key={s.id} style={{ display: 'flex', justifyContent: 'space-between', padding: '0.45rem 0', borderBottom: '1px solid var(--border)', fontSize: 13 }}>
                  <span style={{ fontWeight: 600 }}>{s.siparis_no}</span>
                  <span style={{ color: 'var(--muted)' }}>{new Date(s.olusturuldu).toLocaleDateString('tr-TR')}</span>
                  <span style={{ fontWeight: 700 }}>{Para(s.genel_toplam)}</span>
                </div>
              ))}
            </div>
          )}

          <div style={{ display: 'flex', gap: 8, marginTop: 16, justifyContent: 'flex-end' }}>
            <button onClick={() => { setDetay(null); acModal(bayiDetay); }} style={{ padding: '0.5rem 1rem', borderRadius: 8, background: 'var(--accent)', color: '#fff', fontWeight: 600, fontSize: 13 }}>Düzenle</button>
          </div>
        </Modal>
      )}

      {/* Kaydet Modal */}
      {modal && (
        <Modal title={modal === 'yeni' ? 'Yeni Bayi' : 'Bayi Düzenle'} onClose={() => setModal(null)} width={600}>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
            <F label="Bayi Kodu *" field="kod" />
            <F label="Seviye" field="seviye" options={['platinum','gold','silver','standart'].map(v => ({ v, l: v.toUpperCase() }))} />
            <div style={{ gridColumn: '1/-1' }}><F label="Ünvan *" field="unvan" /></div>
            <F label="Telefon" field="telefon" />
            <F label="E-posta" field="eposta" type="email" />
            <F label="Vergi No" field="vergi_no" />
            <F label="Vergi Dairesi" field="vergi_dairesi" />
            <F label="İl" field="il" />
            <F label="İlçe" field="ilce" />
            <F label="Risk Limiti (TRY)" field="risk_limiti" type="number" />
            <F label="Varsayılan Vade (gün)" field="varsayilan_vade" type="number" />
            <div style={{ gridColumn: '1/-1' }}>
              <label style={{ fontWeight: 600, fontSize: 12, display: 'block', marginBottom: 4, color: 'var(--muted)' }}>Adres</label>
              <textarea value={form.adres || ''} onChange={e => setForm(f => ({ ...f, adres: e.target.value }))} rows={2}
                style={{ width: '100%', padding: '0.5rem', borderRadius: 7, border: '1.5px solid var(--border)', resize: 'vertical', fontSize: 13 }} />
            </div>
          </div>

          {hata && <div style={{ marginTop: 10, color: 'var(--red)', fontSize: 13, fontWeight: 600 }}>{hata}</div>}

          <div style={{ display: 'flex', gap: 8, marginTop: 16, justifyContent: 'flex-end' }}>
            <button onClick={() => setModal(null)} style={{ padding: '0.55rem 1rem', borderRadius: 8, background: 'var(--surface2)', fontWeight: 600, fontSize: 13 }}>İptal</button>
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
