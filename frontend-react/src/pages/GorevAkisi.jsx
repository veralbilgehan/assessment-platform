import { useState, useEffect, useRef } from 'react';

/* ─── Renk sabitleri ─────────────────────────────────── */
const ADIM_RENK = ['#6366f1', '#f97316', '#22c55e', '#f59e0b'];
const ADIM_BG   = ['rgba(99,102,241,0.12)', 'rgba(249,115,22,0.12)', 'rgba(34,197,94,0.12)', 'rgba(245,158,11,0.12)'];

/* ─── Adım Verileri ──────────────────────────────────── */
const ADIMLAR = [
  {
    no: '01',
    ikon: '💬',
    baslik: 'Soru & Cevap ile Görev Tanımla',
    ozet: 'Neye ihtiyacın olduğunu dinamik sorularla anlatırsın.',
    aciklama: 'İşi verecek kişi, sisteme girerek adım adım soruları yanıtlar. Teslim süresi, kullanılacak araçlar, beklenen çıktı kalitesi — her şey net biçimde tanımlanır. Muğlaklık sıfıra iner.',
    etiketler: ['Teslim tarihi', 'Araç seti', 'Çıktı formatı', 'Kapsam sınırı'],
    hedef: 'İş Sahibi',
    motivasyon: 'Sadece soruları cevaplayın — sistem geri kalanını otomatik yapsın.',
    detaylar: [
      { ikon: '🎯', metin: 'Amaç ve kapsam netleşir' },
      { ikon: '⏱️', metin: 'Zaman kısıtları belirlenir' },
      { ikon: '🛠️', metin: 'Araç ve teknoloji gereksinimleri tanımlanır' },
      { ikon: '📐', metin: 'Kalite kriterleri önceden yazılır' },
    ],
  },
  {
    no: '02',
    ikon: '📄',
    baslik: 'Otomatik Şablon Oluşturulur',
    ozet: 'Cevaplar anında standart bir görev şablonuna dönüşür.',
    aciklama: 'İlk aşamadaki yanıtlar otomatik olarak yapılandırılmış bir Görev Şablonu\'na aktarılır. Görevi üstlenecek herkes bu şablonu kopyalar ve aynı kurallar, aynı standartlar çerçevesinde çalışmaya başlar.',
    etiketler: ['Standart format', 'Otomatik oluşum', 'Tek tıkla kopyala'],
    hedef: 'Sistem',
    motivasyon: 'Herkes aynı sayfada, aynı kurallarla başlar — hiçbir adım gözden kaçmaz.',
    detaylar: [
      { ikon: '⚡', metin: 'Anında otomatik dönüşüm' },
      { ikon: '📋', metin: 'Standartlaştırılmış format' },
      { ikon: '🔗', metin: 'Paylaşılabilir şablon linki' },
      { ikon: '✅', metin: 'Kontrol listesi otomatik oluşur' },
    ],
  },
  {
    no: '03',
    ikon: '📤',
    baslik: 'Görevi Al & Teslim Et',
    ozet: 'Hazır şablonla çalış, tamamlandığında sisteme yükle.',
    aciklama: 'Görevi alan kişi ya da kişiler şablonu temel alarak çalışmalarını tamamlar ve sistemе yükler. İş "Tamamlandı" statüsüne geçer ve değerlendirme havuzuna düşer. Süreç şeffaf ve izlenebilirdir.',
    etiketler: ['Dosya yükleme', 'Durum takibi', 'Değerlendirme havuzu'],
    hedef: 'İş Yapan',
    motivasyon: 'Hazır şablonu al, görevi tamamla — diğerleriyle kıyaslanarak öne çık!',
    detaylar: [
      { ikon: '📂', metin: 'Dosya / bağlantı / metin yükleme' },
      { ikon: '🔄', metin: 'Gerçek zamanlı durum güncellemesi' },
      { ikon: '👁️', metin: 'İlerleme tamamen şeffaf' },
      { ikon: '🏁', metin: 'Teslim onayı ve zaman damgası' },
    ],
  },
  {
    no: '04',
    ikon: '⚖️',
    baslik: 'Kıyasla & Kabul Et',
    ozet: 'Çıktılar şablona ve birbirine göre nesnel olarak değerlendirilir.',
    aciklama: 'Sistemin en kritik noktası. İşi yazdıran kişinin beklentileri ile teslim edilen çıktılar kriter bazında karşılaştırılır. Birden fazla kişi aynı görevi yaptıysa hangisi öne çıktığı net görülür. Beklentiyi karşılayan iş onaylanır, süreç kapanır.',
    etiketler: ['Kriter uyumu', 'Performans skoru', 'Onay / Red', 'Sıralama'],
    hedef: 'İş Sahibi + Sistem',
    motivasyon: 'Nesnel, veriye dayalı karar — kişisel önyargı sıfır.',
    detaylar: [
      { ikon: '📊', metin: 'Kriter bazlı uyum skoru' },
      { ikon: '🏆', metin: 'En başarılı teslim öne çıkar' },
      { ikon: '✔️', metin: 'Onay ile süreç kapatılır' },
      { ikon: '📈', metin: 'Geçmiş kıyaslama arşivi' },
    ],
  },
];

/* ─── Animasyonlu Sayaç ──────────────────────────────── */
function SayacAnimasyon({ hedef, suffix = '' }) {
  const [val, setVal] = useState(0);
  const ref = useRef(false);
  const domRef = useRef(null);
  useEffect(() => {
    const obs = new IntersectionObserver(([e]) => {
      if (e.isIntersecting && !ref.current) {
        ref.current = true;
        let start = 0;
        const step = () => {
          start += Math.ceil(hedef / 40);
          if (start >= hedef) { setVal(hedef); return; }
          setVal(start); requestAnimationFrame(step);
        };
        requestAnimationFrame(step);
      }
    }, { threshold: 0.3 });
    if (domRef.current) obs.observe(domRef.current);
    return () => obs.disconnect();
  }, [hedef]);
  return <span ref={domRef}>{val}{suffix}</span>;
}

/* ─── Stepper Üst Bar ────────────────────────────────── */
function Stepper({ aktif, onSecim }) {
  return (
    <div style={{
      display: 'flex', alignItems: 'center', gap: 0,
      background: 'var(--surface)', border: '1px solid var(--border)',
      borderRadius: 14, padding: '6px', marginBottom: '2.5rem',
      overflowX: 'auto',
    }}>
      {ADIMLAR.map((a, i) => (
        <div key={i} style={{ display: 'flex', alignItems: 'center', flex: 1 }}>
          <button
            onClick={() => onSecim(i)}
            style={{
              flex: 1, display: 'flex', alignItems: 'center', gap: 8,
              padding: '0.6rem 1rem', borderRadius: 10, border: 'none',
              background: aktif === i ? ADIM_BG[i] : 'transparent',
              cursor: 'pointer', transition: 'all 0.2s', whiteSpace: 'nowrap',
              outline: aktif === i ? `2px solid ${ADIM_RENK[i]}` : 'none',
              outlineOffset: -2,
            }}
          >
            <span style={{
              width: 28, height: 28, borderRadius: '50%', flexShrink: 0,
              background: aktif === i ? ADIM_RENK[i] : 'var(--surface2)',
              color: aktif === i ? '#fff' : 'var(--muted)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontSize: 12, fontWeight: 800, transition: 'all 0.2s',
            }}>{i + 1}</span>
            <div style={{ textAlign: 'left' }}>
              <div style={{ fontSize: 11, color: aktif === i ? ADIM_RENK[i] : 'var(--muted)', fontWeight: 700, letterSpacing: '0.04em', textTransform: 'uppercase' }}>
                {a.no}
              </div>
              <div style={{ fontSize: 12, fontWeight: aktif === i ? 700 : 400, color: aktif === i ? 'var(--text)' : 'var(--muted)' }}>
                {a.baslik.split(' ').slice(0, 3).join(' ')}…
              </div>
            </div>
          </button>
          {i < ADIMLAR.length - 1 && (
            <div style={{ width: 20, flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <svg width="16" height="10" viewBox="0 0 16 10" fill="none">
                <path d="M1 5h14M10 1l4 4-4 4" stroke={aktif > i ? ADIM_RENK[i] : 'var(--border)'} strokeWidth="1.5" strokeLinecap="round" />
              </svg>
            </div>
          )}
        </div>
      ))}
    </div>
  );
}

/* ─── Detay Kartı ────────────────────────────────────── */
function AdimDetay({ adim, renk, bg, idx }) {
  return (
    <div style={{ animation: 'fadeIn 0.25s', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>

      {/* Sol: Açıklama */}
      <div style={{ background: 'var(--surface)', border: `1px solid ${renk}44`, borderRadius: 14, padding: '1.75rem', position: 'relative', overflow: 'hidden' }}>
        <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: 3, background: renk, borderRadius: '14px 14px 0 0' }} />

        <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: '1.25rem' }}>
          <div style={{ width: 52, height: 52, borderRadius: 14, background: bg, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 24 }}>
            {adim.ikon}
          </div>
          <div>
            <div style={{ fontSize: 10, fontWeight: 800, color: renk, letterSpacing: '0.08em', textTransform: 'uppercase', marginBottom: 3 }}>
              Adım {adim.no}
            </div>
            <h2 style={{ fontSize: '1rem', fontWeight: 800, color: 'var(--text)', lineHeight: 1.3 }}>
              {adim.baslik}
            </h2>
          </div>
        </div>

        <p style={{ fontSize: 13, lineHeight: 1.8, color: 'var(--muted)', marginBottom: '1.25rem' }}>
          {adim.aciklama}
        </p>

        {/* Etiketler */}
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
          {adim.etiketler.map((e, i) => (
            <span key={i} style={{
              fontSize: 11, fontWeight: 600, padding: '3px 10px', borderRadius: 20,
              background: bg, color: renk, border: `1px solid ${renk}33`,
            }}>{e}</span>
          ))}
        </div>

        {/* Motivasyon kutusu */}
        <div style={{
          marginTop: '1.25rem', padding: '0.75rem 1rem',
          background: bg, borderRadius: 8, borderLeft: `3px solid ${renk}`,
        }}>
          <div style={{ fontSize: 10, fontWeight: 700, color: renk, marginBottom: 3, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
            💡 {adim.hedef} için
          </div>
          <div style={{ fontSize: 12, color: 'var(--text)', fontStyle: 'italic', lineHeight: 1.5 }}>
            "{adim.motivasyon}"
          </div>
        </div>
      </div>

      {/* Sağ: Detay listesi + Mini akış */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
        {adim.detaylar.map((d, i) => (
          <div key={i} style={{
            display: 'flex', alignItems: 'center', gap: 12,
            background: 'var(--surface)', border: '1px solid var(--border)',
            borderRadius: 10, padding: '0.85rem 1rem',
            animation: `fadeIn 0.2s ${i * 0.06}s both`,
          }}>
            <div style={{ width: 36, height: 36, borderRadius: 10, background: bg, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 16, flexShrink: 0 }}>
              {d.ikon}
            </div>
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--text)' }}>{d.metin}</div>
            </div>
            <div style={{ width: 8, height: 8, borderRadius: '50%', background: renk, flexShrink: 0 }} />
          </div>
        ))}

        {/* Bağlantı köprüsü */}
        {idx < ADIMLAR.length - 1 && (
          <div style={{
            background: 'var(--surface2)', border: '1px dashed var(--border)',
            borderRadius: 10, padding: '0.75rem 1rem',
            display: 'flex', alignItems: 'center', gap: 8,
            fontSize: 12, color: 'var(--muted)',
          }}>
            <span>Sonraki adım:</span>
            <span style={{ fontWeight: 700, color: ADIM_RENK[idx + 1] }}>
              {ADIMLAR[idx + 1].ikon} {ADIMLAR[idx + 1].baslik}
            </span>
          </div>
        )}
        {idx === ADIMLAR.length - 1 && (
          <div style={{
            background: 'rgba(34,197,94,0.1)', border: '1px solid rgba(34,197,94,0.3)',
            borderRadius: 10, padding: '0.75rem 1rem',
            display: 'flex', alignItems: 'center', gap: 8,
            fontSize: 12, color: '#22c55e', fontWeight: 600,
          }}>
            ✅ Süreç başarıyla tamamlandı — arşive alındı
          </div>
        )}
      </div>
    </div>
  );
}

/* ─── İki Taraflı Perspektif Bölümü ─────────────────── */
function IkiTarafPerspektif() {
  const taraflar = [
    {
      renk: '#6366f1', bg: 'rgba(99,102,241,0.1)',
      ikon: '🏢', baslik: 'İş Sahibi', alt: 'Görevi tanımlayan & değerlendiren',
      adimlar: [
        { no: '01', metin: 'Dinamik form ile görev detaylarını yaz', ikon: '✍️' },
        { no: '02', metin: 'Sistem şablonu otomatik oluşturur', ikon: '⚡' },
        { no: '04', metin: 'Teslim edilen işleri kıyasla & onayla', ikon: '⚖️' },
      ],
      cta: 'Sadece soruları cevaplayın — sistem otomatik şablon oluştursun.',
    },
    {
      renk: '#f97316', bg: 'rgba(249,115,22,0.1)',
      ikon: '🧑‍💻', baslik: 'İş Yapan', alt: 'Görevi teslim eden & öne çıkan',
      adimlar: [
        { no: '02', metin: 'Hazır şablonu bir tıkla al', ikon: '📋' },
        { no: '03', metin: 'Çalışmani tamamla & sisteme yükle', ikon: '📤' },
        { no: '04', metin: 'Diğerleriyle kıyaslanarak öne çık', ikon: '🏆' },
      ],
      cta: 'Hazır şablonu al, görevi tamamla — diğerleriyle kıyaslanarak öne çık!',
    },
  ];

  return (
    <div style={{ marginTop: '3rem' }}>
      <div style={{ textAlign: 'center', marginBottom: '2rem' }}>
        <div style={{ fontSize: 11, fontWeight: 800, color: 'var(--muted)', letterSpacing: '0.1em', textTransform: 'uppercase', marginBottom: 6 }}>
          Perspektif
        </div>
        <h2 style={{ fontSize: '1.3rem', fontWeight: 900, color: 'var(--text)' }}>
          Herkes için farklı, birlikte güçlü
        </h2>
        <p style={{ fontSize: 13, color: 'var(--muted)', marginTop: 6, maxWidth: 460, margin: '6px auto 0' }}>
          Aynı platform, iki farklı deneyim — iş sahibi ve iş yapan birbirini tamamlar.
        </p>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
        {taraflar.map((t, ti) => (
          <div key={ti} style={{
            background: 'var(--surface)', border: `1px solid ${t.renk}33`,
            borderRadius: 14, overflow: 'hidden',
          }}>
            <div style={{ background: t.bg, padding: '1.25rem 1.5rem', borderBottom: `1px solid ${t.renk}22` }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <span style={{ fontSize: 28 }}>{t.ikon}</span>
                <div>
                  <div style={{ fontSize: '1rem', fontWeight: 800, color: t.renk }}>{t.baslik}</div>
                  <div style={{ fontSize: 11, color: 'var(--muted)' }}>{t.alt}</div>
                </div>
              </div>
            </div>

            <div style={{ padding: '1.25rem 1.5rem' }}>
              {t.adimlar.map((a, ai) => (
                <div key={ai} style={{ display: 'flex', alignItems: 'flex-start', gap: 10, marginBottom: ai < t.adimlar.length - 1 ? 14 : 0 }}>
                  <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', flexShrink: 0 }}>
                    <div style={{
                      width: 28, height: 28, borderRadius: '50%',
                      background: t.bg, border: `2px solid ${t.renk}55`,
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      fontSize: 13,
                    }}>{a.ikon}</div>
                    {ai < t.adimlar.length - 1 && (
                      <div style={{ width: 2, height: 16, background: `${t.renk}22`, margin: '3px 0' }} />
                    )}
                  </div>
                  <div style={{ paddingTop: 4 }}>
                    <div style={{ fontSize: 9, fontWeight: 800, color: t.renk, letterSpacing: '0.06em', textTransform: 'uppercase', marginBottom: 2 }}>
                      Adım {a.no}
                    </div>
                    <div style={{ fontSize: 12, color: 'var(--text)', lineHeight: 1.4 }}>{a.metin}</div>
                  </div>
                </div>
              ))}

              <div style={{
                marginTop: '1.25rem', padding: '0.65rem 0.85rem',
                background: t.bg, borderRadius: 8, borderLeft: `3px solid ${t.renk}`,
                fontSize: 12, color: 'var(--text)', fontStyle: 'italic', lineHeight: 1.5,
              }}>
                "{t.cta}"
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

/* ─── İstatistikler ─────────────────────────────────── */
function Istatistikler() {
  const stats = [
    { sayi: 4, suffix: '', label: 'Otomatik Adım', ikon: '🔄', renk: '#6366f1' },
    { sayi: 0, suffix: ' dk', label: 'Manuel Şablon Hazırlama', ikon: '⚡', renk: '#22c55e' },
    { sayi: 100, suffix: '%', label: 'Standart Format', ikon: '📐', renk: '#f97316' },
    { sayi: 360, suffix: '°', label: 'Nesnel Değerlendirme', ikon: '⚖️', renk: '#f59e0b' },
  ];

  return (
    <div style={{
      display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 12,
      margin: '2.5rem 0',
    }}>
      {stats.map((s, i) => (
        <div key={i} style={{
          background: 'var(--surface)', border: '1px solid var(--border)',
          borderRadius: 12, padding: '1.25rem', textAlign: 'center',
        }}>
          <div style={{ fontSize: 22, marginBottom: 4 }}>{s.ikon}</div>
          <div style={{ fontSize: '1.6rem', fontWeight: 900, color: s.renk, lineHeight: 1 }}>
            <SayacAnimasyon hedef={s.sayi} suffix={s.suffix} />
          </div>
          <div style={{ fontSize: 11, color: 'var(--muted)', marginTop: 4 }}>{s.label}</div>
        </div>
      ))}
    </div>
  );
}

/* ─── Canlı Akış Animasyonu ─────────────────────────── */
function CanlıAkisAnimasyonu() {
  const [aktifAdim, setAktifAdim] = useState(0);
  const [calisiyor, setCalisiyor] = useState(true);

  useEffect(() => {
    if (!calisiyor) return;
    const t = setInterval(() => {
      setAktifAdim(p => (p + 1) % 4);
    }, 2200);
    return () => clearInterval(t);
  }, [calisiyor]);

  return (
    <div style={{
      background: 'var(--surface)', border: '1px solid var(--border)',
      borderRadius: 14, padding: '1.5rem', marginTop: '2.5rem',
    }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1.25rem' }}>
        <div>
          <div style={{ fontSize: 11, fontWeight: 800, color: 'var(--muted)', letterSpacing: '0.1em', textTransform: 'uppercase', marginBottom: 3 }}>
            Canlı Önizleme
          </div>
          <h3 style={{ fontSize: '0.95rem', fontWeight: 700, color: 'var(--text)' }}>
            Akış nasıl işliyor?
          </h3>
        </div>
        <button
          onClick={() => setCalisiyor(p => !p)}
          style={{
            padding: '0.35rem 0.85rem', borderRadius: 7, fontSize: 11,
            border: '1px solid var(--border)', background: 'var(--surface2)',
            color: 'var(--muted)', cursor: 'pointer', fontWeight: 600,
          }}
        >
          {calisiyor ? '⏸ Duraklat' : '▶ Başlat'}
        </button>
      </div>

      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
        {ADIMLAR.map((a, i) => (
          <div key={i} style={{ display: 'flex', alignItems: 'center', flex: 1, gap: 8 }}>
            <div style={{
              flex: 1, borderRadius: 10, padding: '0.85rem',
              background: aktifAdim === i ? ADIM_BG[i] : 'var(--surface2)',
              border: `1px solid ${aktifAdim === i ? ADIM_RENK[i] : 'var(--border)'}`,
              transition: 'all 0.4s cubic-bezier(0.4,0,0.2,1)',
              transform: aktifAdim === i ? 'scale(1.03) translateY(-2px)' : 'scale(1)',
              boxShadow: aktifAdim === i ? `0 8px 24px ${ADIM_RENK[i]}22` : 'none',
            }}>
              <div style={{ fontSize: 20, marginBottom: 4 }}>{a.ikon}</div>
              <div style={{ fontSize: 10, fontWeight: 800, color: aktifAdim === i ? ADIM_RENK[i] : 'var(--muted)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 3 }}>
                {a.no}
              </div>
              <div style={{ fontSize: 11, fontWeight: aktifAdim === i ? 700 : 400, color: aktifAdim === i ? 'var(--text)' : 'var(--muted)', lineHeight: 1.4 }}>
                {a.ozet}
              </div>
              {aktifAdim === i && (
                <div style={{ marginTop: 6, display: 'flex', gap: 3 }}>
                  {[0, 1, 2].map(dot => (
                    <div key={dot} style={{
                      width: 5, height: 5, borderRadius: '50%',
                      background: ADIM_RENK[i],
                      animation: `blink 1s ${dot * 0.3}s infinite`,
                    }} />
                  ))}
                </div>
              )}
            </div>
            {i < ADIMLAR.length - 1 && (
              <svg width="16" height="12" viewBox="0 0 16 12" fill="none" style={{ flexShrink: 0 }}>
                <path d="M1 6h14M9 1l6 5-6 5" stroke={aktifAdim > i ? ADIM_RENK[i] : 'var(--border)'} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            )}
          </div>
        ))}
      </div>

      {/* Aktif adım açıklaması */}
      <div style={{
        marginTop: '1rem', padding: '0.65rem 1rem',
        background: ADIM_BG[aktifAdim], borderRadius: 8,
        borderLeft: `3px solid ${ADIM_RENK[aktifAdim]}`,
        fontSize: 12, color: 'var(--text)', lineHeight: 1.6,
        transition: 'all 0.3s',
      }}>
        <span style={{ fontWeight: 700, color: ADIM_RENK[aktifAdim] }}>
          {ADIMLAR[aktifAdim].ikon} {ADIMLAR[aktifAdim].baslik}:
        </span>{' '}
        {ADIMLAR[aktifAdim].ozet}
      </div>
    </div>
  );
}

/* ─── ANA SAYFA ─────────────────────────────────────── */
export default function GorevAkisi() {
  const [aktifAdim, setAktifAdim] = useState(0);

  return (
    <div style={{ animation: 'fadeIn 0.2s', maxWidth: 1100, margin: '0 auto' }}>

      {/* Hero */}
      <div style={{ textAlign: 'center', marginBottom: '2rem' }}>
        <div style={{
          display: 'inline-flex', alignItems: 'center', gap: 8,
          background: 'rgba(99,102,241,0.12)', border: '1px solid rgba(99,102,241,0.3)',
          borderRadius: 20, padding: '4px 14px', marginBottom: '1rem',
          fontSize: 11, fontWeight: 700, color: '#6366f1', textTransform: 'uppercase', letterSpacing: '0.08em',
        }}>
          <div style={{ width: 6, height: 6, borderRadius: '50%', background: '#6366f1', animation: 'blink 1.5s infinite' }} />
          Görev Eşleştirme Platformu
        </div>

        <h1 style={{ fontSize: 'clamp(1.4rem, 3vw, 2.2rem)', fontWeight: 900, lineHeight: 1.2, marginBottom: '0.75rem' }}>
          Tanımla &nbsp;
          <span style={{ color: '#6366f1' }}>→</span>
          &nbsp; Şablonlaştır &nbsp;
          <span style={{ color: '#f97316' }}>→</span>
          &nbsp; Tamamla &nbsp;
          <span style={{ color: '#22c55e' }}>→</span>
          &nbsp;
          <span style={{ color: '#f59e0b' }}>Kıyasla & Kabul Et</span>
        </h1>

        <p style={{ fontSize: 14, color: 'var(--muted)', maxWidth: 580, margin: '0 auto', lineHeight: 1.7 }}>
          Muğlaklığı sıfıra indir. Her görev aynı standartta tanımlanır, aynı kurallarla teslim edilir,
          nesnel metriklerle değerlendirilir.
        </p>
      </div>

      {/* İstatistikler */}
      <Istatistikler />

      {/* Stepper */}
      <Stepper aktif={aktifAdim} onSecim={setAktifAdim} />

      {/* Aktif adım detayı */}
      <AdimDetay
        adim={ADIMLAR[aktifAdim]}
        renk={ADIM_RENK[aktifAdim]}
        bg={ADIM_BG[aktifAdim]}
        idx={aktifAdim}
      />

      {/* Adım Gezinme */}
      <div style={{ display: 'flex', justifyContent: 'center', gap: 8, marginTop: '1.5rem' }}>
        <button
          onClick={() => setAktifAdim(p => Math.max(0, p - 1))}
          disabled={aktifAdim === 0}
          style={{
            padding: '0.5rem 1.25rem', borderRadius: 8, fontSize: 12, fontWeight: 600,
            border: '1px solid var(--border)', background: 'var(--surface2)',
            color: aktifAdim === 0 ? 'var(--muted)' : 'var(--text)',
            cursor: aktifAdim === 0 ? 'not-allowed' : 'pointer', opacity: aktifAdim === 0 ? 0.5 : 1,
          }}
        >← Önceki</button>

        {ADIMLAR.map((_, i) => (
          <button key={i} onClick={() => setAktifAdim(i)} style={{
            width: 8, height: 8, borderRadius: '50%', border: 'none',
            background: aktifAdim === i ? ADIM_RENK[i] : 'var(--border)',
            cursor: 'pointer', padding: 0, transition: 'all 0.2s',
            transform: aktifAdim === i ? 'scale(1.4)' : 'scale(1)',
          }} />
        ))}

        <button
          onClick={() => setAktifAdim(p => Math.min(ADIMLAR.length - 1, p + 1))}
          disabled={aktifAdim === ADIMLAR.length - 1}
          style={{
            padding: '0.5rem 1.25rem', borderRadius: 8, fontSize: 12, fontWeight: 600,
            border: '1px solid var(--border)', background: 'var(--surface2)',
            color: aktifAdim === ADIMLAR.length - 1 ? 'var(--muted)' : 'var(--text)',
            cursor: aktifAdim === ADIMLAR.length - 1 ? 'not-allowed' : 'pointer',
            opacity: aktifAdim === ADIMLAR.length - 1 ? 0.5 : 1,
          }}
        >Sonraki →</button>
      </div>

      {/* Canlı Akış Animasyonu */}
      <CanlıAkisAnimasyonu />

      {/* İki Taraf Perspektifi */}
      <IkiTarafPerspektif />

      {/* Alt CTA */}
      <div style={{
        marginTop: '2.5rem', textAlign: 'center',
        background: 'var(--surface)', border: '1px solid var(--border)',
        borderRadius: 16, padding: '2rem',
        background: 'linear-gradient(135deg, rgba(99,102,241,0.08) 0%, rgba(249,115,22,0.05) 100%)',
      }}>
        <div style={{ fontSize: 24, marginBottom: 8 }}>🚀</div>
        <h3 style={{ fontSize: '1.1rem', fontWeight: 900, marginBottom: 8 }}>
          Karmaşa biter, netlik başlar.
        </h3>
        <p style={{ fontSize: 13, color: 'var(--muted)', maxWidth: 420, margin: '0 auto 1.25rem', lineHeight: 1.6 }}>
          4 adımlı akış, işin her boyutunu standartlaştırır. İş sahibi netliğe, iş yapan ise fırsata kavuşur.
        </p>
        <div style={{ display: 'flex', gap: 10, justifyContent: 'center', flexWrap: 'wrap' }}>
          <button
            onClick={() => setAktifAdim(0)}
            style={{
              padding: '0.65rem 1.5rem', borderRadius: 9, fontSize: 13, fontWeight: 700,
              border: 'none', background: '#6366f1', color: '#fff', cursor: 'pointer',
              boxShadow: '0 4px 16px rgba(99,102,241,0.35)',
            }}
          >
            💬 Görev Tanımlamaya Başla
          </button>
          <button
            onClick={() => setAktifAdim(2)}
            style={{
              padding: '0.65rem 1.5rem', borderRadius: 9, fontSize: 13, fontWeight: 700,
              border: '1px solid var(--border)', background: 'var(--surface2)',
              color: 'var(--text)', cursor: 'pointer',
            }}
          >
            📤 Görevi Teslim Et
          </button>
        </div>
      </div>
    </div>
  );
}
