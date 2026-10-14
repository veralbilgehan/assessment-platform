import { useState, useRef, useEffect } from 'react';
import { CV_KARSILASTIR_SSE, CV_KARSILASTIR_KRITERLER } from '../api/index.js';

const MAKS_CV = 10;
const RENKLER = ['#6366f1', '#05a37b', '#f59e0b', '#ef4444', '#0ea5e9', '#8b5cf6', '#ec4899', '#14b8a6', '#84cc16', '#f97316'];

function aH() { const t = localStorage.getItem('token'); return t ? { Authorization: `Bearer ${t}` } : {}; }

/* ─── Ortak UI ─────────────────────────────────────── */
function Kart({ children, style }) {
  return <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 'var(--radius)', padding: '1.25rem', ...style }}>{children}</div>;
}
function Baslik({ children, alt }) {
  return (
    <div style={{ marginBottom: 12 }}>
      <div style={{ fontSize: 15, fontWeight: 700 }}>{children}</div>
      {alt && <div style={{ fontSize: 12, color: 'var(--muted)', marginTop: 2 }}>{alt}</div>}
    </div>
  );
}
function Lbl({ children }) {
  return <div style={{ fontSize: 11, textTransform: 'uppercase', letterSpacing: '0.06em', color: 'var(--muted)', marginBottom: 5 }}>{children}</div>;
}
function Btn({ onClick, disabled, children, ikincil, style }) {
  return (
    <button onClick={onClick} disabled={disabled} style={{
      padding: '0.55rem 1.1rem', border: ikincil ? '1px solid var(--border)' : 'none', borderRadius: 8, fontSize: 13, fontWeight: 600,
      background: ikincil ? 'var(--surface2)' : 'var(--accent)', color: ikincil ? 'var(--text)' : '#fff',
      cursor: disabled ? 'not-allowed' : 'pointer', opacity: disabled ? 0.5 : 1, ...style,
    }}>{children}</button>
  );
}
const inputStil = { width: '100%', padding: '0.55rem 0.75rem', border: '1px solid var(--border)', borderRadius: 8, background: 'var(--surface)', color: 'var(--text)', fontSize: 13, boxSizing: 'border-box' };

function puanRengi(p) {
  if (p >= 8) return { bg: 'rgba(22,163,74,0.15)', fg: 'var(--green)' };
  if (p >= 6) return { bg: 'rgba(99,102,241,0.12)', fg: 'var(--accent)' };
  if (p >= 4) return { bg: 'rgba(202,138,4,0.15)', fg: 'var(--yellow)' };
  return { bg: 'rgba(220,38,38,0.12)', fg: 'var(--red)' };
}

/* ─── 1. Kurulum: dosyalar, pozisyon, ağırlıklar ──── */
function DosyaAlani({ dosyalar, setDosyalar }) {
  const [drag, setDrag] = useState(false);
  const ref = useRef();

  function ekle(liste) {
    const yeni = [...liste].filter(f => /\.(pdf|docx|txt)$/i.test(f.name));
    setDosyalar(eski => {
      const adlar = new Set(eski.map(f => f.name));
      return [...eski, ...yeni.filter(f => !adlar.has(f.name))].slice(0, MAKS_CV);
    });
  }

  return (
    <div>
      <div
        onClick={() => ref.current.click()}
        onDragOver={e => { e.preventDefault(); setDrag(true); }}
        onDragLeave={() => setDrag(false)}
        onDrop={e => { e.preventDefault(); setDrag(false); ekle(e.dataTransfer.files); }}
        style={{
          border: `2px dashed ${drag ? 'var(--accent)' : 'var(--border)'}`, borderRadius: 10, padding: '1.5rem',
          textAlign: 'center', cursor: 'pointer', background: drag ? 'var(--accent-dim)' : 'transparent',
        }}
      >
        <div style={{ fontSize: 28 }}>📂</div>
        <div style={{ fontSize: 13, fontWeight: 600, marginTop: 4 }}>CV dosyalarını sürükleyin veya tıklayın</div>
        <div style={{ fontSize: 12, color: 'var(--muted)', marginTop: 2 }}>PDF, DOCX veya TXT · 2–{MAKS_CV} aday · dosya başına en fazla 10 MB</div>
        <input ref={ref} type="file" multiple accept=".pdf,.docx,.txt" hidden onChange={e => { ekle(e.target.files); e.target.value = ''; }} />
      </div>
      {dosyalar.length > 0 && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 6, marginTop: 10 }}>
          {dosyalar.map((f, i) => (
            <div key={f.name} style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 13, padding: '6px 10px', background: 'var(--surface2)', borderRadius: 8 }}>
              <span style={{ width: 10, height: 10, borderRadius: '50%', background: RENKLER[i] }} />
              <span style={{ flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{f.name}</span>
              <span style={{ color: 'var(--muted)', fontSize: 11 }}>{(f.size / 1024).toFixed(0)} KB</span>
              <button onClick={() => setDosyalar(d => d.filter(x => x !== f))} style={{ border: 'none', background: 'none', cursor: 'pointer', color: 'var(--red)' }}>✕</button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function AgirlikPaneli({ kriterler, setKriterler }) {
  const toplam = kriterler.reduce((t, k) => t + Number(k.agirlik), 0);
  if (!kriterler.length) {
    return <div style={{ fontSize: 12, color: 'var(--muted)' }}>Kriter listesi yüklenemedi — varsayılan ağırlıklar kullanılacak.</div>;
  }
  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8 }}>
        <Lbl>Kriter Ağırlıkları</Lbl>
        <span style={{ fontSize: 11, color: toplam === 100 ? 'var(--green)' : 'var(--yellow)' }}>
          Toplam %{toplam}{toplam !== 100 && ' (oransal normalize edilir)'}
        </span>
      </div>
      {kriterler.map(k => (
        <div key={k.kod} style={{ display: 'grid', gridTemplateColumns: '1fr 120px 40px', alignItems: 'center', gap: 8, marginBottom: 6 }} title={k.aciklama}>
          <span style={{ fontSize: 12 }}>{k.ad}</span>
          <input type="range" min="0" max="40" value={k.agirlik}
            onChange={e => setKriterler(ks => ks.map(x => x.kod === k.kod ? { ...x, agirlik: Number(e.target.value) } : x))} />
          <span style={{ fontSize: 12, fontWeight: 600, textAlign: 'right' }}>%{k.agirlik}</span>
        </div>
      ))}
    </div>
  );
}

/* ─── 2. Sonuç bileşenleri ─────────────────────────── */
function Siralama({ siralama, analiz, profiller }) {
  const enIyi = analiz.en_iyi_aday;
  const alt = analiz.alternatif_aday;
  return (
    <Kart>
      <Baslik alt="Ağırlıklı toplam puan (0–100) seçtiğiniz kriter ağırlıklarıyla hesaplanmıştır">🏆 Aday Sıralaması</Baslik>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
        {siralama.map(s => {
          const oneri = enIyi?.aday_no === s.aday_no;
          return (
            <div key={s.aday_no} style={{
              display: 'grid', gridTemplateColumns: '36px 1fr 2fr 60px', alignItems: 'center', gap: 10, padding: '10px 12px', borderRadius: 10,
              border: `1px solid ${oneri ? 'var(--green)' : 'var(--border)'}`, background: oneri ? 'rgba(22,163,74,0.06)' : 'transparent',
            }}>
              <span style={{ fontSize: 18, fontWeight: 800, color: RENKLER[s.aday_no - 1] }}>#{s.sira}</span>
              <div>
                <div style={{ fontWeight: 700, fontSize: 14 }}>{s.ad}</div>
                <div style={{ fontSize: 11, color: 'var(--muted)' }}>
                  {profiller[s.aday_no - 1]?.unvan || '—'}
                  {oneri && <span style={{ color: 'var(--green)', fontWeight: 700 }}> · AI önerisi</span>}
                  {alt?.aday_no === s.aday_no && <span style={{ color: 'var(--accent)', fontWeight: 600 }}> · Alternatif</span>}
                </div>
              </div>
              <div style={{ height: 10, background: 'var(--surface2)', borderRadius: 5, overflow: 'hidden' }}>
                <div style={{ width: `${s.toplam_puan}%`, height: '100%', background: RENKLER[s.aday_no - 1] }} />
              </div>
              <span style={{ fontWeight: 800, fontSize: 16, textAlign: 'right' }}>{s.toplam_puan}</span>
            </div>
          );
        })}
      </div>

      {enIyi && (
        <div style={{ marginTop: 16, padding: '12px 14px', borderRadius: 10, background: 'rgba(22,163,74,0.08)', borderLeft: '4px solid var(--green)' }}>
          <div style={{ fontWeight: 700, fontSize: 14 }}>
            ✅ Önerilen aday: {profiller[enIyi.aday_no - 1]?.ad_soyad || `Aday ${enIyi.aday_no}`}
            <span style={{ fontSize: 11, fontWeight: 500, color: 'var(--muted)' }}> · güven: {enIyi.guven}</span>
          </div>
          <div style={{ fontSize: 13, marginTop: 6, lineHeight: 1.6 }}>{enIyi.gerekce}</div>
          {siralama[0]?.aday_no !== enIyi.aday_no && (
            <div style={{ fontSize: 12, marginTop: 6, color: 'var(--yellow)' }}>
              ⚠️ AI önerisi, ağırlıklı puan sıralamasındaki ilk adaydan farklı — gerekçeyi ve ağırlıkları birlikte değerlendirin.
            </div>
          )}
        </div>
      )}
      {alt && (
        <div style={{ marginTop: 10, fontSize: 13, color: 'var(--muted)' }}>
          <b style={{ color: 'var(--text)' }}>Alternatif — {profiller[alt.aday_no - 1]?.ad_soyad || `Aday ${alt.aday_no}`}:</b> {alt.gerekce}
        </div>
      )}
    </Kart>
  );
}

function PuanMatrisi({ kriterler, analiz, profiller }) {
  const [acik, setAcik] = useState(null);
  return (
    <Kart style={{ overflowX: 'auto' }}>
      <Baslik alt="Hücreye tıklayarak AI gerekçesini görün">📊 Kriter Bazında Puan Matrisi (0–10)</Baslik>
      <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
        <thead>
          <tr>
            <th style={{ textAlign: 'left', padding: 8, borderBottom: '1px solid var(--border)' }}>Kriter</th>
            {profiller.map((p, i) => (
              <th key={i} style={{ padding: 8, borderBottom: '1px solid var(--border)', color: RENKLER[i], minWidth: 90 }}>{p.ad_soyad || p._dosya}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {kriterler.map(k => {
            const puanlar = profiller.map((_, i) => Number(analiz.adaylar?.find(a => a.aday_no === i + 1)?.puanlar?.[k.kod]?.puan ?? 0));
            const maks = Math.max(...puanlar);
            return (
              <tr key={k.kod}>
                <td style={{ padding: 8, borderBottom: '1px solid var(--border)' }}>
                  {k.ad} <span style={{ fontSize: 11, color: 'var(--muted)' }}>%{k.agirlik}</span>
                </td>
                {puanlar.map((p, i) => {
                  const { bg, fg } = puanRengi(p);
                  const anahtar = `${k.kod}-${i}`;
                  return (
                    <td key={i} onClick={() => setAcik(acik === anahtar ? null : anahtar)}
                      style={{ padding: 6, borderBottom: '1px solid var(--border)', textAlign: 'center', cursor: 'pointer' }}>
                      <span style={{ display: 'inline-block', minWidth: 34, padding: '3px 8px', borderRadius: 6, background: bg, color: fg, fontWeight: 700, outline: p === maks && maks > 0 ? `2px solid ${fg}` : 'none' }}>
                        {p}
                      </span>
                      {acik === anahtar && (
                        <div style={{ fontSize: 11, color: 'var(--muted)', marginTop: 4, textAlign: 'left', maxWidth: 220 }}>
                          {analiz.adaylar?.find(a => a.aday_no === i + 1)?.puanlar?.[k.kod]?.gerekce}
                        </div>
                      )}
                    </td>
                  );
                })}
              </tr>
            );
          })}
        </tbody>
      </table>
    </Kart>
  );
}

function ProfilTablosu({ profiller }) {
  const satirlar = [
    ['En yüksek derece', p => p.en_yuksek_derece || '—'],
    ['Eğitim', p => (p.egitim || []).map(e => `${e.derece} ${e.bolum} — ${e.okul}`).join('\n') || '—'],
    ['Toplam deneyim', p => p.toplam_deneyim_yil != null ? `${p.toplam_deneyim_yil} yıl` : '—'],
    ['Son pozisyon', p => { const d = p.deneyimler?.[0]; return d ? `${d.pozisyon} @ ${d.sirket}` : '—'; }],
    ['İş yeri sayısı', p => new Set((p.deneyimler || []).filter(d => !d.staj_mi).map(d => d.sirket)).size],
    ['Sertifikalar', p => (p.sertifikalar || []).map(s => s.ad).join('\n') || '—'],
    ['Proje sayısı', p => (p.projeler || []).length],
    ['Ölçülebilir sonuçlu proje', p => (p.projeler || []).filter(x => x.olculebilir_sonuc_var_mi).length],
    ['Öne çıkan proje sonuçları', p => (p.projeler || []).flatMap(x => x.sonuclar || []).slice(0, 4).join('\n') || '—'],
    ['Yayın / Bildiri / Referat', p => (p.yayinlar || []).length],
    ['Referanslar', p => (p.referanslar || []).map(r => `${r.ad} (${r.unvan || r.iliski || '—'})`).join('\n') || '—'],
    ['Yabancı dil', p => (p.beceriler?.yabanci_dil || []).map(d => `${d.dil} ${d.seviye}`).join(', ') || '—'],
    ['Eksik bilgiler', p => (p.eksik_bilgiler || []).join('\n') || '—'],
  ];
  return (
    <Kart style={{ overflowX: 'auto' }}>
      <Baslik alt="CV'lerden çıkarılan bilgiler yan yana">🗂️ Profil Karşılaştırması</Baslik>
      <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12 }}>
        <thead>
          <tr>
            <th style={{ textAlign: 'left', padding: 8, borderBottom: '1px solid var(--border)', width: 170 }}></th>
            {profiller.map((p, i) => (
              <th key={i} style={{ textAlign: 'left', padding: 8, borderBottom: `3px solid ${RENKLER[i]}`, minWidth: 180 }}>{p.ad_soyad || p._dosya}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {satirlar.map(([ad, fn]) => (
            <tr key={ad}>
              <td style={{ padding: 8, borderBottom: '1px solid var(--border)', color: 'var(--muted)', fontWeight: 600, verticalAlign: 'top' }}>{ad}</td>
              {profiller.map((p, i) => (
                <td key={i} style={{ padding: 8, borderBottom: '1px solid var(--border)', whiteSpace: 'pre-line', verticalAlign: 'top' }}>{fn(p)}</td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </Kart>
  );
}

function Farklar({ analiz, profiller }) {
  return (
    <Kart>
      <Baslik>🔍 Adaylar Arasındaki Temel Farklar</Baslik>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
        {(analiz.farklar || []).map((f, i) => (
          <div key={i} style={{ padding: '8px 12px', borderLeft: `3px solid ${RENKLER[(f.one_cikan_aday_no || 1) - 1]}`, background: 'var(--surface2)', borderRadius: 6 }}>
            <div style={{ fontSize: 12, fontWeight: 700 }}>
              {f.boyut}
              {f.one_cikan_aday_no && <span style={{ fontWeight: 500, color: 'var(--muted)' }}> · öne çıkan: {profiller[f.one_cikan_aday_no - 1]?.ad_soyad}</span>}
            </div>
            <div style={{ fontSize: 13, marginTop: 3 }}>{f.aciklama}</div>
          </div>
        ))}
      </div>
    </Kart>
  );
}

function AdayKartlari({ analiz, profiller }) {
  return (
    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: 12 }}>
      {profiller.map((p, i) => {
        const a = analiz.adaylar?.find(x => x.aday_no === i + 1) || {};
        const sorular = (analiz.mulakat_sorulari || []).filter(s => s.aday_no === i + 1);
        return (
          <Kart key={i} style={{ borderTop: `4px solid ${RENKLER[i]}` }}>
            <div style={{ fontWeight: 700, fontSize: 14 }}>{p.ad_soyad || p._dosya}</div>
            <div style={{ fontSize: 12, color: 'var(--muted)', marginBottom: 8 }}>{a.ozet || p.ozet}</div>
            <Liste baslik="💪 Güçlü yönler" ogeler={a.guclu_yonler} renk="var(--green)" />
            <Liste baslik="⚠️ Zayıf yönler" ogeler={a.zayif_yonler} renk="var(--yellow)" />
            <Liste baslik="🚩 Riskler" ogeler={a.riskler} renk="var(--red)" />
            {sorular.length > 0 && (
              <Liste baslik="🎤 Mülakat soruları" ogeler={sorular.map(s => `${s.soru} — ${s.amac}`)} renk="var(--accent)" />
            )}
          </Kart>
        );
      })}
    </div>
  );
}
function Liste({ baslik, ogeler, renk }) {
  if (!ogeler?.length) return null;
  return (
    <div style={{ marginTop: 8 }}>
      <div style={{ fontSize: 12, fontWeight: 700, color: renk }}>{baslik}</div>
      <ul style={{ margin: '4px 0 0', paddingLeft: 18, fontSize: 12, lineHeight: 1.55 }}>
        {ogeler.map((o, i) => <li key={i}>{o}</li>)}
      </ul>
    </div>
  );
}

/* ─── Ana sayfa ────────────────────────────────────── */
export default function CVKarsilastir() {
  const [dosyalar, setDosyalar] = useState([]);
  const [pozisyon, setPozisyon] = useState('');
  const [nitelikler, setNitelikler] = useState('');
  const [kriterler, setKriterler] = useState([]);
  const [calisiyor, setCalisiyor] = useState(false);
  const [gunluk, setGunluk] = useState([]);
  const [sonuc, setSonuc] = useState(null);
  const [hata, setHata] = useState('');
  const iptalRef = useRef(null);

  useEffect(() => {
    fetch(CV_KARSILASTIR_KRITERLER).then(r => r.json()).then(setKriterler).catch(() => {});
  }, []);

  const log = (m) => setGunluk(g => [...g, m]);

  async function baslat() {
    setHata(''); setSonuc(null); setGunluk([]); setCalisiyor(true);
    const form = new FormData();
    dosyalar.forEach(f => form.append('cvler', f));
    form.append('pozisyon', pozisyon);
    form.append('nitelikler', nitelikler);
    form.append('kriterler', JSON.stringify(kriterler.map(({ kod, agirlik }) => ({ kod, agirlik }))));

    const iptal = new AbortController();
    iptalRef.current = iptal;
    try {
      const res = await fetch(CV_KARSILASTIR_SSE, { method: 'POST', body: form, headers: aH(), signal: iptal.signal });
      if (!res.ok) {
        const j = await res.json().catch(() => ({}));
        throw new Error(j.hata || `Sunucu hatası (${res.status})`);
      }
      const reader = res.body.getReader();
      const dec = new TextDecoder();
      let tampon = '';
      for (;;) {
        const { done, value } = await reader.read();
        if (done) break;
        tampon += dec.decode(value, { stream: true });
        const parcalar = tampon.split('\n\n');
        tampon = parcalar.pop();
        for (const p of parcalar) {
          if (!p.startsWith('data: ')) continue;
          const veri = p.slice(6);
          if (veri === '[DONE]') continue;
          const o = JSON.parse(veri);
          if (o.tip === 'durum') log(`⏳ ${o.mesaj}`);
          else if (o.tip === 'profil') log(`✅ ${o.profil._dosya} → ${o.profil.ad_soyad || 'isim bulunamadı'} (${o.profil.toplam_deneyim_yil ?? '?'} yıl deneyim)`);
          else if (o.tip === 'profil_hata') log(`❌ ${o.dosya}: ${o.hata}`);
          else if (o.tip === 'ilerleme') setGunluk(g => [...g.filter(x => !x.startsWith('✍️')), `✍️ Analiz yazılıyor… ${o.karakter} karakter`]);
          else if (o.tip === 'sonuc') { setSonuc(o); log('🏁 Karşılaştırma tamamlandı'); }
          else if (o.tip === 'hata') setHata(o.hata);
        }
      }
    } catch (e) {
      if (e.name !== 'AbortError') setHata(e.message);
    } finally {
      setCalisiyor(false);
    }
  }

  function jsonIndir() {
    const blob = new Blob([JSON.stringify(sonuc, null, 2)], { type: 'application/json' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = `cv-karsilastirma-${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    URL.revokeObjectURL(a.href);
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16, maxWidth: 1300 }}>
      <div>
        <h2 style={{ margin: 0, fontSize: 20 }}>📑 Çoklu CV Karşılaştırma</h2>
        <div style={{ fontSize: 13, color: 'var(--muted)', marginTop: 4 }}>
          CV'leri yükleyin — eğitim, deneyim, deneyim süresi, sertifikalar, projeler, proje sonuçları, yayınlar ve referanslar
          otomatik çıkarılır, adaylar karşılaştırılır ve en uygun aday gerekçesiyle önerilir.
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(340px, 1fr))', gap: 16 }}>
        <Kart>
          <Baslik alt="Her dosya bir adayı temsil eder">1 · CV Dosyaları</Baslik>
          <DosyaAlani dosyalar={dosyalar} setDosyalar={setDosyalar} />
        </Kart>
        <Kart>
          <Baslik alt="Boş bırakılırsa genel değerlendirme yapılır">2 · Pozisyon ve Kriterler</Baslik>
          <Lbl>Hedef Pozisyon</Lbl>
          <input style={inputStil} value={pozisyon} onChange={e => setPozisyon(e.target.value)} placeholder="ör. Kıdemli Proje Yöneticisi" />
          <div style={{ height: 10 }} />
          <Lbl>Aranan Nitelikler</Lbl>
          <textarea style={{ ...inputStil, minHeight: 80, resize: 'vertical' }} value={nitelikler} onChange={e => setNitelikler(e.target.value)}
            placeholder="ör. En az 5 yıl proje yönetimi, PMP sertifikası, inşaat sektörü deneyimi, ileri İngilizce…" />
          <div style={{ height: 12 }} />
          <AgirlikPaneli kriterler={kriterler} setKriterler={setKriterler} />
        </Kart>
      </div>

      <div style={{ display: 'flex', gap: 10, alignItems: 'center', flexWrap: 'wrap' }}>
        <Btn onClick={baslat} disabled={calisiyor || dosyalar.length < 2}>
          {calisiyor ? '⏳ Analiz ediliyor…' : `🚀 ${dosyalar.length} CV'yi Karşılaştır`}
        </Btn>
        {calisiyor && <Btn ikincil onClick={() => iptalRef.current?.abort()}>İptal</Btn>}
        {sonuc && <Btn ikincil onClick={jsonIndir}>⬇️ JSON indir</Btn>}
        {sonuc && <Btn ikincil onClick={() => window.print()}>🖨️ Yazdır / PDF</Btn>}
        {dosyalar.length < 2 && <span style={{ fontSize: 12, color: 'var(--muted)' }}>En az 2 CV gerekli</span>}
      </div>

      {hata && <Kart style={{ borderColor: 'var(--red)', color: 'var(--red)', fontSize: 13 }}>⚠️ {hata}</Kart>}

      {gunluk.length > 0 && !sonuc && (
        <Kart style={{ fontSize: 12, fontFamily: 'monospace', lineHeight: 1.7 }}>
          {gunluk.map((g, i) => <div key={i}>{g}</div>)}
        </Kart>
      )}

      {sonuc && (
        <>
          <Siralama siralama={sonuc.siralama} analiz={sonuc.analiz} profiller={sonuc.profiller} />
          <PuanMatrisi kriterler={sonuc.kriterler} analiz={sonuc.analiz} profiller={sonuc.profiller} />
          <Farklar analiz={sonuc.analiz} profiller={sonuc.profiller} />
          <ProfilTablosu profiller={sonuc.profiller} />
          <AdayKartlari analiz={sonuc.analiz} profiller={sonuc.profiller} />
          {sonuc.analiz.genel_degerlendirme && (
            <Kart>
              <Baslik>📝 Genel Değerlendirme</Baslik>
              <div style={{ fontSize: 13, lineHeight: 1.7, whiteSpace: 'pre-line' }}>{sonuc.analiz.genel_degerlendirme}</div>
            </Kart>
          )}
          <div style={{ fontSize: 11, color: 'var(--muted)' }}>
            Bu analiz karar destek amaçlıdır; nihai işe alım kararı mülakat ve referans kontrolü ile insan değerlendirici tarafından verilmelidir.
          </div>
        </>
      )}
    </div>
  );
}
