import { useState, useRef, useCallback } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { getHiyerarsiSektorler, getHiyerarsiPozisyonlar, getHiyerarsiDeptlar } from '../api/index.js';

const API = import.meta.env.VITE_API_URL || '';
function aH() { const t = localStorage.getItem('token'); return t ? { Authorization: `Bearer ${t}` } : {}; }
function jH() { return { 'Content-Type': 'application/json', ...aH() }; }

/* ─── Ortak UI ─────────────────────────────────────── */
function Kart({ children, style }) {
  return <div style={{ background:'var(--surface)', border:'1px solid var(--border)', borderRadius:'var(--radius)', padding:'1.25rem', ...style }}>{children}</div>;
}
function Lbl({ children, style }) {
  return <div style={{ fontSize:11, textTransform:'uppercase', letterSpacing:'0.06em', color:'var(--muted)', marginBottom:5, ...style }}>{children}</div>;
}
function Btn({ onClick, disabled, children, color='accent', style }) {
  const bg = { accent:'var(--accent)', green:'#22c55e', red:'#ef4444', gray:'var(--surface2)', purple:'linear-gradient(135deg,#6366f1,#8b5cf6)' }[color];
  return (
    <button onClick={onClick} disabled={disabled} style={{
      padding:'0.45rem 1rem', border:'none', borderRadius:6, fontSize:12, fontWeight:600,
      background: bg, color: color==='gray' ? 'var(--text)' : '#fff',
      cursor: disabled ? 'not-allowed' : 'pointer', opacity: disabled ? 0.5 : 1,
      transition:'opacity 0.15s', ...style,
    }}>{children}</button>
  );
}

/* ─── Radar Chart (CSS-only) ──────────────────────── */
function RadarMini({ kriterler, puanlarA, puanlarB }) {
  const n = Math.min(kriterler.length, 8);
  const cx = 90, cy = 90, r = 70;
  const pts = (vals) => Array.from({ length: n }, (_, i) => {
    const angle = (i / n) * 2 * Math.PI - Math.PI / 2;
    const v = (parseFloat(vals[i] ?? 0) / 10) * r;
    return `${cx + v * Math.cos(angle)},${cy + v * Math.sin(angle)}`;
  }).join(' ');
  const gridPts = (frac) => Array.from({ length: n }, (_, i) => {
    const angle = (i / n) * 2 * Math.PI - Math.PI / 2;
    const v = frac * r;
    return `${cx + v * Math.cos(angle)},${cy + v * Math.sin(angle)}`;
  }).join(' ');
  return (
    <svg viewBox="0 0 180 180" style={{ width:'100%', maxWidth:200 }}>
      {[0.25,0.5,0.75,1].map(f => <polygon key={f} points={gridPts(f)} fill="none" stroke="var(--border)" strokeWidth="0.5" />)}
      {Array.from({ length: n }, (_, i) => {
        const angle = (i / n) * 2 * Math.PI - Math.PI / 2;
        return <line key={i} x1={cx} y1={cy} x2={cx+r*Math.cos(angle)} y2={cy+r*Math.sin(angle)} stroke="var(--border)" strokeWidth="0.5" />;
      })}
      <polygon points={pts(puanlarA)} fill="rgba(5,163,123,0.2)" stroke="var(--accent)" strokeWidth="1.5" />
      <polygon points={pts(puanlarB)} fill="rgba(99,102,241,0.2)" stroke="#6366f1" strokeWidth="1.5" />
      {Array.from({ length: n }, (_, i) => {
        const angle = (i / n) * 2 * Math.PI - Math.PI / 2;
        const vA = (parseFloat(puanlarA[i] ?? 0) / 10) * r;
        const vB = (parseFloat(puanlarB[i] ?? 0) / 10) * r;
        return (
          <g key={i}>
            <circle cx={cx+vA*Math.cos(angle)} cy={cy+vA*Math.sin(angle)} r="3" fill="var(--accent)" />
            <circle cx={cx+vB*Math.cos(angle)} cy={cy+vB*Math.sin(angle)} r="3" fill="#6366f1" />
          </g>
        );
      })}
    </svg>
  );
}

/* ─── CV Yükleme Alanı ────────────────────────────── */
function CvYukle({ label, color, onMetin, metin, isim, onIsim }) {
  const [drag, setDrag] = useState(false);
  const [yukleniyor, setYukleniyor] = useState(false);
  const ref = useRef();

  async function handleFile(file) {
    if (!file) return;
    setYukleniyor(true);
    const form = new FormData(); form.append('cv', file);
    try {
      const res = await fetch(`${API}/api/kiyaslamalar/cv-yukle`, { method:'POST', body:form });
      const data = await res.json();
      onMetin(data.metin || '');
      if (!isim) onIsim(file.name.replace(/\.[^.]+$/, ''));
    } catch(e) { alert(e.message); }
    finally { setYukleniyor(false); }
  }

  return (
    <div style={{ flex:1, display:'flex', flexDirection:'column', gap:8 }}>
      <div style={{ display:'flex', alignItems:'center', gap:8, marginBottom:2 }}>
        <div style={{ width:12, height:12, borderRadius:'50%', background:color }} />
        <Lbl style={{ margin:0, color }}>{label}</Lbl>
      </div>
      <input value={isim} onChange={e => onIsim(e.target.value)}
        placeholder="Aday adı ve soyadı..."
        style={{ width:'100%', borderLeft:`3px solid ${color}` }} />

      <div
        onDragOver={e => { e.preventDefault(); setDrag(true); }}
        onDragLeave={() => setDrag(false)}
        onDrop={e => { e.preventDefault(); setDrag(false); handleFile(e.dataTransfer.files[0]); }}
        onClick={() => ref.current?.click()}
        style={{
          border:`2px dashed ${drag ? color : 'var(--border)'}`,
          borderRadius:8, padding:'1.5rem', textAlign:'center', cursor:'pointer',
          background: drag ? `${color}11` : 'var(--surface2)', transition:'all 0.2s',
          minHeight:80, display:'flex', flexDirection:'column', alignItems:'center', justifyContent:'center',
        }}
      >
        <input ref={ref} type="file" accept=".pdf,.docx,.txt" style={{ display:'none' }}
          onChange={e => handleFile(e.target.files[0])} />
        {yukleniyor
          ? <div style={{ fontSize:12, color }}> ⚙️ Okunuyor...</div>
          : metin
          ? <div style={{ fontSize:12, color:'#22c55e' }}>✓ {metin.length.toLocaleString()} karakter yüklendi</div>
          : <div style={{ fontSize:12, color:'var(--muted)' }}>📄 PDF / DOCX / TXT sürükle veya tıkla</div>}
      </div>

      <textarea value={metin} onChange={e => onMetin(e.target.value)}
        placeholder="veya CV metnini buraya yapıştırın..."
        rows={6} style={{ width:'100%', fontSize:12, resize:'vertical' }} />
    </div>
  );
}

/* ─── Kriter Satırı ───────────────────────────────── */
const KAT_RENK = { performans:'#f97316', deneyim:'var(--accent)', egitim:'#6366f1', sertifika:'#f59e0b', ozel:'#8b5cf6' };
const KAT_LABEL = { performans:'⚡ Performans', deneyim:'🏢 Deneyim', egitim:'🎓 Eğitim', sertifika:'🏅 Sertifika', ozel:'⭐ Özel' };

function KriterSatir({ k, agirlik, onChange, onSil, puanA, puanB, aciklamaA, aciklamaB, aiYuklendi }) {
  const [open, setOpen] = useState(false);
  const fark = (parseFloat(puanA||0) - parseFloat(puanB||0)).toFixed(1);
  const farkRenk = fark > 0 ? 'var(--accent)' : fark < 0 ? '#6366f1' : 'var(--muted)';

  return (
    <div style={{ borderBottom:'1px solid var(--border)', paddingBottom:8, marginBottom:8 }}>
      <div style={{ display:'flex', alignItems:'center', gap:8 }}>
        {/* Kategori rozeti */}
        <span style={{
          fontSize:9, fontWeight:700, padding:'2px 6px', borderRadius:8, flexShrink:0,
          background:`${KAT_RENK[k.kategori]}22`, color:KAT_RENK[k.kategori],
          textTransform:'uppercase', letterSpacing:'0.05em',
        }}>{KAT_LABEL[k.kategori]?.split(' ')[0]}</span>

        {/* Kriter adı */}
        <span style={{ flex:1, fontSize:13, fontWeight:500 }}>{k.ad}</span>

        {/* Ağırlık */}
        <div style={{ display:'flex', alignItems:'center', gap:4 }}>
          <input type="number" min={0} max={100} step={1}
            value={agirlik} onChange={e => onChange('agirlik', +e.target.value)}
            style={{ width:48, textAlign:'center', fontSize:12, padding:'3px 4px' }} />
          <span style={{ fontSize:11, color:'var(--muted)' }}>%</span>
        </div>

        {/* Puanlar */}
        {aiYuklendi && (
          <>
            <div style={{ width:40, textAlign:'center' }}>
              <div style={{ fontSize:14, fontWeight:800, color:'var(--accent)' }}>{puanA ?? '-'}</div>
              <div style={{ fontSize:9, color:'var(--muted)' }}>A</div>
            </div>
            <div style={{ width:40, textAlign:'center' }}>
              <div style={{ fontSize:14, fontWeight:800, color:'#6366f1' }}>{puanB ?? '-'}</div>
              <div style={{ fontSize:9, color:'var(--muted)' }}>B</div>
            </div>
            <div style={{ width:36, textAlign:'center' }}>
              <div style={{ fontSize:11, fontWeight:700, color:farkRenk }}>
                {fark > 0 ? `+${fark}` : fark}
              </div>
              <div style={{ fontSize:9, color:'var(--muted)' }}>fark</div>
            </div>
          </>
        )}

        {/* Açıklama toggle */}
        {aiYuklendi && (aciklamaA || aciklamaB) && (
          <button onClick={() => setOpen(o=>!o)} style={{ background:'transparent', border:'none', color:'var(--muted)', cursor:'pointer', fontSize:12, padding:2 }}>
            {open ? '▲' : '▼'}
          </button>
        )}

        {/* Sil */}
        <button onClick={onSil} title="Devre dışı bırak"
          style={{ background:'transparent', border:'none', color:'var(--muted)', cursor:'pointer', fontSize:12, padding:2 }}
          onMouseEnter={e=>e.currentTarget.style.color='#ef4444'}
          onMouseLeave={e=>e.currentTarget.style.color='var(--muted)'}>✕</button>
      </div>

      {/* Mini bar chart */}
      {aiYuklendi && puanA != null && puanB != null && (
        <div style={{ paddingLeft:70, marginTop:4 }}>
          <div style={{ display:'flex', gap:4, alignItems:'center', marginBottom:2 }}>
            <div style={{ width:6, height:6, borderRadius:'50%', background:'var(--accent)', flexShrink:0 }} />
            <div style={{ flex:1, height:5, background:'var(--surface2)', borderRadius:3, overflow:'hidden' }}>
              <div style={{ height:'100%', width:`${puanA*10}%`, background:'var(--accent)', borderRadius:3, transition:'width 0.4s' }} />
            </div>
          </div>
          <div style={{ display:'flex', gap:4, alignItems:'center' }}>
            <div style={{ width:6, height:6, borderRadius:'50%', background:'#6366f1', flexShrink:0 }} />
            <div style={{ flex:1, height:5, background:'var(--surface2)', borderRadius:3, overflow:'hidden' }}>
              <div style={{ height:'100%', width:`${puanB*10}%`, background:'#6366f1', borderRadius:3, transition:'width 0.4s' }} />
            </div>
          </div>
        </div>
      )}

      {/* AI açıklamalar */}
      {open && (
        <div style={{ paddingLeft:70, marginTop:6, display:'grid', gridTemplateColumns:'1fr 1fr', gap:8 }}>
          {aciklamaA && <div style={{ fontSize:11, color:'var(--muted)', lineHeight:1.5, padding:'4px 8px', background:'var(--accent-dim)', borderRadius:5 }}>
            <span style={{ color:'var(--accent)', fontWeight:600 }}>A:</span> {aciklamaA}
          </div>}
          {aciklamaB && <div style={{ fontSize:11, color:'var(--muted)', lineHeight:1.5, padding:'4px 8px', background:'rgba(99,102,241,0.1)', borderRadius:5 }}>
            <span style={{ color:'#6366f1', fontWeight:600 }}>B:</span> {aciklamaB}
          </div>}
        </div>
      )}
    </div>
  );
}

/* ─── ANA SAYFA ────────────────────────────────────── */
export default function AdayKiyasla() {
  const qc = useQueryClient();
  const [panel, setPanel] = useState('yeni'); // 'yeni' | 'gecmis'

  // Aday bilgileri
  const [adayAIsim, setAdayAIsim] = useState('');
  const [adayAMetin, setAdayAMetin] = useState('');
  const [adayBIsim, setAdayBIsim] = useState('');
  const [adayBMetin, setAdayBMetin] = useState('');

  // Filtreler
  const [sektorId, setSektorId] = useState('');
  const [deptId, setDeptId]     = useState('');
  const [pozId, setPozId]       = useState('');
  const [pozAcik, setPozAcik]   = useState('');

  // Kriterler (yerel state — DB'den gelir, kullanıcı düzenleyebilir)
  const [kriterler, setKriterler] = useState(null);
  const [agirliklar, setAgirliklar] = useState({}); // {id: agirlik}
  const [yeniKriterAd, setYeniKriterAd] = useState('');
  const [yeniKriterKat, setYeniKriterKat] = useState('ozel');
  const [yeniKriterAg, setYeniKriterAg] = useState(10);

  // AI + Kıyaslama
  const [kiyaslamaId, setKiyaslamaId] = useState(null);
  const [aiYukleniyor, setAiYukleniyor] = useState(false);
  const [aiDurum, setAiDurum] = useState('');
  const [puanlar, setPuanlar] = useState({}); // {`${kriterId}-${aday}`: {puan, aciklama}}
  const [toplamA, setToplamA] = useState(null);
  const [toplamB, setToplamB] = useState(null);
  const [kazanan, setKazanan] = useState(null);
  const [ozet, setOzet] = useState('');

  // Geçmiş
  const [gecmisler, setGecmisler] = useState([]);
  const [seciliGecmis, setSeciliGecmis] = useState(null);

  const { data: sektorler = [] } = useQuery({ queryKey:['h-sektorler'], queryFn: () => fetch(`${API}/api/hiyerarsi/sektorler`).then(r=>r.json()) });
  const { data: deptlar = [] }   = useQuery({ queryKey:['h-deptlar', sektorId], queryFn: () => fetch(`${API}/api/hiyerarsi/departmanlar/${sektorId}`).then(r=>r.json()), enabled:!!sektorId });
  const { data: pozlar = [] }    = useQuery({ queryKey:['h-pozlar', deptId], queryFn: () => fetch(`${API}/api/hiyerarsi/pozisyonlar/${deptId}`).then(r=>r.json()), enabled:!!deptId });

  // Kriterleri yükle
  async function yukleKriterler() {
    const res = await fetch(`${API}/api/kiyaslamalar/kriterler`);
    const data = await res.json();
    setKriterler(data);
    const ag = {};
    for (const k of data) ag[k.id] = parseFloat(k.agirlik);
    setAgirliklar(ag);
  }
  if (!kriterler) { yukleKriterler(); }

  async function yukleGecmis() {
    const res = await fetch(`${API}/api/kiyaslamalar`, { headers: aH() });
    setGecmisler(await res.json());
  }

  function agirlikTopla() {
    return Object.values(agirliklar).reduce((s, v) => s + (v||0), 0);
  }

  // Ağırlıkları normalize et (100'e böl)
  function agirlikNormalize() {
    const toplam = agirlikTopla();
    if (Math.abs(toplam - 100) < 0.5) return;
    const yeni = {};
    for (const [id, ag] of Object.entries(agirliklar)) {
      yeni[id] = parseFloat(((ag / toplam) * 100).toFixed(1));
    }
    setAgirliklar(yeni);
  }

  async function kriterEkle() {
    if (!yeniKriterAd.trim()) return;
    const res = await fetch(`${API}/api/kiyaslamalar/kriterler`, {
      method:'POST', headers: jH(),
      body: JSON.stringify({ ad:yeniKriterAd, kategori:yeniKriterKat, agirlik:yeniKriterAg }),
    });
    const yeni = await res.json();
    setKriterler(prev => [...prev, yeni]);
    setAgirliklar(prev => ({ ...prev, [yeni.id]: yeniKriterAg }));
    setYeniKriterAd('');
  }

  async function kriterSil(id) {
    await fetch(`${API}/api/kiyaslamalar/kriterler/${id}`, { method:'DELETE', headers: aH() });
    setKriterler(prev => prev.filter(k => k.id !== id));
    setAgirliklar(prev => { const n = {...prev}; delete n[id]; return n; });
  }

  async function agirlikKaydet() {
    const liste = Object.entries(agirliklar).map(([id, ag]) => ({ id:+id, agirlik:ag }));
    await fetch(`${API}/api/kiyaslamalar/kriterler/agirlik/toplu`, {
      method:'PUT', headers: jH(), body: JSON.stringify({ agirliklar: liste }),
    });
  }

  async function baslatVePuanla() {
    if (!adayAIsim || !adayBIsim) { alert('Her iki aday adı zorunlu'); return; }

    // Ağırlık kaydet
    await agirlikKaydet();

    // Kıyaslama oluştur
    const res = await fetch(`${API}/api/kiyaslamalar`, {
      method:'POST', headers: jH(),
      body: JSON.stringify({
        baslik:`${adayAIsim} vs ${adayBIsim}`,
        pozisyon_id: pozId || null, pozisyon_acik: pozAcik || pozlar.find(p=>p.id===+pozId)?.ad || '',
        sektor_id: sektorId || null,
        aday_a_ad: adayAIsim, aday_a_metin: adayAMetin,
        aday_b_ad: adayBIsim, aday_b_metin: adayBMetin,
      }),
    });
    const { id } = await res.json();
    setKiyaslamaId(id);

    // AI puanlama
    setAiYukleniyor(true); setAiDurum('AI puanları hesaplıyor...'); setPuanlar({}); setOzet('');

    const streamRes = await fetch(`${API}/api/kiyaslamalar/${id}/ai-puan`, {
      method:'POST', headers: aH(),
    });
    const reader = streamRes.body.getReader(); const dec = new TextDecoder();
    while (true) {
      const { done, value } = await reader.read(); if (done) break;
      for (const line of dec.decode(value, { stream:true }).split('\n')) {
        if (!line.startsWith('data: ')) continue;
        const p = line.slice(6).trim(); if (p === '[DONE]') break;
        try {
          const obj = JSON.parse(p);
          if (obj.tip === 'ilerleme') setAiDurum(`AI yazıyor... (${obj.karakter} kr)`);
          if (obj.tip === 'bitti') {
            const parsed = obj.parsed;
            const yeniPuanlar = {};
            for (const pp of parsed.puanlar || []) {
              yeniPuanlar[`${pp.kriter_id}-A`] = { puan: pp.aday_a_puan, aciklama: pp.aday_a_aciklama };
              yeniPuanlar[`${pp.kriter_id}-B`] = { puan: pp.aday_b_puan, aciklama: pp.aday_b_aciklama };
            }
            setPuanlar(yeniPuanlar);
            setOzet(parsed.genel_ozet || '');
            setKazanan(parsed.kazanan);
          }
        } catch {}
      }
    }

    // Toplamları çek
    const detay = await fetch(`${API}/api/kiyaslamalar/${id}`).then(r=>r.json());
    setToplamA(detay.aday_a_toplam);
    setToplamB(detay.aday_b_toplam);
    setKazanan(detay.kazanan);
    setAiYukleniyor(false); setAiDurum('');
  }

  const puanlarA = kriterler ? kriterler.map(k => puanlar[`${k.id}-A`]?.puan ?? null) : [];
  const puanlarB = kriterler ? kriterler.map(k => puanlar[`${k.id}-B`]?.puan ?? null) : [];
  const aiYuklendi = Object.keys(puanlar).length > 0;
  const toplamAgirlik = agirlikTopla();
  const agirlikOk = Math.abs(toplamAgirlik - 100) < 0.5;

  const kazananRenk = kazanan === 'A' ? 'var(--accent)' : kazanan === 'B' ? '#6366f1' : '#f59e0b';
  const kazananAd   = kazanan === 'A' ? adayAIsim : kazanan === 'B' ? adayBIsim : 'Eşit';

  return (
    <div style={{ animation:'fadeIn 0.2s' }}>
      {/* Başlık */}
      <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:'1.5rem' }}>
        <div>
          <h1 style={{ fontSize:'1.2rem', fontWeight:800, margin:0 }}>Aday Puanlama & Kıyaslama Matrisi</h1>
          <p style={{ fontSize:13, color:'var(--muted)', margin:'4px 0 0' }}>Çok boyutlu, ağırlıklı ve AI destekli nesnel değerlendirme</p>
        </div>
        <div style={{ display:'flex', gap:8 }}>
          <Btn color={panel==='yeni' ? 'accent':'gray'} onClick={() => setPanel('yeni')}>Yeni Kıyaslama</Btn>
          <Btn color={panel==='gecmis' ? 'accent':'gray'} onClick={() => { setPanel('gecmis'); yukleGecmis(); }}>📂 Geçmiş</Btn>
        </div>
      </div>

      {/* ── PANEL: Geçmiş ── */}
      {panel === 'gecmis' && (
        <div>
          {gecmisler.length === 0
            ? <Kart style={{ textAlign:'center', padding:'3rem', color:'var(--muted)' }}>Henüz kıyaslama yok</Kart>
            : gecmisler.map(g => (
              <Kart key={g.id} style={{ marginBottom:8, cursor:'pointer' }} onClick={async () => {
                const d = await fetch(`${API}/api/kiyaslamalar/${g.id}`).then(r=>r.json());
                setSeciliGecmis(d);
              }}>
                <div style={{ display:'flex', alignItems:'center', gap:12 }}>
                  <div style={{ flex:1 }}>
                    <div style={{ fontWeight:700, fontSize:13 }}>{g.baslik}</div>
                    <div style={{ fontSize:11, color:'var(--muted)' }}>{g.pozisyon_adi || g.pozisyon_acik} · {g.sektor_adi} · {new Date(g.olusturma).toLocaleDateString('tr-TR')}</div>
                  </div>
                  <div style={{ textAlign:'center' }}>
                    <div style={{ fontSize:13, fontWeight:700, color:'var(--accent)' }}>A: {parseFloat(g.aday_a_toplam||0).toFixed(2)}</div>
                    <div style={{ fontSize:13, fontWeight:700, color:'#6366f1' }}>B: {parseFloat(g.aday_b_toplam||0).toFixed(2)}</div>
                  </div>
                  <div style={{
                    padding:'4px 12px', borderRadius:20, fontWeight:700, fontSize:12,
                    background: g.kazanan==='A' ? 'rgba(5,163,123,0.15)' : g.kazanan==='B' ? 'rgba(99,102,241,0.15)' : 'rgba(251,191,36,0.15)',
                    color: g.kazanan==='A' ? 'var(--accent)' : g.kazanan==='B' ? '#6366f1' : '#f59e0b',
                  }}>
                    {g.kazanan === 'A' ? `${g.aday_a_ad} Kazandı` : g.kazanan === 'B' ? `${g.aday_b_ad} Kazandı` : 'Eşit'}
                  </div>
                </div>
              </Kart>
            ))}

          {seciliGecmis && (
            <div style={{ position:'fixed', inset:0, background:'rgba(0,0,0,0.7)', zIndex:1000, display:'flex', alignItems:'center', justifyContent:'center' }}
              onClick={() => setSeciliGecmis(null)}>
              <div style={{ background:'var(--surface)', borderRadius:12, padding:'2rem', maxWidth:640, width:'90%', maxHeight:'80vh', overflowY:'auto' }}
                onClick={e => e.stopPropagation()}>
                <h3 style={{ margin:'0 0 1rem' }}>{seciliGecmis.baslik}</h3>
                {seciliGecmis.ai_ozet && <p style={{ fontSize:13, lineHeight:1.7, color:'var(--muted)', marginBottom:'1rem' }}>{seciliGecmis.ai_ozet}</p>}
                <div style={{ display:'flex', flexDirection:'column', gap:6 }}>
                  {seciliGecmis.puanlar?.map(p => (
                    <div key={p.id} style={{ display:'flex', alignItems:'center', gap:8, fontSize:12, padding:'6px 8px', background:'var(--surface2)', borderRadius:6 }}>
                      <span style={{ flex:1, fontWeight:500 }}>{p.kriter_adi}</span>
                      <span style={{ color:'var(--accent)', fontWeight:700 }}>A: {p.puan}</span>
                    </div>
                  ))}
                </div>
                <button onClick={() => setSeciliGecmis(null)} style={{ marginTop:'1rem', padding:'0.5rem 1.5rem', borderRadius:8, border:'1px solid var(--border)', background:'var(--surface2)', color:'var(--text)', cursor:'pointer' }}>Kapat</button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* ── PANEL: Yeni Kıyaslama ── */}
      {panel === 'yeni' && (
        <div style={{ display:'grid', gridTemplateColumns:'1fr 420px', gap:16, alignItems:'start' }}>

          {/* SOL: CV'ler + Filtreler */}
          <div>
            {/* Hedef Pozisyon */}
            <Kart style={{ marginBottom:12 }}>
              <div style={{ fontSize:13, fontWeight:600, marginBottom:'0.75rem' }}>🎯 Hedef Pozisyon (Opsiyonel)</div>
              <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr 1fr', gap:8 }}>
                <div>
                  <Lbl>Sektör</Lbl>
                  <select value={sektorId} onChange={e => { setSektorId(e.target.value); setDeptId(''); setPozId(''); }} style={{ width:'100%' }}>
                    <option value="">Tümü</option>
                    {sektorler.map(s => <option key={s.id} value={s.id}>{s.ad}</option>)}
                  </select>
                </div>
                <div>
                  <Lbl>Departman</Lbl>
                  <select value={deptId} onChange={e => { setDeptId(e.target.value); setPozId(''); }} style={{ width:'100%' }} disabled={!sektorId}>
                    <option value="">Tümü</option>
                    {deptlar.map(d => <option key={d.id} value={d.id}>{d.ad}</option>)}
                  </select>
                </div>
                <div>
                  <Lbl>Pozisyon</Lbl>
                  <select value={pozId} onChange={e => setPozId(e.target.value)} style={{ width:'100%' }} disabled={!deptId}>
                    <option value="">Seçin...</option>
                    {pozlar.map(p => <option key={p.id} value={p.id}>{p.ad}</option>)}
                  </select>
                </div>
              </div>
              <div style={{ marginTop:8 }}>
                <Lbl>Serbest Pozisyon Tanımı</Lbl>
                <input value={pozAcik} onChange={e => setPozAcik(e.target.value)}
                  placeholder="Örn: Kıdemli Yazılım Geliştirici" style={{ width:'100%' }} />
              </div>
            </Kart>

            {/* CV Alanları */}
            <Kart style={{ marginBottom:12 }}>
              <div style={{ fontSize:13, fontWeight:600, marginBottom:'0.75rem' }}>👤 Adaylar</div>
              <div style={{ display:'flex', gap:16 }}>
                <CvYukle label="Aday A" color="var(--accent)"
                  isim={adayAIsim} onIsim={setAdayAIsim}
                  metin={adayAMetin} onMetin={setAdayAMetin} />
                <div style={{ width:1, background:'var(--border)' }} />
                <CvYukle label="Aday B" color="#6366f1"
                  isim={adayBIsim} onIsim={setAdayBIsim}
                  metin={adayBMetin} onMetin={setAdayBMetin} />
              </div>
            </Kart>

            {/* AI Butonu */}
            <button
              onClick={baslatVePuanla}
              disabled={aiYukleniyor || !adayAIsim || !adayBIsim}
              style={{
                width:'100%', padding:'0.9rem', border:'none', borderRadius:10,
                background: (aiYukleniyor || !adayAIsim || !adayBIsim)
                  ? 'var(--muted)' : 'linear-gradient(135deg,#6366f1,#057c3c)',
                color:'#fff', fontSize:14, fontWeight:800, letterSpacing:'0.02em',
                cursor:(aiYukleniyor||!adayAIsim||!adayBIsim) ? 'not-allowed' : 'pointer',
                boxShadow:'0 4px 24px rgba(5,163,123,0.25)',
              }}
            >
              {aiYukleniyor
                ? `⚙️ ${aiDurum}`
                : aiYuklendi ? '🔄 Yeniden Kıyasla' : '✦ AI ile Otomatik Puanla & Kıyasla'}
            </button>
          </div>

          {/* SAĞ: Kriter Matrisi + Sonuç */}
          <div>
            {/* Sonuç kartı */}
            {aiYuklendi && (
              <Kart style={{ marginBottom:12, borderTop:`3px solid ${kazananRenk}` }}>
                <div style={{ display:'flex', alignItems:'center', gap:12 }}>
                  <div style={{ flex:1 }}>
                    <div style={{ fontSize:11, color:'var(--muted)', marginBottom:2 }}>KAZANAN</div>
                    <div style={{ fontSize:'1.3rem', fontWeight:900, color:kazananRenk }}>{kazananAd}</div>
                  </div>
                  <div style={{ textAlign:'center' }}>
                    <div style={{ fontSize:'1.1rem', fontWeight:800, color:'var(--accent)' }}>{parseFloat(toplamA||0).toFixed(2)}</div>
                    <div style={{ fontSize:10, color:'var(--muted)' }}>{adayAIsim || 'Aday A'}</div>
                  </div>
                  <div style={{ fontSize:18, color:'var(--muted)' }}>vs</div>
                  <div style={{ textAlign:'center' }}>
                    <div style={{ fontSize:'1.1rem', fontWeight:800, color:'#6366f1' }}>{parseFloat(toplamB||0).toFixed(2)}</div>
                    <div style={{ fontSize:10, color:'var(--muted)' }}>{adayBIsim || 'Aday B'}</div>
                  </div>
                </div>
                {/* Radar */}
                <div style={{ display:'flex', justifyContent:'center', marginTop:8 }}>
                  <RadarMini kriterler={kriterler||[]} puanlarA={puanlarA} puanlarB={puanlarB} />
                </div>
                <div style={{ display:'flex', justifyContent:'center', gap:16, fontSize:11, marginTop:4 }}>
                  <span style={{ color:'var(--accent)' }}>● {adayAIsim||'Aday A'}</span>
                  <span style={{ color:'#6366f1' }}>● {adayBIsim||'Aday B'}</span>
                </div>
              </Kart>
            )}

            {/* Kriter Matrisi */}
            <Kart>
              <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:'0.75rem' }}>
                <div style={{ fontSize:13, fontWeight:600 }}>📊 Kıyaslama Kriterleri</div>
                <div style={{ display:'flex', alignItems:'center', gap:8 }}>
                  <div style={{
                    fontSize:11, fontWeight:700, padding:'2px 8px', borderRadius:8,
                    background: agirlikOk ? 'rgba(34,197,94,0.15)' : 'rgba(239,68,68,0.15)',
                    color: agirlikOk ? '#22c55e' : '#ef4444',
                  }}>
                    Σ {toplamAgirlik.toFixed(0)}%
                  </div>
                  {!agirlikOk && (
                    <button onClick={agirlikNormalize} style={{ fontSize:11, padding:'2px 8px', borderRadius:6, border:'1px solid #f59e0b', color:'#f59e0b', background:'transparent', cursor:'pointer' }}>
                      Normalize Et
                    </button>
                  )}
                </div>
              </div>

              {/* Sütun başlıkları */}
              <div style={{ display:'flex', alignItems:'center', gap:8, marginBottom:8, paddingBottom:6, borderBottom:'1px solid var(--border)', fontSize:10, color:'var(--muted)', textTransform:'uppercase', letterSpacing:'0.05em' }}>
                <span style={{ flex:1 }}>Kriter</span>
                <span style={{ width:60, textAlign:'center' }}>Ağırlık</span>
                {aiYuklendi && <>
                  <span style={{ width:40, textAlign:'center', color:'var(--accent)' }}>A</span>
                  <span style={{ width:40, textAlign:'center', color:'#6366f1' }}>B</span>
                  <span style={{ width:36, textAlign:'center' }}>Δ</span>
                  <span style={{ width:20 }} />
                </>}
                <span style={{ width:20 }} />
              </div>

              {(kriterler || []).map(k => (
                <KriterSatir
                  key={k.id} k={k}
                  agirlik={agirliklar[k.id] ?? parseFloat(k.agirlik)}
                  onChange={(field, val) => {
                    if (field === 'agirlik') setAgirliklar(prev => ({ ...prev, [k.id]: val }));
                  }}
                  onSil={() => kriterSil(k.id)}
                  puanA={puanlar[`${k.id}-A`]?.puan ?? null}
                  puanB={puanlar[`${k.id}-B`]?.puan ?? null}
                  aciklamaA={puanlar[`${k.id}-A`]?.aciklama}
                  aciklamaB={puanlar[`${k.id}-B`]?.aciklama}
                  aiYuklendi={aiYuklendi}
                />
              ))}

              {/* Yeni kriter ekle */}
              <div style={{ borderTop:'1px dashed var(--border)', paddingTop:10, marginTop:4 }}>
                <div style={{ fontSize:11, color:'var(--muted)', marginBottom:6 }}>+ Yeni Kriter Ekle</div>
                <div style={{ display:'flex', gap:6, flexWrap:'wrap' }}>
                  <select value={yeniKriterKat} onChange={e => setYeniKriterKat(e.target.value)} style={{ width:110 }}>
                    {Object.entries(KAT_LABEL).map(([k,l]) => <option key={k} value={k}>{l}</option>)}
                  </select>
                  <input value={yeniKriterAd} onChange={e => setYeniKriterAd(e.target.value)}
                    onKeyDown={e => e.key==='Enter' && kriterEkle()}
                    placeholder="Kriter adı..." style={{ flex:1, minWidth:100 }} />
                  <input type="number" min={0} max={50} value={yeniKriterAg}
                    onChange={e => setYeniKriterAg(+e.target.value)}
                    style={{ width:50, textAlign:'center' }} />
                  <span style={{ fontSize:11, color:'var(--muted)', lineHeight:'32px' }}>%</span>
                  <Btn onClick={kriterEkle} disabled={!yeniKriterAd} style={{ padding:'0.4rem 0.75rem' }}>Ekle</Btn>
                </div>
              </div>
            </Kart>

            {/* AI Özet */}
            {ozet && (
              <Kart style={{ marginTop:12 }}>
                <div style={{ fontSize:13, fontWeight:600, marginBottom:8 }}>🤖 AI Genel Değerlendirmesi</div>
                <p style={{ fontSize:13, lineHeight:1.7, color:'var(--muted)', margin:0 }}>{ozet}</p>
              </Kart>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
