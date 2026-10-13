import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { getCVler, getCV, postCV, putCV, deleteCV } from '../api/index.js';

/* ─── 4M Beceri Kategorileri ─────────────────────────── */
const DORT_M = [
  { kod: 'insan',   etiket: 'İnsan (Man)',          simge: '👥', renk: '#6366f1', ipucu: 'Liderlik, ekip yönetimi, iletişim, eğitim verme…' },
  { kod: 'makine',  etiket: 'Makine (Machine)',     simge: '⚙️', renk: '#0891b2', ipucu: 'CNC, PLC, forklift, ERP/SAP, yazılım araçları…' },
  { kod: 'metot',   etiket: 'Metot (Method)',       simge: '📐', renk: '#16a34a', ipucu: 'Lean, 5S, Kaizen, Six Sigma, proje yönetimi…' },
  { kod: 'malzeme', etiket: 'Malzeme (Material)',   simge: '🧱', renk: '#ca8a04', ipucu: 'Hammadde bilgisi, kalite kontrol, stok yönetimi…' },
];

const BOS_CV = {
  ad_soyad: '', unvan: '', eposta: '', telefon: '', adres: '', ozet: '',
  egitimler: [], sertifikalar: [], deneyimler: [], beceriler: [], yetkinlikler: [],
};

const YENI = {
  egitimler:    () => ({ okul: '', bolum: '', derece: 'Lisans', baslangic: '', bitis: '', not_ortalamasi: '' }),
  sertifikalar: () => ({ ad: '', kurum: '', tarih: '', gecerlilik: '', belge_no: '' }),
  deneyimler:   () => ({ sirket: '', pozisyon: '', baslangic: '', bitis: '', devam_ediyor: false, aciklama: '' }),
  yetkinlikler: () => ({ ad: '', seviye: 3, kanit: '' }),
};

const DERECELER = ['Lise', 'Ön Lisans', 'Lisans', 'Yüksek Lisans', 'Doktora', 'Diğer'];
const SEVIYE_ADI = ['', 'Başlangıç', 'Temel', 'Orta', 'İleri', 'Uzman'];

/* ─── Küçük yardımcı bileşenler ─────────────────────── */
function Kart({ baslik, simge, aksiyon, children }) {
  return (
    <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 'var(--radius)', padding: '1.25rem', marginBottom: '1rem' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: '1rem' }}>
        <span style={{ fontSize: 16 }}>{simge}</span>
        <h3 style={{ margin: 0, fontSize: 14, fontWeight: 700, flex: 1 }}>{baslik}</h3>
        {aksiyon}
      </div>
      {children}
    </div>
  );
}

function Alan({ etiket, zorunlu, children, genis }) {
  return (
    <label style={{ display: 'flex', flexDirection: 'column', gap: 4, gridColumn: genis ? '1 / -1' : undefined }}>
      <span style={{ fontSize: 11.5, fontWeight: 600, color: 'var(--muted)' }}>
        {etiket}{zorunlu && <span style={{ color: 'var(--red)', marginLeft: 3 }}>*</span>}
      </span>
      {children}
    </label>
  );
}

const izgara = { display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: 10 };
const girdi  = { width: '100%', boxSizing: 'border-box' };
const anaBtn = { padding: '0.55rem 1.1rem', borderRadius: 8, background: 'var(--accent)', color: '#fff', fontSize: 13, fontWeight: 600 };
const ikincilBtn = { padding: '0.55rem 1.1rem', borderRadius: 8, background: 'var(--surface)', border: '1px solid var(--border)', color: 'var(--text)', fontSize: 13, fontWeight: 600 };

function EkleBtn({ onClick, children = '+ Ekle' }) {
  return (
    <button type="button" onClick={onClick} style={{
      fontSize: 12, padding: '0.35rem 0.75rem', borderRadius: 6, cursor: 'pointer',
      border: '1px solid var(--accent)', background: 'var(--accent-dim)', color: 'var(--accent)', fontWeight: 600,
    }}>{children}</button>
  );
}

function SilBtn({ onClick }) {
  return (
    <button type="button" onClick={onClick} title="Kaldır" style={{
      border: 'none', background: 'transparent', color: 'var(--red)', cursor: 'pointer', fontSize: 16, padding: '0 4px',
    }}>✕</button>
  );
}

function Satir({ children, onSil }) {
  return (
    <div style={{ border: '1px solid var(--border)', borderRadius: 8, padding: '0.75rem', marginBottom: 8, background: 'var(--surface2)', position: 'relative' }}>
      <div style={{ position: 'absolute', top: 6, right: 6 }}><SilBtn onClick={onSil} /></div>
      <div style={{ paddingRight: 24 }}>{children}</div>
    </div>
  );
}

function Bos({ children }) {
  return <div style={{ fontSize: 12, color: 'var(--muted)', fontStyle: 'italic' }}>{children}</div>;
}

function SeviyeSec({ deger, onChange }) {
  return (
    <div style={{ display: 'flex', gap: 3, alignItems: 'center' }}>
      {[1, 2, 3, 4, 5].map(n => (
        <button key={n} type="button" onClick={() => onChange(n)} title={SEVIYE_ADI[n]} style={{
          width: 22, height: 22, borderRadius: 4, cursor: 'pointer', fontSize: 11, padding: 0,
          border: '1px solid var(--border)',
          background: n <= deger ? 'var(--accent)' : 'var(--surface)',
          color: n <= deger ? '#fff' : 'var(--muted)',
        }}>{n}</button>
      ))}
      <span style={{ fontSize: 11, color: 'var(--muted)', marginLeft: 4 }}>{SEVIYE_ADI[deger]}</span>
    </div>
  );
}

/* ─── 4M Beceri Girişi ──────────────────────────────── */
function DortMBeceriler({ beceriler, onChange }) {
  const [taslak, setTaslak] = useState({ insan: '', makine: '', metot: '', malzeme: '' });

  function ekle(kategori) {
    const ad = taslak[kategori].trim();
    if (!ad) return;
    onChange([...beceriler, { kategori, ad, seviye: 3 }]);
    setTaslak(t => ({ ...t, [kategori]: '' }));
  }
  const guncelle = (i, alan, deger) => onChange(beceriler.map((b, j) => (j === i ? { ...b, [alan]: deger } : b)));
  const sil = (i) => onChange(beceriler.filter((_, j) => j !== i));

  return (
    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: 10 }}>
      {DORT_M.map(m => (
        <div key={m.kod} style={{ border: `1px solid ${m.renk}40`, borderTop: `3px solid ${m.renk}`, borderRadius: 8, padding: '0.75rem' }}>
          <div style={{ fontSize: 13, fontWeight: 700, color: m.renk, marginBottom: 2 }}>{m.simge} {m.etiket}</div>
          <div style={{ fontSize: 11, color: 'var(--muted)', marginBottom: 8 }}>{m.ipucu}</div>
          <div style={{ display: 'flex', gap: 6, marginBottom: 8 }}>
            <input
              style={{ ...girdi, flex: 1 }}
              value={taslak[m.kod]}
              placeholder="Beceri adı"
              onChange={e => setTaslak(t => ({ ...t, [m.kod]: e.target.value }))}
              onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); ekle(m.kod); } }}
            />
            <EkleBtn onClick={() => ekle(m.kod)}>+</EkleBtn>
          </div>
          {beceriler.map((b, i) => b.kategori !== m.kod ? null : (
            <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '4px 0', borderTop: '1px dashed var(--border)' }}>
              <span style={{ flex: 1, fontSize: 12.5 }}>{b.ad}</span>
              <SeviyeSec deger={b.seviye} onChange={v => guncelle(i, 'seviye', v)} />
              <SilBtn onClick={() => sil(i)} />
            </div>
          ))}
        </div>
      ))}
    </div>
  );
}

/* ─── CV Önizleme (yazdırılabilir) ──────────────────── */
function Onizleme({ cv }) {
  const bolum = (baslik) => (
    <h4 style={{ fontSize: 12, letterSpacing: '0.08em', color: '#6366f1', borderBottom: '1px solid #dde2ee', paddingBottom: 3, margin: '14px 0 6px' }}>{baslik}</h4>
  );
  const tarih = (a, b, devam) => [a, devam ? 'Devam ediyor' : b].filter(Boolean).join(' – ');

  return (
    <div id="cv-onizleme" style={{ background: '#fff', color: '#1a1f36', padding: '1.5rem', borderRadius: 8, border: '1px solid var(--border)', fontSize: 12, lineHeight: 1.5 }}>
      <div style={{ fontSize: 20, fontWeight: 800 }}>{cv.ad_soyad || 'Ad Soyad'}</div>
      {cv.unvan && <div style={{ fontSize: 13, color: '#6366f1', fontWeight: 600 }}>{cv.unvan}</div>}
      <div style={{ color: '#6b7591', marginTop: 4 }}>{[cv.eposta, cv.telefon, cv.adres].filter(Boolean).join('  ·  ')}</div>
      {cv.ozet && <p style={{ marginTop: 10 }}>{cv.ozet}</p>}

      {cv.deneyimler.length > 0 && <>{bolum('İŞ DENEYİMİ')}
        {cv.deneyimler.map((d, i) => (
          <div key={i} style={{ marginBottom: 8 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', gap: 8 }}>
              <b>{d.pozisyon}{d.sirket && ` — ${d.sirket}`}</b>
              <span style={{ color: '#6b7591', whiteSpace: 'nowrap' }}>{tarih(d.baslangic, d.bitis, d.devam_ediyor)}</span>
            </div>
            {d.aciklama && <div style={{ whiteSpace: 'pre-wrap' }}>{d.aciklama}</div>}
          </div>
        ))}</>}

      {cv.egitimler.length > 0 && <>{bolum('EĞİTİM')}
        {cv.egitimler.map((e, i) => (
          <div key={i} style={{ display: 'flex', justifyContent: 'space-between', gap: 8, marginBottom: 4 }}>
            <span><b>{e.okul}</b>{e.bolum && ` — ${e.bolum}`} ({e.derece}){e.not_ortalamasi && `, GNO: ${e.not_ortalamasi}`}</span>
            <span style={{ color: '#6b7591', whiteSpace: 'nowrap' }}>{tarih(e.baslangic, e.bitis)}</span>
          </div>
        ))}</>}

      {cv.sertifikalar.length > 0 && <>{bolum('SERTİFİKALAR')}
        {cv.sertifikalar.map((s, i) => (
          <div key={i} style={{ marginBottom: 3 }}>
            <b>{s.ad}</b>{s.kurum && ` — ${s.kurum}`}{s.tarih && ` (${s.tarih})`}
            {s.gecerlilik && <span style={{ color: '#6b7591' }}> · Geçerlilik: {s.gecerlilik}</span>}
          </div>
        ))}</>}

      {cv.beceriler.length > 0 && <>{bolum('BECERİLER (4M)')}
        {DORT_M.map(m => {
          const liste = cv.beceriler.filter(b => b.kategori === m.kod);
          if (!liste.length) return null;
          return (
            <div key={m.kod} style={{ marginBottom: 3 }}>
              <b style={{ color: m.renk }}>{m.etiket}:</b>{' '}
              {liste.map(b => `${b.ad} (${SEVIYE_ADI[b.seviye]})`).join(', ')}
            </div>
          );
        })}</>}

      {cv.yetkinlikler.length > 0 && <>{bolum('YETKİNLİKLER')}
        {cv.yetkinlikler.map((y, i) => (
          <div key={i} style={{ display: 'flex', gap: 8, alignItems: 'center', marginBottom: 3 }}>
            <span style={{ flex: 1 }}><b>{y.ad}</b>{y.kanit && <span style={{ color: '#6b7591' }}> — {y.kanit}</span>}</span>
            <span style={{ letterSpacing: 1, color: '#6366f1' }}>{'●'.repeat(y.seviye)}{'○'.repeat(5 - y.seviye)}</span>
          </div>
        ))}</>}
    </div>
  );
}

/* ─── Ana Sayfa ─────────────────────────────────────── */
export default function CVOlustur() {
  const qc = useQueryClient();
  const [cv, setCv] = useState(BOS_CV);
  const [seciliId, setSeciliId] = useState(null);
  const [mesaj, setMesaj] = useState({ tip: '', metin: '' });

  const { data: liste = [] } = useQuery({ queryKey: ['cvler'], queryFn: getCVler });

  const kaydet = useMutation({
    mutationFn: (veri) => (seciliId ? putCV(seciliId, veri) : postCV(veri)),
    onSuccess: (kayit) => {
      setSeciliId(kayit.id);
      qc.invalidateQueries({ queryKey: ['cvler'] });
      setMesaj({ tip: 'ok', metin: 'CV kaydedildi.' });
    },
    onError: (e) => {
      const d = e.response?.data;
      setMesaj({ tip: 'hata', metin: d?.hata || d?.hatalar?.map(h => h.mesaj).join(', ') || e.message });
    },
  });

  const sil = useMutation({
    mutationFn: deleteCV,
    onSuccess: () => { yeniCV(); qc.invalidateQueries({ queryKey: ['cvler'] }); },
  });

  async function ac(id) {
    const d = await getCV(id);
    setCv({ ...BOS_CV, ...Object.fromEntries(Object.entries(d).map(([k, v]) => [k, v ?? ''])) });
    setSeciliId(id);
    setMesaj({ tip: '', metin: '' });
  }

  function yeniCV() { setCv(BOS_CV); setSeciliId(null); setMesaj({ tip: '', metin: '' }); }

  const alan = (k) => ({ value: cv[k], onChange: e => setCv(c => ({ ...c, [k]: e.target.value })), style: girdi });
  const listeEkle = (k) => setCv(c => ({ ...c, [k]: [...c[k], YENI[k]()] }));
  const listeSil = (k, i) => setCv(c => ({ ...c, [k]: c[k].filter((_, j) => j !== i) }));
  const listeAlan = (k, i, a, tip = 'text') => ({
    type: tip,
    style: girdi,
    ...(tip === 'checkbox' ? { checked: !!cv[k][i][a] } : { value: cv[k][i][a] ?? '' }),
    onChange: e => {
      const v = tip === 'checkbox' ? e.target.checked : e.target.value;
      setCv(c => ({ ...c, [k]: c[k].map((x, j) => (j === i ? { ...x, [a]: v } : x)) }));
    },
  });

  function gonder(e) {
    e.preventDefault();
    if (!cv.ad_soyad.trim()) { setMesaj({ tip: 'hata', metin: 'Ad soyad zorunludur.' }); return; }
    kaydet.mutate(cv);
  }

  function yazdir() {
    const icerik = document.getElementById('cv-onizleme')?.outerHTML;
    const w = window.open('', '_blank');
    if (!w || !icerik) return;
    w.document.write(`<html><head><title>CV</title><style>body{font-family:system-ui,sans-serif;margin:0}#cv-onizleme{border:none!important}</style></head><body>${icerik}</body></html>`);
    w.document.close();
    w.focus();
    w.print();
  }

  return (
    <div style={{ display: 'grid', gridTemplateColumns: '220px minmax(0, 1fr) minmax(0, 420px)', gap: '1rem', alignItems: 'start' }}>
      {/* ── Sol: kayıtlı CV listesi ── */}
      <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 'var(--radius)', padding: '0.75rem' }}>
        <button type="button" onClick={yeniCV} style={{ ...anaBtn, width: '100%', marginBottom: 8 }}>+ Yeni CV</button>
        {liste.length === 0 && <Bos>Henüz kayıtlı CV yok.</Bos>}
        {liste.map(c => (
          <button key={c.id} type="button" onClick={() => ac(c.id)} style={{
            width: '100%', textAlign: 'left', padding: '0.5rem', borderRadius: 6, border: 'none', cursor: 'pointer', marginBottom: 2,
            background: seciliId === c.id ? 'var(--accent-dim)' : 'transparent',
            color: seciliId === c.id ? 'var(--accent)' : 'var(--text)',
          }}>
            <div style={{ fontSize: 12.5, fontWeight: 600 }}>{c.ad_soyad}</div>
            <div style={{ fontSize: 11, color: 'var(--muted)' }}>{c.unvan || '—'}</div>
          </button>
        ))}
      </div>

      {/* ── Orta: form ── */}
      <form onSubmit={gonder}>
        <Kart baslik="Kişisel Bilgiler" simge="👤">
          <div style={izgara}>
            <Alan etiket="Ad Soyad" zorunlu><input {...alan('ad_soyad')} required /></Alan>
            <Alan etiket="Ünvan / Hedef Pozisyon"><input {...alan('unvan')} /></Alan>
            <Alan etiket="E-posta"><input type="email" {...alan('eposta')} /></Alan>
            <Alan etiket="Telefon"><input type="tel" {...alan('telefon')} /></Alan>
            <Alan etiket="Adres / Şehir" genis><input {...alan('adres')} /></Alan>
            <Alan etiket="Profesyonel Özet" genis><textarea rows={3} {...alan('ozet')} /></Alan>
          </div>
        </Kart>

        <Kart baslik="Eğitim" simge="🎓" aksiyon={<EkleBtn onClick={() => listeEkle('egitimler')} />}>
          {cv.egitimler.length === 0 && <Bos>Eğitim bilgisi eklemek için “+ Ekle”ye tıklayın.</Bos>}
          {cv.egitimler.map((_, i) => (
            <Satir key={i} onSil={() => listeSil('egitimler', i)}>
              <div style={izgara}>
                <Alan etiket="Okul" zorunlu><input {...listeAlan('egitimler', i, 'okul')} /></Alan>
                <Alan etiket="Bölüm"><input {...listeAlan('egitimler', i, 'bolum')} /></Alan>
                <Alan etiket="Derece">
                  <select {...listeAlan('egitimler', i, 'derece')}>{DERECELER.map(d => <option key={d}>{d}</option>)}</select>
                </Alan>
                <Alan etiket="Başlangıç"><input {...listeAlan('egitimler', i, 'baslangic', 'month')} /></Alan>
                <Alan etiket="Bitiş"><input {...listeAlan('egitimler', i, 'bitis', 'month')} /></Alan>
                <Alan etiket="Not Ortalaması"><input {...listeAlan('egitimler', i, 'not_ortalamasi')} placeholder="3.25 / 4.00" /></Alan>
              </div>
            </Satir>
          ))}
        </Kart>

        <Kart baslik="Sertifikalar" simge="📜" aksiyon={<EkleBtn onClick={() => listeEkle('sertifikalar')} />}>
          {cv.sertifikalar.length === 0 && <Bos>Sertifika eklemek için “+ Ekle”ye tıklayın.</Bos>}
          {cv.sertifikalar.map((_, i) => (
            <Satir key={i} onSil={() => listeSil('sertifikalar', i)}>
              <div style={izgara}>
                <Alan etiket="Sertifika Adı" zorunlu><input {...listeAlan('sertifikalar', i, 'ad')} /></Alan>
                <Alan etiket="Veren Kurum"><input {...listeAlan('sertifikalar', i, 'kurum')} /></Alan>
                <Alan etiket="Alınış Tarihi"><input {...listeAlan('sertifikalar', i, 'tarih', 'month')} /></Alan>
                <Alan etiket="Geçerlilik"><input {...listeAlan('sertifikalar', i, 'gecerlilik')} placeholder="Süresiz / 2027-06" /></Alan>
                <Alan etiket="Belge No"><input {...listeAlan('sertifikalar', i, 'belge_no')} /></Alan>
              </div>
            </Satir>
          ))}
        </Kart>

        <Kart baslik="İş Deneyimi" simge="💼" aksiyon={<EkleBtn onClick={() => listeEkle('deneyimler')} />}>
          {cv.deneyimler.length === 0 && <Bos>İş deneyimi eklemek için “+ Ekle”ye tıklayın.</Bos>}
          {cv.deneyimler.map((d, i) => (
            <Satir key={i} onSil={() => listeSil('deneyimler', i)}>
              <div style={izgara}>
                <Alan etiket="Şirket" zorunlu><input {...listeAlan('deneyimler', i, 'sirket')} /></Alan>
                <Alan etiket="Pozisyon"><input {...listeAlan('deneyimler', i, 'pozisyon')} /></Alan>
                <Alan etiket="Başlangıç"><input {...listeAlan('deneyimler', i, 'baslangic', 'month')} /></Alan>
                <Alan etiket="Bitiş">
                  <input {...listeAlan('deneyimler', i, 'bitis', 'month')} disabled={d.devam_ediyor} />
                </Alan>
                <label style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12, alignSelf: 'end', paddingBottom: 6 }}>
                  <input {...listeAlan('deneyimler', i, 'devam_ediyor', 'checkbox')} style={{ width: 'auto' }} /> Halen çalışıyorum
                </label>
                <Alan etiket="Görev ve Başarılar" genis><textarea rows={3} {...listeAlan('deneyimler', i, 'aciklama')} /></Alan>
              </div>
            </Satir>
          ))}
        </Kart>

        <Kart baslik="Beceriler — 4M Modeli" simge="🧩">
          <DortMBeceriler beceriler={cv.beceriler} onChange={b => setCv(c => ({ ...c, beceriler: b }))} />
        </Kart>

        <Kart baslik="Yetkinlikler" simge="⭐" aksiyon={<EkleBtn onClick={() => listeEkle('yetkinlikler')} />}>
          {cv.yetkinlikler.length === 0 && <Bos>Örn. Problem çözme, Analitik düşünme, Takım çalışması…</Bos>}
          {cv.yetkinlikler.map((y, i) => (
            <Satir key={i} onSil={() => listeSil('yetkinlikler', i)}>
              <div style={izgara}>
                <Alan etiket="Yetkinlik" zorunlu><input {...listeAlan('yetkinlikler', i, 'ad')} /></Alan>
                <Alan etiket="Seviye">
                  <SeviyeSec deger={y.seviye} onChange={v => setCv(c => ({ ...c, yetkinlikler: c.yetkinlikler.map((x, j) => (j === i ? { ...x, seviye: v } : x)) }))} />
                </Alan>
                <Alan etiket="Kanıt / Örnek" genis><input {...listeAlan('yetkinlikler', i, 'kanit')} placeholder="Bu yetkinliği gösteren somut bir örnek" /></Alan>
              </div>
            </Satir>
          ))}
        </Kart>

        <div style={{ display: 'flex', gap: 8, alignItems: 'center', position: 'sticky', bottom: 0, background: 'var(--bg)', padding: '0.75rem 0' }}>
          <button type="submit" style={{ ...anaBtn, opacity: kaydet.isPending ? 0.6 : 1 }} disabled={kaydet.isPending}>
            {kaydet.isPending ? 'Kaydediliyor…' : seciliId ? 'Güncelle' : 'Kaydet'}
          </button>
          <button type="button" onClick={yazdir} style={ikincilBtn}>🖨️ Yazdır / PDF</button>
          {seciliId && (
            <button type="button" style={{ ...ikincilBtn, color: 'var(--red)' }}
              onClick={() => { if (confirm('Bu CV silinsin mi?')) sil.mutate(seciliId); }}>Sil</button>
          )}
          {mesaj.metin && (
            <span style={{ fontSize: 12, color: mesaj.tip === 'hata' ? 'var(--red)' : 'var(--green)' }}>{mesaj.metin}</span>
          )}
        </div>
      </form>

      {/* ── Sağ: canlı önizleme ── */}
      <div style={{ position: 'sticky', top: 0 }}>
        <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--muted)', letterSpacing: '0.08em', marginBottom: 6 }}>CANLI ÖNİZLEME</div>
        <Onizleme cv={cv} />
      </div>
    </div>
  );
}
