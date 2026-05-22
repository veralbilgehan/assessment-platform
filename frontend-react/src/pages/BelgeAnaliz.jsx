import { useState, useRef, useCallback } from 'react';
import { useQuery } from '@tanstack/react-query';
import {
  getHiyerarsiSektorler, getHiyerarsiDeptlar,
  getHiyerarsiPozisyonlar, getHiyerarsiYetenekler,
  BELGE_ANALIZ_SSE, BELGE_PROFIL_SSE, BELGE_KARS_SSE,
} from '../api/index.js';

/* ─── Ortak UI bileşenleri ─────────────────────────────────── */
function Sec({ label, children }) {
  return (
    <div style={{ marginBottom: 8 }}>
      <div style={{ fontSize: 11, textTransform: 'uppercase', letterSpacing: '0.06em', color: 'var(--muted)', marginBottom: 6 }}>
        {label}
      </div>
      {children}
    </div>
  );
}

function Kart({ children, style }) {
  return (
    <div style={{
      background: 'var(--surface)', border: '1px solid var(--border)',
      borderRadius: 'var(--radius)', padding: '1.5rem', ...style,
    }}>
      {children}
    </div>
  );
}

function Btn({ onClick, disabled, color = 'accent', children, style }) {
  const bg = {
    accent: 'var(--accent)', green: '#22c55e', red: '#ef4444',
    gray: 'var(--surface2)', purple: 'linear-gradient(135deg,#6366f1,#8b5cf6)', orange: '#f97316',
  }[color];
  return (
    <button onClick={onClick} disabled={disabled} style={{
      padding: '0.45rem 1rem', border: 'none', borderRadius: 6,
      background: bg, color: color === 'gray' ? 'var(--text)' : '#fff',
      fontSize: 13, fontWeight: 600, cursor: disabled ? 'not-allowed' : 'pointer',
      opacity: disabled ? 0.5 : 1, transition: 'opacity 0.15s', ...style,
    }}>
      {children}
    </button>
  );
}

function Tag({ label, onRemove, color }) {
  return (
    <span style={{
      display: 'inline-flex', alignItems: 'center', gap: 5,
      padding: '3px 10px',
      background: color ? `${color}22` : 'var(--accent-dim)',
      border: `1px solid ${color || 'var(--accent)'}`,
      borderRadius: 20, fontSize: 12, color: color || 'var(--accent)',
    }}>
      {label}
      {onRemove && <span onClick={onRemove} style={{ cursor: 'pointer', lineHeight: 1, fontSize: 10 }}>✕</span>}
    </span>
  );
}

function Iskelet({ rows = 3, lastWidth = '100%' }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
      {Array.from({ length: rows }).map((_, i) => (
        <div key={i} style={{
          height: 15, borderRadius: 4, background: 'var(--border)',
          width: i === rows - 1 ? lastWidth : '100%',
          animation: 'pulse 1.5s ease-in-out infinite',
        }} />
      ))}
    </div>
  );
}

function renderMd(text) {
  return text.split('\n').map((line, i) => {
    if (/^\*\*.+\*\*$/.test(line.trim()))
      return <div key={i} style={{ fontWeight: 700, color: 'var(--accent)', marginTop: i > 0 ? 16 : 0, marginBottom: 4 }}>{line.replace(/\*\*/g, '')}</div>;
    if (line.startsWith('- ') || line.startsWith('• '))
      return <div key={i} style={{ paddingLeft: 16, fontSize: 13, lineHeight: 1.7 }}>· {line.slice(2)}</div>;
    if (/^\d+\.\s/.test(line))
      return <div key={i} style={{ paddingLeft: 16, fontSize: 13, lineHeight: 1.7 }}>{line}</div>;
    if (!line.trim()) return <div key={i} style={{ height: 6 }} />;
    return <p key={i} style={{ margin: '0 0 4px', fontSize: 13, lineHeight: 1.75 }}>{line}</p>;
  });
}

/* ─── BÖLÜM 1: Döküman Analizi ─────────────────────────────── */
function BolumDokumanAnaliz({ onBilgiSakla, onMetinHazir }) {
  const [dragOver, setDragOver] = useState(false);
  const [dosya, setDosya] = useState(null);
  const [yukleniyor, setYukleniyor] = useState(false);
  const [rawMetin, setRawMetin] = useState('');
  const [makale, setMakale] = useState('');
  const [konu, setKonu] = useState('');
  const [bilgi, setBilgi] = useState([]);
  const [streaming, setStreaming] = useState(false);
  const [kaydedildi, setKaydedildi] = useState(false);
  const [belgeId, setBelgeId] = useState(null);
  const [izin, setIzin] = useState('beklemede');
  const [sakla, setSakla] = useState(false);
  const inputRef = useRef();

  const handleDosya = useCallback((file) => {
    if (!file) return;
    const izinliMime = [
      'application/pdf',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      'text/plain',
    ];
    if (!izinliMime.includes(file.type)) {
      alert('Sadece PDF, DOCX veya TXT yükleyebilirsiniz.'); return;
    }
    setDosya(file);
    analiz(file);
  }, []);

  async function analiz(file) {
    setYukleniyor(true); setStreaming(true);
    setMakale(''); setKonu(''); setBilgi([]); setRawMetin('');
    setKaydedildi(false); setBelgeId(null); setIzin('beklemede'); setSakla(false);
    onMetinHazir(null, null);

    const form = new FormData();
    form.append('dosya', file);
    try {
      const res = await fetch(BELGE_ANALIZ_SSE, { method: 'POST', body: form });
      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let rawText = '';
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        for (const line of decoder.decode(value, { stream: true }).split('\n')) {
          if (!line.startsWith('data: ')) continue;
          const payload = line.slice(6).trim();
          if (payload === '[DONE]') break;
          try {
            const obj = JSON.parse(payload);
            if (obj.tip === 'metin') { rawText = obj.veri; setRawMetin(obj.veri); }
            if (obj.tip === 'sonuc') {
              setKonu(obj.veri.konu || '');
              setBilgi(obj.veri.bilgi || []);
              setMakale(obj.veri.makale || '');
            }
          } catch {}
        }
      }
      onMetinHazir(rawText, null);
    } catch (e) { alert('Analiz hatası: ' + e.message); }
    finally { setYukleniyor(false); setStreaming(false); }
  }

  async function kaydet() {
    try {
      const token = localStorage.getItem('token');
      const res = await fetch('/api/belgeler', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}) },
        body: JSON.stringify({ orijinal_ad: dosya?.name, mime_type: dosya?.type, icerik: rawMetin, ai_makale: makale, ai_konu: konu, ai_bilgi: bilgi }),
      });
      const data = await res.json();
      setBelgeId(data.id); setKaydedildi(true);
      onMetinHazir(rawMetin, data.id);
    } catch (e) { alert(e.message); }
  }

  async function sil() {
    if (belgeId) {
      const token = localStorage.getItem('token');
      await fetch(`/api/belgeler/${belgeId}`, {
        method: 'DELETE',
        headers: token ? { Authorization: `Bearer ${token}` } : {},
      });
    }
    setDosya(null); setMakale(''); setKonu(''); setBilgi([]);
    setKaydedildi(false); setBelgeId(null);
    onMetinHazir(null, null);
  }

  async function izinGuncelle(yeniIzin) {
    setIzin(yeniIzin);
    if (belgeId) {
      const token = localStorage.getItem('token');
      await fetch(`/api/belgeler/${belgeId}/izin`, {
        method: 'PATCH', headers: { 'Content-Type': 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}) },
        body: JSON.stringify({ izin: yeniIzin }),
      });
    }
  }

  async function saklaGuncelle() {
    const yeni = !sakla; setSakla(yeni);
    if (belgeId) {
      const token = localStorage.getItem('token');
      await fetch(`/api/belgeler/${belgeId}/sakla`, {
        method: 'PATCH', headers: { 'Content-Type': 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}) },
        body: JSON.stringify({ sakla: yeni }),
      });
    }
    if (yeni) onBilgiSakla({ konu, bilgi });
    else onBilgiSakla(null);
  }

  const analizVar = makale || konu || bilgi.length > 0;

  return (
    <div>
      <div style={{ display: 'flex', alignItems: 'baseline', gap: 10, marginBottom: '1.25rem' }}>
        <span style={{ fontSize: 12, fontWeight: 700, padding: '2px 8px', background: 'var(--accent-dim)', color: 'var(--accent)', borderRadius: 6 }}>Bölüm 1</span>
        <h2 style={{ fontSize: '1.05rem', fontWeight: 700 }}>Döküman Analizi & İçerik Üretimi</h2>
      </div>

      <Kart style={{ marginBottom: 14 }}>
        <div
          onDragOver={e => { e.preventDefault(); setDragOver(true); }}
          onDragLeave={() => setDragOver(false)}
          onDrop={e => { e.preventDefault(); setDragOver(false); handleDosya(e.dataTransfer.files[0]); }}
          onClick={() => inputRef.current?.click()}
          style={{
            border: `2px dashed ${dragOver ? 'var(--accent)' : 'var(--border)'}`,
            borderRadius: 8, padding: '1.75rem', textAlign: 'center', cursor: 'pointer',
            background: dragOver ? 'var(--accent-dim)' : 'var(--surface2)', transition: 'all 0.2s',
          }}
        >
          <input ref={inputRef} type="file" accept=".pdf,.docx,.txt" style={{ display: 'none' }} onChange={e => handleDosya(e.target.files[0])} />
          <div style={{ fontSize: 28, marginBottom: 6 }}>📄</div>
          {dosya ? (
            <div>
              <div style={{ fontWeight: 600, fontSize: 13 }}>{dosya.name}</div>
              <div style={{ fontSize: 12, color: 'var(--muted)', marginTop: 3 }}>{(dosya.size / 1024).toFixed(0)} KB</div>
            </div>
          ) : (
            <div>
              <div style={{ fontWeight: 600, fontSize: 13, marginBottom: 3 }}>Dosyayı sürükle & bırak veya tıkla</div>
              <div style={{ fontSize: 12, color: 'var(--muted)' }}>PDF, DOCX, TXT · Maks 10 MB</div>
            </div>
          )}
        </div>
      </Kart>

      {(yukleniyor || analizVar) && (
        <Kart style={{ marginBottom: 14 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: '1.25rem' }}>
            <span style={{ fontWeight: 700, background: 'linear-gradient(135deg,#6366f1,#8b5cf6)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
              ✦ AI Çıktı Paneli
            </span>
            {streaming && <span style={{ fontSize: 12, color: 'var(--accent)' }}>Analiz ediliyor...</span>}
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 12 }}>
            <div style={{ background: 'var(--surface2)', border: '1px solid var(--border)', borderRadius: 8, padding: '1rem' }}>
              <Sec label="Konu">{konu ? <p style={{ fontSize: 13, lineHeight: 1.6, margin: 0 }}>{konu}</p> : <Iskelet rows={2} />}</Sec>
            </div>
            <div style={{ background: 'var(--surface2)', border: '1px solid var(--border)', borderRadius: 8, padding: '1rem' }}>
              <Sec label="Hap Bilgiler">
                {bilgi.length > 0
                  ? <ul style={{ paddingLeft: 16, fontSize: 13, lineHeight: 1.7, margin: 0 }}>{bilgi.map((b, i) => <li key={i}>{b}</li>)}</ul>
                  : <Iskelet rows={4} />}
              </Sec>
            </div>
          </div>

          <div style={{ background: 'var(--surface2)', border: '1px solid var(--border)', borderRadius: 8, padding: '1rem' }}>
            <Sec label="Makale">
              {makale
                ? <p style={{ fontSize: 13, lineHeight: 1.8, whiteSpace: 'pre-wrap', margin: 0 }}>{makale}</p>
                : <Iskelet rows={6} lastWidth="60%" />}
            </Sec>
          </div>
        </Kart>
      )}

      {analizVar && !streaming && (
        <Kart>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 24, alignItems: 'flex-start' }}>
            <div>
              <div style={{ fontSize: 11, textTransform: 'uppercase', color: 'var(--muted)', letterSpacing: '0.05em', marginBottom: 8 }}>Yetkilendirme</div>
              <div style={{ display: 'flex', gap: 6 }}>
                <Btn color={izin === 'izin_verildi' ? 'green' : 'gray'} onClick={() => izinGuncelle('izin_verildi')}>✓ İzin Ver</Btn>
                <Btn color={izin === 'izin_verilmedi' ? 'red' : 'gray'} onClick={() => izinGuncelle('izin_verilmedi')}>✕ İzin Verme</Btn>
              </div>
            </div>
            <div style={{ width: 1, background: 'var(--border)', alignSelf: 'stretch' }} />
            <div>
              <div style={{ fontSize: 11, textTransform: 'uppercase', color: 'var(--muted)', letterSpacing: '0.05em', marginBottom: 8 }}>Veri İşlemleri</div>
              <div style={{ display: 'flex', gap: 6 }}>
                <Btn color="accent" onClick={kaydet} disabled={kaydedildi}>{kaydedildi ? '✓ Kaydedildi' : '💾 Kaydet'}</Btn>
                <Btn color="red" onClick={sil}>🗑 Sil</Btn>
              </div>
            </div>
            <div style={{ width: 1, background: 'var(--border)', alignSelf: 'stretch' }} />
            <div>
              <div style={{ fontSize: 11, textTransform: 'uppercase', color: 'var(--muted)', letterSpacing: '0.05em', marginBottom: 8 }}>AI Hafızası</div>
              <button onClick={saklaGuncelle} style={{
                padding: '0.45rem 1rem', borderRadius: 6, fontSize: 13, fontWeight: 600,
                border: `1px solid ${sakla ? '#f97316' : 'var(--border)'}`,
                background: sakla ? 'rgba(249,115,22,0.12)' : 'var(--surface2)',
                color: sakla ? '#f97316' : 'var(--muted)', cursor: 'pointer', transition: 'all 0.2s',
              }}>
                {sakla ? '🔥 Hafızada' : '🧠 Benim İçin Sakla'}
              </button>
              {sakla && <div style={{ fontSize: 11, color: '#f97316', marginTop: 4 }}>Profil üretiminde kullanılacak</div>}
            </div>
          </div>
        </Kart>
      )}
    </div>
  );
}

/* ─── Yetenek Kartı ─────────────────────────────────────────── */
function YeteknekKarti({ y }) {
  const [acik, setAcik] = useState(false);
  return (
    <div style={{
      border: `1px solid ${y.renk_kodu || 'var(--border)'}33`,
      borderLeft: `3px solid ${y.renk_kodu || 'var(--accent)'}`,
      borderRadius: 8, overflow: 'hidden', marginBottom: 8,
    }}>
      <button
        onClick={() => setAcik(o => !o)}
        style={{
          width: '100%', textAlign: 'left', background: 'var(--surface2)',
          border: 'none', padding: '0.6rem 0.85rem', cursor: 'pointer',
          display: 'flex', alignItems: 'center', gap: 8,
        }}
      >
        <span style={{ flex: 1, fontSize: 13, fontWeight: 600, color: 'var(--text)' }}>
          {y.yetenek_adi}
          {y.zorunlu && <span style={{ marginLeft: 6, fontSize: 10, color: '#ef4444', fontWeight: 700 }}>ZORUNLU</span>}
        </span>
        <span style={{
          fontSize: 10, background: `${y.renk_kodu || 'var(--accent)'}22`,
          color: y.renk_kodu || 'var(--accent)', padding: '2px 6px', borderRadius: 10,
        }}>
          {y.kategori_adi}
        </span>
        <span style={{
          fontSize: 10, color: 'var(--muted)',
          background: 'var(--surface)', padding: '2px 6px', borderRadius: 10, border: '1px solid var(--border)',
        }}>
          Ağ: {y.agirlik}/10
        </span>
        <span style={{ fontSize: 10, color: 'var(--muted)', transform: acik ? 'rotate(90deg)' : 'none', transition: 'transform 0.2s' }}>▶</span>
      </button>

      {acik && (
        <div style={{ padding: '0.75rem 0.85rem', background: 'var(--surface)' }}>
          {y.aciklama && (
            <p style={{ fontSize: 12, color: 'var(--muted)', margin: '0 0 10px', lineHeight: 1.6 }}>{y.aciklama}</p>
          )}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
            {y.olumlu_yorumlar?.length > 0 && (
              <div style={{ background: 'rgba(34,197,94,0.07)', border: '1px solid rgba(34,197,94,0.25)', borderRadius: 6, padding: '0.6rem 0.75rem' }}>
                <div style={{ fontSize: 10, fontWeight: 700, color: '#22c55e', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 6 }}>✓ Olumlu Gözlemler</div>
                {y.olumlu_yorumlar.map((j, i) => (
                  <div key={i} style={{ fontSize: 12, color: 'var(--text)', lineHeight: 1.6, marginBottom: 4 }}>· {j}</div>
                ))}
              </div>
            )}
            {y.olumsuz_yorumlar?.length > 0 && (
              <div style={{ background: 'rgba(239,68,68,0.07)', border: '1px solid rgba(239,68,68,0.25)', borderRadius: 6, padding: '0.6rem 0.75rem' }}>
                <div style={{ fontSize: 10, fontWeight: 700, color: '#ef4444', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 6 }}>⚠ Gelişim Alanları</div>
                {y.olumsuz_yorumlar.map((j, i) => (
                  <div key={i} style={{ fontSize: 12, color: 'var(--text)', lineHeight: 1.6, marginBottom: 4 }}>· {j}</div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

/* ─── BÖLÜM 2: Profil Sihirbazı ────────────────────────────── */
function BolumProfilSihirbazi({ hafizaBilgi, belgeMetin, belgeId, onBilgiSakla }) {
  // Cascading state
  const [sektorId, setSektorId]   = useState('');
  const [deptId, setDeptId]       = useState('');
  const [pozId, setPozId]         = useState('');
  const [pozAd, setPozAd]         = useState('');
  const [konu, setKonu]           = useState('');
  const [yetenekInput, setYetenekInput] = useState('');
  const [yetenekler, setYetenekler]     = useState([]);

  // Çıktı state
  const [profil, setProfil]       = useState('');
  const [profilStream, setProfilStream] = useState(false);
  const [karsRapor, setKarsRapor] = useState('');
  const [karsStream, setKarsStream] = useState(false);
  const [karsSkor, setKarsSkor]   = useState(null);

  // Aksiyon barı state
  const [izin, setIzin]             = useState('beklemede');
  const [sakla, setSakla]           = useState(false);
  const [kaydedildi, setKaydedildi] = useState(false);
  const [profilId, setProfilId]     = useState(null);

  // Cascading queries
  const { data: sektorler = [] } = useQuery({
    queryKey: ['h-sektorler'], queryFn: getHiyerarsiSektorler,
  });
  const sektorObj = sektorler.find(s => s.id === +sektorId);

  const { data: deptlar = [] } = useQuery({
    queryKey: ['h-deptlar', sektorId], queryFn: () => getHiyerarsiDeptlar(sektorId),
    enabled: !!sektorId,
  });
  const deptObj = deptlar.find(d => d.id === +deptId);

  const { data: pozlar = [] } = useQuery({
    queryKey: ['h-pozlar', deptId], queryFn: () => getHiyerarsiPozisyonlar(deptId),
    enabled: !!deptId,
  });
  const pozObj = pozlar.find(p => p.id === +pozId);

  const { data: yetenekVeri = [], isLoading: yetkLoading } = useQuery({
    queryKey: ['h-yetenekler', pozId], queryFn: () => getHiyerarsiYetenekler(pozId),
    enabled: !!pozId,
  });

  const konuOrnekleri = ['Kriz Yönetimi', 'Yeni Nesil Satış Stratejileri', 'Dijital Dönüşüm', 'Takım Liderliği', 'Veri Odaklı Karar Alma'];

  function addYetenek(val) {
    const y = val || yetenekInput.trim();
    if (y && !yetenekler.includes(y)) setYetenekler(p => [...p, y]);
    setYetenekInput('');
  }

  /* ─── Aksiyon Fonksiyonları ──────────────────────────── */
  async function profilKaydet() {
    try {
      const token = localStorage.getItem('token');
      const icerik = [
        profil,
        karsRapor ? '\n\n---\nKarşılaştırma Raporu:\n' + karsRapor : '',
      ].join('');
      const res = await fetch('/api/belgeler', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}) },
        body: JSON.stringify({
          orijinal_ad: `Profil Kartı — ${pozAd}${konu ? ' · ' + konu : ''}`,
          mime_type: 'text/profil-karti',
          icerik,
          ai_makale: karsRapor || profil,
          ai_konu: `${pozAd}${konu ? ' — ' + konu : ''}`,
          ai_bilgi: [sektorObj?.ad, deptObj?.ad, pozAd, konu].filter(Boolean),
        }),
      });
      const data = await res.json();
      setProfilId(data.id);
      setKaydedildi(true);
    } catch (e) { alert('Kayıt hatası: ' + e.message); }
  }

  async function profilSil() {
    if (profilId) {
      const token = localStorage.getItem('token');
      await fetch(`/api/belgeler/${profilId}`, {
        method: 'DELETE',
        headers: token ? { Authorization: `Bearer ${token}` } : {},
      });
    }
    setProfil(''); setKarsRapor(''); setKarsSkor(null);
    setKaydedildi(false); setProfilId(null);
    setIzin('beklemede'); setSakla(false);
  }

  async function izinGuncelle(yeniIzin) {
    setIzin(yeniIzin);
    if (profilId) {
      const token = localStorage.getItem('token');
      await fetch(`/api/belgeler/${profilId}/izin`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}) },
        body: JSON.stringify({ izin: yeniIzin }),
      });
    }
  }

  function saklaGuncelle() {
    const yeni = !sakla;
    setSakla(yeni);
    if (onBilgiSakla) {
      onBilgiSakla(yeni ? { konu: `${pozAd} — ${konu}`, bilgi: [profil.slice(0, 300)] } : null);
    }
  }

  async function olusturProfil() {
    if (!konu || !sektorObj || !pozAd) { alert('Konu, Sektör ve Pozisyon zorunlu.'); return; }
    setProfil(''); setProfilStream(true);
    setKaydedildi(false); setProfilId(null); setIzin('beklemede'); setSakla(false);

    // Yetenek listesi: form tag'leri + DB yetkinlikler
    const yetList = [
      ...yetenekler,
      ...yetenekVeri.map(y => y.yetenek_adi),
    ].filter((v, i, a) => a.indexOf(v) === i);

    const token = localStorage.getItem('token');
    try {
      const res = await fetch(BELGE_PROFIL_SSE, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}) },
        body: JSON.stringify({
          konu, sektor: sektorObj.ad, sektor_aciklama: sektorObj.aciklama || '',
          pozisyon: pozAd, departman: deptObj?.ad || '',
          yetenekler: yetList,
        }),
      });
      const reader = res.body.getReader();
      const dec = new TextDecoder();
      let text = '';
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        for (const line of dec.decode(value, { stream: true }).split('\n')) {
          if (!line.startsWith('data: ')) continue;
          const p = line.slice(6).trim();
          if (p === '[DONE]') break;
          try { const { text: d } = JSON.parse(p); text += d; setProfil(text); } catch {}
        }
      }
    } catch (e) { alert(e.message); }
    finally { setProfilStream(false); }
  }

  async function karsilastir() {
    if (!pozId && !pozAd) { alert('Önce pozisyon seçin.'); return; }
    if (!belgeMetin) { alert('Karşılaştırılacak belge yükleyin (Bölüm 1).'); return; }
    setKarsRapor(''); setKarsStream(true); setKarsSkor(null);

    const token = localStorage.getItem('token');
    try {
      const res = await fetch(BELGE_KARS_SSE, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}) },
        body: JSON.stringify({ belge_id: belgeId, pozisyon_id: +pozId || null, belge_metin: belgeMetin }),
      });
      const reader = res.body.getReader();
      const dec = new TextDecoder();
      let text = '';
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        for (const line of dec.decode(value, { stream: true }).split('\n')) {
          if (!line.startsWith('data: ')) continue;
          const p = line.slice(6).trim();
          if (p === '[DONE]') break;
          try {
            const obj = JSON.parse(p);
            if (obj.text) { text += obj.text; setKarsRapor(text); }
            if (obj.tip === 'skor') setKarsSkor(obj.skor);
          } catch {}
        }
      }
    } catch (e) { alert(e.message); }
    finally { setKarsStream(false); }
  }

  const skorRenk = karsSkor >= 75 ? '#22c55e' : karsSkor >= 50 ? '#f97316' : '#ef4444';

  return (
    <div>
      <div style={{ display: 'flex', alignItems: 'baseline', gap: 10, marginBottom: '1.25rem' }}>
        <span style={{ fontSize: 12, fontWeight: 700, padding: '2px 8px', background: 'rgba(139,92,246,0.15)', color: '#8b5cf6', borderRadius: 6 }}>Bölüm 2</span>
        <h2 style={{ fontSize: '1.05rem', fontWeight: 700 }}>Dinamik Profil & Problem Sihirbazı</h2>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '380px 1fr', gap: 16, alignItems: 'start' }}>

        {/* ── FORM ── */}
        <div>
          <Kart style={{ marginBottom: 12 }}>
            <div style={{ fontSize: 13, fontWeight: 600, marginBottom: '1.25rem' }}>📋 Adım Adım Seçim</div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>

              <Sec label="1 · Konu Başlığı">
                <input value={konu} onChange={e => setKonu(e.target.value)} placeholder="Örn: Kriz Yönetimi" style={{ width: '100%' }} />
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4, marginTop: 6 }}>
                  {konuOrnekleri.map(k => (
                    <span key={k} onClick={() => setKonu(k)} style={{
                      padding: '2px 8px', fontSize: 11, background: 'var(--surface2)',
                      border: '1px solid var(--border)', borderRadius: 20, cursor: 'pointer', color: 'var(--muted)',
                    }}>{k}</span>
                  ))}
                </div>
              </Sec>

              {/* ── SEKTÖR ── */}
              <Sec label="2 · Sektör">
                <select value={sektorId} onChange={e => { setSektorId(e.target.value); setDeptId(''); setPozId(''); setPozAd(''); }} style={{ width: '100%' }}>
                  <option value="">Sektör seçin...</option>
                  {sektorler.map(s => <option key={s.id} value={s.id}>{s.nace_kodu ? `[${s.nace_kodu}] ` : ''}{s.ad}</option>)}
                </select>
                {sektorObj?.aciklama && (
                  <div style={{
                    marginTop: 6, padding: '0.5rem 0.75rem',
                    background: 'var(--accent-dim)', border: '1px solid var(--accent)',
                    borderRadius: 6, fontSize: 12, color: 'var(--accent)', lineHeight: 1.5,
                  }}>
                    {sektorObj.aciklama}
                  </div>
                )}
              </Sec>

              {/* ── DEPARTMAN ── */}
              <Sec label="3 · Birim / Departman">
                <select value={deptId} onChange={e => { setDeptId(e.target.value); setPozId(''); setPozAd(''); }} style={{ width: '100%' }} disabled={!sektorId}>
                  <option value="">{sektorId ? 'Departman seçin...' : 'Önce sektör seçin'}</option>
                  {deptlar.map(d => <option key={d.id} value={d.id}>{d.ad}</option>)}
                </select>
                {deptObj?.aciklama && (
                  <div style={{ marginTop: 4, fontSize: 11, color: 'var(--muted)', lineHeight: 1.5 }}>{deptObj.aciklama}</div>
                )}
              </Sec>

              {/* ── POZİSYON ── */}
              <Sec label="4 · Pozisyon">
                {pozlar.length > 0 ? (
                  <select value={pozId} onChange={e => {
                    setPozId(e.target.value);
                    const p = pozlar.find(x => x.id === +e.target.value);
                    setPozAd(p?.ad || '');
                  }} style={{ width: '100%' }} disabled={!deptId}>
                    <option value="">Pozisyon seçin...</option>
                    {pozlar.map(p => <option key={p.id} value={p.id}>{p.ad}{p.seviye ? ` (${p.seviye})` : ''}</option>)}
                  </select>
                ) : (
                  <input value={pozAd} onChange={e => setPozAd(e.target.value)} placeholder="Örn: Senior Developer" style={{ width: '100%' }} />
                )}
              </Sec>

              {/* ── YETENEKLER ── */}
              <Sec label="5 · Ek Yetenekler (isteğe bağlı)">
                <div style={{ display: 'flex', gap: 6 }}>
                  <input value={yetenekInput} onChange={e => setYetenekInput(e.target.value)}
                    onKeyDown={e => e.key === 'Enter' && addYetenek()}
                    placeholder="Ekstra yetenek yaz..." style={{ flex: 1 }} />
                  <Btn onClick={() => addYetenek()} disabled={!yetenekInput} style={{ padding: '0.45rem 0.75rem' }}>+</Btn>
                </div>
                {yetenekler.length > 0 && (
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: 5, marginTop: 8 }}>
                    {yetenekler.map(y => <Tag key={y} label={y} onRemove={() => setYetenekler(p => p.filter(x => x !== y))} />)}
                  </div>
                )}
                {hafizaBilgi && (
                  <div style={{ marginTop: 8, padding: '6px 10px', background: 'rgba(249,115,22,0.08)', border: '1px solid rgba(249,115,22,0.3)', borderRadius: 6, fontSize: 11, color: '#f97316' }}>
                    🧠 Hafızadan: <strong>{hafizaBilgi.konu}</strong> bağlam olarak eklenecek
                  </div>
                )}
              </Sec>

              {/* ── BUTONLAR ── */}
              <button onClick={olusturProfil} disabled={!konu || !sektorId || (!pozId && !pozAd) || profilStream} style={{
                padding: '0.65rem', border: 'none', borderRadius: 6, width: '100%',
                background: 'linear-gradient(135deg,#6366f1,#8b5cf6)', color: '#fff',
                fontSize: 13, fontWeight: 700,
                cursor: (!konu || !sektorId || (!pozId && !pozAd) || profilStream) ? 'not-allowed' : 'pointer',
                opacity: (!konu || !sektorId || (!pozId && !pozAd) || profilStream) ? 0.6 : 1,
              }}>
                {profilStream ? '✦ Oluşturuluyor...' : '✦ Problem & Profil Kartı Oluştur'}
              </button>

              <button onClick={karsilastir} disabled={(!pozId && !pozAd) || !belgeMetin || karsStream} style={{
                padding: '0.65rem', border: 'none', borderRadius: 6, width: '100%',
                background: 'linear-gradient(135deg,#0d9488,#057c3c)', color: '#fff',
                fontSize: 13, fontWeight: 700,
                cursor: ((!pozId && !pozAd) || !belgeMetin || karsStream) ? 'not-allowed' : 'pointer',
                opacity: ((!pozId && !pozAd) || !belgeMetin || karsStream) ? 0.6 : 1,
              }}>
                {karsStream ? '⚡ Karşılaştırılıyor...' : '⚡ Belge ↔ Pozisyon Karşılaştır'}
              </button>
              {!belgeMetin && (
                <div style={{ fontSize: 11, color: 'var(--muted)', textAlign: 'center', marginTop: -8 }}>
                  Karşılaştırma için Bölüm 1'den belge yükleyin
                </div>
              )}
            </div>
          </Kart>
        </div>

        {/* ── SAĞ KOLON ── */}
        <div>
          {/* Yetkinlik kartları */}
          {pozId && (
            <Kart style={{ marginBottom: 12 }}>
              <div style={{ fontSize: 13, fontWeight: 600, marginBottom: 10 }}>
                🎯 Pozisyon Yetkinlik Profili
                {pozObj && <span style={{ fontSize: 11, color: 'var(--muted)', fontWeight: 400, marginLeft: 8 }}>{pozObj.ad}{pozObj.seviye ? ` · ${pozObj.seviye}` : ''}</span>}
              </div>
              {yetkLoading ? (
                <Iskelet rows={4} />
              ) : yetenekVeri.length > 0 ? (
                yetenekVeri.map(y => <YeteknekKarti key={y.yetenek_id} y={y} />)
              ) : (
                <div style={{ fontSize: 13, color: 'var(--muted)', textAlign: 'center', padding: '1rem' }}>
                  Bu pozisyon için yetkinlik tanımlı değil
                </div>
              )}
            </Kart>
          )}

          {/* Profil çıktı */}
          <Kart style={{ minHeight: 200, marginBottom: 12 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: '1rem' }}>
              <span style={{ fontSize: 13, fontWeight: 600 }}>🤖 Problem & Profil Kartı</span>
              {profilStream && (
                <span style={{ fontSize: 12, color: '#8b5cf6' }}>
                  Üretiliyor
                  <span style={{ display: 'inline-block', width: 2, height: 12, background: '#8b5cf6', marginLeft: 4, verticalAlign: 'middle', animation: 'blink 1s infinite' }} />
                </span>
              )}
            </div>
            {profil ? (
              <div style={{ fontSize: 13, lineHeight: 1.75 }}>{renderMd(profil)}</div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: 140, color: 'var(--muted)', gap: 10 }}>
                <span style={{ fontSize: 36, opacity: 0.15 }}>🃏</span>
                <span style={{ fontSize: 13 }}>Formu doldurun ve kartı oluşturun</span>
              </div>
            )}
          </Kart>

          {/* Karşılaştırma çıktı */}
          {(karsRapor || karsStream) && (
            <Kart style={{ marginBottom: 12 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: '1rem' }}>
                <span style={{ fontSize: 13, fontWeight: 600 }}>⚡ Karşılaştırma Raporu</span>
                {karsSkor !== null && (
                  <span style={{
                    fontSize: 14, fontWeight: 800, color: skorRenk,
                    background: `${skorRenk}22`, border: `1px solid ${skorRenk}44`,
                    padding: '2px 10px', borderRadius: 20,
                  }}>
                    Uyum: {karsSkor}/100
                  </span>
                )}
                {karsStream && <span style={{ fontSize: 12, color: 'var(--accent)' }}>Analiz ediliyor...</span>}
              </div>
              <div style={{ fontSize: 13, lineHeight: 1.75 }}>{renderMd(karsRapor)}</div>
            </Kart>
          )}

          {/* ── Aksiyon Barı (profil üretildikten sonra görünür) ── */}
          {profil && !profilStream && (
            <Kart>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 20, alignItems: 'flex-start' }}>

                {/* YETKİLENDİRME */}
                <div>
                  <div style={{ fontSize: 11, textTransform: 'uppercase', color: 'var(--muted)', letterSpacing: '0.06em', marginBottom: 8, fontWeight: 700 }}>
                    Yetkilendirme
                  </div>
                  <div style={{ display: 'flex', gap: 6 }}>
                    <Btn
                      color={izin === 'izin_verildi' ? 'green' : 'gray'}
                      onClick={() => izinGuncelle('izin_verildi')}
                    >
                      ✓ İzin Ver
                    </Btn>
                    <Btn
                      color={izin === 'izin_verilmedi' ? 'red' : 'gray'}
                      onClick={() => izinGuncelle('izin_verilmedi')}
                    >
                      ✕ İzin Verme
                    </Btn>
                  </div>
                </div>

                {/* Dikey ayırıcı */}
                <div style={{ width: 1, background: 'var(--border)', alignSelf: 'stretch' }} />

                {/* VERİ İŞLEMLERİ */}
                <div>
                  <div style={{ fontSize: 11, textTransform: 'uppercase', color: 'var(--muted)', letterSpacing: '0.06em', marginBottom: 8, fontWeight: 700 }}>
                    Veri İşlemleri
                  </div>
                  <div style={{ display: 'flex', gap: 6 }}>
                    <Btn color="accent" onClick={profilKaydet} disabled={kaydedildi}>
                      {kaydedildi ? '✓ Kaydedildi' : '💾 Kaydet'}
                    </Btn>
                    <Btn color="red" onClick={profilSil}>🗑 Sil</Btn>
                  </div>
                  {kaydedildi && (
                    <div style={{ fontSize: 11, color: 'var(--accent)', marginTop: 4 }}>
                      Evrak kutusuna eklendi
                    </div>
                  )}
                </div>

                {/* Dikey ayırıcı */}
                <div style={{ width: 1, background: 'var(--border)', alignSelf: 'stretch' }} />

                {/* AI HAFIZASI */}
                <div>
                  <div style={{ fontSize: 11, textTransform: 'uppercase', color: 'var(--muted)', letterSpacing: '0.06em', marginBottom: 8, fontWeight: 700 }}>
                    AI Hafızası
                  </div>
                  <button
                    onClick={saklaGuncelle}
                    style={{
                      padding: '0.45rem 1rem', borderRadius: 6, fontSize: 13, fontWeight: 600,
                      border: `1px solid ${sakla ? '#f97316' : 'var(--border)'}`,
                      background: sakla ? 'rgba(249,115,22,0.10)' : 'var(--surface2)',
                      color: sakla ? '#f97316' : 'var(--muted)',
                      cursor: 'pointer', transition: 'all 0.2s',
                      display: 'flex', alignItems: 'center', gap: 6,
                    }}
                  >
                    🧠 {sakla ? 'Hafızada ✓' : 'Benim İçin Sakla'}
                  </button>
                  {sakla && (
                    <div style={{ fontSize: 11, color: '#f97316', marginTop: 4 }}>
                      Bölüm 1 analizinde kullanılacak
                    </div>
                  )}
                </div>

              </div>
            </Kart>
          )}
        </div>
      </div>
    </div>
  );
}

/* ─── SAYFA ──────────────────────────────────────────────────── */
export default function BelgeAnaliz() {
  const [hafizaBilgi, setHafizaBilgi] = useState(null);
  const [belgeMetin, setBelgeMetin]   = useState('');
  const [belgeId, setBelgeId]         = useState(null);

  return (
    <div style={{ animation: 'fadeIn 0.2s' }}>
      <BolumDokumanAnaliz
        onBilgiSakla={setHafizaBilgi}
        onMetinHazir={(metin, id) => { setBelgeMetin(metin || ''); setBelgeId(id || null); }}
      />

      <div style={{ display: 'flex', alignItems: 'center', gap: 12, margin: '32px 0 28px' }}>
        <div style={{ flex: 1, height: 1, background: 'var(--border)' }} />
        <span style={{ fontSize: 11, color: 'var(--muted)', textTransform: 'uppercase', letterSpacing: '0.1em' }}>Profil & Karşılaştırma</span>
        <div style={{ flex: 1, height: 1, background: 'var(--border)' }} />
      </div>

      <BolumProfilSihirbazi
        hafizaBilgi={hafizaBilgi}
        belgeMetin={belgeMetin}
        belgeId={belgeId}
        onBilgiSakla={setHafizaBilgi}
      />
    </div>
  );
}
