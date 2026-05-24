import { useState, useEffect } from 'react';
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

  // Belge seçimi
  const [belgeMetin, setBelgeMetin] = useState('');
  const [belgeler, setBelgeler]     = useState([]);
  const [belgelerYuk, setBelgelerYuk] = useState(false);
  const [secilenBelge, setSecilenBelge] = useState(null);

  // Hedef kitle
  const [sektorId, setSektorId]   = useState('');
  const [deptId, setDeptId]       = useState('');
  const [pozId, setPozId]         = useState('');

  // Test parametreleri
  const [projeAd, setProjeAd]       = useState('');
  const [soruSayisi, setSoruSayisi] = useState(null);
  const [zorluk, setZorluk]         = useState('');
  const [sureDakika, setSureDakika] = useState(null);
  const [kaynakModu, setKaynakModu] = useState('hibrit');
  const [dokOran, setDokOran]       = useState(40);
  const [havuzOran, setHavuzOran]   = useState(30);
  const [aiOran, setAiOran]         = useState(30);
  const [soruTipi, setSoruTipi]     = useState('karma');

  // Üretim / Test
  const [projeler, setProjeler]       = useState([]);
  const [aktifProje, setAktifProje]   = useState(null);
  const [uretimDurum, setUretimDurum] = useState('');
  const [uretildi, setUretildi]       = useState(false);
  const [sorularOnizle, setSorularOnizle] = useState([]);

  // Test Çözme
  const [mod, setMod]               = useState('yonetim');
  const [oturumData, setOturumData] = useState(null);
  const [sonuc, setSonuc]           = useState(null);
  const [secilenProje, setSecilenProje] = useState(null);

  // Test Ata modal
  const [testAtaProje, setTestAtaProje]     = useState(null);
  const [ataEmail, setAtaEmail]             = useState('');
  const [ataAd, setAtaAd]                   = useState('');
  const [ataGonderiliyor, setAtaGonderiliyor] = useState(false);
  const [ataKopyalandi, setAtaKopyalandi]   = useState(false);
  const [ataAlicilar, setAtaAlicilar]       = useState([]);

  const [sakliIds, setSakliIds] = useState(() => {
    try { return JSON.parse(localStorage.getItem('sakli_testler') || '[]'); } catch { return []; }
  });

  function saklaToggle(id) {
    setSakliIds(prev => {
      const next = prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id];
      localStorage.setItem('sakli_testler', JSON.stringify(next));
      return next;
    });
  }

  // Cascading queries
  const { data: sektorler = [] } = useQuery({ queryKey:['h-sektorler'], queryFn: getHiyerarsiSektorler });
  const sektorObj = sektorler.find(s => s.id === +sektorId);
  const { data: deptlar = [] } = useQuery({ queryKey:['h-deptlar', sektorId], queryFn: () => getHiyerarsiDeptlar(sektorId), enabled:!!sektorId });
  const { data: pozlar = [] } = useQuery({ queryKey:['h-pozlar', deptId], queryFn: () => getHiyerarsiPozisyonlar(deptId), enabled:!!deptId });

  useEffect(() => { yukleProjeListesi(); yukleBelgeler(); }, []);

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

  async function belgeSil(belge) {
    if (!confirm(`"${belge.ai_konu || belge.orijinal_ad}" belgesini silmek istediğinize emin misiniz?`)) return;
    await fetch(`${API}/api/belgeler/${belge.id}`, { method: 'DELETE', headers: authH() });
    if (secilenBelge?.id === belge.id) { setSecilenBelge(null); setBelgeMetin(''); }
    await yukleBelgeler();
  }

  async function secBelge(belge) {
    if (secilenBelge?.id === belge.id) {
      setSecilenBelge(null); setBelgeMetin('');
      if (kaynakModu === 'hibrit' || kaynakModu === 'dokuman') setKaynakModu('ai');
      return;
    }
    setSecilenBelge(belge);
    try {
      const res = await fetch(`${API}/api/belgeler/${belge.id}`, { headers: authH() });
      const data = await res.json();
      setBelgeMetin(data.icerik || data.ai_makale || '');
      setProjeAd(((data.ai_konu || data.orijinal_ad || '').slice(0, 55)) + ' Testi');
      setKaynakModu('hibrit');
    } catch(e) {}
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
          if (line.startsWith(':')) continue;
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
        setTimeout(() => setAdim(0), 3000);
      }
    } catch(e) {
      setUretimDurum('❌ Soru üretimi başarısız: ' + e.message);
      await yukleProjeListesi();
      setTimeout(() => setAdim(0), 3000);
    } finally {
      await yukleProjeListesi();
    }
  }

  /* ── Test Ata yardımcıları ─────────────────────────── */
  function openAtaModal(proje) {
    setTestAtaProje(proje);
    setAtaEmail(''); setAtaAd('');
    setAtaGonderiliyor(false); setAtaKopyalandi(false);
    setAtaAlicilar([]);
  }

  function getAtaLink(projeId) {
    return `${window.location.origin}/test?proje=${projeId}`;
  }

  async function kopyalaAtaLink() {
    await navigator.clipboard.writeText(getAtaLink(testAtaProje?.id));
    setAtaKopyalandi(true);
    setTimeout(() => setAtaKopyalandi(false), 2000);
  }

  function aliciEkle() {
    const eposta = ataEmail.trim();
    const ad     = ataAd.trim() || 'Aday';
    if (!eposta) { alert('E-posta adresi zorunlu'); return; }
    if (ataAlicilar.some(a => a.eposta === eposta)) { alert('Bu e-posta zaten listede'); return; }
    setAtaAlicilar(prev => [...prev, { ad, eposta, durum: 'bekliyor' }]);
    setAtaEmail(''); setAtaAd('');
  }

  function aliciSil(eposta) {
    setAtaAlicilar(prev => prev.filter(a => a.eposta !== eposta));
  }

  async function tekGonder(alici) {
    setAtaAlicilar(prev => prev.map(a => a.eposta === alici.eposta ? { ...a, durum: 'gonderiyor' } : a));
    try {
      const t = localStorage.getItem('token');
      const r = await fetch(`${API}/api/testler/davet`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...(t ? { Authorization: `Bearer ${t}` } : {}) },
        body: JSON.stringify({
          proje_id:    testAtaProje?.id,
          aday_ad:     alici.ad,
          aday_eposta: alici.eposta,
          pozisyon:    testAtaProje?.pozisyon_adi || '',
          test_linki:  getAtaLink(testAtaProje?.id),
        }),
      });
      if (!r.ok) { const e = await r.json(); throw new Error(e.hata || 'Gönderilemedi'); }
      setAtaAlicilar(prev => prev.map(a => a.eposta === alici.eposta ? { ...a, durum: 'gonderildi' } : a));
    } catch(e) {
      setAtaAlicilar(prev => prev.map(a => a.eposta === alici.eposta ? { ...a, durum: 'hata', hataMsg: e.message } : a));
    }
  }

  async function tumunuGonder() {
    const bekleyenler = ataAlicilar.filter(a => a.durum === 'bekliyor' || a.durum === 'hata');
    for (const alici of bekleyenler) {
      await tekGonder(alici);
    }
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
          display:'flex', alignItems:'center', justifyContent:'center', padding:'1rem' }}
          onClick={() => setTestAtaProje(null)}>
          <div style={{ background:'var(--surface)', borderRadius:14, padding:'1.75rem',
            maxWidth:560, width:'100%', boxShadow:'0 20px 60px rgba(0,0,0,0.4)',
            maxHeight:'90vh', overflowY:'auto' }}
            onClick={e => e.stopPropagation()}>

            {/* Başlık */}
            <div style={{ display:'flex', alignItems:'flex-start', justifyContent:'space-between', marginBottom:'1.25rem' }}>
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

            {/* QR Kod + Link yan yana */}
            <div style={{ display:'grid', gridTemplateColumns:'auto 1fr', gap:16, alignItems:'center', marginBottom:'1.25rem' }}>
              {/* QR */}
              <div style={{ textAlign:'center' }}>
                <img
                  src={`https://api.qrserver.com/v1/create-qr-code/?size=130x130&data=${encodeURIComponent(getAtaLink(testAtaProje.id))}`}
                  alt="QR Kod"
                  style={{ width:130, height:130, borderRadius:8, border:'1px solid var(--border)' }}
                />
                <button onClick={async () => {
                  const url = `https://api.qrserver.com/v1/create-qr-code/?size=400x400&data=${encodeURIComponent(getAtaLink(testAtaProje.id))}`;
                  const res = await fetch(url);
                  const blob = await res.blob();
                  const a = document.createElement('a');
                  a.href = URL.createObjectURL(blob);
                  a.download = `test-qr-${testAtaProje.id}.png`;
                  a.click();
                }} style={{
                  marginTop:6, display:'block', width:'100%', padding:'0.3rem 0',
                  borderRadius:6, border:'1px solid var(--border)', background:'var(--surface2)',
                  color:'var(--muted)', fontSize:10, fontWeight:700, cursor:'pointer',
                }}>⬇ QR İndir</button>
              </div>

              {/* Link + kopyala + WhatsApp */}
              <div>
                <div style={{ fontSize:11, textTransform:'uppercase', letterSpacing:'0.06em', color:'var(--muted)', marginBottom:6 }}>Test Bağlantısı</div>
                <div style={{ display:'flex', gap:6, marginBottom:8 }}>
                  <input readOnly value={getAtaLink(testAtaProje.id)}
                    style={{ flex:1, fontSize:11, color:'var(--muted)', background:'var(--surface2)' }}
                    onClick={e => e.target.select()}
                  />
                  <button onClick={kopyalaAtaLink} style={{
                    padding:'0.4rem 0.75rem', borderRadius:6, border:'none', flexShrink:0,
                    background: ataKopyalandi ? '#22c55e' : 'var(--surface2)',
                    color: ataKopyalandi ? '#fff' : 'var(--text)',
                    fontSize:12, fontWeight:600, cursor:'pointer',
                  }}>{ataKopyalandi ? '✓' : '📋'}</button>
                </div>
                {/* WhatsApp paylaş */}
                <button onClick={() => {
                  const metin = `${testAtaProje.ad} — Yetkinlik değerlendirme testine davet edildiniz.\n\nTeste başlamak için:\n${getAtaLink(testAtaProje.id)}`;
                  window.open(`https://wa.me/?text=${encodeURIComponent(metin)}`, '_blank');
                }} style={{
                  display:'flex', alignItems:'center', justifyContent:'center', gap:6,
                  width:'100%', padding:'0.45rem 0', borderRadius:7, border:'none',
                  background:'#25d366', color:'#fff', fontSize:12, fontWeight:700, cursor:'pointer', marginBottom:8,
                }}>
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
                    <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/>
                  </svg>
                  WhatsApp'ta Paylaş
                </button>
                <div style={{ fontSize:11, color:'var(--muted)', lineHeight:1.5 }}>
                  Adaylar bu linki açarak veya QR kodu tarayarak teste başlayabilir.
                </div>
              </div>
            </div>

            <div style={{ borderTop:'1px dashed var(--border)', margin:'1rem 0' }} />

            {/* Alıcı ekle formu */}
            <div style={{ fontSize:12, fontWeight:700, marginBottom:8 }}>📧 Davetiye Gönder</div>
            <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr auto', gap:6, marginBottom:10 }}>
              <input
                placeholder="Ad Soyad"
                value={ataAd}
                onChange={e => setAtaAd(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && aliciEkle()}
                style={{ fontSize:12 }}
              />
              <input
                type="email"
                placeholder="eposta@sirket.com"
                value={ataEmail}
                onChange={e => setAtaEmail(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && aliciEkle()}
                style={{ fontSize:12 }}
              />
              <button onClick={aliciEkle} style={{
                padding:'0.4rem 0.8rem', borderRadius:6, border:'none',
                background:'var(--accent)', color:'#fff', fontSize:12, fontWeight:700, cursor:'pointer', whiteSpace:'nowrap',
              }}>+ Ekle</button>
            </div>

            {/* Alıcı listesi */}
            {ataAlicilar.length > 0 && (
              <div style={{ marginBottom:12 }}>
                <div style={{ display:'flex', flexDirection:'column', gap:5, maxHeight:200, overflowY:'auto' }}>
                  {ataAlicilar.map(a => (
                    <div key={a.eposta} style={{
                      display:'flex', alignItems:'center', gap:8, padding:'0.45rem 0.75rem',
                      borderRadius:7, background:'var(--surface2)', border:'1px solid var(--border)',
                    }}>
                      <div style={{ flex:1, minWidth:0 }}>
                        <div style={{ fontSize:12, fontWeight:600, overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>{a.ad}</div>
                        <div style={{ fontSize:11, color:'var(--muted)', overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>{a.eposta}</div>
                      </div>
                      {a.durum === 'gonderildi' && (
                        <span style={{ fontSize:11, color:'#22c55e', fontWeight:700, flexShrink:0 }}>✓ Gönderildi</span>
                      )}
                      {a.durum === 'gonderiyor' && (
                        <span style={{ fontSize:11, color:'var(--accent)', flexShrink:0 }}>⚙️...</span>
                      )}
                      {a.durum === 'hata' && (
                        <span title={a.hataMsg} style={{ fontSize:11, color:'#ef4444', fontWeight:700, flexShrink:0, cursor:'help' }}>✗ Hata</span>
                      )}
                      {(a.durum === 'bekliyor' || a.durum === 'hata') && (
                        <button onClick={() => tekGonder(a)} style={{
                          padding:'0.25rem 0.6rem', borderRadius:5, border:'1px solid var(--accent)',
                          background:'transparent', color:'var(--accent)', fontSize:11, fontWeight:700, cursor:'pointer', flexShrink:0,
                        }}>Gönder</button>
                      )}
                      <button onClick={() => aliciSil(a.eposta)} style={{
                        padding:'0.25rem 0.5rem', borderRadius:5, border:'1px solid #ef4444',
                        background:'transparent', color:'#ef4444', fontSize:11, cursor:'pointer', flexShrink:0,
                      }}>✕</button>
                    </div>
                  ))}
                </div>

                {ataAlicilar.some(a => a.durum === 'bekliyor' || a.durum === 'hata') && (
                  <button onClick={tumunuGonder} style={{
                    marginTop:8, width:'100%', padding:'0.55rem', borderRadius:7, border:'none',
                    background:'var(--accent)', color:'#fff', fontSize:13, fontWeight:700, cursor:'pointer',
                  }}>
                    📧 Tümüne Gönder ({ataAlicilar.filter(a => a.durum === 'bekliyor' || a.durum === 'hata').length} kişi)
                  </button>
                )}
                {ataAlicilar.every(a => a.durum === 'gonderildi') && (
                  <div style={{ marginTop:8, padding:'0.6rem 1rem', background:'rgba(34,197,94,0.12)', border:'1px solid rgba(34,197,94,0.3)', borderRadius:8, textAlign:'center', fontSize:13, fontWeight:700, color:'#22c55e' }}>
                    ✅ Tüm davetler gönderildi!
                  </div>
                )}
              </div>
            )}

            {ataAlicilar.length === 0 && (
              <div style={{ fontSize:11, color:'var(--muted)', textAlign:'center', padding:'0.5rem 0' }}>
                Yukarıdan kişi ekleyip davetiye gönderin.
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

      {/* ── ADIM 0: Ayarla & Seç ── */}
      {adim === 0 && (
        <div style={{ display:'grid', gridTemplateColumns:'1fr 340px', gap:16, alignItems:'start' }}>

          {/* SOL KOLON */}
          <div style={{ display:'flex', flexDirection:'column', gap:16 }}>

            {/* Kart 1: Belgelerimden Seç */}
            <Kart>
              <div style={{ fontSize:13, fontWeight:700, marginBottom:'1rem' }}>📚 Belgelerimden Seç</div>
              {belgelerYuk ? (
                <div style={{ textAlign:'center', padding:'1.5rem', color:'var(--muted)', fontSize:13 }}>Yükleniyor...</div>
              ) : belgeler.length === 0 ? (
                <div style={{ textAlign:'center', padding:'1.5rem', color:'var(--muted)', fontSize:13 }}>
                  Belge Analiz sayfasından belge ekleyin.
                </div>
              ) : (
                <div style={{ maxHeight:200, overflowY:'auto', display:'flex', flexDirection:'column', gap:6 }}>
                  {belgeler.map(b => (
                    <div key={b.id} style={{
                      padding:'0.55rem 0.75rem', borderRadius:8,
                      background: secilenBelge?.id === b.id ? 'var(--accent-dim)' : 'var(--surface2)',
                      border:`1px solid ${secilenBelge?.id === b.id ? 'var(--accent)' : 'var(--border)'}`,
                      display:'flex', alignItems:'center', gap:8,
                    }}>
                      <div style={{ flex:1, minWidth:0 }}>
                        <div style={{ fontSize:12, fontWeight:600, overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>
                          {b.ai_konu || b.orijinal_ad || 'Belge'}
                        </div>
                        <div style={{ fontSize:10, color:'var(--muted)', marginTop:2 }}>
                          {new Date(b.olusturma).toLocaleDateString('tr-TR')}
                        </div>
                      </div>
                      <button onClick={() => secBelge(b)} style={{
                        padding:'0.3rem 0.6rem', borderRadius:6,
                        border:`1px solid ${secilenBelge?.id === b.id ? 'var(--accent)' : 'var(--border)'}`,
                        background: secilenBelge?.id === b.id ? 'var(--accent)' : 'transparent',
                        color: secilenBelge?.id === b.id ? '#fff' : 'var(--muted)',
                        fontSize:11, fontWeight:700, cursor:'pointer', whiteSpace:'nowrap',
                      }}>{secilenBelge?.id === b.id ? '✓ Seçildi' : 'Seç'}</button>
                      <button onClick={() => belgeSil(b)} style={{
                        padding:'0.3rem 0.55rem', borderRadius:6, border:'1px solid #ef4444',
                        background:'transparent', color:'#ef4444', fontSize:11, fontWeight:700, cursor:'pointer',
                      }}>🗑</button>
                    </div>
                  ))}
                </div>
              )}
              {secilenBelge && (
                <div style={{ marginTop:8, padding:'0.5rem 0.75rem', background:'rgba(34,197,94,0.08)', border:'1px solid rgba(34,197,94,0.2)', borderRadius:6, fontSize:12, color:'#22c55e' }}>
                  ✓ <strong>{secilenBelge.ai_konu || secilenBelge.orijinal_ad}</strong> seçildi
                </div>
              )}
            </Kart>

            {/* Kart 2: Hedef Kitle + Test Parametreleri */}
            <Kart>
              <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:24 }}>

                {/* Sol: Hedef Kitle */}
                <div>
                  <div style={{ fontSize:13, fontWeight:700, marginBottom:'1rem' }}>🎯 Hedef Kitle</div>
                  <div style={{ display:'flex', flexDirection:'column', gap:12 }}>
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
                </div>

                {/* Sağ: Test Parametreleri */}
                <div>
                  <div style={{ fontSize:13, fontWeight:700, marginBottom:'1rem' }}>⚙️ Test Parametreleri</div>
                  <div style={{ display:'flex', flexDirection:'column', gap:14 }}>

                    {/* Proje Adı */}
                    <div>
                      <Lbl>Proje Adı <span style={{ fontWeight:400, textTransform:'none', letterSpacing:0 }}>(opsiyonel)</span></Lbl>
                      <input value={projeAd} onChange={e => setProjeAd(e.target.value)}
                        placeholder="Örn: Q3 2025 Yazılım Geliştirici Testi" style={{ width:'100%' }} />
                    </div>

                    {/* Soru Sayısı */}
                    <div>
                      <Lbl>Soru Sayısı</Lbl>
                      <div style={{ display:'flex', gap:5, flexWrap:'wrap', alignItems:'center' }}>
                        {[10,15,20,25,30].map(n => (
                          <Chip key={n} label={String(n)} active={soruSayisi===n} onClick={() => setSoruSayisi(n)} />
                        ))}
                        <input type="number" min={5} max={50} value={soruSayisi || ''}
                          onChange={e => setSoruSayisi(+e.target.value)} style={{ width:55, textAlign:'center' }} />
                      </div>
                    </div>

                    {/* Zorluk */}
                    <div>
                      <Lbl>Zorluk Derecesi</Lbl>
                      <div style={{ display:'flex', gap:5, flexWrap:'wrap' }}>
                        {[['kolay','#22c55e'],['orta','#f59e0b'],['zor','#ef4444'],['karisik','#8b5cf6']].map(([z,c]) => (
                          <Chip key={z} label={z} active={zorluk===z} onClick={() => setZorluk(z)} color={c} />
                        ))}
                      </div>
                    </div>

                    {/* Süre */}
                    <div>
                      <Lbl>Süre Limiti (dakika)</Lbl>
                      <div style={{ display:'flex', gap:5, flexWrap:'wrap', alignItems:'center' }}>
                        {[30,45,60,90].map(n => (
                          <Chip key={n} label={`${n} dk`} active={sureDakika===n} onClick={() => setSureDakika(n)} />
                        ))}
                        <input type="number" min={10} max={180} value={sureDakika || ''}
                          onChange={e => setSureDakika(+e.target.value)} style={{ width:55, textAlign:'center' }} />
                      </div>
                    </div>

                    {/* Soru Türü */}
                    <div>
                      <Lbl>Soru Türü</Lbl>
                      <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:5 }}>
                        {[
                          ['karma','🎲 Karma','Karışık türler','#8b5cf6'],
                          ['cok_secmeli','📝 Çok Seçmeli','A, B, C, D','#6366f1'],
                          ['dogru_yanlis','✅ D/Y','İki seçenek','#f59e0b'],
                          ['acik_uclu','✍️ Açık Uçlu','Yazılı cevap','#22c55e'],
                        ].map(([v,l,desc,c]) => (
                          <button key={v} onClick={() => setSoruTipi(v)} style={{
                            padding:'0.45rem 0.6rem', borderRadius:7, border:`1px solid ${soruTipi===v ? c : 'var(--border)'}`,
                            background: soruTipi===v ? `${c}18` : 'var(--surface2)',
                            cursor:'pointer', textAlign:'left', transition:'all 0.15s',
                          }}>
                            <div style={{ fontSize:11, fontWeight:700, color: soruTipi===v ? c : 'var(--text)' }}>{l}</div>
                            <div style={{ fontSize:10, color:'var(--muted)', marginTop:1 }}>{desc}</div>
                          </button>
                        ))}
                      </div>
                    </div>

                  </div>
                </div>
              </div>
            </Kart>

            {/* Kart 3: Soru Kaynağı */}
            <Kart>
              <div style={{ fontSize:13, fontWeight:700, marginBottom:'1rem' }}>🔀 Soru Kaynağı</div>
              {(!secilenBelge || !belgeMetin) && (
                <div style={{ marginBottom:10, padding:'0.5rem 0.75rem', background:'rgba(251,191,36,0.08)', border:'1px solid rgba(251,191,36,0.25)', borderRadius:6, fontSize:11, color:'#f59e0b' }}>
                  Belge seçilmeden bu seçenekler kullanılamaz: Döküman, Hibrit
                </div>
              )}
              <div style={{ display:'flex', flexDirection:'column', gap:6, marginBottom:16 }}>
                {[
                  ['dokuman','Sadece Döküman'],
                  ['havuz','Sadece Havuz'],
                  ['ai','Sadece AI'],
                  ['hibrit','Hibrit (Hepsi)'],
                ].map(([k,l]) => {
                  const disabled = (k === 'dokuman' || k === 'hibrit') && (!secilenBelge || !belgeMetin);
                  return (
                    <label key={k} style={{
                      display:'flex', alignItems:'center', gap:10, padding:'0.55rem 0.8rem',
                      borderRadius:6, cursor: disabled ? 'not-allowed' : 'pointer',
                      background: kaynakModu===k ? 'var(--accent-dim)' : 'var(--surface2)',
                      border:`1px solid ${kaynakModu===k ? 'var(--accent)' : 'var(--border)'}`,
                      opacity: disabled ? 0.4 : 1,
                      pointerEvents: disabled ? 'none' : 'auto',
                    }}>
                      <input type="radio" value={k} checked={kaynakModu===k}
                        onChange={() => !disabled && setKaynakModu(k)}
                        disabled={disabled}
                        style={{ accentColor:'var(--accent)' }} />
                      <span style={{ fontSize:13, fontWeight: kaynakModu===k ? 600 : 400 }}>{l}</span>
                    </label>
                  );
                })}
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

              {/* Üret Butonu */}
              <div style={{ marginTop:16 }}>
                {(!soruSayisi || !zorluk || !sureDakika) && (
                  <div style={{ marginBottom:8, padding:'0.5rem 0.75rem', background:'rgba(239,68,68,0.08)', border:'1px solid rgba(239,68,68,0.25)', borderRadius:6, fontSize:12, color:'#ef4444' }}>
                    ⚠ Devam etmek için soru sayısı, zorluk ve süre seçin.
                  </div>
                )}
                <button
                  disabled={!soruSayisi || !zorluk || !sureDakika}
                  onClick={() => {
                    if (!soruSayisi || !zorluk || !sureDakika) return;
                    setAdim(1);
                    projeOlusturVeUret({});
                  }}
                  style={{
                    width:'100%', padding:'0.75rem', borderRadius:8, border:'none',
                    background: (!soruSayisi || !zorluk || !sureDakika) ? 'var(--muted)' : 'linear-gradient(135deg,#6366f1,#8b5cf6)',
                    color:'#fff', fontSize:14, fontWeight:700,
                    cursor: (!soruSayisi || !zorluk || !sureDakika) ? 'not-allowed' : 'pointer',
                    transition:'all 0.15s',
                  }}>
                  ✦ Testi Üret
                </button>
              </div>
            </Kart>

          </div>

          {/* SAĞ KOLON — sticky test listesi */}
          <div style={{ position:'sticky', top:16 }}>
            <Kart>
              <div style={{ fontSize:13, fontWeight:700, marginBottom:'1rem' }}>📋 Testler ({projeler.length})</div>
              {projeler.length === 0 ? (
                <div style={{ textAlign:'center', padding:'2rem 1rem', color:'var(--muted)', fontSize:13 }}>
                  Henüz test yok
                </div>
              ) : (
                <div style={{ display:'flex', flexDirection:'column', gap:6 }}>
                  {projeler.map(p => (
                    <div key={p.id} style={{ display:'flex', alignItems:'center', gap:6, padding:'0.55rem 0.65rem', borderRadius:8, background:'var(--surface2)', border:'1px solid var(--border)' }}>
                      <div style={{ flex:1, minWidth:0 }}>
                        <div style={{ fontSize:12, fontWeight:600, overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>{p.ad}</div>
                        <div style={{ fontSize:10, color:'var(--muted)' }}>{p.soru_uretilen}/{p.soru_sayisi} soru · {p.katilimci_sayisi} katılımcı · {p.zorluk} · {p.sure_dakika} dk</div>
                      </div>
                      <span style={{ fontSize:10, padding:'2px 5px', borderRadius:10, flexShrink:0,
                        background: p.durum==='hazir' ? 'rgba(34,197,94,0.15)' : p.durum==='uretiliyor' ? 'rgba(99,102,241,0.15)' : 'rgba(251,191,36,0.15)',
                        color: p.durum==='hazir' ? '#22c55e' : p.durum==='uretiliyor' ? '#6366f1' : '#f59e0b',
                      }}>
                        {p.durum === 'uretiliyor' ? '⚙️ üretiliyor' : p.durum}
                      </span>
                      {p.durum === 'uretiliyor' && (
                        <button onClick={async () => {
                          setAdim(1); setUretimDurum('⚙️ Yeniden üretiliyor...');
                          const uretRes = await fetch(`${API}/api/testler/proje/${p.id}/uret`, { method:'POST', headers: authH() });
                          const reader2 = uretRes.body.getReader(); const dec2 = new TextDecoder();
                          let ok = false;
                          while (true) {
                            const { done, value } = await reader2.read(); if (done) break;
                            for (const line of dec2.decode(value, { stream:true }).split('\n')) {
                              if (line.startsWith(':')) continue;
                              if (!line.startsWith('data: ')) continue;
                              const p2 = line.slice(6).trim();
                              try { const obj = JSON.parse(p2); if (obj.tip === 'bitti') { setSorularOnizle(obj.sorular||[]); setUretildi(true); ok=true; } } catch {}
                            }
                          }
                          await yukleProjeListesi();
                          if (ok) setAdim(1); else setAdim(0);
                        }} style={{ padding:'0.25rem 0.5rem', borderRadius:5, border:'1px solid #6366f1', background:'transparent', color:'#6366f1', fontSize:10, fontWeight:700, cursor:'pointer', flexShrink:0 }}>🔄 Tekrar</button>
                      )}
                      {p.durum !== 'uretiliyor' && (
                        <button onClick={() => openAtaModal(p)} style={{ padding:'0.25rem 0.5rem', borderRadius:5, border:'1px solid var(--accent)', background:'transparent', color:'var(--accent)', fontSize:10, fontWeight:700, cursor:'pointer', flexShrink:0 }}>🧪 Ata</button>
                      )}
                      {p.durum === 'hazir' && (
                        <button onClick={() => { setSecilenProje(p); setMod('aday_giris'); }} style={{ padding:'0.25rem 0.5rem', borderRadius:5, border:'none', background:'var(--accent)', color:'#fff', fontSize:10, fontWeight:700, cursor:'pointer', flexShrink:0 }}>▶</button>
                      )}
                      <button onClick={() => saklaToggle(p.id)} style={{
                        padding:'0.25rem 0.5rem', borderRadius:5,
                        border:`1px solid ${sakliIds.includes(p.id) ? '#f59e0b' : 'var(--border)'}`,
                        background: sakliIds.includes(p.id) ? 'rgba(245,158,11,0.15)' : 'transparent',
                        color: sakliIds.includes(p.id) ? '#f59e0b' : 'var(--muted)',
                        fontSize:10, fontWeight:700, cursor:'pointer', flexShrink:0,
                      }}>{sakliIds.includes(p.id) ? '★' : '☆'}</button>
                      <button onClick={() => projeSil(p)} style={{ padding:'0.25rem 0.5rem', borderRadius:5, border:'1px solid #ef4444', background:'transparent', color:'#ef4444', fontSize:10, fontWeight:700, cursor:'pointer', flexShrink:0 }}>🗑</button>
                    </div>
                  ))}
                </div>
              )}
            </Kart>
          </div>

        </div>
      )}

      {/* ── ADIM 1: Üret & Önizle ── */}
      {adim === 1 && (
        <div>
          <button onClick={() => setAdim(0)} style={{ marginBottom:16, padding:'0.45rem 1rem', borderRadius:6, border:'1px solid var(--border)', background:'var(--surface2)', color:'var(--text)', fontSize:13, cursor:'pointer' }}>
            ← Geri
          </button>

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
