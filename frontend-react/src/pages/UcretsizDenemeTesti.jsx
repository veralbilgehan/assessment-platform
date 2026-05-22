import { useState, useRef, useEffect } from 'react';

const API = import.meta.env.VITE_API_URL || '';

/* ─── Klasman ────────────────────────────────────────── */
const KLASMAN = [
  { min: 80, durum: 'Çok İyi İş Çıkaranlar',  renk: '#22c55e', ikon: '🏆' },
  { min: 70, durum: 'İyi / Geleceği Parlak',   renk: '#6366f1', ikon: '⭐' },
  { min: 60, durum: 'Beklenen Performans',      renk: '#f59e0b', ikon: '✅' },
  { min: 50, durum: 'Sınırda / Riskli',         renk: '#f97316', ikon: '⚠️' },
  { min: 0,  durum: 'Yetkin Olmayan Kişiler',   renk: '#ef4444', ikon: '❌' },
];
function getKlasman(o) { return KLASMAN.find(k => o >= k.min) || KLASMAN[4]; }
function getAracRenk(o, renkOverride) {
  if (renkOverride) return renkOverride;
  return o >= 80 ? '#22c55e' : o >= 70 ? '#6366f1' : o >= 60 ? '#f59e0b' : o >= 50 ? '#f97316' : '#ef4444';
}

/* ─── Skor Halkası ───────────────────────────────────── */
function SkorHalkasi({ oran, renk }) {
  const r = 52, cx = 64, cy = 64, cevre = 2 * Math.PI * r;
  return (
    <svg viewBox="0 0 128 128" style={{ width: 120, height: 120 }}>
      <circle cx={cx} cy={cy} r={r} fill="none" stroke="var(--surface2)" strokeWidth="10" />
      <circle cx={cx} cy={cy} r={r} fill="none" stroke={renk} strokeWidth="10"
        strokeDasharray={`${(oran / 100) * cevre} ${cevre}`}
        strokeDashoffset={cevre / 4} strokeLinecap="round" />
      <text x={cx} y={cy - 6}  textAnchor="middle" fill={renk}         fontSize="22" fontWeight="900" fontFamily="system-ui">{Math.round(oran)}</text>
      <text x={cx} y={cy + 14} textAnchor="middle" fill="var(--muted)" fontSize="10" fontFamily="system-ui">/100</text>
    </svg>
  );
}

/* ─── Pozisyon Seçici ────────────────────────────────── */
function PozisyonSecici({ pozisyonlar, seciliId, onSec }) {
  const [arama, setArama] = useState('');
  const [acik, setAcik] = useState(false);
  const ref = useRef();

  // Dışarı tıklanınca kapat
  useEffect(() => {
    function kapat(e) { if (ref.current && !ref.current.contains(e.target)) setAcik(false); }
    document.addEventListener('mousedown', kapat);
    return () => document.removeEventListener('mousedown', kapat);
  }, []);

  const secili = pozisyonlar.find(p => p.id === seciliId);

  // Arama + gruplama
  const filtrelendi = pozisyonlar.filter(p =>
    !arama || p.ad.toLowerCase().includes(arama.toLowerCase())
      || p.sektor_adi.toLowerCase().includes(arama.toLowerCase())
      || p.departman_adi.toLowerCase().includes(arama.toLowerCase())
  );

  // Sektörlere göre grupla
  const gruplar = filtrelendi.reduce((acc, p) => {
    const k = p.sektor_adi;
    if (!acc[k]) acc[k] = [];
    acc[k].push(p);
    return acc;
  }, {});

  const SEVIYE_RENK = {
    stajyer: '#6b7591', junior: '#22c55e', uzman: '#6366f1',
    kıdemli_uzman: '#8b5cf6', takım_lideri: '#f59e0b',
    yönetici: '#f97316', direktör: '#ef4444', c_seviyesi: '#dc2626',
  };

  return (
    <div ref={ref} style={{ position: 'relative' }}>
      <button
        type="button"
        onClick={() => setAcik(v => !v)}
        style={{
          width: '100%', padding: '0.7rem 1rem',
          background: seciliId ? 'var(--accent-dim)' : 'var(--surface2)',
          border: `1px solid ${seciliId ? 'var(--accent)' : 'var(--border)'}`,
          borderRadius: 10, color: 'var(--text)',
          display: 'flex', alignItems: 'center', gap: 8,
          cursor: 'pointer', textAlign: 'left', transition: 'all 0.2s',
          fontSize: 13,
        }}
      >
        <span style={{ fontSize: 16 }}>🎯</span>
        <span style={{ flex: 1 }}>
          {secili
            ? <><strong>{secili.ad}</strong> <span style={{ color: 'var(--muted)', fontSize: 12 }}>· {secili.departman_adi}</span></>
            : <span style={{ color: 'var(--muted)' }}>Pozisyon seçin (isteğe bağlı)</span>
          }
        </span>
        <span style={{ color: 'var(--muted)', fontSize: 11, transform: acik ? 'rotate(180deg)' : 'none', transition: 'transform 0.2s' }}>▾</span>
      </button>

      {seciliId && (
        <button
          type="button"
          onClick={(e) => { e.stopPropagation(); onSec(null); }}
          style={{
            position: 'absolute', right: 36, top: '50%', transform: 'translateY(-50%)',
            background: 'none', border: 'none', color: 'var(--muted)',
            fontSize: 14, cursor: 'pointer', padding: '2px 6px', borderRadius: 4,
          }}
          title="Seçimi temizle"
        >✕</button>
      )}

      {acik && (
        <div style={{
          position: 'absolute', top: 'calc(100% + 6px)', left: 0, right: 0, zIndex: 200,
          background: 'var(--surface)', border: '1px solid var(--border)',
          borderRadius: 12, boxShadow: '0 8px 24px rgba(30,40,80,0.12)',
          maxHeight: 340, display: 'flex', flexDirection: 'column', overflow: 'hidden',
        }}>
          {/* Arama */}
          <div style={{ padding: '0.65rem 0.75rem', borderBottom: '1px solid var(--border)' }}>
            <input
              autoFocus
              value={arama}
              onChange={e => setArama(e.target.value)}
              placeholder="Pozisyon, departman veya sektör ara..."
              style={{ width: '100%', fontSize: 12, boxSizing: 'border-box' }}
              onClick={e => e.stopPropagation()}
            />
          </div>

          {/* Liste */}
          <div style={{ overflowY: 'auto', flex: 1 }}>
            {Object.keys(gruplar).length === 0 ? (
              <div style={{ padding: '1.5rem', textAlign: 'center', color: 'var(--muted)', fontSize: 12 }}>
                Sonuç bulunamadı
              </div>
            ) : Object.entries(gruplar).map(([sektor, pozlar]) => (
              <div key={sektor}>
                <div style={{
                  padding: '0.45rem 0.85rem', fontSize: 10, fontWeight: 800,
                  color: 'var(--muted)', background: 'var(--surface2)',
                  letterSpacing: '0.07em', textTransform: 'uppercase',
                  borderBottom: '1px solid var(--border)',
                }}>
                  {sektor}
                </div>
                {pozlar.map(p => (
                  <button
                    key={p.id}
                    type="button"
                    onClick={() => { onSec(p.id); setAcik(false); setArama(''); }}
                    style={{
                      width: '100%', padding: '0.6rem 1rem',
                      background: seciliId === p.id ? 'var(--accent-dim)' : 'transparent',
                      border: 'none', borderBottom: '1px solid var(--border)',
                      color: 'var(--text)', textAlign: 'left',
                      display: 'flex', alignItems: 'center', gap: 10,
                      cursor: 'pointer', transition: 'background 0.1s', fontSize: 13,
                    }}
                    onMouseEnter={e => { if (seciliId !== p.id) e.currentTarget.style.background = 'var(--surface2)'; }}
                    onMouseLeave={e => { if (seciliId !== p.id) e.currentTarget.style.background = 'transparent'; }}
                  >
                    <div style={{ flex: 1 }}>
                      <span style={{ fontWeight: seciliId === p.id ? 700 : 400 }}>{p.ad}</span>
                      <span style={{ fontSize: 11, color: 'var(--muted)', marginLeft: 6 }}>{p.departman_adi}</span>
                    </div>
                    <span style={{
                      fontSize: 10, padding: '2px 8px', borderRadius: 10, fontWeight: 600, flexShrink: 0,
                      background: (SEVIYE_RENK[p.seviye] || '#6b7591') + '18',
                      color: SEVIYE_RENK[p.seviye] || '#6b7591',
                    }}>
                      {p.seviye?.replace('_', ' ')}
                    </span>
                  </button>
                ))}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

/* ─── Yetkinlik Chip'leri ────────────────────────────── */
function YetkinlikChipler({ yetkinlikler }) {
  if (!yetkinlikler?.length) return null;
  return (
    <div style={{
      background: 'var(--surface)',
      border: '1px solid var(--border)',
      borderRadius: 10, padding: '0.85rem 1rem',
      marginTop: 10,
    }}>
      <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--muted)', marginBottom: 8, letterSpacing: '0.06em' }}>
        📋 BU POZİSYON İÇİN DEĞERLENDİRİLECEK YETKİNLİKLER
      </div>
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
        {yetkinlikler.map((y, i) => (
          <span key={i} style={{
            fontSize: 11, padding: '4px 10px', borderRadius: 20, fontWeight: 600,
            background: (y.renk_kodu || '#6366f1') + '18',
            color: y.renk_kodu || '#6366f1',
            border: `1px solid ${(y.renk_kodu || '#6366f1')}44`,
            display: 'flex', alignItems: 'center', gap: 5,
          }}>
            {y.zorunlu && <span title="Zorunlu" style={{ fontSize: 9, opacity: 0.8 }}>★</span>}
            {y.yetkinlik_adi}
            <span style={{ opacity: 0.6, fontSize: 10 }}>· {y.kategori_adi}</span>
          </span>
        ))}
      </div>
      <div style={{ marginTop: 8, fontSize: 11, color: 'var(--muted)', display: 'flex', alignItems: 'center', gap: 4 }}>
        <span style={{ color: '#6366f1' }}>★</span> = Zorunlu yetkinlik
        &nbsp;·&nbsp; AI bu yetkinliklere göre araç analizi yapacak
      </div>
    </div>
  );
}

/* ─── Rapor Görüntüleyici ─────────────────────────────── */
function RaporGoster({ rapor, dosyaAdi }) {
  const basari = parseFloat(rapor.basari_yuzdesi || 0);
  const klas   = getKlasman(basari);
  const gruplar = rapor.gruplar || [];
  const pozBilgi = rapor.pozisyon_bilgi;

  return (
    <div style={{ animation: 'fadeIn 0.3s' }}>
      {/* Başlık Kartı */}
      <div style={{
        background: `linear-gradient(135deg, ${klas.renk}15, var(--surface))`,
        border: `1px solid ${klas.renk}33`, borderRadius: 14, padding: '1.5rem 2rem',
        marginBottom: '1.25rem', position: 'relative',
      }}>
        <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: 3, background: klas.renk, borderRadius: '14px 14px 0 0' }} />
        <div style={{ display: 'flex', alignItems: 'center', gap: '2rem', flexWrap: 'wrap' }}>
          <div style={{ flex: 1, minWidth: 180 }}>
            <div style={{ fontSize: 10, fontWeight: 800, color: 'var(--muted)', letterSpacing: '0.1em', textTransform: 'uppercase', marginBottom: 4 }}>
              TEST DEĞERLENDİRME VE PERFORMANS RAPORU
            </div>
            <div style={{ fontSize: '1.35rem', fontWeight: 900, color: 'var(--text)', marginBottom: 6 }}>
              {rapor.aday_ad || 'Bilinmiyor'}
            </div>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 10, fontSize: 12, color: 'var(--muted)' }}>
              {(rapor.pozisyon || pozBilgi?.pozisyon_adi) && (
                <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                  🎯 {pozBilgi?.pozisyon_adi || rapor.pozisyon}
                </span>
              )}
              {pozBilgi?.sektor_adi && <span>🏢 {pozBilgi.sektor_adi}</span>}
              {rapor.test_adi && <span>📝 {rapor.test_adi}</span>}
              {rapor.tarih && <span>📅 {new Date(rapor.tarih).toLocaleDateString('tr-TR')}</span>}
              <span>📋 {rapor.toplam_soru || 0} Soru</span>
            </div>
            {dosyaAdi && <div style={{ fontSize: 11, color: 'var(--muted)', marginTop: 4 }}>📎 {dosyaAdi}</div>}
          </div>
          <div style={{ textAlign: 'center' }}>
            <SkorHalkasi oran={basari} renk={klas.renk} />
            <div style={{ fontSize: 11, fontWeight: 700, color: klas.renk, marginTop: 2 }}>{klas.ikon} {klas.durum}</div>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
            {[
              { l: 'Doğru',  v: rapor.dogru  || 0, renk: '#22c55e' },
              { l: 'Yanlış', v: rapor.yanlis || 0, renk: '#ef4444' },
              { l: 'Boş',    v: rapor.bos    || 0, renk: 'var(--muted)' },
              { l: 'Oran',   v: `%${Math.round(basari)}`, renk: klas.renk },
            ].map((m, i) => (
              <div key={i} style={{ background: 'var(--surface2)', borderRadius: 8, padding: '0.5rem 0.75rem', textAlign: 'center', border: '1px solid var(--border)' }}>
                <div style={{ fontSize: '1.1rem', fontWeight: 900, color: m.renk }}>{m.v}</div>
                <div style={{ fontSize: 10, color: 'var(--muted)' }}>{m.l}</div>
              </div>
            ))}
          </div>
        </div>
        <button onClick={() => window.print()} style={{
          position: 'absolute', top: 14, right: 14,
          padding: '0.35rem 0.85rem', borderRadius: 7, fontSize: 11, fontWeight: 600,
          border: '1px solid var(--border)', background: 'var(--surface)', color: 'var(--text)', cursor: 'pointer',
        }}>🖨️ Yazdır / PDF</button>
      </div>

      {/* Yetkinlik özeti (pozisyon seçildiyse) */}
      {pozBilgi?.yetkinlikler?.length > 0 && (
        <div style={{
          background: 'var(--surface)', border: '1px solid var(--accent)44',
          borderRadius: 12, padding: '1rem 1.25rem', marginBottom: '1.25rem',
        }}>
          <div style={{ fontSize: 12, fontWeight: 700, color: 'var(--accent)', marginBottom: 8 }}>
            🎯 Pozisyon Yetkinlik Profili — {pozBilgi.pozisyon_adi}
          </div>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
            {pozBilgi.yetkinlikler.map((y, i) => {
              const grup = gruplar[i];
              const oran = grup?.oran;
              return (
                <div key={i} style={{
                  display: 'flex', alignItems: 'center', gap: 6,
                  padding: '4px 10px', borderRadius: 20,
                  background: (y.renk_kodu || '#6366f1') + '15',
                  border: `1px solid ${(y.renk_kodu || '#6366f1')}33`,
                }}>
                  <span style={{ fontSize: 11, fontWeight: 600, color: y.renk_kodu || '#6366f1' }}>
                    {y.yetkinlik_adi}
                  </span>
                  {oran !== undefined && (
                    <span style={{
                      fontSize: 10, fontWeight: 800,
                      color: getAracRenk(oran, null),
                    }}>%{oran}</span>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Bölüm 1 — Klasman Tablosu */}
      <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 12, padding: '1.5rem', marginBottom: '1.25rem' }}>
        <h3 style={{ fontSize: 13, fontWeight: 800, marginBottom: '1rem', paddingBottom: '0.6rem', borderBottom: '1px solid var(--border)' }}>🏅 1. Performans Klasman Tablosu</h3>
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12 }}>
          <thead><tr style={{ borderBottom: '2px solid var(--border)' }}>
            {['', 'Başarı Oranı', 'Çalışan Statüsü', 'Gelecek Potansiyeli'].map((h, i) => (
              <th key={i} style={{ padding: '6px 10px', textAlign: 'left', fontSize: 10, fontWeight: 800, color: 'var(--muted)', textTransform: 'uppercase' }}>{h}</th>
            ))}
          </tr></thead>
          <tbody>
            {[
              { aralik: '%80–%100', durum: 'Çok İyi İş Çıkaranlar',  renk: '#22c55e', ikon: '🏆', pot: 'Verimlilik ve iş kalitesi katlanarak artar.', aktif: basari >= 80 },
              { aralik: '%70–%79',  durum: 'İyi / Geleceği Parlak',   renk: '#6366f1', ikon: '⭐', pot: 'Küçük dokunuşlarla en üst seviyeye çıkabilir.', aktif: basari >= 70 && basari < 80 },
              { aralik: '%60–%69',  durum: 'Beklenen Performans',      renk: '#f59e0b', ikon: '✅', pot: 'Standartları karşılayan, gelişime açık.', aktif: basari >= 60 && basari < 70 },
              { aralik: '%50–%59',  durum: 'Sınırda / Riskli',         renk: '#f97316', ikon: '⚠️', pot: 'Dikkatle takip ve desteklenmesi gereken.', aktif: basari >= 50 && basari < 60 },
              { aralik: '%0–%49',   durum: 'Yetkin Olmayan Kişiler',   renk: '#ef4444', ikon: '❌', pot: 'Radikal değişiklik veya eğitim gerekenler.', aktif: basari < 50 },
            ].map((s, i) => (
              <tr key={i} style={{ background: s.aktif ? `${s.renk}12` : 'transparent', borderBottom: '1px solid var(--border)' }}>
                <td style={{ padding: '8px 10px', fontSize: 14 }}>{s.aktif ? s.ikon : <span style={{ opacity: 0.2 }}>{s.ikon}</span>}</td>
                <td style={{ padding: '8px 10px', fontWeight: s.aktif ? 800 : 400, color: s.aktif ? s.renk : 'var(--muted)' }}>
                  {s.aralik}{s.aktif && <span style={{ marginLeft: 6, fontSize: 10, background: s.renk, color: '#fff', padding: '1px 7px', borderRadius: 8, fontWeight: 700 }}>SİZ</span>}
                </td>
                <td style={{ padding: '8px 10px', fontWeight: s.aktif ? 700 : 400, color: s.aktif ? 'var(--text)' : 'var(--muted)' }}>{s.durum}</td>
                <td style={{ padding: '8px 10px', fontSize: 11, color: s.aktif ? 'var(--text)' : 'var(--muted)' }}>{s.pot}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Bölüm 2 — Araç/Yetkinlik Analizi */}
      {gruplar.length > 0 && (
        <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 12, padding: '1.5rem', marginBottom: '1.25rem' }}>
          <h3 style={{ fontSize: 13, fontWeight: 800, marginBottom: '1rem', paddingBottom: '0.6rem', borderBottom: '1px solid var(--border)' }}>
            📊 2. {pozBilgi ? 'Yetkinlik Bazlı' : 'Araç Bazlı'} Performans Analizi
          </h3>
          {gruplar.map((g, i) => {
            const renk = getAracRenk(g.oran, g.renk);
            const etiket = g.oran >= 70 ? 'Güçlü Alan' : g.oran >= 60 ? 'Beklenen' : g.oran >= 50 ? 'Sınırda' : 'Gelişim Alanı';
            return (
              <div key={i} style={{ background: 'var(--surface2)', borderRadius: 10, padding: '0.85rem', marginBottom: 8, border: `1px solid ${renk}22` }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6 }}>
                  <div style={{
                    width: 28, height: 28, borderRadius: '50%',
                    background: `${renk}22`, border: `2px solid ${renk}`,
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    fontWeight: 900, fontSize: 11, color: renk, flexShrink: 0,
                  }}>{i + 1}</div>
                  <div style={{ flex: 1 }}>
                    <span style={{ fontWeight: 700, fontSize: 12 }}>
                      {g.ad || `${i + 1}. Araç`}
                    </span>
                    <span style={{
                      marginLeft: 8, fontSize: 10, padding: '1px 7px', borderRadius: 8,
                      background: `${renk}20`, color: renk, fontWeight: 700,
                    }}>{etiket}</span>
                  </div>
                  <span style={{ fontSize: '1.1rem', fontWeight: 900, color: renk }}>{g.oran}%</span>
                </div>
                <div style={{ height: 6, background: 'var(--border)', borderRadius: 3, overflow: 'hidden' }}>
                  <div style={{ height: '100%', width: `${g.oran}%`, background: renk, borderRadius: 3, transition: 'width 0.8s ease' }} />
                </div>
                <div style={{ fontSize: 10, color: 'var(--muted)', marginTop: 4 }}>
                  {g.dogru}/{g.toplam} doğru
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Bölüm 3 — Yol Haritası */}
      <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 12, padding: '1.5rem', marginBottom: '1.25rem' }}>
        <h3 style={{ fontSize: 13, fontWeight: 800, marginBottom: '0.75rem', paddingBottom: '0.6rem', borderBottom: '1px solid var(--border)' }}>
          🗺️ 3. Geleceğe Yönelik Yol Haritası ve Aksiyon Planı
        </h3>
        <div style={{ background: 'rgba(99,102,241,0.08)', borderLeft: '3px solid #6366f1', borderRadius: '0 8px 8px 0', padding: '0.6rem 0.85rem', marginBottom: '0.85rem', fontSize: 12, lineHeight: 1.6 }}>
          <strong style={{ color: '#6366f1' }}>⚡ Kritik Kural:</strong> Doğru cevap sayısı ne kadar yüksekse, gelecekteki iş üretkenliği ve başarısı o kadar katlanarak artacaktır.
        </div>
        {[
          { ikon: '🔍', renk: '#6366f1', baslik: 'Hata Analizi Odaklı Gelişim',
            metin: pozBilgi
              ? `${pozBilgi.pozisyon_adi} pozisyonu için kritik yetkinliklerde yapılan hatalar analiz edilmeli, özellikle zorunlu yetkinliklerdeki eksikler hedefli eğitimlerle kapatılmalıdır.`
              : '3., 4. ve 5. araçlarda yapılan yanlışların nedenleri tespit edilmeli ve bu alanlarda lokal eğitimler verilmelidir.'
          },
          { ikon: '📈', renk: '#22c55e', baslik: 'Verimlilik Artışı',
            metin: `%80 barajına yaklaşmak için hata yapılan spesifik soru tipleri üzerinde pratik yapılmalı; doğru sayısı istikrarlı şekilde yukarı çekilmelidir. Mevcut: %${Math.round(basari)}.`
          },
          { ikon: '🗺️', renk: '#f59e0b', baslik: 'Gelecek Planlaması',
            metin: pozBilgi
              ? `Güçlü olunan yetkinliklerdeki başarı refleksleri, gelişim gerektiren alanlara da entegre edilmeli; ${pozBilgi.pozisyon_adi} rolünün gerektirdiği yetkinlik eşiğine ulaşılmalıdır.`
              : 'Başarılı olunan ilk araçlardaki güçlü refleksler, zayıf olunan son araçlara da entegre edilmelidir.'
          },
        ].map((a, i) => (
          <div key={i} style={{ display: 'flex', gap: 10, padding: '0.85rem', background: 'var(--surface2)', borderRadius: 9, borderLeft: `4px solid ${a.renk}`, marginBottom: 8, border: `1px solid ${a.renk}22` }}>
            <span style={{ fontSize: 18, flexShrink: 0 }}>{a.ikon}</span>
            <div>
              <div style={{ fontSize: 12, fontWeight: 700, color: a.renk, marginBottom: 2 }}>{a.baslik}</div>
              <div style={{ fontSize: 11, color: 'var(--muted)', lineHeight: 1.6 }}>{a.metin}</div>
            </div>
          </div>
        ))}
      </div>

      {/* Bölüm 4 — Nihai Skor */}
      <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 12, padding: '1.5rem' }}>
        <h3 style={{ fontSize: 13, fontWeight: 800, marginBottom: '1rem', paddingBottom: '0.6rem', borderBottom: '1px solid var(--border)' }}>💯 4. Nihai Değerlendirme ve Skorlama</h3>
        <div style={{ background: `${klas.renk}0d`, border: `2px solid ${klas.renk}33`, borderRadius: 12, padding: '1.5rem', textAlign: 'center', marginBottom: '1rem' }}>
          <div style={{ fontSize: 10, fontWeight: 800, color: klas.renk, letterSpacing: '0.1em', textTransform: 'uppercase', marginBottom: 6 }}>💯 Genel Başarı Skoru</div>
          <div style={{ fontSize: '3rem', fontWeight: 900, color: klas.renk, lineHeight: 1 }}>{Math.round(basari)}</div>
          <div style={{ fontSize: 13, color: 'var(--muted)', marginTop: 4 }}>100 Üzerinden Puan</div>
          <div style={{ maxWidth: 360, margin: '12px auto 0', height: 7, background: 'var(--border)', borderRadius: 4, overflow: 'hidden' }}>
            <div style={{ height: '100%', width: `${basari}%`, background: `linear-gradient(90deg,${klas.renk}99,${klas.renk})`, borderRadius: 4 }} />
          </div>
          <div style={{ fontSize: 11, color: 'var(--muted)', marginTop: 8, fontStyle: 'italic' }}>
            Doğru cevap sayısı arttıkça bu skor 100'e yaklaşacak ve kişinin işe kabul/devam/terfi şansı en üst seviyeye çıkacaktır.
          </div>
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 10 }}>
          {[
            { l: 'Toplam Doğru Cevap Oranı', v: `%${Math.round(basari)}`, renk: klas.renk },
            { l: 'Geçmiş Performans Notu', v: klas.durum, renk: klas.renk },
            { l: 'Gelecek Potansiyel Notu', v: basari >= 80 ? 'Liderliğe Hazır' : basari >= 70 ? 'Verimliliği Artırılabilir' : basari >= 60 ? 'Gelişime Açık' : basari >= 50 ? 'Yoğun Destek Gerekli' : 'Radikal Değişim Gerekli', renk: basari >= 70 ? '#22c55e' : basari >= 50 ? '#f59e0b' : '#ef4444' },
          ].map((m, i) => (
            <div key={i} style={{ background: 'var(--surface2)', borderRadius: 9, padding: '0.85rem', textAlign: 'center', border: '1px solid var(--border)' }}>
              <div style={{ fontSize: 10, color: 'var(--muted)', textTransform: 'uppercase', fontWeight: 700, marginBottom: 4 }}>{m.l}</div>
              <div style={{ fontSize: 12, fontWeight: 800, color: m.renk, lineHeight: 1.3 }}>{m.v}</div>
            </div>
          ))}
        </div>

        {/* AI Özet */}
        {rapor.ozet && (
          <div style={{ marginTop: '1rem', padding: '0.75rem 1rem', background: 'var(--surface2)', borderRadius: 9, fontSize: 12, color: 'var(--muted)', fontStyle: 'italic', lineHeight: 1.7, border: '1px solid var(--border)' }}>
            🤖 {rapor.ozet}
          </div>
        )}
      </div>
    </div>
  );
}

/* ─── Ana Sayfa ──────────────────────────────────────── */
export default function UcretsizDenemeTesti() {
  const [adim, setAdim]           = useState('yukle');
  const [dosya, setDosya]         = useState(null);
  const [drag, setDrag]           = useState(false);
  const [hata, setHata]           = useState('');
  const [rapor, setRapor]         = useState(null);
  const [dosyaAdi, setDosyaAdi]   = useState('');
  const [ilerleme, setIlerleme]   = useState('');
  const [pozisyonlar, setPozisyonlar] = useState([]);
  const [seciliPozId, setSeciliPozId] = useState(null);
  const [yetkinlikler, setYetkinlikler] = useState([]);
  const ref = useRef();

  const KABUL_TIPLER = '.xlsx,.xls,.csv,.pdf,.docx,.txt';

  // Tüm pozisyonları yükle
  useEffect(() => {
    fetch(`${API}/api/pozisyonlar/liste`)
      .then(r => r.json())
      .then(data => Array.isArray(data) ? setPozisyonlar(data) : [])
      .catch(() => {});
  }, []);

  // Pozisyon seçildiğinde yetkinliklerini getir
  async function pozSec(pozId) {
    setSeciliPozId(pozId);
    if (!pozId) { setYetkinlikler([]); return; }
    try {
      const r = await fetch(`${API}/api/pozisyonlar/${pozId}`);
      const data = await r.json();
      setYetkinlikler(data.yetkinlikler || []);
    } catch { setYetkinlikler([]); }
  }

  function dosyaSec(file) {
    if (!file) return;
    setDosya(file);
    setDosyaAdi(file.name);
    setHata('');
  }

  async function gonder() {
    if (!dosya) { setHata('Lütfen önce bir dosya seçin.'); return; }
    setAdim('isleniyor');
    setIlerleme('Dosya okunuyor...');

    const form = new FormData();
    form.append('dosya', dosya);
    if (seciliPozId) form.append('pozisyon_id', String(seciliPozId));

    try {
      setIlerleme('AI analiz ediyor...');
      const res  = await fetch(`${API}/api/deneme/yukle`, { method: 'POST', body: form });
      const data = await res.json();

      if (!res.ok) {
        setHata(data.hata || 'Bir hata oluştu');
        setAdim('yukle');
        return;
      }

      setRapor(data.rapor);
      setAdim('rapor');
    } catch (e) {
      setHata('Sunucuya bağlanılamadı: ' + e.message);
      setAdim('yukle');
    }
  }

  function sifirla() {
    setAdim('yukle'); setDosya(null); setDosyaAdi('');
    setRapor(null); setHata('');
    // Pozisyon seçimini koru (kullanışlı olabilir)
  }

  return (
    <div style={{ animation: 'fadeIn 0.2s', maxWidth: 900, margin: '0 auto' }}>
      {/* Başlık */}
      <div style={{ textAlign: 'center', marginBottom: '2rem' }}>
        <div style={{
          display: 'inline-flex', alignItems: 'center', gap: 8,
          background: 'rgba(34,197,94,0.10)', border: '1px solid rgba(34,197,94,0.25)',
          borderRadius: 20, padding: '4px 14px', marginBottom: '1rem',
          fontSize: 11, fontWeight: 700, color: '#16a34a', textTransform: 'uppercase', letterSpacing: '0.08em',
        }}>
          <div style={{ width: 6, height: 6, borderRadius: '50%', background: '#22c55e', animation: 'blink 1.5s infinite' }} />
          0 TL — Ücretsiz Deneme
        </div>
        <h1 style={{ fontSize: 'clamp(1.2rem, 3vw, 1.8rem)', fontWeight: 900, marginBottom: '0.5rem' }}>
          Ücretsiz Deneme Testi
        </h1>
        <p style={{ fontSize: 13, color: 'var(--muted)', maxWidth: 520, margin: '0 auto', lineHeight: 1.7 }}>
          Pozisyon seçin, test sonuç dosyanızı yükleyin — AI o pozisyonun
          yetkinlik profiline göre <strong>Performans Analiz Raporu</strong> üretsin.
        </p>
      </div>

      {/* Adım göstergesi */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 0, marginBottom: '2rem' }}>
        {[
          { k: 'yukle',     n: '1', l: 'Seç & Yükle' },
          { k: 'isleniyor', n: '2', l: 'AI Analiz'    },
          { k: 'rapor',     n: '3', l: 'Rapor Hazır'  },
        ].map((s, i) => {
          const aktif = adim === s.k;
          const gecti = (adim === 'rapor' && i < 2) || (adim === 'isleniyor' && i < 1);
          return (
            <div key={s.k} style={{ display: 'flex', alignItems: 'center' }}>
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4 }}>
                <div style={{
                  width: 32, height: 32, borderRadius: '50%',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  fontWeight: 800, fontSize: 13,
                  background: gecti ? '#22c55e' : aktif ? 'var(--accent)' : 'var(--surface2)',
                  color: gecti || aktif ? '#fff' : 'var(--muted)',
                  border: `2px solid ${gecti ? '#22c55e' : aktif ? 'var(--accent)' : 'var(--border)'}`,
                }}>{gecti ? '✓' : s.n}</div>
                <div style={{ fontSize: 10, fontWeight: aktif ? 700 : 400, color: aktif ? 'var(--accent)' : 'var(--muted)', whiteSpace: 'nowrap' }}>{s.l}</div>
              </div>
              {i < 2 && <div style={{ width: 50, height: 2, background: gecti ? '#22c55e' : 'var(--border)', margin: '0 6px 16px', transition: 'background 0.3s' }} />}
            </div>
          );
        })}
      </div>

      {/* Adım: Yükle */}
      {adim === 'yukle' && (
        <div>
          {/* Limit bilgisi */}
          <div style={{ background: 'rgba(99,102,241,0.08)', border: '1px solid rgba(99,102,241,0.2)', borderRadius: 10, padding: '0.65rem 1rem', marginBottom: '1.25rem', display: 'flex', alignItems: 'center', gap: 8, fontSize: 12 }}>
            <span style={{ fontSize: 16 }}>ℹ️</span>
            <span><strong style={{ color: 'var(--accent)' }}>Ücretsiz limit:</strong> Günde 1 rapor hakkı. Giriş yaparak sınırsız kullanım sağlayabilirsiniz.</span>
          </div>

          {/* ─── Pozisyon Seçici ─── */}
          <div style={{
            background: 'var(--surface)', border: '1px solid var(--border)',
            borderRadius: 12, padding: '1.1rem 1.25rem', marginBottom: '1rem',
          }}>
            <div style={{ fontSize: 11, fontWeight: 800, color: 'var(--muted)', letterSpacing: '0.07em', marginBottom: 8 }}>
              4 · POZİSYON
            </div>
            <PozisyonSecici
              pozisyonlar={pozisyonlar}
              seciliId={seciliPozId}
              onSec={pozSec}
            />
            {/* Yetkinlik chip'leri */}
            <YetkinlikChipler yetkinlikler={yetkinlikler} />
          </div>

          {/* ─── Drag & Drop ─── */}
          <div style={{
            background: 'var(--surface)', border: '1px solid var(--border)',
            borderRadius: 12, padding: '1.1rem 1.25rem', marginBottom: '1rem',
          }}>
            <div style={{ fontSize: 11, fontWeight: 800, color: 'var(--muted)', letterSpacing: '0.07em', marginBottom: 8 }}>
              5 · DOSYA YÜKLEYİN
            </div>
            <div
              onDragOver={e => { e.preventDefault(); setDrag(true); }}
              onDragLeave={() => setDrag(false)}
              onDrop={e => { e.preventDefault(); setDrag(false); dosyaSec(e.dataTransfer.files[0]); }}
              onClick={() => ref.current?.click()}
              style={{
                border: `2px dashed ${drag ? 'var(--accent)' : dosya ? '#22c55e' : 'var(--border)'}`,
                borderRadius: 10, padding: '2.5rem 2rem', textAlign: 'center', cursor: 'pointer',
                background: drag ? 'var(--accent-dim)' : dosya ? 'rgba(34,197,94,0.05)' : 'var(--surface2)',
                transition: 'all 0.2s',
              }}
            >
              <input ref={ref} type="file" accept={KABUL_TIPLER} style={{ display: 'none' }}
                onChange={e => dosyaSec(e.target.files[0])} />
              {dosya ? (
                <>
                  <div style={{ fontSize: 36, marginBottom: 8 }}>📄</div>
                  <div style={{ fontSize: 14, fontWeight: 700, color: '#22c55e', marginBottom: 4 }}>{dosyaAdi}</div>
                  <div style={{ fontSize: 12, color: 'var(--muted)' }}>{(dosya.size / 1024).toFixed(1)} KB — Farklı dosya için tıklayın</div>
                </>
              ) : (
                <>
                  <div style={{ fontSize: 40, marginBottom: 10, opacity: 0.35 }}>📥</div>
                  <div style={{ fontSize: 14, fontWeight: 700, color: 'var(--text)', marginBottom: 6 }}>Test sonuç dosyanızı buraya sürükleyin</div>
                  <div style={{ fontSize: 12, color: 'var(--muted)', marginBottom: 10 }}>veya tıklayarak seçin</div>
                  <div style={{ display: 'flex', justifyContent: 'center', gap: 6, flexWrap: 'wrap' }}>
                    {['📊 Excel (.xlsx)', '📋 CSV', '📄 PDF', '📝 Word (.docx)', '📃 TXT'].map(f => (
                      <span key={f} style={{ fontSize: 11, padding: '3px 10px', borderRadius: 12, background: 'var(--surface)', color: 'var(--muted)', border: '1px solid var(--border)' }}>{f}</span>
                    ))}
                  </div>
                </>
              )}
            </div>
          </div>

          {hata && (
            <div style={{ marginBottom: '0.75rem', padding: '0.6rem 1rem', background: 'rgba(220,38,38,0.08)', border: '1px solid rgba(220,38,38,0.25)', borderRadius: 8, fontSize: 12, color: '#dc2626', display: 'flex', gap: 8 }}>
              <span>❌</span> {hata}
            </div>
          )}

          <button onClick={gonder} disabled={!dosya} style={{
            width: '100%', padding: '0.95rem', border: 'none', borderRadius: 10,
            background: dosya ? 'linear-gradient(135deg,#22c55e,#16a34a)' : 'var(--surface2)',
            color: dosya ? '#fff' : 'var(--muted)', fontSize: 14, fontWeight: 800,
            cursor: dosya ? 'pointer' : 'not-allowed',
            boxShadow: dosya ? '0 4px 20px rgba(34,197,94,0.25)' : 'none',
            transition: 'all 0.2s',
          }}>
            {dosya
              ? `✦ Raporu Ücretsiz Oluştur${seciliPozId ? ' (Yetkinlik Bazlı)' : ''}`
              : 'Önce dosya seçin'
            }
          </button>
        </div>
      )}

      {/* Adım: İşleniyor */}
      {adim === 'isleniyor' && (
        <div style={{ textAlign: 'center', padding: '4rem 2rem', background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 14 }}>
          <div style={{ width: 48, height: 48, border: '3px solid var(--border)', borderTop: '3px solid var(--accent)', borderRadius: '50%', animation: 'spin 0.8s linear infinite', margin: '0 auto 1.5rem' }} />
          <div style={{ fontSize: 15, fontWeight: 700, marginBottom: 6 }}>{ilerleme}</div>
          <div style={{ fontSize: 12, color: 'var(--muted)', maxWidth: 380, margin: '0 auto', lineHeight: 1.6 }}>
            {seciliPozId
              ? 'AI sistemi dosyanızı seçilen pozisyonun yetkinlik profiline göre analiz ediyor...'
              : 'AI sistemi dosyanızı analiz edip performans raporunu oluşturuyor...'
            }
            Bu işlem birkaç saniye sürebilir.
          </div>
        </div>
      )}

      {/* Adım: Rapor */}
      {adim === 'rapor' && rapor && (
        <>
          <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: '1rem', gap: 8 }}>
            <button onClick={sifirla} style={{ padding: '0.45rem 1.1rem', borderRadius: 8, fontSize: 12, fontWeight: 600, border: '1px solid var(--border)', background: 'var(--surface)', color: 'var(--text)', cursor: 'pointer' }}>
              ← Yeni Rapor
            </button>
          </div>
          <RaporGoster rapor={rapor} dosyaAdi={dosyaAdi} />
        </>
      )}
    </div>
  );
}
