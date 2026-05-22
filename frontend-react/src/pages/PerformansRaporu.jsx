import { useState, useEffect, useRef } from 'react';

const API = import.meta.env.VITE_API_URL || '';
function aH() { const t = localStorage.getItem('token'); return t ? { Authorization: `Bearer ${t}` } : {}; }

/* ─── Klasman Tablosu Veri ───────────────────────────── */
const KLASMAN = [
  { min: 80, max: 100, durum: 'Çok İyi İş Çıkaranlar',  renk: '#22c55e', bg: 'rgba(34,197,94,0.12)',    ikon: '🏆', potansiyel: 'Doğru cevap sayısı arttıkça verimlilik ve iş kalitesi katlanarak artar.' },
  { min: 70, max: 79,  durum: 'İyi / Geleceği Parlak',   renk: '#6366f1', bg: 'rgba(99,102,241,0.12)',   ikon: '⭐', potansiyel: 'Potansiyeli yüksek, küçük dokunuşlarla en üst seviyeye çıkabilir.' },
  { min: 60, max: 69,  durum: 'Beklenen Performans',      renk: '#f59e0b', bg: 'rgba(245,158,11,0.12)',   ikon: '✅', potansiyel: 'Standartları karşılayan, gelişime açık kişiler.' },
  { min: 50, max: 59,  durum: 'Sınırda / Riskli',         renk: '#f97316', bg: 'rgba(249,115,22,0.12)',   ikon: '⚠️', potansiyel: 'Dikkatle takip edilmesi ve desteklenmesi gereken kişiler.' },
  { min: 0,  max: 49,  durum: 'Yetkin Olmayan Kişiler',   renk: '#ef4444', bg: 'rgba(239,68,68,0.12)',    ikon: '❌', potansiyel: 'Mevcut görev için yetersiz, radikal değişiklik veya eğitim gerekenler.' },
];

function getKlasman(oran) {
  return KLASMAN.find(k => oran >= k.min && oran <= k.max) || KLASMAN[4];
}

/* ─── Araç analiz metni ──────────────────────────────── */
function getAracMetni(idx, oran) {
  if (oran >= 80) return `${idx + 1}. Araç'ta geçmiş performans oldukça başarılı. İşin temel mantığı kavranmış, odaklanma seviyesi yüksek.`;
  if (oran >= 70) return `${idx + 1}. Araç'ta performans iyi seviyede. İş mantığı büyük ölçüde kavranmış, ufak iyileştirmeler üst seviyeye taşıyabilir.`;
  if (oran >= 60) return `${idx + 1}. Araç'ta beklenen standartlar yakalanmış; ancak bazı noktalarda dikkat dağınıklığı veya bilgi eksikliği yaşanmış.`;
  if (oran >= 50) return `${idx + 1}. Araç'ta sınırda bir performans sergilenmiş. Bu aşamada yapılan hatalar, adayın zorlandığı spesifik konuları işaret ediyor.`;
  return `${idx + 1}. Araç'ta hatalar artış göstermiştir. Bu aştaki zayıf noktalara odaklanmak, gelecekteki gelişimin anahtarıdır.`;
}

function getAracRenk(oran) {
  if (oran >= 80) return '#22c55e';
  if (oran >= 70) return '#6366f1';
  if (oran >= 60) return '#f59e0b';
  if (oran >= 50) return '#f97316';
  return '#ef4444';
}

/* ─── Statik Aksiyon Planı Üretici ──────────────────── */
function olusturAksiyonPlani(gruplar, basari) {
  const zayifGruplar = gruplar.filter((g, i) => g.oran < 60 && i >= 2);
  const hataAlani = zayifGruplar.length > 0
    ? `${zayifGruplar.map((_, i) => `${i + 3}., ${i + 4}.`).join('')} araçlardaki`
    : 'son bölümlerdeki';

  return [
    {
      baslik: 'Hata Analizi Odaklı Gelişim',
      ikon: '🔍',
      renk: '#6366f1',
      metin: `${hataAlani} yanlışların nedenleri (bilgi eksikliği mi, süre yönetimi mi, yöresel algı farkı mı?) tek tek tespit edilmeli ve bu alanlarda lokal eğitimler verilmelidir.`,
    },
    {
      baslik: 'Verimlilik Artışı',
      ikon: '📈',
      renk: '#22c55e',
      metin: `%80 barajına yaklaşmak için hata yapılan spesifik soru tipleri üzerinde pratik yapılmalı; doğru sayısı yavaş yavaş ve istikrarlı bir şekilde yukarı çekilmelidir. Mevcut başarı oranı: %${Math.round(basari)}.`,
    },
    {
      baslik: 'Gelecek Planlaması',
      ikon: '🗺️',
      renk: '#f59e0b',
      metin: `Kişi, başarılı olduğu ilk iki araçtaki güçlü reflekslerini, zayıf olduğu son araçlara da entegre etmeyi öğrenmelidir. Güçlü başlangıç alışkanlıkları tüm sürece yayılmalıdır.`,
    },
  ];
}

/* ─── Bileşenler ─────────────────────────────────────── */
function Kart({ children, style }) {
  return <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 12, padding: '1.5rem', ...style }}>{children}</div>;
}

function BolumBaslik({ no, baslik, ikon }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: '1.25rem', paddingBottom: '0.75rem', borderBottom: '1px solid var(--border)' }}>
      <div style={{ width: 28, height: 28, borderRadius: '50%', background: 'var(--accent-dim)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 13, color: 'var(--accent)', fontWeight: 800, flexShrink: 0 }}>{no}</div>
      <span style={{ fontSize: 15 }}>{ikon}</span>
      <h2 style={{ fontSize: '0.95rem', fontWeight: 800, color: 'var(--text)', margin: 0 }}>{baslik}</h2>
    </div>
  );
}

/* ─── Skor Göstergesi (SVG halka) ───────────────────── */
function SkorGostergesi({ oran, renk }) {
  const r = 52, cx = 64, cy = 64;
  const cevre = 2 * Math.PI * r;
  const doluluk = (oran / 100) * cevre;
  return (
    <svg viewBox="0 0 128 128" style={{ width: 128, height: 128 }}>
      <circle cx={cx} cy={cy} r={r} fill="none" stroke="var(--surface2)" strokeWidth="10" />
      <circle cx={cx} cy={cy} r={r} fill="none" stroke={renk} strokeWidth="10"
        strokeDasharray={`${doluluk} ${cevre}`}
        strokeDashoffset={cevre / 4}
        strokeLinecap="round"
        style={{ transition: 'stroke-dasharray 1s ease' }}
      />
      <text x={cx} y={cy - 6} textAnchor="middle" fill={renk} fontSize="22" fontWeight="900" fontFamily="system-ui">
        {Math.round(oran)}
      </text>
      <text x={cx} y={cy + 14} textAnchor="middle" fill="var(--muted)" fontSize="10" fontFamily="system-ui">
        /100
      </text>
    </svg>
  );
}

/* ─── Oturum Listesi ─────────────────────────────────── */
function OturumListesi({ oturumlar, secili, onSecim }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
      {oturumlar.length === 0 && (
        <div style={{ textAlign: 'center', padding: '2rem', color: 'var(--muted)', fontSize: 13 }}>
          Henüz tamamlanmış test yok
        </div>
      )}
      {oturumlar.map(o => {
        const klas = getKlasman(parseFloat(o.basari_yuzdesi || 0));
        const aktif = secili?.id === o.id;
        return (
          <div key={o.id} onClick={() => onSecim(o)}
            style={{
              padding: '0.75rem 1rem', borderRadius: 9, cursor: 'pointer',
              background: aktif ? 'var(--accent-dim)' : 'var(--surface2)',
              border: `1px solid ${aktif ? 'var(--accent)' : 'var(--border)'}`,
              transition: 'all 0.15s',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <div style={{ width: 7, height: 7, borderRadius: '50%', background: klas.renk, flexShrink: 0 }} />
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontWeight: 700, fontSize: 12, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                  {o.aday_ad} {o.aday_soyad}
                </div>
                <div style={{ fontSize: 10, color: 'var(--muted)' }}>
                  {o.proje_adi} · {new Date(o.baslangic).toLocaleDateString('tr-TR')}
                </div>
              </div>
              <div style={{ fontSize: 13, fontWeight: 800, color: klas.renk, flexShrink: 0 }}>
                %{Math.round(parseFloat(o.basari_yuzdesi || 0))}
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}

/* ─── Tam Rapor ──────────────────────────────────────── */
function TamRapor({ rapor }) {
  const { oturum, detay } = rapor;
  const basari = parseFloat(oturum.basari_yuzdesi || 0);
  const klas = getKlasman(basari);

  // 5 eşit araç grubu oluştur
  const grubBuyu = Math.ceil(detay.length / 5);
  const gruplar = Array.from({ length: 5 }, (_, i) => {
    const dilim = detay.slice(i * grubBuyu, (i + 1) * grubBuyu);
    if (dilim.length === 0) return null;
    const dogru = dilim.filter(s => s.dogru_mu === true).length;
    const oran = Math.round((dogru / dilim.length) * 100);
    return { sorular: dilim, dogru, toplam: dilim.length, oran };
  }).filter(Boolean);

  const aksiyonlar = olusturAksiyonPlani(gruplar, basari);

  // AI Analiz state
  const [aiMetin, setAiMetin] = useState('');
  const [aiYukleniyor, setAiYukleniyor] = useState(false);
  const [aiHata, setAiHata] = useState('');

  // E-posta state
  const [emailPanel, setEmailPanel] = useState(false);
  const [emailAdres, setEmailAdres] = useState(oturum.aday_eposta || '');
  const [emailGonderen, setEmailGonderen] = useState(false);
  const [emailSonuc, setEmailSonuc] = useState(null); // {ok, mesaj}

  async function emailGonder() {
    if (!emailAdres.trim()) { setEmailSonuc({ ok: false, mesaj: 'E-posta adresi boş olamaz.' }); return; }
    setEmailGonderen(true); setEmailSonuc(null);
    try {
      const res = await fetch(`${API}/api/testler/oturum/${oturum.id}/email-gonder`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...aH() },
        body: JSON.stringify({ alici_eposta: emailAdres, alici_ad: `${oturum.aday_ad} ${oturum.aday_soyad}` }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.hata || 'Gönderim hatası');
      setEmailSonuc({ ok: true, mesaj: `✅ Rapor ${emailAdres} adresine başarıyla gönderildi.` });
    } catch (e) {
      setEmailSonuc({ ok: false, mesaj: `❌ ${e.message}` });
    } finally { setEmailGonderen(false); }
  }

  async function aiAnalizBaslat() {
    setAiYukleniyor(true); setAiMetin(''); setAiHata('');
    try {
      const res = await fetch(`${API}/api/testler/oturum/${oturum.id}/ai-analiz`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...aH() },
        body: JSON.stringify({
          gruplar,
          basari_yuzdesi: basari,
          aday_ad: oturum.aday_ad,
          aday_soyad: oturum.aday_soyad,
          pozisyon: oturum.aday_pozisyon || oturum.pozisyon_adi,
        }),
      });
      const reader = res.body.getReader(); const dec = new TextDecoder();
      while (true) {
        const { done, value } = await reader.read(); if (done) break;
        for (const line of dec.decode(value, { stream: true }).split('\n')) {
          if (!line.startsWith('data: ')) continue;
          const p = line.slice(6).trim();
          if (p === '[DONE]') break;
          try {
            const obj = JSON.parse(p);
            if (obj.tip === 'delta') setAiMetin(prev => prev + obj.metin);
          } catch {}
        }
      }
    } catch (e) { setAiHata(e.message); }
    finally { setAiYukleniyor(false); }
  }

  return (
    <div style={{ animation: 'fadeIn 0.25s' }}>
      {/* ── Rapor Başlığı ─────────────────────────────────── */}
      <div style={{
        background: `linear-gradient(135deg, ${klas.bg.replace('0.12', '0.2')}, var(--surface))`,
        border: `1px solid ${klas.renk}44`,
        borderRadius: 14, padding: '1.5rem 2rem', marginBottom: '1.25rem',
        position: 'relative', overflow: 'hidden',
      }}>
        <div style={{
          position: 'absolute', top: 0, left: 0, right: 0, height: 3,
          background: `linear-gradient(90deg, ${klas.renk}, ${klas.renk}44)`,
        }} />
        <div style={{ display: 'flex', alignItems: 'center', gap: '2rem', flexWrap: 'wrap' }}>
          <div style={{ flex: 1, minWidth: 200 }}>
            <div style={{ fontSize: 10, fontWeight: 800, color: 'var(--muted)', letterSpacing: '0.1em', textTransform: 'uppercase', marginBottom: 4 }}>
              TEST DEĞERLENDİRME VE PERFORMANS RAPORU
            </div>
            <h2 style={{ fontSize: '1.4rem', fontWeight: 900, color: 'var(--text)', marginBottom: 4 }}>
              {oturum.aday_ad} {oturum.aday_soyad}
            </h2>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 14, fontSize: 12, color: 'var(--muted)' }}>
              {oturum.aday_pozisyon && <span>🎯 {oturum.aday_pozisyon}</span>}
              {oturum.aday_sirket && <span>🏢 {oturum.aday_sirket}</span>}
              <span>📅 {new Date(oturum.baslangic).toLocaleDateString('tr-TR', { day:'2-digit', month:'long', year:'numeric' })}</span>
              <span>📋 {oturum.soru_sayisi || detay.length} Soru</span>
              {oturum.proje_adi && <span>📝 {oturum.proje_adi}</span>}
            </div>
          </div>
          {/* Skor */}
          <div style={{ textAlign: 'center' }}>
            <SkorGostergesi oran={basari} renk={klas.renk} />
            <div style={{ fontSize: 11, fontWeight: 700, color: klas.renk, marginTop: 4 }}>
              {klas.ikon} {klas.durum}
            </div>
          </div>
          {/* Hızlı metrikler */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
            {[
              { label: 'Doğru', val: oturum.dogru_sayisi || 0, renk: '#22c55e' },
              { label: 'Yanlış', val: oturum.yanlis_sayisi || 0, renk: '#ef4444' },
              { label: 'Boş', val: oturum.bos_sayisi || 0, renk: 'var(--muted)' },
              { label: 'Puan', val: `${parseFloat(oturum.toplam_puan||0).toFixed(0)}`, renk: klas.renk },
            ].map((m, i) => (
              <div key={i} style={{ background: 'var(--surface2)', borderRadius: 8, padding: '0.5rem 0.75rem', textAlign: 'center' }}>
                <div style={{ fontSize: '1.1rem', fontWeight: 900, color: m.renk }}>{m.val}</div>
                <div style={{ fontSize: 10, color: 'var(--muted)' }}>{m.label}</div>
              </div>
            ))}
          </div>
        </div>
        {/* Yazdır + E-posta butonları */}
        <div style={{ position: 'absolute', top: 12, right: 12, display: 'flex', gap: 6 }}>
          <button
            onClick={() => window.print()}
            style={{
              padding: '0.35rem 0.85rem', borderRadius: 7, fontSize: 11, fontWeight: 600,
              border: '1px solid var(--border)', background: 'var(--surface)', color: 'var(--text)',
              cursor: 'pointer',
            }}
          >🖨️ Yazdır</button>
          <button
            onClick={() => { setEmailPanel(p => !p); setEmailSonuc(null); }}
            style={{
              padding: '0.35rem 0.85rem', borderRadius: 7, fontSize: 11, fontWeight: 600,
              border: `1px solid ${emailPanel ? '#6366f1' : 'var(--border)'}`,
              background: emailPanel ? 'rgba(99,102,241,0.15)' : 'var(--surface)',
              color: emailPanel ? '#6366f1' : 'var(--text)', cursor: 'pointer',
            }}
          >📧 E-posta Gönder</button>
        </div>

        {/* E-posta Paneli */}
        {emailPanel && (
          <div style={{
            position: 'absolute', top: 48, right: 12, zIndex: 10,
            background: 'var(--surface)', border: '1px solid #6366f144',
            borderRadius: 12, padding: '1rem', width: 300,
            boxShadow: '0 8px 32px rgba(0,0,0,0.3)',
            animation: 'fadeIn 0.15s',
          }}>
            <div style={{ fontSize: 12, fontWeight: 700, marginBottom: 8, color: 'var(--text)' }}>
              📧 Raporu E-posta ile Gönder
            </div>
            <div style={{ fontSize: 11, color: 'var(--muted)', marginBottom: 8 }}>
              Alıcı: <strong>{oturum.aday_ad} {oturum.aday_soyad}</strong>
            </div>
            <input
              type="email"
              value={emailAdres}
              onChange={e => setEmailAdres(e.target.value)}
              placeholder="ornek@email.com"
              style={{ width: '100%', marginBottom: 8, fontSize: 12 }}
              onKeyDown={e => e.key === 'Enter' && emailGonder()}
            />
            <button
              onClick={emailGonder}
              disabled={emailGonderen || !emailAdres.trim()}
              style={{
                width: '100%', padding: '0.5rem', borderRadius: 7, border: 'none', fontSize: 12,
                fontWeight: 700, background: emailGonderen ? 'var(--muted)' : '#6366f1',
                color: '#fff', cursor: emailGonderen ? 'not-allowed' : 'pointer',
              }}
            >
              {emailGonderen ? '⚙️ Gönderiliyor...' : '✈️ Gönder'}
            </button>
            {emailSonuc && (
              <div style={{
                marginTop: 8, fontSize: 11, padding: '6px 10px', borderRadius: 6,
                background: emailSonuc.ok ? 'rgba(34,197,94,0.1)' : 'rgba(239,68,68,0.1)',
                color: emailSonuc.ok ? '#22c55e' : '#ef4444',
                lineHeight: 1.5,
              }}>
                {emailSonuc.mesaj}
              </div>
            )}
            {!emailSonuc && (
              <div style={{ marginTop: 8, fontSize: 10, color: 'var(--muted)', lineHeight: 1.5 }}>
                SMTP ayarları için backend .env dosyasını güncelleyin.
              </div>
            )}
          </div>
        )}

      </div>

      {/* ── BÖLÜM 1: Performans Klasman Tablosu ────────────── */}
      <Kart style={{ marginBottom: '1.25rem' }}>
        <BolumBaslik no="1" ikon="🏅" baslik="Performans Klasman Tablosu" />
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
            <thead>
              <tr style={{ borderBottom: '2px solid var(--border)' }}>
                {['', 'Doğru Cevap Oranı (%)', 'Çalışan Statüsü', 'Gelecek Potansiyeli ve Verimlilik'].map((h, i) => (
                  <th key={i} style={{ padding: '0.5rem 0.75rem', textAlign: 'left', fontSize: 10, fontWeight: 800, color: 'var(--muted)', textTransform: 'uppercase', letterSpacing: '0.06em' }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {KLASMAN.map((k, i) => {
                const benBurada = basari >= k.min && basari <= k.max;
                return (
                  <tr key={i} style={{
                    background: benBurada ? k.bg : 'transparent',
                    border: benBurada ? `1px solid ${k.renk}44` : 'none',
                    borderRadius: benBurada ? 8 : 0,
                    transition: 'background 0.2s',
                  }}>
                    <td style={{ padding: '0.6rem 0.75rem', textAlign: 'center', fontSize: 16 }}>{benBurada ? k.ikon : <span style={{ opacity: 0.3 }}>{k.ikon}</span>}</td>
                    <td style={{ padding: '0.6rem 0.75rem' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                        <span style={{ fontWeight: benBurada ? 800 : 400, color: benBurada ? k.renk : 'var(--muted)' }}>
                          %{k.min} — %{k.max}
                        </span>
                        {benBurada && (
                          <span style={{ fontSize: 10, padding: '2px 8px', borderRadius: 10, background: k.renk, color: '#fff', fontWeight: 700 }}>
                            SİZ
                          </span>
                        )}
                      </div>
                    </td>
                    <td style={{ padding: '0.6rem 0.75rem', fontWeight: benBurada ? 700 : 400, color: benBurada ? 'var(--text)' : 'var(--muted)' }}>
                      {k.durum}
                    </td>
                    <td style={{ padding: '0.6rem 0.75rem', fontSize: 12, color: benBurada ? 'var(--text)' : 'var(--muted)', lineHeight: 1.4 }}>
                      {k.potansiyel}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
        {/* Mini bilgi notu */}
        <div style={{ marginTop: '1rem', padding: '0.6rem 0.9rem', background: 'var(--surface2)', borderRadius: 8, fontSize: 12, color: 'var(--muted)', fontStyle: 'italic' }}>
          ℹ️ Doğru cevap sayısı ne kadar yüksekse, kişinin gelecekteki iş üretkenliği ve başarısı o kadar katlanarak artacaktır.
        </div>
      </Kart>

      {/* ── BÖLÜM 2: Araç Bazlı Performans Analizi ─────────── */}
      <Kart style={{ marginBottom: '1.25rem' }}>
        <BolumBaslik no="2" ikon="📊" baslik="Geçmiş Dönem Performans Analizi (Araç Bazlı)" />
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          {gruplar.map((g, i) => {
            const renk = getAracRenk(g.oran);
            const etiket = g.oran >= 70 ? 'Güçlü Alan' : g.oran >= 60 ? 'Beklenen' : g.oran >= 50 ? 'Sınırda' : 'Gelişim Alanı';
            return (
              <div key={i} style={{ background: 'var(--surface2)', borderRadius: 10, padding: '1rem', border: `1px solid ${renk}22` }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 8 }}>
                  <div style={{
                    width: 32, height: 32, borderRadius: '50%', background: `${renk}22`,
                    border: `2px solid ${renk}`, display: 'flex', alignItems: 'center',
                    justifyContent: 'center', fontWeight: 900, fontSize: 12, color: renk, flexShrink: 0,
                  }}>{i + 1}</div>
                  <div style={{ flex: 1 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      <span style={{ fontWeight: 700, fontSize: 13 }}>{i + 1}. Araç</span>
                      <span style={{ fontSize: 10, padding: '1px 8px', borderRadius: 8, background: `${renk}22`, color: renk, fontWeight: 700 }}>{etiket}</span>
                    </div>
                    <div style={{ fontSize: 11, color: 'var(--muted)' }}>{g.dogru}/{g.toplam} doğru cevap</div>
                  </div>
                  <div style={{ fontSize: '1.2rem', fontWeight: 900, color: renk }}>{g.oran}%</div>
                </div>

                {/* İlerleme çubuğu */}
                <div style={{ height: 6, background: 'var(--border)', borderRadius: 4, overflow: 'hidden', marginBottom: 8 }}>
                  <div style={{
                    height: '100%', width: `${g.oran}%`, background: renk,
                    borderRadius: 4, transition: 'width 0.8s ease',
                  }} />
                </div>

                {/* Analiz metni */}
                <div style={{ fontSize: 12, color: 'var(--muted)', lineHeight: 1.6 }}>
                  {getAracMetni(i, g.oran)}
                </div>
              </div>
            );
          })}
        </div>

        {/* Kümülatif bar karşılaştırma */}
        <div style={{ marginTop: '1rem', padding: '1rem', background: 'var(--surface)', borderRadius: 10, border: '1px solid var(--border)' }}>
          <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--muted)', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 10 }}>
            Araç Performans Karşılaştırması
          </div>
          <div style={{ display: 'flex', alignItems: 'flex-end', gap: 6, height: 60 }}>
            {gruplar.map((g, i) => {
              const renk = getAracRenk(g.oran);
              return (
                <div key={i} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 3 }}>
                  <div style={{ fontSize: 9, fontWeight: 700, color: renk }}>{g.oran}%</div>
                  <div style={{ width: '100%', height: `${Math.max(4, g.oran * 0.5)}px`, background: renk, borderRadius: '3px 3px 0 0', minHeight: 4, transition: 'height 0.8s ease' }} />
                  <div style={{ fontSize: 9, color: 'var(--muted)' }}>A{i + 1}</div>
                </div>
              );
            })}
            {/* %80 referans çizgisi */}
            <div style={{ position: 'absolute', left: 0, right: 0, height: 1, background: '#22c55e44', top: 20, pointerEvents: 'none' }} />
          </div>
        </div>
      </Kart>

      {/* ── BÖLÜM 3: Yol Haritası ve Aksiyon Planı ──────────── */}
      <Kart style={{ marginBottom: '1.25rem' }}>
        <BolumBaslik no="3" ikon="🗺️" baslik="Geleceğe Yönelik Yol Haritası ve Aksiyon Planı" />

        {/* Kritik kural */}
        <div style={{ background: 'rgba(99,102,241,0.1)', border: '1px solid rgba(99,102,241,0.3)', borderRadius: 9, padding: '0.75rem 1rem', marginBottom: '1rem', fontSize: 12, color: 'var(--text)', lineHeight: 1.6 }}>
          <span style={{ fontWeight: 800, color: 'var(--accent)' }}>⚡ Kritik Kural: </span>
          Doğru cevap sayısı ne kadar yüksekse, kişinin gelecekteki iş üretkenliği ve başarısı o kadar katlanarak artacaktır. Bu plan, hedefi %80 üzerine çıkarmak için tasarlanmıştır.
        </div>

        {/* Aksiyon kartları */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          {aksiyonlar.map((a, i) => (
            <div key={i} style={{ display: 'flex', gap: 12, padding: '1rem', background: 'var(--surface2)', borderRadius: 10, borderLeft: `4px solid ${a.renk}` }}>
              <div style={{ fontSize: 22, flexShrink: 0, marginTop: 1 }}>{a.ikon}</div>
              <div>
                <div style={{ fontWeight: 700, fontSize: 13, color: a.renk, marginBottom: 4 }}>{a.baslik}</div>
                <div style={{ fontSize: 12, color: 'var(--muted)', lineHeight: 1.7 }}>{a.metin}</div>
              </div>
            </div>
          ))}
        </div>

        {/* AI Analiz Butonu */}
        <div style={{ marginTop: '1.25rem', borderTop: '1px dashed var(--border)', paddingTop: '1rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: aiMetin ? '0.75rem' : 0 }}>
            <div style={{ fontSize: 12, color: 'var(--muted)' }}>
              🤖 AI destekli kişiselleştirilmiş analiz isteğe bağlı
            </div>
            <button
              onClick={aiAnalizBaslat}
              disabled={aiYukleniyor}
              style={{
                padding: '0.45rem 1.1rem', borderRadius: 8, fontSize: 12, fontWeight: 700,
                border: 'none', background: aiYukleniyor ? 'var(--muted)' : 'linear-gradient(135deg, #6366f1, #8b5cf6)',
                color: '#fff', cursor: aiYukleniyor ? 'not-allowed' : 'pointer',
              }}
            >
              {aiYukleniyor ? '⚙️ Analiz ediliyor...' : '✦ AI ile Derinlemesine Analiz'}
            </button>
          </div>

          {aiMetin && (
            <div style={{ background: 'var(--surface)', border: '1px solid rgba(99,102,241,0.3)', borderRadius: 10, padding: '1rem', fontSize: 13, lineHeight: 1.8, color: 'var(--text)', whiteSpace: 'pre-wrap', animation: 'fadeIn 0.3s' }}>
              {aiMetin}
              {aiYukleniyor && <span style={{ animation: 'blink 1s infinite' }}>▋</span>}
            </div>
          )}
          {aiHata && <div style={{ color: '#ef4444', fontSize: 12, marginTop: 6 }}>Hata: {aiHata}</div>}
        </div>
      </Kart>

      {/* ── BÖLÜM 4: Nihai Değerlendirme ve Skorlama ───────── */}
      <Kart>
        <BolumBaslik no="4" ikon="💯" baslik="Nihai Değerlendirme ve Skorlama" />

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 14 }}>
          {/* Doğru cevap oranı */}
          <div style={{ background: 'var(--surface2)', borderRadius: 10, padding: '1.25rem', textAlign: 'center' }}>
            <div style={{ fontSize: 10, fontWeight: 700, color: 'var(--muted)', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 6 }}>
              Toplam Doğru Cevap Oranı
            </div>
            <div style={{ fontSize: '2rem', fontWeight: 900, color: klas.renk, lineHeight: 1 }}>
              %{Math.round(basari)}
            </div>
            <div style={{ fontSize: 11, color: 'var(--muted)', marginTop: 4 }}>
              {oturum.dogru_sayisi} doğru / {detay.length} soru
            </div>
          </div>

          {/* Geçmiş performans notu */}
          <div style={{ background: 'var(--surface2)', borderRadius: 10, padding: '1.25rem', textAlign: 'center' }}>
            <div style={{ fontSize: 10, fontWeight: 700, color: 'var(--muted)', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 6 }}>
              Geçmiş Performans Notu
            </div>
            <div style={{ fontSize: 13, fontWeight: 800, color: klas.renk, lineHeight: 1.4 }}>
              {klas.durum}
            </div>
            <div style={{ fontSize: 11, color: 'var(--muted)', marginTop: 4 }}>
              {klas.ikon}
            </div>
          </div>

          {/* Gelecek potansiyel notu */}
          <div style={{ background: 'var(--surface2)', borderRadius: 10, padding: '1.25rem', textAlign: 'center' }}>
            <div style={{ fontSize: 10, fontWeight: 700, color: 'var(--muted)', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 6 }}>
              Gelecek Potansiyel Notu
            </div>
            <div style={{ fontSize: 13, fontWeight: 800, color: basari >= 70 ? '#22c55e' : basari >= 50 ? '#f59e0b' : '#ef4444', lineHeight: 1.4 }}>
              {basari >= 80 ? 'Liderliğe Hazır' : basari >= 70 ? 'Verimliliği Artırılabilir' : basari >= 60 ? 'Gelişime Açık' : basari >= 50 ? 'Yoğun Destek Gerekli' : 'Radikal Değişim Gerekli'}
            </div>
            <div style={{ fontSize: 11, color: 'var(--muted)', marginTop: 4 }}>
              {basari >= 70 ? '📈 Yükselen' : basari >= 50 ? '📊 Gelişiyor' : '⬇️ Kritik'}
            </div>
          </div>
        </div>

        {/* Büyük Skor Gösterimi */}
        <div style={{
          marginTop: '1.25rem', textAlign: 'center', padding: '1.5rem',
          background: klas.bg, borderRadius: 12, border: `2px solid ${klas.renk}33`,
        }}>
          <div style={{ fontSize: 11, fontWeight: 800, color: klas.renk, letterSpacing: '0.1em', textTransform: 'uppercase', marginBottom: 8 }}>
            💯 Genel Başarı Skoru
          </div>
          <div style={{ fontSize: '3rem', fontWeight: 900, color: klas.renk, lineHeight: 1 }}>
            {Math.round(basari)}
          </div>
          <div style={{ fontSize: 14, color: 'var(--muted)', marginTop: 4 }}>100 Üzerinden Puan</div>

          {/* Skor ilerlemesi */}
          <div style={{ maxWidth: 400, margin: '1rem auto 0' }}>
            <div style={{ height: 8, background: 'var(--border)', borderRadius: 4, overflow: 'hidden' }}>
              <div style={{ height: '100%', width: `${basari}%`, background: `linear-gradient(90deg, ${klas.renk}88, ${klas.renk})`, borderRadius: 4, transition: 'width 1s ease' }} />
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 9, color: 'var(--muted)', marginTop: 4 }}>
              <span>0</span><span>25</span><span>50</span><span>75</span><span>100</span>
            </div>
          </div>

          <div style={{ marginTop: '0.75rem', fontSize: 12, color: 'var(--muted)', fontStyle: 'italic', maxWidth: 480, margin: '0.75rem auto 0', lineHeight: 1.5 }}>
            Doğru cevap sayısı arttıkça bu skor 100'e yaklaşacak ve kişinin işe kabul / devam / terfi şansı yavaş yavaş en üst seviyeye çıkacaktır.
          </div>
        </div>

        {/* İmza ve Tarih Bölümü */}
        <div style={{
          marginTop: '1.25rem', paddingTop: '1.25rem',
          borderTop: '2px dashed var(--border)',
          display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '2rem',
        }}>
          <div>
            <div style={{ fontSize: 10, color: 'var(--muted)', marginBottom: 4 }}>Aday / Çalışan Adı Soyadı</div>
            <div style={{ fontWeight: 700, fontSize: 14 }}>{oturum.aday_ad} {oturum.aday_soyad}</div>
            {oturum.aday_pozisyon && <div style={{ fontSize: 12, color: 'var(--muted)' }}>{oturum.aday_pozisyon}</div>}
            {oturum.aday_sirket && <div style={{ fontSize: 12, color: 'var(--muted)' }}>{oturum.aday_sirket}</div>}
          </div>
          <div style={{ textAlign: 'right' }}>
            <div style={{ fontSize: 10, color: 'var(--muted)', marginBottom: 4 }}>Değerlendirme Tarihi ve Saati</div>
            <div style={{ fontWeight: 700, fontSize: 14 }}>
              {new Date(oturum.bitis || oturum.baslangic).toLocaleDateString('tr-TR', { day:'2-digit', month:'long', year:'numeric' })}
            </div>
            <div style={{ fontSize: 12, color: 'var(--muted)' }}>
              {new Date(oturum.bitis || oturum.baslangic).toLocaleTimeString('tr-TR', { hour:'2-digit', minute:'2-digit' })}
            </div>
          </div>
          <div style={{ borderTop: '1px solid var(--border)', paddingTop: 8 }}>
            <div style={{ fontSize: 10, color: 'var(--muted)', marginBottom: 4 }}>Test Adı</div>
            <div style={{ fontWeight: 600, fontSize: 12 }}>{oturum.proje_adi}</div>
          </div>
          <div style={{ borderTop: '1px solid var(--border)', paddingTop: 8, textAlign: 'right' }}>
            <div style={{ fontSize: 10, color: 'var(--muted)', marginBottom: 4 }}>İmza Onayı</div>
            <div style={{ fontSize: 12, color: '#22c55e', fontWeight: 600 }}>✅ Onaylandı</div>
          </div>
        </div>
      </Kart>
    </div>
  );
}

/* ─── ANA SAYFA ──────────────────────────────────────── */
export default function PerformansRaporu() {
  const [oturumlar, setOturumlar] = useState([]);
  const [secili, setSecili] = useState(null);
  const [rapor, setRapor] = useState(null);
  const [raporYukleniyor, setRaporYukleniyor] = useState(false);
  const [listYukleniyor, setListYukleniyor] = useState(true);
  const [arama, setArama] = useState('');

  useEffect(() => {
    fetch(`${API}/api/testler/oturum`, { headers: aH() })
      .then(r => r.json())
      .then(d => setOturumlar(Array.isArray(d) ? d : []))
      .catch(() => setOturumlar([]))
      .finally(() => setListYukleniyor(false));
  }, []);

  async function raporYukle(oturum) {
    setSecili(oturum);
    setRapor(null);
    setRaporYukleniyor(true);
    try {
      const res = await fetch(`${API}/api/testler/oturum/${oturum.id}/rapor`, { headers: aH() });
      const data = await res.json();
      setRapor(data);
    } catch (e) { alert('Rapor yüklenemedi: ' + e.message); }
    finally { setRaporYukleniyor(false); }
  }

  const filtreli = oturumlar.filter(o => {
    const q = arama.toLowerCase();
    return (
      `${o.aday_ad} ${o.aday_soyad}`.toLowerCase().includes(q) ||
      (o.proje_adi || '').toLowerCase().includes(q) ||
      (o.aday_sirket || '').toLowerCase().includes(q)
    );
  });

  return (
    <div style={{ animation: 'fadeIn 0.2s', display: 'grid', gridTemplateColumns: '280px 1fr', gap: 16, alignItems: 'start', minHeight: '80vh' }}>

      {/* ── Sol Panel: Oturum Listesi ───────────────────────── */}
      <div style={{ position: 'sticky', top: 0 }}>
        <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 12, overflow: 'hidden' }}>
          <div style={{ padding: '1rem', borderBottom: '1px solid var(--border)' }}>
            <div style={{ fontSize: 12, fontWeight: 800, color: 'var(--text)', marginBottom: 8 }}>
              📋 Test Oturumları
            </div>
            <input
              value={arama} onChange={e => setArama(e.target.value)}
              placeholder="Aday veya test ara..."
              style={{ width: '100%', fontSize: 12 }}
            />
          </div>
          <div style={{ padding: '0.5rem', maxHeight: 'calc(100vh - 160px)', overflowY: 'auto' }}>
            {listYukleniyor
              ? <div style={{ textAlign: 'center', padding: '2rem', color: 'var(--muted)', fontSize: 12 }}>Yükleniyor...</div>
              : <OturumListesi oturumlar={filtreli} secili={secili} onSecim={raporYukle} />
            }
          </div>
        </div>

        {/* İstatistik özeti */}
        {oturumlar.length > 0 && (
          <div style={{ marginTop: 10, background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 10, padding: '0.85rem' }}>
            <div style={{ fontSize: 10, fontWeight: 700, color: 'var(--muted)', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 8 }}>
              Genel İstatistik
            </div>
            {[
              { label: 'Toplam Katılımcı', val: oturumlar.length },
              {
                label: 'Ortalama Başarı',
                val: `%${Math.round(oturumlar.reduce((s, o) => s + parseFloat(o.basari_yuzdesi || 0), 0) / oturumlar.length)}`,
                renk: (() => {
                  const ort = oturumlar.reduce((s, o) => s + parseFloat(o.basari_yuzdesi || 0), 0) / oturumlar.length;
                  return getKlasman(ort).renk;
                })(),
              },
              { label: '%80+ Başaran', val: oturumlar.filter(o => parseFloat(o.basari_yuzdesi || 0) >= 80).length },
            ].map((s, i) => (
              <div key={i} style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, marginBottom: 4 }}>
                <span style={{ color: 'var(--muted)' }}>{s.label}</span>
                <span style={{ fontWeight: 700, color: s.renk || 'var(--text)' }}>{s.val}</span>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* ── Sağ Panel: Rapor ────────────────────────────────── */}
      <div>
        {!secili && !raporYukleniyor && (
          <div style={{
            display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
            minHeight: 400, gap: 12, color: 'var(--muted)',
            background: 'var(--surface)', border: '1px dashed var(--border)', borderRadius: 14,
          }}>
            <div style={{ fontSize: 48, opacity: 0.3 }}>📊</div>
            <div style={{ fontSize: 14, fontWeight: 600 }}>Rapor görüntülemek için sol taraftan bir oturum seçin</div>
            <div style={{ fontSize: 12, opacity: 0.7 }}>4 bölümlü detaylı performans analizi görüntülenecek</div>
          </div>
        )}

        {raporYukleniyor && (
          <div style={{
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            minHeight: 400, gap: 10, color: 'var(--muted)',
          }}>
            <div style={{ width: 20, height: 20, border: '2px solid var(--border)', borderTop: '2px solid var(--accent)', borderRadius: '50%', animation: 'spin 0.8s linear infinite' }} />
            Rapor yükleniyor...
          </div>
        )}

        {rapor && !raporYukleniyor && <TamRapor rapor={rapor} />}
      </div>
    </div>
  );
}
