import { useState, useRef, useCallback, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import {
  getHiyerarsiSektorler, getHiyerarsiDeptlar,
  getHiyerarsiPozisyonlar,
} from '../api/index.js';

const API = import.meta.env.VITE_API_URL || '';

/* ─── Ortak UI ──────────────────────────────────────────── */
function authH() {
  const t = localStorage.getItem('token');
  return t ? { Authorization: `Bearer ${t}` } : {};
}
function Kart({ children, style }) {
  return <div style={{ background:'var(--surface)', border:'1px solid var(--border)', borderRadius:'var(--radius)', padding:'1.5rem', ...style }}>{children}</div>;
}
function Lbl({ children }) {
  return <div style={{ fontSize:11, textTransform:'uppercase', letterSpacing:'0.06em', color:'var(--muted)', marginBottom:6 }}>{children}</div>;
}
function Chip({ label, active, onClick, color }) {
  return (
    <button onClick={onClick} style={{
      padding:'0.35rem 0.85rem', borderRadius:20, fontSize:12, fontWeight:600, cursor:'pointer',
      border:`1px solid ${active ? (color||'var(--accent)') : 'var(--border)'}`,
      background: active ? `${color||'var(--accent)'}22` : 'transparent',
      color: active ? (color||'var(--accent)') : 'var(--muted)', transition:'all 0.15s',
    }}>{label}</button>
  );
}
function Pbar({ value, color='var(--accent)' }) {
  return (
    <div style={{ height:8, background:'var(--surface2)', borderRadius:4, overflow:'hidden' }}>
      <div style={{ height:'100%', width:`${Math.min(100,value)}%`, background:color, borderRadius:4, transition:'width 0.4s' }} />
    </div>
  );
}

/* ─── ADIM GÖSTERGESİ ──────────────────────────────────── */
function Adimlar({ aktif }) {
  const adimlar = ['Döküman & Proje', 'Filtrele & Hedef', 'Parametreler', 'Üret & Önizle'];
  return (
    <div style={{ display:'flex', alignItems:'center', marginBottom:'2rem', gap:0 }}>
      {adimlar.map((a, i) => (
        <div key={i} style={{ display:'flex', alignItems:'center', flex: i < adimlar.length-1 ? 1 : 'none' }}>
          <div style={{ display:'flex', flexDirection:'column', alignItems:'center', gap:4 }}>
            <div style={{
              width:30, height:30, borderRadius:'50%', display:'flex', alignItems:'center', justifyContent:'center',
              fontSize:12, fontWeight:700,
              background: i < aktif ? 'var(--accent)' : i === aktif ? 'var(--accent)' : 'var(--surface2)',
              color: i <= aktif ? '#fff' : 'var(--muted)',
              border: i === aktif ? '2px solid var(--accent)' : '1px solid var(--border)',
            }}>
              {i < aktif ? '✓' : i+1}
            </div>
            <span style={{ fontSize:10, color: i <= aktif ? 'var(--accent)' : 'var(--muted)', whiteSpace:'nowrap' }}>{a}</span>
          </div>
          {i < adimlar.length-1 && (
            <div style={{ flex:1, height:2, background: i < aktif ? 'var(--accent)' : 'var(--border)', margin:'0 8px', marginBottom:20 }} />
          )}
        </div>
      ))}
    </div>
  );
}

/* ─── SORU KARTI (önizleme) ────────────────────────────── */
function SoruKarti({ soru, index, cevap, onCevap, showAnswer }) {
  const kaynak = { dokuman:'📄', havuz:'🗃️', ai:'🤖' }[soru.kaynak] || '🤖';
  return (
    <div style={{
      background:'var(--surface2)', border:'1px solid var(--border)', borderRadius:10,
      padding:'1rem 1.25rem', marginBottom:10,
    }}>
      <div style={{ display:'flex', gap:8, marginBottom:'0.75rem', alignItems:'flex-start' }}>
        <span style={{
          flexShrink:0, width:24, height:24, borderRadius:'50%',
          background:'var(--accent-dim)', color:'var(--accent)',
          display:'flex', alignItems:'center', justifyContent:'center',
          fontSize:11, fontWeight:700,
        }}>{index+1}</span>
        <div style={{ flex:1 }}>
          <div style={{ display:'flex', gap:6, marginBottom:4, flexWrap:'wrap' }}>
            <span style={{ fontSize:10, color:'var(--muted)' }}>{kaynak} {soru.kaynak}</span>
            <span style={{
              fontSize:10, padding:'1px 6px', borderRadius:10,
              background: soru.zorluk==='kolay' ? 'rgba(34,197,94,0.15)' : soru.zorluk==='zor' ? 'rgba(239,68,68,0.15)' : 'rgba(251,191,36,0.15)',
              color: soru.zorluk==='kolay' ? '#22c55e' : soru.zorluk==='zor' ? '#ef4444' : '#f59e0b',
            }}>{soru.zorluk}</span>
            <span style={{ fontSize:10, color:'var(--muted)' }}>{soru.puan_degeri} puan</span>
          </div>
          <p style={{ margin:0, fontSize:13, lineHeight:1.6, fontWeight:500 }}>{soru.soru_metni}</p>
        </div>
      </div>

      {soru.soru_tipi === 'cok_secmeli' && soru.secenekler?.length > 0 && (
        <div style={{ paddingLeft:32, display:'flex', flexDirection:'column', gap:4 }}>
          {soru.secenekler.map(s => {
            const isCorrect  = showAnswer && s.harf === soru.dogru_cevap;
            const isSelected = cevap === s.harf;
            const isWrong    = showAnswer && isSelected && !isCorrect;
            return (
              <label key={s.harf} style={{
                display:'flex', alignItems:'center', gap:8, padding:'0.4rem 0.65rem',
                borderRadius:6, cursor: showAnswer ? 'default' : 'pointer',
                background: isCorrect ? 'rgba(34,197,94,0.1)' : isWrong ? 'rgba(239,68,68,0.1)' : isSelected ? 'var(--accent-dim)' : 'transparent',
                border:`1px solid ${isCorrect ? '#22c55e' : isWrong ? '#ef4444' : isSelected ? 'var(--accent)' : 'transparent'}`,
              }}>
                <input type="radio" name={`q${soru.id}`} value={s.harf}
                  checked={isSelected} onChange={() => !showAnswer && onCevap?.(soru.id, s.harf)}
                  style={{ accentColor:'var(--accent)' }} />
                <span style={{ fontSize:12 }}><strong>{s.harf})</strong> {s.metin}</span>
                {isCorrect && <span style={{ marginLeft:'auto', color:'#22c55e', fontSize:12 }}>✓</span>}
              </label>
            );
          })}
        </div>
      )}
      {soru.soru_tipi === 'dogru_yanlis' && (
        <div style={{ paddingLeft:32, display:'flex', gap:8 }}>
          {['Doğru','Yanlış'].map(opt => {
            const isSelected = cevap === opt;
            const isCorrect  = showAnswer && soru.dogru_cevap === opt;
            const isWrong    = showAnswer && isSelected && !isCorrect;
            return (
              <label key={opt} style={{
                display:'flex', alignItems:'center', gap:6, padding:'0.4rem 0.85rem',
                borderRadius:6, cursor: showAnswer ? 'default' : 'pointer',
                background: isCorrect ? 'rgba(34,197,94,0.1)' : isWrong ? 'rgba(239,68,68,0.1)' : isSelected ? 'var(--accent-dim)' : 'var(--surface)',
                border:`1px solid ${isCorrect ? '#22c55e' : isWrong ? '#ef4444' : isSelected ? 'var(--accent)' : 'var(--border)'}`,
              }}>
                <input type="radio" name={`q${soru.id}`} value={opt}
                  checked={isSelected} onChange={() => !showAnswer && onCevap?.(soru.id, opt)}
                  style={{ accentColor:'var(--accent)' }} />
                <span style={{ fontSize:12, fontWeight:600 }}>{opt}</span>
              </label>
            );
          })}
        </div>
      )}
      {soru.soru_tipi === 'acik_uclu' && (
        <textarea
          value={cevap || ''}
          onChange={e => !showAnswer && onCevap?.(soru.id, e.target.value)}
          readOnly={showAnswer}
          placeholder="Cevabınızı yazın..."
          rows={3}
          style={{ width:'100%', marginLeft:32, resize:'vertical', fontSize:12, boxSizing:'border-box' }}
        />
      )}
      {showAnswer && soru.aciklama && (
        <div style={{ marginTop:8, paddingLeft:32, padding:'0.5rem 0.75rem', background:'rgba(99,102,241,0.08)', border:'1px solid rgba(99,102,241,0.2)', borderRadius:6, fontSize:12, color:'#a5b4fc' }}>
          💡 {soru.aciklama}
        </div>
      )}
    </div>
  );
}

/* ─── ADAY GİRİŞ FORMU ─────────────────────────────────── */
function AdayGiris({ proje, onBaslat }) {
  const [ad, setAd]           = useState('');
  const [soyad, setSoyad]     = useState('');
  const [eposta, setEposta]   = useState('');
  const [pozisyon, setPozisyon] = useState('');
  const [sirket, setSirket]   = useState('');
  const [imza, setImza]       = useState(false);
  const [hata, setHata]       = useState('');
  const [yukleniyor, setYukleniyor] = useState(false);

  async function handleBaslat(e) {
    e.preventDefault();
    if (!imza) { setHata('Kimlik onayı zorunludur'); return; }
    setHata(''); setYukleniyor(true);
    try {
      const res = await fetch(`${API}/api/testler/oturum`, {
        method:'POST', headers:{ 'Content-Type':'application/json' },
        body: JSON.stringify({ proje_id: proje.id, aday_ad: ad, aday_soyad: soyad, aday_eposta: eposta, aday_pozisyon: pozisyon, aday_sirket: sirket, imza_onay: imza }),
      });
      const data = await res.json();
      if (!res.ok) { setHata(data.hata); return; }
      onBaslat(data);
    } catch(e) { setHata(e.message); }
    finally { setYukleniyor(false); }
  }

  return (
    <div style={{ maxWidth:540, margin:'0 auto' }}>
      <Kart>
        <div style={{ textAlign:'center', marginBottom:'1.5rem' }}>
          <div style={{ fontSize:36, marginBottom:8 }}>📝</div>
          <h2 style={{ fontSize:'1.1rem', fontWeight:700, margin:0 }}>{proje.ad}</h2>
          <div style={{ display:'flex', justifyContent:'center', gap:16, marginTop:8, fontSize:12, color:'var(--muted)' }}>
            <span>⏱ {proje.sure_dakika} dakika</span>
            <span>❓ {proje.soru_sayisi} soru</span>
            <span>📊 {proje.zorluk}</span>
          </div>
        </div>

        <form onSubmit={handleBaslat}>
          <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:12, marginBottom:12 }}>
            <div><Lbl>Ad *</Lbl><input value={ad} onChange={e=>setAd(e.target.value)} required style={{ width:'100%' }} /></div>
            <div><Lbl>Soyad *</Lbl><input value={soyad} onChange={e=>setSoyad(e.target.value)} required style={{ width:'100%' }} /></div>
            <div><Lbl>E-posta</Lbl><input type="email" value={eposta} onChange={e=>setEposta(e.target.value)} style={{ width:'100%' }} /></div>
            <div><Lbl>Pozisyon</Lbl><input value={pozisyon} onChange={e=>setPozisyon(e.target.value)} placeholder="Başvurduğunuz pozisyon" style={{ width:'100%' }} /></div>
            <div style={{ gridColumn:'1/-1' }}><Lbl>Şirket / Kurum</Lbl><input value={sirket} onChange={e=>setSirket(e.target.value)} style={{ width:'100%' }} /></div>
          </div>

          <div style={{
            padding:'0.75rem 1rem', background:'rgba(99,102,241,0.08)',
            border:'1px solid rgba(99,102,241,0.25)', borderRadius:8, marginBottom:12,
          }}>
            <label style={{ display:'flex', alignItems:'flex-start', gap:10, cursor:'pointer' }}>
              <input type="checkbox" checked={imza} onChange={e=>setImza(e.target.checked)}
                style={{ marginTop:3, accentColor:'var(--accent)', flexShrink:0 }} />
              <span style={{ fontSize:12, lineHeight:1.6, color:'var(--text)' }}>
                <strong>{ad || 'Ad'} {soyad || 'Soyad'}</strong> olarak bu testi bizzat çözeceğimi, yanıtlarımın özgün olduğunu beyan eder,
                {' '}<strong>kimliğimi onaylıyorum.</strong>
                {' '}Test sonuçlarının ilgili birimlerle paylaşılmasına izin veriyorum.
              </span>
            </label>
          </div>

          {hata && <div style={{ color:'#ef4444', fontSize:12, marginBottom:8 }}>{hata}</div>}

          <button type="submit" disabled={!ad || !soyad || !imza || yukleniyor} style={{
            width:'100%', padding:'0.75rem', border:'none', borderRadius:8,
            background: (!ad||!soyad||!imza) ? 'var(--muted)' : 'var(--accent)',
            color:'#fff', fontSize:14, fontWeight:700,
            cursor: (!ad||!soyad||!imza||yukleniyor) ? 'not-allowed' : 'pointer',
          }}>
            {yukleniyor ? 'Başlatılıyor...' : '▶ Teste Başla'}
          </button>
        </form>
      </Kart>
    </div>
  );
}

/* ─── TEST ÇÖZME EKRANI ────────────────────────────────── */
function TestEkrani({ oturumData, proje, onBitis }) {
  const { oturum_id, sorular = [], sure_dakika } = oturumData;
  const [cevaplar, setCevaplar] = useState({});
  const [kalanSaniye, setKalanSaniye] = useState(sure_dakika * 60);
  const [aktifSoru, setAktifSoru] = useState(0);
  const [gonderiliyor, setGonderiliyor] = useState(false);

  useEffect(() => {
    const timer = setInterval(() => {
      setKalanSaniye(s => {
        if (s <= 1) { clearInterval(timer); bitir(); return 0; }
        return s - 1;
      });
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  const dk = Math.floor(kalanSaniye / 60);
  const sn = kalanSaniye % 60;
  const surenBitti = kalanSaniye <= 300;

  function handleCevap(soruId, deger) {
    setCevaplar(prev => ({ ...prev, [soruId]: deger }));
  }

  async function bitir() {
    setGonderiliyor(true);
    const cevapListesi = sorular.map(s => ({
      soru_id: s.id,
      verilen_cevap: cevaplar[s.id] || '',
    }));
    try {
      const res = await fetch(`${API}/api/testler/oturum/${oturum_id}/bitir`, {
        method:'POST', headers:{ 'Content-Type':'application/json' },
        body: JSON.stringify({ cevaplar: cevapListesi }),
      });
      const skor = await res.json();
      onBitis({ oturum_id, skor, sorular, cevaplar });
    } catch(e) { alert(e.message); }
    finally { setGonderiliyor(false); }
  }

  const cevaplanan = Object.keys(cevaplar).length;
  const ilerleme   = sorular.length > 0 ? (cevaplanan / sorular.length) * 100 : 0;

  return (
    <div style={{ display:'grid', gridTemplateColumns:'240px 1fr', gap:16, alignItems:'start' }}>
      {/* Sidebar */}
      <div style={{ position:'sticky', top:0 }}>
        <Kart style={{ marginBottom:10 }}>
          <div style={{ textAlign:'center' }}>
            <div style={{
              fontSize:'2rem', fontWeight:800,
              color: surenBitti ? '#ef4444' : 'var(--accent)',
              fontVariantNumeric:'tabular-nums',
            }}>
              {String(dk).padStart(2,'0')}:{String(sn).padStart(2,'0')}
            </div>
            <div style={{ fontSize:11, color:'var(--muted)', marginTop:2 }}>Kalan Süre</div>
            {surenBitti && <div style={{ fontSize:11, color:'#ef4444', marginTop:4 }}>⚠ Süreniz dolmak üzere!</div>}
          </div>
        </Kart>
        <Kart style={{ marginBottom:10 }}>
          <Lbl>İlerleme</Lbl>
          <Pbar value={ilerleme} />
          <div style={{ fontSize:12, color:'var(--muted)', marginTop:4 }}>{cevaplanan}/{sorular.length} cevaplandı</div>
        </Kart>
        <Kart>
          <Lbl>Sorular</Lbl>
          <div style={{ display:'flex', flexWrap:'wrap', gap:4 }}>
            {sorular.map((s, i) => (
              <button key={s.id} onClick={() => setAktifSoru(i)} style={{
                width:28, height:28, borderRadius:6, fontSize:11, fontWeight:600,
                border:`1px solid ${cevaplar[s.id] ? 'var(--accent)' : 'var(--border)'}`,
                background: i === aktifSoru ? 'var(--accent)' : cevaplar[s.id] ? 'var(--accent-dim)' : 'var(--surface2)',
                color: i === aktifSoru ? '#fff' : cevaplar[s.id] ? 'var(--accent)' : 'var(--muted)',
                cursor:'pointer',
              }}>{i+1}</button>
            ))}
          </div>
        </Kart>
      </div>

      {/* Soru */}
      <div>
        {sorular[aktifSoru] && (
          <Kart style={{ marginBottom:12 }}>
            <SoruKarti
              soru={sorular[aktifSoru]} index={aktifSoru}
              cevap={cevaplar[sorular[aktifSoru].id]}
              onCevap={handleCevap}
              showAnswer={false}
            />
            <div style={{ display:'flex', justifyContent:'space-between', marginTop:12 }}>
              <button onClick={() => setAktifSoru(i => Math.max(0, i-1))} disabled={aktifSoru===0}
                style={{ padding:'0.45rem 1rem', borderRadius:6, border:'1px solid var(--border)', background:'var(--surface2)', color:'var(--text)', fontSize:13, cursor:'pointer' }}>
                ← Önceki
              </button>
              {aktifSoru < sorular.length - 1 ? (
                <button onClick={() => setAktifSoru(i => i+1)}
                  style={{ padding:'0.45rem 1rem', borderRadius:6, border:'none', background:'var(--accent)', color:'#fff', fontSize:13, fontWeight:600, cursor:'pointer' }}>
                  Sonraki →
                </button>
              ) : (
                <button onClick={bitir} disabled={gonderiliyor} style={{
                  padding:'0.45rem 1.25rem', borderRadius:6, border:'none',
                  background: gonderiliyor ? 'var(--muted)' : '#22c55e', color:'#fff', fontSize:13, fontWeight:700, cursor:'pointer',
                }}>
                  {gonderiliyor ? 'Gönderiliyor...' : '✓ Testi Bitir'}
                </button>
              )}
            </div>
          </Kart>
        )}
        <div style={{ display:'flex', justifyContent:'center' }}>
          <button onClick={bitir} disabled={gonderiliyor} style={{
            padding:'0.6rem 2rem', borderRadius:8, border:'none',
            background: gonderiliyor ? 'var(--muted)' : '#ef4444', color:'#fff', fontSize:13, fontWeight:600, cursor:'pointer',
          }}>
            {gonderiliyor ? 'Gönderiliyor...' : '⏹ Testi Erken Bitir'}
          </button>
        </div>
      </div>
    </div>
  );
}

/* ─── SONUÇ RAPORU ─────────────────────────────────────── */
function SonucRaporu({ sonuc, proje }) {
  const { oturum_id, skor, sorular, cevaplar } = sonuc;
  const [showCevaplar, setShowCevaplar] = useState(false);
  const [raporDetay, setRaporDetay] = useState(null);

  useEffect(() => {
    fetch(`${API}/api/testler/oturum/${oturum_id}/rapor`)
      .then(r => r.json())
      .then(d => setRaporDetay(d))
      .catch(() => {});
  }, [oturum_id]);

  const basari = skor.basari_yuzdesi;
  const renk = basari >= 70 ? '#22c55e' : basari >= 50 ? '#f97316' : '#ef4444';
  const etiket = basari >= 70 ? 'Başarılı ✓' : basari >= 50 ? 'Geçer Notta ⚡' : 'Gelişim Gerekli ⚠';

  const tarih = new Date().toLocaleString('tr-TR');
  const aday  = raporDetay?.oturum;

  return (
    <div style={{ maxWidth:800, margin:'0 auto' }}>
      {/* Başlık */}
      <Kart style={{ marginBottom:12, textAlign:'center' }}>
        <div style={{ fontSize:60, marginBottom:8 }}>
          {basari >= 70 ? '🏆' : basari >= 50 ? '📊' : '📉'}
        </div>
        <h2 style={{ fontSize:'1.4rem', fontWeight:800, margin:'0 0 4px' }}>{etiket}</h2>
        <div style={{ fontSize:'3rem', fontWeight:900, color:renk, lineHeight:1 }}>%{basari}</div>
        <div style={{ fontSize:13, color:'var(--muted)', marginTop:4 }}>Başarı Oranı</div>
      </Kart>

      {/* Metrikler */}
      <div style={{ display:'grid', gridTemplateColumns:'repeat(4,1fr)', gap:8, marginBottom:12 }}>
        {[
          { label:'Doğru', value:skor.dogru_sayisi, renk:'#22c55e' },
          { label:'Yanlış', value:skor.yanlis_sayisi, renk:'#ef4444' },
          { label:'Boş', value:skor.bos_sayisi, renk:'var(--muted)' },
          { label:'Puan', value:`${skor.kazanilan_puan}/${skor.toplam_puan}`, renk:'var(--accent)' },
        ].map(m => (
          <Kart key={m.label} style={{ textAlign:'center', padding:'1rem' }}>
            <div style={{ fontSize:'1.5rem', fontWeight:800, color:m.renk }}>{m.value}</div>
            <div style={{ fontSize:11, color:'var(--muted)', marginTop:2 }}>{m.label}</div>
          </Kart>
        ))}
      </div>

      {/* İmza Alanı (Footer) */}
      <Kart style={{ marginBottom:12, borderTop:'3px solid var(--accent)' }}>
        <div style={{ fontSize:11, fontWeight:700, textTransform:'uppercase', letterSpacing:'0.08em', color:'var(--accent)', marginBottom:'1rem' }}>
          📋 Test Tamamlama Kaydı
        </div>
        <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:12, fontSize:13 }}>
          <div>
            <span style={{ color:'var(--muted)' }}>Ad Soyad: </span>
            <strong>{aday?.aday_ad || ''} {aday?.aday_soyad || ''}</strong>
          </div>
          <div>
            <span style={{ color:'var(--muted)' }}>Pozisyon: </span>
            <strong>{aday?.aday_pozisyon || '-'}</strong>
          </div>
          <div>
            <span style={{ color:'var(--muted)' }}>Kurum: </span>
            <strong>{aday?.aday_sirket || '-'}</strong>
          </div>
          <div>
            <span style={{ color:'var(--muted)' }}>Test: </span>
            <strong>{proje?.ad}</strong>
          </div>
          <div>
            <span style={{ color:'var(--muted)' }}>Tamamlama Tarihi: </span>
            <strong>{tarih}</strong>
          </div>
          <div>
            <span style={{ color:'var(--muted)' }}>Süre: </span>
            <strong>{skor.sure_saniye ? `${Math.floor(skor.sure_saniye/60)} dk ${skor.sure_saniye%60} sn` : '-'}</strong>
          </div>
        </div>
        <div style={{ marginTop:'1rem', padding:'0.6rem 1rem', background:'rgba(34,197,94,0.08)', border:'1px solid rgba(34,197,94,0.2)', borderRadius:6, fontSize:12, color:'#22c55e' }}>
          ✓ Bu kayıt, {aday?.aday_ad || ''} {aday?.aday_soyad || ''} tarafından {tarih} tarihinde dijital olarak onaylanmıştır.
        </div>
      </Kart>

      <div style={{ textAlign:'center', marginBottom:16 }}>
        <button onClick={() => setShowCevaplar(v => !v)} style={{
          padding:'0.6rem 1.5rem', borderRadius:8, border:'1px solid var(--border)',
          background:'var(--surface2)', color:'var(--text)', fontSize:13, fontWeight:600, cursor:'pointer',
        }}>
          {showCevaplar ? '▲ Cevapları Gizle' : '▼ Cevap Anahtarını Göster'}
        </button>
      </div>

      {showCevaplar && raporDetay?.detay && (
        <div>
          {raporDetay.detay.map((s, i) => (
            <SoruKarti key={s.soru_no} soru={s} index={i} cevap={s.verilen_cevap} showAnswer={true} />
          ))}
        </div>
      )}
    </div>
  );
}

/* ─── ANA SAYFA ────────────────────────────────────────── */
export default function TestModulu() {
  const [adim, setAdim] = useState(0);

  // Adım 1 — Döküman
  const [dosya, setDosya]         = useState(null);
  const [dragOver, setDragOver]   = useState(false);
  const [belgeMetin, setBelgeMetin] = useState('');
  const [analizYukleniyor, setAnalizYukleniyor] = useState(false);
  const inputRef = useRef();

  // Adım 2 — Filtreler
  const [sektorId, setSektorId]   = useState('');
  const [deptId, setDeptId]       = useState('');
  const [pozId, setPozId]         = useState('');

  // Belge seçim sekmesi
  const [belgeSecTab, setBelgeSecTab] = useState('dosya'); // 'dosya' | 'belgeler'
  const [belgeler, setBelgeler]       = useState([]);
  const [belgelerYuk, setBelgelerYuk] = useState(false);
  const [secilenBelge, setSecilenBelge] = useState(null);

  // Adım 3 — Parametreler
  const [projeAd, setProjeAd]   = useState('');
  const [soruSayisi, setSoruSayisi] = useState(20);
  const [zorluk, setZorluk]     = useState('karisik');
  const [sureDakika, setSureDakika] = useState(45);
  const [kaynakModu, setKaynakModu] = useState('hibrit');
  const [dokOran, setDokOran]   = useState(40);
  const [havuzOran, setHavuzOran] = useState(30);
  const [aiOran, setAiOran]     = useState(30);
  const [soruTipi, setSoruTipi] = useState('karma');

  // Adım 4 — Üretim / Test
  const [projeler, setProjeler]   = useState([]);
  const [aktifProje, setAktifProje] = useState(null);
  const [uretimDurum, setUretimDurum] = useState('');
  const [uretildi, setUretildi]   = useState(false);
  const [sorularOnizle, setSorularOnizle] = useState([]);

  // Test Çözme
  const [mod, setMod] = useState('yonetim'); // 'yonetim' | 'aday_giris' | 'cozuyor' | 'sonuc'
  const [oturumData, setOturumData] = useState(null);
  const [sonuc, setSonuc]           = useState(null);
  const [secilenProje, setSecilenProje] = useState(null);

  // Test Ata modal
  const [testAtaProje, setTestAtaProje]       = useState(null);
  const [ataEmail, setAtaEmail]               = useState('');
  const [ataAd, setAtaAd]                     = useState('');
  const [ataGonderildi, setAtaGonderildi]     = useState(false);
  const [ataGonderiliyor, setAtaGonderiliyor] = useState(false);
  const [ataKopyalandi, setAtaKopyalandi]     = useState(false);

  // Cascading queries
  const { data: sektorler = [] } = useQuery({ queryKey:['h-sektorler'], queryFn: getHiyerarsiSektorler });
  const sektorObj = sektorler.find(s => s.id === +sektorId);
  const { data: deptlar = [] } = useQuery({ queryKey:['h-deptlar', sektorId], queryFn: () => getHiyerarsiDeptlar(sektorId), enabled:!!sektorId });
  const { data: pozlar = [] } = useQuery({ queryKey:['h-pozlar', deptId], queryFn: () => getHiyerarsiPozisyonlar(deptId), enabled:!!deptId });

  useEffect(() => { yukleProjeListesi(); }, []);

  // Pozisyon seçilince otomatik proje adı üret
  useEffect(() => {
    if (pozId && pozlar.length) {
      const poz = pozlar.find(p => String(p.id) === String(pozId));
      if (poz) {
        const tarih = new Date().toLocaleDateString('tr-TR', { month:'short', year:'numeric' });
        setProjeAd(`${poz.ad} Testi — ${tarih}`);
      }
    }
  }, [pozId, pozlar]);

  async function yukleProjeListesi() {
    const res = await fetch(`${API}/api/testler/proje`, { headers: authH() });
    const data = await res.json();
    setProjeler(Array.isArray(data) ? data : []);
  }

  async function projeSil(proje) {
    if (!confirm(`"${proje.ad}" testini silmek istediğinize emin misiniz?`)) return;
    await fetch(`${API}/api/testler/proje/${proje.id}`, { method: 'DELETE', headers: authH() });
    await yukleProjeListesi();
  }

  async function yukleBelgeler() {
    setBelgelerYuk(true);
    try {
      const res = await fetch(`${API}/api/belgeler`, { headers: authH() });
      const data = await res.json();
      setBelgeler(Array.isArray(data) ? data : []);
    } catch(e) {}
    finally { setBelgelerYuk(false); }
  }

  async function secBelgeIcerik(belge) {
    setSecilenBelge(belge);
    try {
      const res = await fetch(`${API}/api/belgeler/${belge.id}`, { headers: authH() });
      const data = await res.json();
      const icerik = data.icerik || data.ai_makale || '';
      setBelgeMetin(icerik);
      setProjeAd(((data.ai_konu || data.orijinal_ad || '').slice(0, 55)) + ' Testi');
    } catch(e) {}
  }

  async function handleDosya(file) {
    if (!file) return;
    setDosya(file); setAnalizYukleniyor(true); setBelgeMetin('');
    const form = new FormData(); form.append('dosya', file);
    try {
      const res = await fetch(`${API}/api/belgeler/analiz/stream`, { method:'POST', body:form });
      const reader = res.body.getReader(); const dec = new TextDecoder();
      while (true) {
        const { done, value } = await reader.read(); if (done) break;
        for (const line of dec.decode(value, { stream:true }).split('\n')) {
          if (!line.startsWith('data: ')) continue;
          const p = line.slice(6).trim(); if (p === '[DONE]') break;
          try { const obj = JSON.parse(p); if (obj.tip === 'metin') setBelgeMetin(obj.veri); } catch {}
        }
      }
      setProjeAd(file.name.replace(/\.[^.]+$/, '') + ' Testi');
    } catch(e) { alert(e.message); }
    finally { setAnalizYukleniyor(false); }
  }

  async function projeOlusturVeUret({ _belgeMetin, _projeAd, _soruTipi } = {}) {
    setUretimDurum('Proje oluşturuluyor...'); setUretildi(false); setSorularOnizle([]);
    const kullanBelgeMetin = _belgeMetin ?? belgeMetin;
    const kullanProjeAd   = _projeAd   ?? projeAd;
    const kullanSoruTipi  = _soruTipi  ?? soruTipi;

    let projeId;
    try {
      const projeRes = await fetch(`${API}/api/testler/proje`, {
        method:'POST', headers:{ 'Content-Type':'application/json', ...authH() },
        body: JSON.stringify({
          ad: kullanProjeAd || 'Yeni Test', belge_metin: kullanBelgeMetin || null,
          sektor_id: sektorId || null, departman_id: deptId || null,
          pozisyon_id: pozId || null, yetkinlik_ids: null,
          soru_sayisi: soruSayisi, zorluk, sure_dakika: sureDakika,
          kaynak_modu: kaynakModu, dokuman_oran: dokOran, havuz_oran: havuzOran, ai_oran: aiOran,
          soru_tipi: kullanSoruTipi,
        }),
      });
      const data = await projeRes.json();
      projeId = data.id;
    } catch(e) {
      setUretimDurum('❌ Proje oluşturulamadı: ' + e.message);
      return;
    }

    setUretimDurum('🤖 AI sorular üretiyor — bu işlem 1-2 dakika sürebilir...');

    try {
      const uretRes = await fetch(`${API}/api/testler/proje/${projeId}/uret`, {
        method:'POST', headers: authH(),
      });
      const reader = uretRes.body.getReader(); const dec = new TextDecoder();
      let tamamlandi = false;
      while (true) {
        const { done, value } = await reader.read(); if (done) break;
        for (const line of dec.decode(value, { stream:true }).split('\n')) {
          if (line.startsWith(':')) continue; // keepalive ping — yoksay
          if (!line.startsWith('data: ')) continue;
          const p = line.slice(6).trim(); if (p === '[DONE]') { tamamlandi = true; break; }
          try {
            const obj = JSON.parse(p);
            if (obj.tip === 'durum')    setUretimDurum(`⚙️ ${obj.mesaj}`);
            if (obj.tip === 'ilerleme') setUretimDurum(`🤖 AI yazıyor... (${obj.karakter} karakter)`);
            if (obj.tip === 'uyari')    setUretimDurum(`⚠️ ${obj.mesaj}`);
            if (obj.tip === 'bitti') {
              setSorularOnizle(obj.sorular || []);
              setUretildi(true);
              setUretimDurum('');
              tamamlandi = true;
            }
          } catch {}
        }
        if (tamamlandi) break;
      }
      if (!tamamlandi) {
        setUretimDurum('⚠️ Bağlantı kesildi — proje kaydedildi, listeden açabilirsiniz.');
        await yukleProjeListesi();
        setTimeout(() => setAdim(0), 3000); // 3 saniye sonra listeye dön
      }
    } catch(e) {
      setUretimDurum('❌ Soru üretimi başarısız: ' + e.message);
      await yukleProjeListesi();
      setTimeout(() => setAdim(0), 3000);
    } finally {
      // Başarılı tamamlanmışsa listeyi yenile ama adımı değiştirme
      await yukleProjeListesi();
    }
  }

  /* ── Test Ata yardımcıları ─────────────────────────── */
  function openAtaModal(proje) {
    setTestAtaProje(proje);
    setAtaEmail(''); setAtaAd(''); setAtaGonderildi(false);
    setAtaGonderiliyor(false); setAtaKopyalandi(false);
  }

  function getAtaLink(projeId) {
    return `${window.location.origin}/test?proje=${projeId}&aday=${encodeURIComponent(ataAd)}`;
  }

  async function kopyalaAtaLink() {
    await navigator.clipboard.writeText(getAtaLink(testAtaProje?.id));
    setAtaKopyalandi(true);
    setTimeout(() => setAtaKopyalandi(false), 2000);
  }

  async function ataDavetGonder() {
    if (!ataEmail.trim()) { alert('E-posta adresi zorunlu'); return; }
    setAtaGonderiliyor(true);
    try {
      const t = localStorage.getItem('token');
      const r = await fetch(`${API}/api/testler/davet`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...(t ? { Authorization: `Bearer ${t}` } : {}) },
        body: JSON.stringify({
          proje_id:    testAtaProje?.id,
          aday_ad:     ataAd || 'Aday',
          aday_eposta: ataEmail,
          pozisyon:    testAtaProje?.pozisyon_adi || '',
          test_linki:  getAtaLink(testAtaProje?.id),
        }),
      });
      if (!r.ok) { const e = await r.json(); throw new Error(e.hata || 'Gönderilemedi'); }
      setAtaGonderildi(true);
    } catch(e) { alert(e.message); }
    finally { setAtaGonderiliyor(false); }
  }

  /* ── Test Çözüm Akışı ── */
  if (mod === 'aday_giris' && secilenProje) {
    return <AdayGiris proje={secilenProje} onBaslat={data => { setOturumData(data); setMod('cozuyor'); }} />;
  }
  if (mod === 'cozuyor' && oturumData) {
    return <TestEkrani oturumData={oturumData} proje={secilenProje} onBitis={s => { setSonuc(s); setMod('sonuc'); }} />;
  }
  if (mod === 'sonuc' && sonuc) {
    return (
      <div>
        <button onClick={() => setMod('yonetim')} style={{ marginBottom:16, padding:'0.45rem 1rem', borderRadius:6, border:'1px solid var(--border)', background:'var(--surface2)', color:'var(--text)', fontSize:13, cursor:'pointer' }}>
          ← Yönetim Paneline Dön
        </button>
        <SonucRaporu sonuc={sonuc} proje={secilenProje} />
      </div>
    );
  }

  /* ── Yönetim Paneli ── */
  return (
    <div style={{ animation:'fadeIn 0.2s' }}>

      {/* ── MODAL: Test Ata ── */}
      {testAtaProje && (
        <div style={{ position:'fixed', inset:0, background:'rgba(0,0,0,0.65)', zIndex:1000,
          display:'flex', alignItems:'center', justifyContent:'center' }}
          onClick={() => setTestAtaProje(null)}>
          <div style={{ background:'var(--surface)', borderRadius:14, padding:'1.75rem',
            maxWidth:480, width:'92%', boxShadow:'0 20px 60px rgba(0,0,0,0.4)' }}
            onClick={e => e.stopPropagation()}>

            {/* Başlık */}
            <div style={{ display:'flex', alignItems:'flex-start', justifyContent:'space-between', marginBottom:'1rem' }}>
              <div>
                <div style={{ fontSize:'1rem', fontWeight:800, marginBottom:4 }}>🧪 Test Ata</div>
                <div style={{ fontSize:12, color:'var(--muted)' }}>
                  <span style={{ color:'var(--accent)', fontWeight:600 }}>{testAtaProje.ad}</span>
                  {testAtaProje.pozisyon_adi && ` · ${testAtaProje.pozisyon_adi}`}
                </div>
              </div>
              <button onClick={() => setTestAtaProje(null)} style={{
                background:'transparent', border:'none', color:'var(--muted)',
                cursor:'pointer', fontSize:20, lineHeight:1, padding:2,
              }}>✕</button>
            </div>

            {/* Aday Adı */}
            <div style={{ marginBottom:'0.85rem' }}>
              <div style={{ fontSize:11, textTransform:'uppercase', letterSpacing:'0.06em', color:'var(--muted)', marginBottom:6 }}>Aday Adı (Opsiyonel)</div>
              <input
                placeholder="Ad Soyad..."
                value={ataAd}
                onChange={e => setAtaAd(e.target.value)}
                style={{ width:'100%' }}
              />
            </div>

            {/* Test Linki */}
            <div style={{ marginBottom:'1rem' }}>
              <div style={{ fontSize:11, textTransform:'uppercase', letterSpacing:'0.06em', color:'var(--muted)', marginBottom:6 }}>Test Bağlantısı</div>
              <div style={{ display:'flex', gap:8, alignItems:'center' }}>
                <input readOnly value={getAtaLink(testAtaProje.id)}
                  style={{ flex:1, fontSize:11, color:'var(--muted)', background:'var(--surface2)' }} />
                <button onClick={kopyalaAtaLink} style={{
                  padding:'0.4rem 0.85rem', borderRadius:6, border:'none', flexShrink:0,
                  background: ataKopyalandi ? '#22c55e' : 'var(--surface2)',
                  color: ataKopyalandi ? '#fff' : 'var(--text)',
                  fontSize:12, fontWeight:600, cursor:'pointer',
                }}>{ataKopyalandi ? '✓ Kopyalandı' : '📋 Kopyala'}</button>
              </div>
            </div>

            <div style={{ borderTop:'1px dashed var(--border)', margin:'1rem 0' }} />

            {/* E-posta Gönder */}
            {!ataGonderildi ? (
              <div>
                <div style={{ fontSize:11, textTransform:'uppercase', letterSpacing:'0.06em', color:'var(--muted)', marginBottom:6 }}>Davet E-postası Gönder</div>
                <div style={{ display:'flex', gap:8 }}>
                  <input
                    type="email"
                    placeholder="aday@email.com"
                    value={ataEmail}
                    onChange={e => setAtaEmail(e.target.value)}
                    onKeyDown={e => e.key === 'Enter' && ataDavetGonder()}
                    style={{ flex:1 }}
                  />
                  <button onClick={ataDavetGonder} disabled={!ataEmail.trim() || ataGonderiliyor} style={{
                    padding:'0.4rem 0.85rem', borderRadius:6, border:'none', flexShrink:0,
                    background: (!ataEmail.trim() || ataGonderiliyor) ? 'var(--muted)' : 'var(--accent)',
                    color:'#fff', fontSize:12, fontWeight:600,
                    cursor:(!ataEmail.trim() || ataGonderiliyor) ? 'not-allowed' : 'pointer',
                  }}>{ataGonderiliyor ? '⚙️...' : '📧 Gönder'}</button>
                </div>
                <div style={{ fontSize:11, color:'var(--muted)', marginTop:6 }}>
                  Adaya test daveti ve bağlantı e-posta ile gönderilir.
                </div>
              </div>
            ) : (
              <div style={{
                background:'rgba(34,197,94,0.12)', border:'1px solid rgba(34,197,94,0.3)',
                borderRadius:10, padding:'0.85rem 1rem', textAlign:'center',
              }}>
                <div style={{ fontSize:16, marginBottom:4 }}>✅</div>
                <div style={{ fontSize:13, fontWeight:700, color:'#22c55e' }}>Davet gönderildi!</div>
                <div style={{ fontSize:11, color:'var(--muted)', marginTop:4 }}>
                  <strong>{ataEmail}</strong> adresine test daveti iletildi.
                </div>
              </div>
            )}
          </div>
        </div>
      )}
      <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:'1.5rem' }}>
        <div>
          <h1 style={{ fontSize:'1.2rem', fontWeight:800, margin:0 }}>Test Hazırlama & Değerlendirme</h1>
          <p style={{ fontSize:13, color:'var(--muted)', margin:'4px 0 0' }}>Döküman ve AI destekli hibrit test motoru</p>
        </div>
      </div>

      <Adimlar aktif={adim} />

      {/* ── ADIM 0: Döküman & Proje ── */}
      {adim === 0 && (
        <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:16 }}>
          <Kart>
            {/* Sekme Barı */}
            <div style={{ display:'flex', borderRadius:8, overflow:'hidden', border:'1px solid var(--border)', marginBottom:'1rem' }}>
              {[['dosya','📄 Dosya Yükle'],['belgeler','📚 Belgelerimden Seç']].map(([k,l]) => (
                <button key={k} onClick={() => { setBelgeSecTab(k); if(k==='belgeler') yukleBelgeler(); }} style={{
                  flex:1, padding:'0.5rem', border:'none', cursor:'pointer', fontSize:12, fontWeight:600,
                  background: belgeSecTab===k ? 'var(--accent)' : 'var(--surface2)',
                  color: belgeSecTab===k ? '#fff' : 'var(--muted)', transition:'all 0.15s',
                }}>{l}</button>
              ))}
            </div>

            {/* Dosya Yükle sekmesi */}
            {belgeSecTab === 'dosya' && (<>
              <div
                onDragOver={e => { e.preventDefault(); setDragOver(true); }}
                onDragLeave={() => setDragOver(false)}
                onDrop={e => { e.preventDefault(); setDragOver(false); handleDosya(e.dataTransfer.files[0]); }}
                onClick={() => inputRef.current?.click()}
                style={{
                  border:`2px dashed ${dragOver ? 'var(--accent)' : 'var(--border)'}`,
                  borderRadius:8, padding:'2rem', textAlign:'center', cursor:'pointer',
                  background: dragOver ? 'var(--accent-dim)' : 'var(--surface2)', transition:'all 0.2s',
                }}
              >
                <input ref={inputRef} type="file" accept=".pdf,.docx,.txt" style={{ display:'none' }} onChange={e => handleDosya(e.target.files[0])} />
                <div style={{ fontSize:32, marginBottom:8 }}>{analizYukleniyor ? '⚙️' : '📄'}</div>
                {analizYukleniyor ? (
                  <div style={{ fontSize:13, color:'var(--accent)' }}>Döküman analiz ediliyor...</div>
                ) : dosya ? (
                  <div>
                    <div style={{ fontWeight:600, fontSize:13 }}>{dosya.name}</div>
                    <div style={{ fontSize:11, color:'var(--muted)', marginTop:3 }}>
                      {belgeMetin ? `✓ ${belgeMetin.length} karakter çıkarıldı` : 'İşleniyor...'}
                    </div>
                  </div>
                ) : (
                  <div>
                    <div style={{ fontWeight:600, fontSize:13, marginBottom:3 }}>Sürükle & Bırak veya Tıkla</div>
                    <div style={{ fontSize:12, color:'var(--muted)' }}>PDF, DOCX, TXT · Opsiyonel</div>
                  </div>
                )}
              </div>
              {belgeMetin && !secilenBelge && (
                <div style={{ marginTop:8, padding:'0.5rem 0.75rem', background:'rgba(34,197,94,0.08)', border:'1px solid rgba(34,197,94,0.2)', borderRadius:6, fontSize:12, color:'#22c55e' }}>
                  ✓ Döküman metni RAG için hazır
                </div>
              )}
            </>)}

            {/* Belgelerimden Seç sekmesi */}
            {belgeSecTab === 'belgeler' && (
              <div>
                {belgelerYuk ? (
                  <div style={{ textAlign:'center', padding:'2rem', color:'var(--muted)', fontSize:13 }}>Yükleniyor...</div>
                ) : belgeler.length === 0 ? (
                  <div style={{ textAlign:'center', padding:'2rem', color:'var(--muted)', fontSize:13 }}>
                    Henüz kayıtlı belge yok.<br/>
                    <span style={{ fontSize:11 }}>Belge Analiz sayfasından belge ekleyin.</span>
                  </div>
                ) : (
                  <div style={{ maxHeight:280, overflowY:'auto', display:'flex', flexDirection:'column', gap:6 }}>
                    {belgeler.map(b => (
                      <div key={b.id} style={{
                        padding:'0.65rem 0.85rem', borderRadius:8,
                        background: secilenBelge?.id === b.id ? 'var(--accent-dim)' : 'var(--surface2)',
                        border:`1px solid ${secilenBelge?.id === b.id ? 'var(--accent)' : 'var(--border)'}`,
                        display:'flex', alignItems:'center', gap:8,
                      }}>
                        <div style={{ flex:1, minWidth:0 }}>
                          <div style={{ fontSize:12, fontWeight:600, overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>
                            {b.ai_konu || b.orijinal_ad || 'Belge'}
                          </div>
                          <div style={{ fontSize:10, color:'var(--muted)', marginTop:2 }}>
                            {b.orijinal_ad} · {new Date(b.olusturma).toLocaleDateString('tr-TR')}
                          </div>
                        </div>
                        <button onClick={() => secBelgeIcerik(b)} style={{
                          padding:'0.3rem 0.6rem', borderRadius:6, border:`1px solid ${secilenBelge?.id===b.id ? 'var(--accent)' : 'var(--border)'}`,
                          background: secilenBelge?.id===b.id ? 'var(--accent)' : 'transparent',
                          color: secilenBelge?.id===b.id ? '#fff' : 'var(--muted)',
                          fontSize:11, fontWeight:700, cursor:'pointer', whiteSpace:'nowrap',
                        }}>{secilenBelge?.id===b.id ? '✓ Seçildi' : 'Seç'}</button>
                        <button onClick={async () => {
                          // Hızlı Test Hazırla — belgeyi seç ve direkt üret
                          setAdim(3);
                          let icerik = '';
                          try {
                            const r = await fetch(`${API}/api/belgeler/${b.id}`, { headers: authH() });
                            const d = await r.json();
                            icerik = d.icerik || d.ai_makale || '';
                          } catch(e) {}
                          const ad = ((b.ai_konu || b.orijinal_ad || '').slice(0, 55)) + ' Testi';
                          setBelgeMetin(icerik); setProjeAd(ad);
                          projeOlusturVeUret({ _belgeMetin: icerik, _projeAd: ad, _soruTipi: soruTipi });
                        }} style={{
                          padding:'0.3rem 0.65rem', borderRadius:6, border:'none',
                          background:'linear-gradient(135deg,#6366f1,#8b5cf6)',
                          color:'#fff', fontSize:11, fontWeight:700, cursor:'pointer', whiteSpace:'nowrap',
                        }}>⚡ Test Hazırla</button>
                      </div>
                    ))}
                  </div>
                )}
                {secilenBelge && (
                  <div style={{ marginTop:8, padding:'0.5rem 0.75rem', background:'rgba(34,197,94,0.08)', border:'1px solid rgba(34,197,94,0.2)', borderRadius:6, fontSize:12, color:'#22c55e' }}>
                    ✓ <strong>{secilenBelge.ai_konu || secilenBelge.orijinal_ad}</strong> seçildi
                  </div>
                )}
              </div>
            )}
          </Kart>

          <Kart>
            <div style={{ fontSize:13, fontWeight:600, marginBottom:'1rem' }}>📋 Mevcut Testler</div>
            {projeler.length === 0 ? (
              <div style={{ textAlign:'center', padding:'2rem', color:'var(--muted)', fontSize:13 }}>
                Henüz test yok.<br/>Sol taraftan döküman yükleyip devam edin.
              </div>
            ) : (
              <div style={{ maxHeight:300, overflowY:'auto' }}>
                {projeler.map(p => (
                  <div key={p.id} style={{
                    display:'flex', alignItems:'center', gap:8,
                    padding:'0.6rem 0.75rem', borderRadius:8, marginBottom:6,
                    background:'var(--surface2)', border:'1px solid var(--border)',
                  }}>
                    <div style={{ flex:1, minWidth:0 }}>
                      <div style={{ fontSize:13, fontWeight:600, overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>{p.ad}</div>
                      <div style={{ fontSize:11, color:'var(--muted)' }}>
                        {p.soru_uretilen}/{p.soru_sayisi} soru · {p.katilimci_sayisi} katılımcı · {p.zorluk}
                      </div>
                    </div>
                    <span style={{
                      fontSize:10, padding:'2px 6px', borderRadius:10,
                      background: p.durum==='hazir' ? 'rgba(34,197,94,0.15)' : p.durum==='uretiliyor' ? 'rgba(99,102,241,0.15)' : 'rgba(251,191,36,0.15)',
                      color: p.durum==='hazir' ? '#22c55e' : p.durum==='uretiliyor' ? '#6366f1' : '#f59e0b',
                    }}>
                      {p.durum === 'uretiliyor' ? '⚙️ üretiliyor' : p.durum}
                    </span>
                    {/* Takılı kalan "uretiliyor" projeleri için Yeniden Dene */}
                    {p.durum === 'uretiliyor' && (
                      <button onClick={async () => {
                        setAdim(3); setUretimDurum('⚙️ Yeniden üretiliyor...');
                        const uretRes = await fetch(`${API}/api/testler/proje/${p.id}/uret`, { method:'POST', headers: authH() });
                        const reader2 = uretRes.body.getReader(); const dec2 = new TextDecoder();
                        let ok = false;
                        while (true) {
                          const { done, value } = await reader2.read(); if (done) break;
                          for (const line of dec2.decode(value, { stream:true }).split('\n')) {
                            if (line.startsWith(':')) continue;
                            if (!line.startsWith('data: ')) continue;
                            const p2 = line.slice(6).trim();
                            try { const obj = JSON.parse(p2); if (obj.tip === 'ilerleme') setUretimDurum(`🤖 AI yazıyor... (${obj.karakter} kr)`); if (obj.tip === 'bitti') { setSorularOnizle(obj.sorular||[]); setUretildi(true); ok=true; } } catch {}
                          }
                        }
                        await yukleProjeListesi();
                        if (ok) setAdim(3); else setAdim(0);
                      }} style={{ padding:'0.3rem 0.6rem', borderRadius:6, border:'1px solid #6366f1', background:'transparent', color:'#6366f1', fontSize:11, fontWeight:700, cursor:'pointer' }}>
                        🔄 Tekrar
                      </button>
                    )}
                    {p.durum !== 'uretiliyor' && (
                      <button onClick={() => openAtaModal(p)} title="Test Ata" style={{
                        padding:'0.3rem 0.6rem', borderRadius:6, border:'1px solid var(--accent)',
                        background:'transparent', color:'var(--accent)', fontSize:11, fontWeight:700, cursor:'pointer',
                      }}>🧪 Ata</button>
                    )}
                    {p.durum === 'hazir' && (
                      <button onClick={() => { setSecilenProje(p); setMod('aday_giris'); }} style={{
                        padding:'0.3rem 0.7rem', borderRadius:6, border:'none',
                        background:'var(--accent)', color:'#fff', fontSize:11, fontWeight:700, cursor:'pointer',
                      }}>▶</button>
                    )}
                    <button onClick={() => projeSil(p)} title="Sil" style={{
                      padding:'0.3rem 0.6rem', borderRadius:6, border:'1px solid #ef4444',
                      background:'transparent', color:'#ef4444', fontSize:11, fontWeight:700, cursor:'pointer',
                    }}>🗑</button>
                  </div>
                ))}
              </div>
            )}
          </Kart>

          <div style={{ gridColumn:'1/-1', display:'flex', justifyContent:'flex-end' }}>
            <button onClick={() => setAdim(1)} style={{
              padding:'0.65rem 2rem', borderRadius:8, border:'none',
              background:'var(--accent)', color:'#fff', fontSize:13, fontWeight:700, cursor:'pointer',
            }}>Devam Et →</button>
          </div>
        </div>
      )}

      {/* ── ADIM 1: Filtrele & Hedef ── */}
      {adim === 1 && (
        <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:16 }}>
          <Kart>
            <div style={{ fontSize:13, fontWeight:600, marginBottom:'1rem' }}>🎯 Hedef Kitle Seçimi</div>
            <div style={{ display:'flex', flexDirection:'column', gap:14 }}>
              <div>
                <Lbl>Sektör</Lbl>
                <select value={sektorId} onChange={e => { setSektorId(e.target.value); setDeptId(''); setPozId(''); }} style={{ width:'100%' }}>
                  <option value="">Sektör seçin...</option>
                  {sektorler.map(s => <option key={s.id} value={s.id}>{s.nace_kodu ? `[${s.nace_kodu}] ` : ''}{s.ad}</option>)}
                </select>
                {sektorObj?.aciklama && <div style={{ marginTop:4, fontSize:11, color:'var(--muted)', lineHeight:1.5 }}>{sektorObj.aciklama}</div>}
              </div>
              <div>
                <Lbl>Departman / Birim</Lbl>
                <select value={deptId} onChange={e => { setDeptId(e.target.value); setPozId(''); }} style={{ width:'100%' }} disabled={!sektorId}>
                  <option value="">{sektorId ? 'Departman seçin...' : 'Önce sektör'}</option>
                  {deptlar.map(d => <option key={d.id} value={d.id}>{d.ad}</option>)}
                </select>
              </div>
              <div>
                <Lbl>Pozisyon</Lbl>
                <select value={pozId} onChange={e => setPozId(e.target.value)} style={{ width:'100%' }} disabled={!deptId}>
                  <option value="">{deptId ? 'Pozisyon seçin...' : 'Önce departman'}</option>
                  {pozlar.map(p => <option key={p.id} value={p.id}>{p.ad}{p.seviye ? ` (${p.seviye})` : ''}</option>)}
                </select>
              </div>
            </div>
          </Kart>

          <div style={{ gridColumn:'1/-1', display:'flex', justifyContent:'space-between' }}>
            <button onClick={() => setAdim(0)} style={{ padding:'0.65rem 1.5rem', borderRadius:8, border:'1px solid var(--border)', background:'var(--surface2)', color:'var(--text)', fontSize:13, cursor:'pointer' }}>← Geri</button>
            <button onClick={() => setAdim(2)} style={{ padding:'0.65rem 2rem', borderRadius:8, border:'none', background:'var(--accent)', color:'#fff', fontSize:13, fontWeight:700, cursor:'pointer' }}>Devam Et →</button>
          </div>
        </div>
      )}

      {/* ── ADIM 2: Parametreler ── */}
      {adim === 2 && (
        <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:16 }}>
          <Kart>
            <div style={{ fontSize:13, fontWeight:600, marginBottom:'1rem' }}>⚙️ Test Parametreleri</div>
            <div style={{ display:'flex', flexDirection:'column', gap:14 }}>
              <div>
                <Lbl>Proje Adı</Lbl>
                <input value={projeAd} onChange={e => setProjeAd(e.target.value)} placeholder="Örn: Q3 2025 Yazılım Geliştirici Testi" style={{ width:'100%' }} />
              </div>
              <div>
                <Lbl>Soru Sayısı</Lbl>
                <div style={{ display:'flex', gap:6 }}>
                  {[10,15,20,25,30].map(n => (
                    <Chip key={n} label={String(n)} active={soruSayisi===n} onClick={() => setSoruSayisi(n)} />
                  ))}
                  <input type="number" min={5} max={50} value={soruSayisi} onChange={e => setSoruSayisi(+e.target.value)}
                    style={{ width:60, textAlign:'center' }} />
                </div>
              </div>
              <div>
                <Lbl>Soru Türü</Lbl>
                <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:6 }}>
                  {[
                    ['karma','🎲 Karma','Karışık türler (önerilen)','#8b5cf6'],
                    ['cok_secmeli','📝 Çok Seçmeli','A, B, C, D seçenekli','#6366f1'],
                    ['dogru_yanlis','✅ Doğru / Yanlış','İki seçenekli ifade','#f59e0b'],
                    ['acik_uclu','✍️ Açık Uçlu','Yazılı kısa cevap','#22c55e'],
                  ].map(([v,l,desc,c]) => (
                    <button key={v} onClick={() => setSoruTipi(v)} style={{
                      padding:'0.55rem 0.75rem', borderRadius:8, border:`1px solid ${soruTipi===v ? c : 'var(--border)'}`,
                      background: soruTipi===v ? `${c}18` : 'var(--surface2)',
                      cursor:'pointer', textAlign:'left', transition:'all 0.15s',
                    }}>
                      <div style={{ fontSize:12, fontWeight:700, color: soruTipi===v ? c : 'var(--text)' }}>{l}</div>
                      <div style={{ fontSize:10, color:'var(--muted)', marginTop:2 }}>{desc}</div>
                    </button>
                  ))}
                </div>
              </div>
              <div>
                <Lbl>Zorluk Derecesi</Lbl>
                <div style={{ display:'flex', gap:6 }}>
                  {[['kolay','#22c55e'],['orta','#f59e0b'],['zor','#ef4444'],['karisik','#8b5cf6']].map(([z,c]) => (
                    <Chip key={z} label={z} active={zorluk===z} onClick={() => setZorluk(z)} color={c} />
                  ))}
                </div>
              </div>
              <div>
                <Lbl>Süre Limiti (dakika)</Lbl>
                <div style={{ display:'flex', gap:6, alignItems:'center' }}>
                  {[30,45,60,90].map(n => (
                    <Chip key={n} label={`${n} dk`} active={sureDakika===n} onClick={() => setSureDakika(n)} />
                  ))}
                  <input type="number" min={10} max={180} value={sureDakika} onChange={e => setSureDakika(+e.target.value)}
                    style={{ width:60, textAlign:'center' }} />
                </div>
              </div>
            </div>
          </Kart>

          <Kart>
            <div style={{ fontSize:13, fontWeight:600, marginBottom:'1rem' }}>🔀 Soru Kaynağı Dağılımı</div>
            <div style={{ display:'flex', flexDirection:'column', gap:6, marginBottom:16 }}>
              {[['dokuman','Sadece Döküman'],['havuz','Sadece Havuz'],['ai','Sadece AI'],['hibrit','Hibrit (Hepsi)']].map(([k,l]) => (
                <label key={k} style={{
                  display:'flex', alignItems:'center', gap:10, padding:'0.55rem 0.8rem',
                  borderRadius:6, cursor:'pointer',
                  background: kaynakModu===k ? 'var(--accent-dim)' : 'var(--surface2)',
                  border:`1px solid ${kaynakModu===k ? 'var(--accent)' : 'var(--border)'}`,
                }}>
                  <input type="radio" value={k} checked={kaynakModu===k} onChange={() => setKaynakModu(k)} style={{ accentColor:'var(--accent)' }} />
                  <span style={{ fontSize:13, fontWeight: kaynakModu===k ? 600 : 400 }}>{l}</span>
                </label>
              ))}
            </div>

            {kaynakModu === 'hibrit' && (
              <div style={{ background:'var(--surface2)', borderRadius:8, padding:'1rem' }}>
                <Lbl>Hibrit Oran Ayarı</Lbl>
                {[
                  ['📄 Döküman', dokOran, setDokOran, '#6366f1'],
                  ['🗃️ Soru Havuzu', havuzOran, setHavuzOran, '#f59e0b'],
                  ['🤖 AI Üretimi', aiOran, setAiOran, '#22c55e'],
                ].map(([label, val, setter, color]) => (
                  <div key={label} style={{ marginBottom:10 }}>
                    <div style={{ display:'flex', justifyContent:'space-between', fontSize:12, marginBottom:4 }}>
                      <span>{label}</span><span style={{ fontWeight:700, color }}>{val}%</span>
                    </div>
                    <input type="range" min={0} max={100} value={val} onChange={e => setter(+e.target.value)}
                      style={{ width:'100%', accentColor:color }} />
                  </div>
                ))}
                <div style={{ fontSize:11, color: Math.abs(dokOran+havuzOran+aiOran-100) < 1 ? '#22c55e' : '#ef4444' }}>
                  Toplam: {dokOran+havuzOran+aiOran}% {Math.abs(dokOran+havuzOran+aiOran-100) < 1 ? '✓' : '⚠ 100 olmalı'}
                </div>
              </div>
            )}
          </Kart>

          <div style={{ gridColumn:'1/-1', display:'flex', justifyContent:'space-between' }}>
            <button onClick={() => setAdim(1)} style={{ padding:'0.65rem 1.5rem', borderRadius:8, border:'1px solid var(--border)', background:'var(--surface2)', color:'var(--text)', fontSize:13, cursor:'pointer' }}>← Geri</button>
            <button onClick={() => { setAdim(3); projeOlusturVeUret({}); }} style={{
              padding:'0.65rem 2rem', borderRadius:8, border:'none',
              background:'linear-gradient(135deg,#6366f1,#8b5cf6)',
              color:'#fff', fontSize:13, fontWeight:700, cursor:'pointer',
            }}>✦ Testi Üret →</button>
          </div>
        </div>
      )}

      {/* ── ADIM 3: Üretim & Önizleme ── */}
      {adim === 3 && (
        <div>
          {!uretildi ? (
            <Kart style={{ textAlign:'center', padding:'3rem' }}>
              <div style={{ fontSize:48, marginBottom:12 }}>
                {uretimDurum.startsWith('❌') || uretimDurum.startsWith('⚠️') ? '⚠️' : '⚙️'}
              </div>
              <div style={{ fontSize:16, fontWeight:700, marginBottom:8 }}>
                {uretimDurum.startsWith('❌') ? 'Hata Oluştu' : uretimDurum.startsWith('⚠️') ? 'Dikkat' : 'Test Üretiliyor...'}
              </div>
              <div style={{ fontSize:13, color:'var(--muted)', marginBottom:16, maxWidth:480, margin:'0 auto 16px' }}>{uretimDurum}</div>
              {!uretimDurum.startsWith('❌') && !uretimDurum.startsWith('⚠️') && (
                <div style={{ maxWidth:400, margin:'0 auto 16px' }}>
                  <div style={{ height:6, background:'var(--surface2)', borderRadius:3, overflow:'hidden' }}>
                    <div style={{ height:'100%', background:'var(--accent)', borderRadius:3, animation:'progressAnim 2s ease-in-out infinite' }} />
                  </div>
                  <div style={{ fontSize:11, color:'var(--muted)', marginTop:8 }}>
                    Bu işlem soru sayısına göre 1-3 dakika sürebilir ☕
                  </div>
                </div>
              )}
              <button onClick={() => { setAdim(0); yukleProjeListesi(); }} style={{
                marginTop:12, padding:'0.5rem 1.5rem', borderRadius:8,
                border:'1px solid var(--border)', background:'var(--surface2)',
                color:'var(--text)', fontSize:12, cursor:'pointer',
              }}>← Listeye Dön</button>
              <style>{`@keyframes progressAnim { 0%{width:0%} 50%{width:80%} 100%{width:95%} }`}</style>
            </Kart>
          ) : (
            <div>
              <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:12 }}>
                <div style={{ display:'flex', alignItems:'center', gap:10 }}>
                  <span style={{ fontSize:18 }}>✅</span>
                  <div>
                    <div style={{ fontSize:14, fontWeight:700 }}>{sorularOnizle.length} soru üretildi</div>
                    <div style={{ fontSize:12, color:'var(--muted)' }}>
                      📄 {sorularOnizle.filter(s=>s.kaynak==='dokuman').length} döküman ·
                      🗃️ {sorularOnizle.filter(s=>s.kaynak==='havuz').length} havuz ·
                      🤖 {sorularOnizle.filter(s=>s.kaynak==='ai').length} AI
                    </div>
                  </div>
                </div>
                <div style={{ display:'flex', gap:8 }}>
                  <button onClick={() => setAdim(0)} style={{ padding:'0.45rem 1rem', borderRadius:6, border:'1px solid var(--border)', background:'var(--surface2)', color:'var(--text)', fontSize:12, cursor:'pointer' }}>← Başa Dön</button>
                  <button onClick={async () => {
                    const projeler2 = await fetch(`${API}/api/testler/proje`, { headers: authH() }).then(r=>r.json());
                    const son = projeler2[0];
                    if (son) { setSecilenProje(son); setMod('aday_giris'); }
                  }} style={{ padding:'0.45rem 1.25rem', borderRadius:6, border:'none', background:'#22c55e', color:'#fff', fontSize:12, fontWeight:700, cursor:'pointer' }}>
                    ▶ Testi Başlat
                  </button>
                </div>
              </div>
              <div>
                {sorularOnizle.map((s, i) => (
                  <SoruKarti key={i} soru={s} index={i} showAnswer={true} />
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
