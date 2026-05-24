import { useState, useEffect, useRef } from 'react';

const API = import.meta.env.VITE_API_URL || '';

/* ─── Yardımcı bileşenler ──────────────────────────────────── */
function Kart({ children, style }) {
  return (
    <div style={{
      background: '#fff', border: '1px solid #e5e7eb',
      borderRadius: 14, padding: '1.5rem', ...style,
    }}>{children}</div>
  );
}
function Lbl({ children }) {
  return (
    <div style={{ fontSize: 11, textTransform: 'uppercase', letterSpacing: '0.06em', color: '#6b7280', marginBottom: 6 }}>
      {children}
    </div>
  );
}
function Pbar({ value, color = '#6366f1' }) {
  return (
    <div style={{ height: 8, background: '#f3f4f6', borderRadius: 4, overflow: 'hidden' }}>
      <div style={{ height: '100%', width: `${Math.min(100, value)}%`, background: color, borderRadius: 4, transition: 'width 0.4s' }} />
    </div>
  );
}

/* ─── Soru kartı ───────────────────────────────────────────── */
function SoruKarti({ soru, index, cevap, onCevap, showAnswer }) {
  return (
    <div style={{ background: '#f9fafb', border: '1px solid #e5e7eb', borderRadius: 10, padding: '1rem 1.25rem', marginBottom: 10 }}>
      <div style={{ display: 'flex', gap: 10, marginBottom: '0.75rem' }}>
        <span style={{
          flexShrink: 0, width: 26, height: 26, borderRadius: '50%',
          background: '#e0e7ff', color: '#6366f1',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          fontSize: 12, fontWeight: 700,
        }}>{index + 1}</span>
        <div style={{ flex: 1 }}>
          <div style={{ display: 'flex', gap: 6, marginBottom: 4, flexWrap: 'wrap' }}>
            <span style={{
              fontSize: 10, padding: '1px 7px', borderRadius: 10, fontWeight: 600,
              background: soru.zorluk === 'kolay' ? 'rgba(34,197,94,0.15)' : soru.zorluk === 'zor' ? 'rgba(239,68,68,0.15)' : 'rgba(251,191,36,0.15)',
              color: soru.zorluk === 'kolay' ? '#16a34a' : soru.zorluk === 'zor' ? '#dc2626' : '#d97706',
            }}>{soru.zorluk || 'orta'}</span>
            <span style={{ fontSize: 10, color: '#9ca3af' }}>{soru.puan_degeri} puan</span>
          </div>
          <p style={{ margin: 0, fontSize: 14, lineHeight: 1.65, fontWeight: 500, color: '#111827' }}>{soru.soru_metni}</p>
        </div>
      </div>

      {soru.soru_tipi === 'cok_secmeli' && soru.secenekler?.length > 0 && (
        <div style={{ paddingLeft: 36, display: 'flex', flexDirection: 'column', gap: 5 }}>
          {soru.secenekler.map(s => {
            const dogruMu  = showAnswer && s.harf === soru.dogru_cevap;
            const secildi  = cevap === s.harf;
            const yanlismi = showAnswer && secildi && !dogruMu;
            return (
              <label key={s.harf} style={{
                display: 'flex', alignItems: 'center', gap: 8, padding: '0.45rem 0.7rem',
                borderRadius: 7, cursor: showAnswer ? 'default' : 'pointer',
                background: dogruMu ? 'rgba(34,197,94,0.1)' : yanlismi ? 'rgba(239,68,68,0.1)' : secildi ? '#eef2ff' : 'transparent',
                border: `1px solid ${dogruMu ? '#22c55e' : yanlismi ? '#ef4444' : secildi ? '#6366f1' : 'transparent'}`,
              }}>
                <input type="radio" name={`q${soru.id}`} value={s.harf}
                  checked={secildi} onChange={() => !showAnswer && onCevap?.(soru.id, s.harf)}
                  style={{ accentColor: '#6366f1' }} />
                <span style={{ fontSize: 13 }}><strong>{s.harf})</strong> {s.metin}</span>
                {dogruMu && <span style={{ marginLeft: 'auto', color: '#22c55e', fontSize: 13 }}>✓</span>}
              </label>
            );
          })}
        </div>
      )}
      {soru.soru_tipi === 'dogru_yanlis' && (
        <div style={{ paddingLeft: 36, display: 'flex', gap: 8 }}>
          {['Doğru', 'Yanlış'].map(opt => {
            const secildi  = cevap === opt;
            const dogruMu  = showAnswer && soru.dogru_cevap === opt;
            const yanlismi = showAnswer && secildi && !dogruMu;
            return (
              <label key={opt} style={{
                display: 'flex', alignItems: 'center', gap: 7, padding: '0.4rem 1rem',
                borderRadius: 7, cursor: showAnswer ? 'default' : 'pointer',
                background: dogruMu ? 'rgba(34,197,94,0.1)' : yanlismi ? 'rgba(239,68,68,0.1)' : secildi ? '#eef2ff' : '#f9fafb',
                border: `1px solid ${dogruMu ? '#22c55e' : yanlismi ? '#ef4444' : secildi ? '#6366f1' : '#e5e7eb'}`,
              }}>
                <input type="radio" name={`q${soru.id}`} value={opt}
                  checked={secildi} onChange={() => !showAnswer && onCevap?.(soru.id, opt)}
                  style={{ accentColor: '#6366f1' }} />
                <span style={{ fontSize: 13, fontWeight: 600 }}>{opt}</span>
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
          placeholder="Cevabınızı buraya yazın..."
          rows={3}
          style={{ width: '100%', marginLeft: 36, resize: 'vertical', fontSize: 13, borderRadius: 7, border: '1px solid #e5e7eb', padding: '0.5rem', boxSizing: 'border-box' }}
        />
      )}
      {showAnswer && soru.aciklama && (
        <div style={{ marginTop: 8, marginLeft: 36, padding: '0.5rem 0.75rem', background: 'rgba(99,102,241,0.08)', border: '1px solid rgba(99,102,241,0.2)', borderRadius: 6, fontSize: 12, color: '#6366f1' }}>
          💡 {soru.aciklama}
        </div>
      )}
    </div>
  );
}

/* ─── Aday kayıt formu ─────────────────────────────────────── */
function AdayGiris({ proje, onBaslat }) {
  const params = new URLSearchParams(window.location.search);
  const [ad, setAd]         = useState(decodeURIComponent(params.get('aday') || '').split(' ')[0] || '');
  const [soyad, setSoyad]   = useState(decodeURIComponent(params.get('aday') || '').split(' ').slice(1).join(' ') || '');
  const [eposta, setEposta] = useState('');
  const [pozisyon, setPozisyon] = useState('');
  const [sirket, setSirket] = useState('');
  const [imza, setImza]     = useState(false);
  const [hata, setHata]     = useState('');
  const [yukleniyor, setYukleniyor] = useState(false);

  async function handleBaslat(e) {
    e.preventDefault();
    if (!imza) { setHata('Kimlik onayı zorunludur'); return; }
    setHata(''); setYukleniyor(true);
    try {
      const res = await fetch(`${API}/api/testler/oturum`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ proje_id: proje.id, aday_ad: ad, aday_soyad: soyad, aday_eposta: eposta, aday_pozisyon: pozisyon, aday_sirket: sirket, imza_onay: imza }),
      });
      const data = await res.json();
      if (!res.ok) { setHata(data.hata || 'Hata oluştu'); return; }
      onBaslat(data);
    } catch (e) { setHata(e.message); }
    finally { setYukleniyor(false); }
  }

  return (
    <div style={{ maxWidth: 560, margin: '0 auto', padding: '2rem 1rem' }}>
      <Kart>
        <div style={{ textAlign: 'center', marginBottom: '1.75rem' }}>
          <div style={{ fontSize: 42, marginBottom: 10 }}>📝</div>
          <h2 style={{ fontSize: '1.15rem', fontWeight: 800, margin: '0 0 6px', color: '#111827' }}>{proje.ad}</h2>
          <div style={{ display: 'flex', justifyContent: 'center', gap: 18, fontSize: 12, color: '#6b7280' }}>
            <span>⏱ {proje.sure_dakika} dakika</span>
            <span>❓ {proje.soru_sayisi} soru</span>
            <span>📊 {proje.zorluk}</span>
            {proje.pozisyon_adi && <span>💼 {proje.pozisyon_adi}</span>}
          </div>
        </div>

        <form onSubmit={handleBaslat}>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 12 }}>
            <div><Lbl>Ad *</Lbl><input value={ad} onChange={e => setAd(e.target.value)} required style={{ width: '100%', padding: '0.5rem 0.75rem', borderRadius: 8, border: '1px solid #e5e7eb', fontSize: 14 }} /></div>
            <div><Lbl>Soyad *</Lbl><input value={soyad} onChange={e => setSoyad(e.target.value)} required style={{ width: '100%', padding: '0.5rem 0.75rem', borderRadius: 8, border: '1px solid #e5e7eb', fontSize: 14 }} /></div>
            <div><Lbl>E-posta</Lbl><input type="email" value={eposta} onChange={e => setEposta(e.target.value)} style={{ width: '100%', padding: '0.5rem 0.75rem', borderRadius: 8, border: '1px solid #e5e7eb', fontSize: 14 }} /></div>
            <div><Lbl>Pozisyon</Lbl><input value={pozisyon} onChange={e => setPozisyon(e.target.value)} placeholder="Başvurduğunuz pozisyon" style={{ width: '100%', padding: '0.5rem 0.75rem', borderRadius: 8, border: '1px solid #e5e7eb', fontSize: 14 }} /></div>
            <div style={{ gridColumn: '1/-1' }}><Lbl>Şirket / Kurum</Lbl><input value={sirket} onChange={e => setSirket(e.target.value)} style={{ width: '100%', padding: '0.5rem 0.75rem', borderRadius: 8, border: '1px solid #e5e7eb', fontSize: 14 }} /></div>
          </div>

          <div style={{ padding: '0.75rem 1rem', background: '#f0f0ff', border: '1px solid #c7d2fe', borderRadius: 9, marginBottom: 14 }}>
            <label style={{ display: 'flex', alignItems: 'flex-start', gap: 10, cursor: 'pointer' }}>
              <input type="checkbox" checked={imza} onChange={e => setImza(e.target.checked)} style={{ marginTop: 3, accentColor: '#6366f1', flexShrink: 0 }} />
              <span style={{ fontSize: 12, lineHeight: 1.65, color: '#374151' }}>
                <strong>{ad || 'Ad'} {soyad || 'Soyad'}</strong> olarak bu testi bizzat çözeceğimi beyan ederek <strong>kimliğimi onaylıyorum.</strong>{' '}
                Test sonuçlarının ilgili birimlerle paylaşılmasına izin veriyorum.
              </span>
            </label>
          </div>

          {hata && <div style={{ color: '#dc2626', fontSize: 12, marginBottom: 10 }}>{hata}</div>}

          <button type="submit" disabled={!ad || !soyad || !imza || yukleniyor} style={{
            width: '100%', padding: '0.75rem', border: 'none', borderRadius: 9,
            background: (!ad || !soyad || !imza) ? '#e5e7eb' : '#6366f1',
            color: (!ad || !soyad || !imza) ? '#9ca3af' : '#fff',
            fontSize: 15, fontWeight: 700, cursor: (!ad || !soyad || !imza || yukleniyor) ? 'not-allowed' : 'pointer',
          }}>
            {yukleniyor ? 'Başlatılıyor...' : '▶ Teste Başla'}
          </button>
        </form>
      </Kart>
    </div>
  );
}

/* ─── Test çözme ekranı ────────────────────────────────────── */
function TestEkrani({ oturumData, onBitis }) {
  const { oturum_id, sorular = [], sure_dakika } = oturumData;
  const [cevaplar, setCevaplar]       = useState({});
  const [kalanSaniye, setKalanSaniye] = useState(sure_dakika * 60);
  const [aktifSoru, setAktifSoru]     = useState(0);
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
  const azKaldi = kalanSaniye <= 300;
  const cevaplanan = Object.keys(cevaplar).length;

  function handleCevap(soruId, deger) {
    setCevaplar(prev => ({ ...prev, [soruId]: deger }));
  }

  async function bitir() {
    if (gonderiliyor) return;
    setGonderiliyor(true);
    const cevapListesi = sorular.map(s => ({ soru_id: s.id, verilen_cevap: cevaplar[s.id] || '' }));
    try {
      const res = await fetch(`${API}/api/testler/oturum/${oturum_id}/bitir`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ cevaplar: cevapListesi }),
      });
      const skor = await res.json();
      onBitis({ oturum_id, skor, sorular, cevaplar });
    } catch (e) { alert(e.message); }
    finally { setGonderiliyor(false); }
  }

  return (
    <div style={{ display: 'grid', gridTemplateColumns: '220px 1fr', gap: 16, maxWidth: 960, margin: '0 auto', padding: '1.5rem 1rem' }}>
      {/* Sidebar */}
      <div style={{ position: 'sticky', top: 16, alignSelf: 'start' }}>
        <Kart style={{ marginBottom: 10, textAlign: 'center' }}>
          <div style={{ fontSize: '2.2rem', fontWeight: 800, color: azKaldi ? '#ef4444' : '#6366f1', fontVariantNumeric: 'tabular-nums' }}>
            {String(dk).padStart(2, '0')}:{String(sn).padStart(2, '0')}
          </div>
          <div style={{ fontSize: 11, color: '#6b7280', marginTop: 2 }}>Kalan Süre</div>
          {azKaldi && <div style={{ fontSize: 11, color: '#ef4444', marginTop: 4 }}>⚠ Süreniz dolmak üzere!</div>}
        </Kart>

        <Kart style={{ marginBottom: 10 }}>
          <div style={{ fontSize: 11, textTransform: 'uppercase', letterSpacing: '0.06em', color: '#6b7280', marginBottom: 6 }}>İlerleme</div>
          <Pbar value={(cevaplanan / sorular.length) * 100} />
          <div style={{ fontSize: 12, color: '#6b7280', marginTop: 4 }}>{cevaplanan}/{sorular.length} cevaplandı</div>
        </Kart>

        <Kart>
          <div style={{ fontSize: 11, textTransform: 'uppercase', letterSpacing: '0.06em', color: '#6b7280', marginBottom: 8 }}>Sorular</div>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4 }}>
            {sorular.map((s, i) => (
              <button key={s.id} onClick={() => setAktifSoru(i)} style={{
                width: 28, height: 28, borderRadius: 6, fontSize: 11, fontWeight: 600,
                border: `1px solid ${cevaplar[s.id] ? '#6366f1' : '#e5e7eb'}`,
                background: i === aktifSoru ? '#6366f1' : cevaplar[s.id] ? '#e0e7ff' : '#f9fafb',
                color: i === aktifSoru ? '#fff' : cevaplar[s.id] ? '#6366f1' : '#6b7280',
                cursor: 'pointer',
              }}>{i + 1}</button>
            ))}
          </div>
        </Kart>
      </div>

      {/* Soru içeriği */}
      <div>
        {sorular[aktifSoru] && (
          <Kart style={{ marginBottom: 12 }}>
            <SoruKarti
              soru={sorular[aktifSoru]} index={aktifSoru}
              cevap={cevaplar[sorular[aktifSoru].id]}
              onCevap={handleCevap}
              showAnswer={false}
            />
            <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 10 }}>
              <button onClick={() => setAktifSoru(i => Math.max(0, i - 1))} disabled={aktifSoru === 0}
                style={{ padding: '0.45rem 1rem', borderRadius: 7, border: '1px solid #e5e7eb', background: '#f9fafb', color: '#374151', fontSize: 13, cursor: 'pointer' }}>
                ← Önceki
              </button>
              {aktifSoru < sorular.length - 1 ? (
                <button onClick={() => setAktifSoru(i => i + 1)}
                  style={{ padding: '0.45rem 1.1rem', borderRadius: 7, border: 'none', background: '#6366f1', color: '#fff', fontSize: 13, fontWeight: 600, cursor: 'pointer' }}>
                  Sonraki →
                </button>
              ) : (
                <button onClick={bitir} disabled={gonderiliyor} style={{
                  padding: '0.45rem 1.25rem', borderRadius: 7, border: 'none',
                  background: gonderiliyor ? '#9ca3af' : '#22c55e', color: '#fff', fontSize: 13, fontWeight: 700, cursor: 'pointer',
                }}>
                  {gonderiliyor ? 'Gönderiliyor...' : '✓ Testi Bitir'}
                </button>
              )}
            </div>
          </Kart>
        )}
        <div style={{ textAlign: 'center' }}>
          <button onClick={bitir} disabled={gonderiliyor} style={{
            padding: '0.55rem 2rem', borderRadius: 8, border: 'none',
            background: gonderiliyor ? '#9ca3af' : '#ef4444', color: '#fff', fontSize: 13, fontWeight: 600, cursor: 'pointer',
          }}>
            {gonderiliyor ? 'Gönderiliyor...' : '⏹ Testi Erken Bitir'}
          </button>
        </div>
      </div>
    </div>
  );
}

/* ─── Sonuç raporu ─────────────────────────────────────────── */
function SonucRaporu({ sonuc, proje }) {
  const { oturum_id, skor, sorular, cevaplar } = sonuc;
  const [showCevaplar, setShowCevaplar] = useState(false);
  const [raporDetay, setRaporDetay]     = useState(null);
  const [bildirimDurum, setBildirimDurum] = useState(''); // '' | 'gonderildi' | 'hata'

  useEffect(() => {
    // Detaylı raporu al
    fetch(`${API}/api/testler/oturum/${oturum_id}/rapor`)
      .then(r => r.json())
      .then(d => setRaporDetay(d))
      .catch(() => {});

    // Test hazırlayıcıya otomatik bildirim gönder
    fetch(`${API}/api/testler/oturum/${oturum_id}/bildir`, { method: 'POST' })
      .then(r => r.ok ? setBildirimDurum('gonderildi') : setBildirimDurum('hata'))
      .catch(() => setBildirimDurum('hata'));
  }, [oturum_id]);

  const basari = parseFloat(skor.basari_yuzdesi || 0);
  const renk   = basari >= 70 ? '#22c55e' : basari >= 50 ? '#f97316' : '#ef4444';
  const etiket = basari >= 70 ? 'Başarılı ✓' : basari >= 50 ? 'Geçer Notta ⚡' : 'Gelişim Gerekli ⚠';
  const aday   = raporDetay?.oturum;
  const tarih  = new Date().toLocaleString('tr-TR');

  return (
    <div style={{ maxWidth: 720, margin: '0 auto', padding: '2rem 1rem' }}>
      {/* Başlık */}
      <Kart style={{ marginBottom: 12, textAlign: 'center' }}>
        <div style={{ fontSize: 56, marginBottom: 8 }}>{basari >= 70 ? '🏆' : basari >= 50 ? '📊' : '📉'}</div>
        <h2 style={{ fontSize: '1.4rem', fontWeight: 800, margin: '0 0 4px', color: '#111827' }}>{etiket}</h2>
        <div style={{ fontSize: '3rem', fontWeight: 900, color: renk, lineHeight: 1 }}>%{Math.round(basari)}</div>
        <div style={{ fontSize: 13, color: '#6b7280', marginTop: 4 }}>Başarı Oranı</div>

        {bildirimDurum === 'gonderildi' && (
          <div style={{ marginTop: 12, fontSize: 12, color: '#22c55e' }}>
            ✅ Sonuçlarınız değerlendirmeye gönderildi
          </div>
        )}
      </Kart>

      {/* Metrikler */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: 8, marginBottom: 12 }}>
        {[
          { label: 'Doğru', value: skor.dogru_sayisi, renk: '#22c55e' },
          { label: 'Yanlış', value: skor.yanlis_sayisi, renk: '#ef4444' },
          { label: 'Boş', value: skor.bos_sayisi, renk: '#9ca3af' },
          { label: 'Puan', value: `${skor.kazanilan_puan}/${skor.toplam_puan}`, renk: '#6366f1' },
        ].map(m => (
          <Kart key={m.label} style={{ textAlign: 'center', padding: '1rem' }}>
            <div style={{ fontSize: '1.5rem', fontWeight: 800, color: m.renk }}>{m.value}</div>
            <div style={{ fontSize: 11, color: '#6b7280', marginTop: 2 }}>{m.label}</div>
          </Kart>
        ))}
      </div>

      {/* Tamamlama kaydı */}
      <Kart style={{ marginBottom: 12, borderTop: '3px solid #6366f1' }}>
        <div style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em', color: '#6366f1', marginBottom: '1rem' }}>
          📋 Test Tamamlama Kaydı
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, fontSize: 13 }}>
          <div><span style={{ color: '#6b7280' }}>Ad Soyad: </span><strong>{aday?.aday_ad || ''} {aday?.aday_soyad || ''}</strong></div>
          <div><span style={{ color: '#6b7280' }}>Test: </span><strong>{proje?.ad}</strong></div>
          <div><span style={{ color: '#6b7280' }}>Pozisyon: </span><strong>{aday?.aday_pozisyon || '-'}</strong></div>
          <div><span style={{ color: '#6b7280' }}>Tarih: </span><strong>{tarih}</strong></div>
          {skor.sure_saniye && (
            <div><span style={{ color: '#6b7280' }}>Süre: </span><strong>{Math.floor(skor.sure_saniye / 60)} dk {skor.sure_saniye % 60} sn</strong></div>
          )}
        </div>
        <div style={{ marginTop: '1rem', padding: '0.6rem 1rem', background: 'rgba(34,197,94,0.08)', border: '1px solid rgba(34,197,94,0.2)', borderRadius: 6, fontSize: 12, color: '#16a34a' }}>
          ✓ {aday?.aday_ad || ''} {aday?.aday_soyad || ''} tarafından {tarih} tarihinde dijital olarak onaylanmıştır.
        </div>
      </Kart>

      <div style={{ textAlign: 'center', marginBottom: 16 }}>
        <button onClick={() => setShowCevaplar(v => !v)} style={{
          padding: '0.6rem 1.5rem', borderRadius: 8, border: '1px solid #e5e7eb',
          background: '#f9fafb', color: '#374151', fontSize: 13, fontWeight: 600, cursor: 'pointer',
        }}>
          {showCevaplar ? '▲ Cevapları Gizle' : '▼ Cevap Anahtarını Göster'}
        </button>
      </div>

      {showCevaplar && raporDetay?.detay && raporDetay.detay.map((s, i) => (
        <SoruKarti key={s.soru_no} soru={s} index={i} cevap={s.verilen_cevap} showAnswer={true} />
      ))}
    </div>
  );
}

/* ─── Ana sayfa ────────────────────────────────────────────── */
export default function TestCoz() {
  const params  = new URLSearchParams(window.location.search);
  const projeId = params.get('proje');

  const [proje, setProje]         = useState(null);
  const [hata, setHata]           = useState('');
  const [mod, setMod]             = useState('giris'); // 'giris' | 'cozuyor' | 'sonuc'
  const [oturumData, setOturumData] = useState(null);
  const [sonuc, setSonuc]           = useState(null);

  useEffect(() => {
    if (!projeId) { setHata('Geçersiz test bağlantısı. Lütfen doğru bir link kullanın.'); return; }
    fetch(`${API}/api/testler/proje/${projeId}`)
      .then(r => r.json())
      .then(d => {
        if (d.hata) setHata(d.hata);
        else if (d.durum !== 'hazir') setHata('Bu test henüz hazır değil veya süresi dolmuş.');
        else setProje(d);
      })
      .catch(() => setHata('Test yüklenemedi. İnternet bağlantınızı kontrol edin.'));
  }, [projeId]);

  // Sayfa başlığı
  useEffect(() => {
    if (proje) document.title = proje.ad + ' — Test';
  }, [proje]);

  const sayfaStyle = {
    minHeight: '100vh',
    background: '#f3f4f6',
    fontFamily: "'Segoe UI', Arial, sans-serif",
  };

  const headerStyle = {
    background: '#fff',
    borderBottom: '1px solid #e5e7eb',
    padding: '0.875rem 1.5rem',
    display: 'flex',
    alignItems: 'center',
    gap: 12,
  };

  if (hata) {
    return (
      <div style={sayfaStyle}>
        <div style={headerStyle}>
          <span style={{ fontSize: 20 }}>🧪</span>
          <span style={{ fontWeight: 700, color: '#111827' }}>Değerlendirme Sistemi</span>
        </div>
        <div style={{ maxWidth: 500, margin: '4rem auto', padding: '0 1rem', textAlign: 'center' }}>
          <Kart>
            <div style={{ fontSize: 48, marginBottom: 12 }}>⚠️</div>
            <h2 style={{ fontSize: '1.1rem', fontWeight: 700, color: '#111827', margin: '0 0 8px' }}>Test Açılamadı</h2>
            <p style={{ fontSize: 13, color: '#6b7280', margin: 0 }}>{hata}</p>
          </Kart>
        </div>
      </div>
    );
  }

  if (!proje) {
    return (
      <div style={sayfaStyle}>
        <div style={headerStyle}>
          <span style={{ fontSize: 20 }}>🧪</span>
          <span style={{ fontWeight: 700, color: '#111827' }}>Değerlendirme Sistemi</span>
        </div>
        <div style={{ textAlign: 'center', marginTop: '5rem', color: '#6b7280', fontSize: 14 }}>
          <div style={{ fontSize: 32, marginBottom: 12 }}>⚙️</div>
          Test yükleniyor...
        </div>
      </div>
    );
  }

  return (
    <div style={sayfaStyle}>
      <div style={headerStyle}>
        <span style={{ fontSize: 20 }}>🧪</span>
        <span style={{ fontWeight: 700, color: '#111827' }}>Değerlendirme Sistemi</span>
        {mod === 'cozuyor' && (
          <span style={{ marginLeft: 'auto', fontSize: 12, color: '#6b7280' }}>{proje.ad}</span>
        )}
      </div>

      {mod === 'giris'   && <AdayGiris proje={proje} onBaslat={data => { setOturumData(data); setMod('cozuyor'); }} />}
      {mod === 'cozuyor' && <TestEkrani oturumData={oturumData} onBitis={s => { setSonuc(s); setMod('sonuc'); }} />}
      {mod === 'sonuc'   && <SonucRaporu sonuc={sonuc} proje={proje} />}
    </div>
  );
}
