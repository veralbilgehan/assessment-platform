import { useState, useEffect, useCallback } from 'react';

const API = import.meta.env.VITE_API_URL || '';

/* ─── Renk yardımcıları ─────────────────────────────── */
function basariRenk(v) {
  if (v >= 80) return '#22c55e';
  if (v >= 70) return '#84cc16';
  if (v >= 60) return '#eab308';
  if (v >= 50) return '#f97316';
  return '#ef4444';
}
function durumRenk(d) {
  if (d === 'tamamlandi' || d === 'aktif') return '#22c55e';
  if (d === 'taslak') return 'var(--muted)';
  return 'var(--accent)';
}
function boyutFormat(bytes) {
  if (!bytes) return '—';
  if (bytes > 1_048_576) return `${(bytes / 1_048_576).toFixed(1)} MB`;
  if (bytes > 1024) return `${(bytes / 1024).toFixed(0)} KB`;
  return `${bytes} B`;
}
function sureFmt(sn) {
  if (!sn) return '—';
  const d = Math.floor(sn / 60), s = sn % 60;
  return `${d}:${String(s).padStart(2, '0')}`;
}
function tarihFmt(t) {
  if (!t) return '—';
  return new Date(t).toLocaleDateString('tr-TR', { day: '2-digit', month: 'short', year: 'numeric' });
}

/* ─── İstatistik Kartı ──────────────────────────────── */
function StatKart({ etiket, deger, renk, simge }) {
  return (
    <div style={{
      background: 'var(--surface)',
      border: '1px solid var(--border)',
      borderRadius: 12,
      padding: '1rem 1.25rem',
      display: 'flex',
      alignItems: 'center',
      gap: 14,
      flex: 1,
    }}>
      <div style={{
        width: 42, height: 42, borderRadius: 10,
        background: renk + '22',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        fontSize: 20, flexShrink: 0,
      }}>
        {simge}
      </div>
      <div>
        <div style={{ fontSize: 24, fontWeight: 700, color: renk, lineHeight: 1 }}>
          {deger ?? '—'}
        </div>
        <div style={{ fontSize: 11, color: 'var(--muted)', marginTop: 3 }}>{etiket}</div>
      </div>
    </div>
  );
}

/* ─── Sıralama düğmesi ──────────────────────────────── */
function SiralaBtn({ label, aktif, yon, onToggle }) {
  return (
    <button
      onClick={onToggle}
      style={{
        padding: '0.4rem 0.85rem',
        background: aktif ? 'var(--accent-dim)' : 'transparent',
        border: `1px solid ${aktif ? 'var(--accent)' : 'var(--border)'}`,
        color: aktif ? 'var(--accent)' : 'var(--muted)',
        borderRadius: 6,
        fontSize: 12,
        cursor: 'pointer',
        display: 'flex', alignItems: 'center', gap: 4,
      }}
    >
      {label} {aktif && (yon === 'asc' ? '↑' : '↓')}
    </button>
  );
}

/* ─── Silme onayı düğmesi ───────────────────────────── */
function SilBtn({ onSil }) {
  const [onay, setOnay] = useState(false);
  if (onay) return (
    <span style={{ display: 'flex', gap: 4 }}>
      <button onClick={onSil} style={BTN.silOnay}>Evet</button>
      <button onClick={() => setOnay(false)} style={BTN.iptal}>İptal</button>
    </span>
  );
  return (
    <button onClick={() => setOnay(true)} style={BTN.sil} title="Sil">✕</button>
  );
}

const BTN = {
  sil: {
    padding: '0.25rem 0.55rem', background: 'transparent',
    border: '1px solid var(--border)', color: 'var(--muted)',
    borderRadius: 5, fontSize: 12, cursor: 'pointer', transition: 'all 0.15s',
  },
  silOnay: {
    padding: '0.25rem 0.55rem', background: '#ef444422',
    border: '1px solid #ef4444', color: '#ef4444',
    borderRadius: 5, fontSize: 12, cursor: 'pointer',
  },
  iptal: {
    padding: '0.25rem 0.55rem', background: 'transparent',
    border: '1px solid var(--border)', color: 'var(--muted)',
    borderRadius: 5, fontSize: 12, cursor: 'pointer',
  },
};

/* ─── Tablo sarmalayıcı ─────────────────────────────── */
function Tablo({ children, basliklar }) {
  return (
    <div style={{ overflowX: 'auto' }}>
      <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
        <thead>
          <tr>
            {basliklar.map((b, i) => (
              <th key={i} style={{
                textAlign: i === basliklar.length - 1 ? 'center' : 'left',
                padding: '0.6rem 0.75rem',
                borderBottom: '1px solid var(--border)',
                color: 'var(--muted)',
                fontWeight: 600,
                fontSize: 11,
                whiteSpace: 'nowrap',
              }}>{b}</th>
            ))}
          </tr>
        </thead>
        <tbody>{children}</tbody>
      </table>
    </div>
  );
}

function Satir({ cells, onMouseEnter, onMouseLeave, style }) {
  return (
    <tr
      onMouseEnter={onMouseEnter}
      onMouseLeave={onMouseLeave}
      style={{ borderBottom: '1px solid var(--border)', ...style }}
    >
      {cells.map((c, i) => (
        <td key={i} style={{ padding: '0.65rem 0.75rem', verticalAlign: 'middle' }}>
          {c}
        </td>
      ))}
    </tr>
  );
}

function TabloBos({ mesaj = 'Kayıt bulunamadı' }) {
  return (
    <tr>
      <td colSpan={20} style={{ padding: '3rem', textAlign: 'center', color: 'var(--muted)' }}>
        {mesaj}
      </td>
    </tr>
  );
}

/* ─── Dökümanlar Sekmesi ────────────────────────────── */
function DokumanlarTab({ onYenile }) {
  const [rows, setRows] = useState([]);
  const [yukleniyor, setYukleniyor] = useState(true);
  const [q, setQ] = useState('');
  const [siralama, setSiralama] = useState('tarih');
  const [yon, setYon] = useState('desc');
  const [hover, setHover] = useState(null);

  const yukle = useCallback(async () => {
    setYukleniyor(true);
    try {
      const p = new URLSearchParams({ siralama, yon, q });
      const r = await fetch(`${API}/api/evrak/dokumanlar?${p}`);
      setRows(await r.json());
    } finally { setYukleniyor(false); }
  }, [siralama, yon, q]);

  useEffect(() => { yukle(); }, [yukle]);

  const sil = async (id) => {
    await fetch(`${API}/api/evrak/belge/${id}`, { method: 'DELETE' });
    setRows(r => r.filter(x => x.id !== id));
    onYenile();
  };

  function togSiralama(key) {
    if (siralama === key) setYon(y => y === 'asc' ? 'desc' : 'asc');
    else { setSiralama(key); setYon('desc'); }
  }

  return (
    <div>
      <div style={{ display: 'flex', gap: 8, marginBottom: '1rem', flexWrap: 'wrap' }}>
        <input value={q} onChange={e => setQ(e.target.value)}
          placeholder="Dosya adı veya konu ara..."
          style={{ flex: 1, minWidth: 200 }} />
        <SiralaBtn label="Tarihe göre" aktif={siralama==='tarih'} yon={yon} onToggle={() => togSiralama('tarih')} />
        <SiralaBtn label="Ada göre" aktif={siralama==='ad'} yon={yon} onToggle={() => togSiralama('ad')} />
      </div>
      <Tablo basliklar={['Dosya Adı', 'Tür', 'Boyut', 'Konu Özeti', 'Tarih', '']}>
        {yukleniyor ? (
          <tr><td colSpan={6} style={{ padding: '3rem', textAlign: 'center', color: 'var(--muted)' }}>Yükleniyor...</td></tr>
        ) : rows.length === 0 ? <TabloBos /> : rows.map(r => (
          <Satir key={r.id}
            onMouseEnter={() => setHover(r.id)}
            onMouseLeave={() => setHover(null)}
            style={{ background: hover === r.id ? 'var(--surface2)' : 'transparent', transition: 'background 0.1s' }}
            cells={[
              <span style={{ fontWeight: 500, color: 'var(--text)' }}>{r.ad}</span>,
              <span style={{
                fontSize: 10, padding: '2px 7px', borderRadius: 4,
                background: 'var(--accent-dim)', color: 'var(--accent)', fontWeight: 600,
              }}>{(r.mime_type || 'dosya').split('/').pop().toUpperCase()}</span>,
              <span style={{ color: 'var(--muted)' }}>{boyutFormat(r.boyut_byte)}</span>,
              <span style={{ color: 'var(--muted)', maxWidth: 280, display: 'block', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                {r.konu_ozeti || '—'}
              </span>,
              <span style={{ color: 'var(--muted)', whiteSpace: 'nowrap' }}>{tarihFmt(r.tarih)}</span>,
              <div style={{ textAlign: 'center' }}><SilBtn onSil={() => sil(r.id)} /></div>,
            ]}
          />
        ))}
      </Tablo>
    </div>
  );
}

/* ─── Testler Sekmesi ───────────────────────────────── */
function TestlerTab({ onYenile }) {
  const [rows, setRows] = useState([]);
  const [yukleniyor, setYukleniyor] = useState(true);
  const [q, setQ] = useState('');
  const [siralama, setSiralama] = useState('tarih');
  const [yon, setYon] = useState('desc');
  const [hover, setHover] = useState(null);

  const yukle = useCallback(async () => {
    setYukleniyor(true);
    try {
      const p = new URLSearchParams({ siralama, yon, q });
      const r = await fetch(`${API}/api/evrak/testler?${p}`);
      setRows(await r.json());
    } finally { setYukleniyor(false); }
  }, [siralama, yon, q]);

  useEffect(() => { yukle(); }, [yukle]);

  const sil = async (id) => {
    await fetch(`${API}/api/evrak/test/${id}`, { method: 'DELETE' });
    setRows(r => r.filter(x => x.id !== id));
    onYenile();
  };

  function togSiralama(key) {
    if (siralama === key) setYon(y => y === 'asc' ? 'desc' : 'asc');
    else { setSiralama(key); setYon('desc'); }
  }

  return (
    <div>
      <div style={{ display: 'flex', gap: 8, marginBottom: '1rem', flexWrap: 'wrap' }}>
        <input value={q} onChange={e => setQ(e.target.value)}
          placeholder="Test adı ara..."
          style={{ flex: 1, minWidth: 200 }} />
        <SiralaBtn label="Tarihe göre" aktif={siralama==='tarih'} yon={yon} onToggle={() => togSiralama('tarih')} />
        <SiralaBtn label="Ada göre" aktif={siralama==='ad'} yon={yon} onToggle={() => togSiralama('ad')} />
      </div>
      <Tablo basliklar={['Test Adı', 'Durum', 'Zorluk', 'Sorular', 'Katılımcı', 'Tamamlayan', 'Sektör / Pozisyon', 'Tarih', '']}>
        {yukleniyor ? (
          <tr><td colSpan={9} style={{ padding: '3rem', textAlign: 'center', color: 'var(--muted)' }}>Yükleniyor...</td></tr>
        ) : rows.length === 0 ? <TabloBos /> : rows.map(r => (
          <Satir key={r.id}
            onMouseEnter={() => setHover(r.id)}
            onMouseLeave={() => setHover(null)}
            style={{ background: hover === r.id ? 'var(--surface2)' : 'transparent', transition: 'background 0.1s' }}
            cells={[
              <span style={{ fontWeight: 500, color: 'var(--text)' }}>{r.ad}</span>,
              <span style={{
                fontSize: 10, padding: '2px 7px', borderRadius: 4, fontWeight: 600,
                background: durumRenk(r.durum) + '22', color: durumRenk(r.durum),
              }}>{r.durum || '—'}</span>,
              <span style={{ fontSize: 11, color: 'var(--muted)' }}>{r.zorluk || '—'}</span>,
              <span style={{ color: 'var(--muted)' }}>
                {r.uretilen_soru ?? 0} / {r.soru_sayisi}
              </span>,
              <span style={{ color: 'var(--text)', fontWeight: 500 }}>{r.katilimci_sayisi ?? 0}</span>,
              <span style={{ color: '#22c55e', fontWeight: 500 }}>{r.tamamlayan ?? 0}</span>,
              <span style={{ color: 'var(--muted)', fontSize: 12 }}>
                {r.sektor_adi || '—'}
                {r.pozisyon_adi ? <><br /><span style={{ fontSize: 11 }}>{r.pozisyon_adi}</span></> : ''}
              </span>,
              <span style={{ color: 'var(--muted)', whiteSpace: 'nowrap' }}>{tarihFmt(r.tarih)}</span>,
              <div style={{ textAlign: 'center' }}><SilBtn onSil={() => sil(r.id)} /></div>,
            ]}
          />
        ))}
      </Tablo>
    </div>
  );
}

/* ─── Raporlar Sekmesi ──────────────────────────────── */
function RaporlarTab({ onYenile }) {
  const [rows, setRows] = useState([]);
  const [yukleniyor, setYukleniyor] = useState(true);
  const [q, setQ] = useState('');
  const [siralama, setSiralama] = useState('tarih');
  const [yon, setYon] = useState('desc');
  const [hover, setHover] = useState(null);

  const yukle = useCallback(async () => {
    setYukleniyor(true);
    try {
      const p = new URLSearchParams({ siralama, yon, q });
      const r = await fetch(`${API}/api/evrak/raporlar?${p}`);
      setRows(await r.json());
    } finally { setYukleniyor(false); }
  }, [siralama, yon, q]);

  useEffect(() => { yukle(); }, [yukle]);

  const sil = async (id) => {
    await fetch(`${API}/api/evrak/rapor/${id}`, { method: 'DELETE' });
    setRows(r => r.filter(x => x.id !== id));
    onYenile();
  };

  function togSiralama(key) {
    if (siralama === key) setYon(y => y === 'asc' ? 'desc' : 'asc');
    else { setSiralama(key); setYon('desc'); }
  }

  return (
    <div>
      <div style={{ display: 'flex', gap: 8, marginBottom: '1rem', flexWrap: 'wrap' }}>
        <input value={q} onChange={e => setQ(e.target.value)}
          placeholder="Aday adı veya test ara..."
          style={{ flex: 1, minWidth: 200 }} />
        <SiralaBtn label="Tarihe göre" aktif={siralama==='tarih'} yon={yon} onToggle={() => togSiralama('tarih')} />
        <SiralaBtn label="Ada göre" aktif={siralama==='ad'} yon={yon} onToggle={() => togSiralama('ad')} />
        <SiralaBtn label="Başarıya göre" aktif={siralama==='basari'} yon={yon} onToggle={() => togSiralama('basari')} />
      </div>
      <Tablo basliklar={['Aday', 'Test', 'Başarı', 'D / Y / B', 'Süre', 'Pozisyon', 'Tarih', '']}>
        {yukleniyor ? (
          <tr><td colSpan={8} style={{ padding: '3rem', textAlign: 'center', color: 'var(--muted)' }}>Yükleniyor...</td></tr>
        ) : rows.length === 0 ? <TabloBos /> : rows.map(r => {
          const oran = parseFloat(r.basari_yuzdesi) || 0;
          return (
            <Satir key={r.id}
              onMouseEnter={() => setHover(r.id)}
              onMouseLeave={() => setHover(null)}
              style={{ background: hover === r.id ? 'var(--surface2)' : 'transparent', transition: 'background 0.1s' }}
              cells={[
                <div>
                  <div style={{ fontWeight: 600, color: 'var(--text)' }}>{r.aday_tam_ad || '—'}</div>
                  {r.aday_sirket && <div style={{ fontSize: 11, color: 'var(--muted)' }}>{r.aday_sirket}</div>}
                </div>,
                <span style={{ color: 'var(--muted)', fontSize: 12 }}>{r.test_adi}</span>,
                <div style={{ display: 'flex', alignItems: 'center', gap: 6, minWidth: 80 }}>
                  <div style={{
                    width: 36, height: 36, borderRadius: '50%',
                    background: `conic-gradient(${basariRenk(oran)} ${oran * 3.6}deg, var(--border) 0)`,
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    fontSize: 9, fontWeight: 700, color: 'var(--text)',
                    flexShrink: 0,
                  }}>
                    <div style={{ width: 24, height: 24, borderRadius: '50%', background: 'var(--bg)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                      {oran.toFixed(0)}%
                    </div>
                  </div>
                </div>,
                <span style={{ fontFamily: 'monospace', color: 'var(--muted)', fontSize: 12 }}>
                  <span style={{ color: '#22c55e' }}>{r.dogru_sayisi}</span>
                  {' / '}
                  <span style={{ color: '#ef4444' }}>{r.yanlis_sayisi}</span>
                  {' / '}
                  <span>{r.bos_sayisi}</span>
                </span>,
                <span style={{ color: 'var(--muted)' }}>{sureFmt(r.sure_saniye)}</span>,
                <span style={{ color: 'var(--muted)', fontSize: 12 }}>
                  {r.pozisyon_adi || r.aday_pozisyon || '—'}
                </span>,
                <span style={{ color: 'var(--muted)', whiteSpace: 'nowrap' }}>{tarihFmt(r.tarih)}</span>,
                <div style={{ textAlign: 'center' }}><SilBtn onSil={() => sil(r.id)} /></div>,
              ]}
            />
          );
        })}
      </Tablo>
    </div>
  );
}

/* ─── Denemeler Sekmesi ─────────────────────────────── */
function DenemelerTab({ onYenile }) {
  const [rows, setRows] = useState([]);
  const [yukleniyor, setYukleniyor] = useState(true);
  const [q, setQ] = useState('');
  const [yon, setYon] = useState('desc');
  const [hover, setHover] = useState(null);

  const yukle = useCallback(async () => {
    setYukleniyor(true);
    try {
      const p = new URLSearchParams({ q, yon });
      const r = await fetch(`${API}/api/evrak/denemeler?${p}`);
      setRows(await r.json());
    } finally { setYukleniyor(false); }
  }, [q, yon]);

  useEffect(() => { yukle(); }, [yukle]);

  const sil = async (id) => {
    await fetch(`${API}/api/evrak/deneme/${id}`, { method: 'DELETE' });
    setRows(r => r.filter(x => x.id !== id));
    onYenile();
  };

  return (
    <div>
      <div style={{ display: 'flex', gap: 8, marginBottom: '1rem', flexWrap: 'wrap' }}>
        <input value={q} onChange={e => setQ(e.target.value)}
          placeholder="Aday adı veya dosya ara..."
          style={{ flex: 1, minWidth: 200 }} />
        <SiralaBtn label="Yeniden eskiye" aktif={yon==='desc'} yon={yon} onToggle={() => setYon('desc')} />
        <SiralaBtn label="Eskiden yeniye" aktif={yon==='asc'} yon={yon} onToggle={() => setYon('asc')} />
      </div>
      <Tablo basliklar={['Aday', 'Dosya', 'Tür', 'Başarı %', 'Tarih', '']}>
        {yukleniyor ? (
          <tr><td colSpan={6} style={{ padding: '3rem', textAlign: 'center', color: 'var(--muted)' }}>Yükleniyor...</td></tr>
        ) : rows.length === 0 ? (
          <tr>
            <td colSpan={6} style={{ padding: '3rem', textAlign: 'center' }}>
              <div style={{ color: 'var(--muted)', marginBottom: 8 }}>Henüz deneme raporu yok</div>
              <div style={{ fontSize: 12, color: 'var(--muted)', opacity: 0.6 }}>
                "Ücretsiz Deneme Testi" sayfasından Excel/PDF yükleyerek rapor oluşturabilirsiniz.
              </div>
            </td>
          </tr>
        ) : rows.map(r => {
          const oran = parseFloat(r.basari_yuzdesi) || 0;
          return (
            <Satir key={r.id}
              onMouseEnter={() => setHover(r.id)}
              onMouseLeave={() => setHover(null)}
              style={{ background: hover === r.id ? 'var(--surface2)' : 'transparent', transition: 'background 0.1s' }}
              cells={[
                <span style={{ fontWeight: 500, color: 'var(--text)' }}>{r.aday_ad || 'Bilinmiyor'}</span>,
                <span style={{ color: 'var(--muted)', fontSize: 12, maxWidth: 200, display: 'block', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                  {r.dosya_adi || '—'}
                </span>,
                <span style={{
                  fontSize: 10, padding: '2px 7px', borderRadius: 4,
                  background: 'var(--accent-dim)', color: 'var(--accent)', fontWeight: 600,
                  textTransform: 'uppercase',
                }}>{r.dosya_tipi || '—'}</span>,
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <div style={{
                    width: 80, height: 6, borderRadius: 3, background: 'var(--border)', overflow: 'hidden',
                  }}>
                    <div style={{ width: `${oran}%`, height: '100%', background: basariRenk(oran), transition: 'width 0.5s' }} />
                  </div>
                  <span style={{ fontWeight: 600, color: basariRenk(oran), fontSize: 13 }}>
                    %{oran.toFixed(1)}
                  </span>
                </div>,
                <span style={{ color: 'var(--muted)', whiteSpace: 'nowrap' }}>{tarihFmt(r.tarih)}</span>,
                <div style={{ textAlign: 'center' }}><SilBtn onSil={() => sil(r.id)} /></div>,
              ]}
            />
          );
        })}
      </Tablo>
    </div>
  );
}

/* ─── Ana Bileşen ───────────────────────────────────── */
const SEKMELER = [
  { key: 'dokumanlar', label: '📄 Dökümanlar', renk: '#6366f1' },
  { key: 'testler',    label: '📝 Testler',     renk: '#8b5cf6' },
  { key: 'raporlar',  label: '📊 Raporlar',    renk: '#06b6d4' },
  { key: 'denemeler', label: '🆓 Denemeler',   renk: '#22c55e' },
];

export default function EvrakKutusu() {
  const [aktifSekme, setAktifSekme] = useState('dokumanlar');
  const [istatistik, setIstatistik] = useState(null);
  const [istatYukleniyor, setIstatYukleniyor] = useState(true);

  const yukleIstatistik = useCallback(async () => {
    try {
      setIstatYukleniyor(true);
      const r = await fetch(`${API}/api/evrak/istatistik`);
      setIstatistik(await r.json());
    } finally { setIstatYukleniyor(false); }
  }, []);

  useEffect(() => { yukleIstatistik(); }, [yukleIstatistik]);

  const ist = istatistik || {};

  return (
    <div style={{ maxWidth: 1200, margin: '0 auto' }}>
      {/* Başlık */}
      <div style={{ marginBottom: '1.75rem' }}>
        <h1 style={{ fontSize: '1.5rem', fontWeight: 700, margin: 0, marginBottom: 4 }}>
          📦 Evrak Kutusu
        </h1>
        <p style={{ color: 'var(--muted)', margin: 0, fontSize: 14 }}>
          Tüm belgeler, testler ve raporların merkezi yönetimi
        </p>
      </div>

      {/* İstatistik kartları */}
      <div style={{ display: 'flex', gap: 12, marginBottom: '1.75rem', flexWrap: 'wrap' }}>
        <StatKart
          etiket="Döküman"
          deger={istatYukleniyor ? '…' : ist.dokumanlar ?? 0}
          renk="#6366f1"
          simge="📄"
        />
        <StatKart
          etiket="Test Projesi"
          deger={istatYukleniyor ? '…' : ist.testler ?? 0}
          renk="#8b5cf6"
          simge="📝"
        />
        <StatKart
          etiket="Tamamlanan Rapor"
          deger={istatYukleniyor ? '…' : ist.raporlar ?? 0}
          renk="#06b6d4"
          simge="📊"
        />
        <StatKart
          etiket="Deneme Raporu"
          deger={istatYukleniyor ? '…' : ist.denemeler ?? 0}
          renk="#22c55e"
          simge="🆓"
        />
        <StatKart
          etiket="Ortalama Başarı"
          deger={istatYukleniyor ? '…' : `%${ist.ortalama_basari ?? 0}`}
          renk="#f97316"
          simge="🎯"
        />
      </div>

      {/* Sekme başlıkları */}
      <div style={{
        display: 'flex',
        borderBottom: '1px solid var(--border)',
        marginBottom: '1.5rem',
        gap: 2,
      }}>
        {SEKMELER.map(s => (
          <button
            key={s.key}
            onClick={() => setAktifSekme(s.key)}
            style={{
              padding: '0.65rem 1.25rem',
              background: 'transparent',
              border: 'none',
              borderBottom: aktifSekme === s.key
                ? `2px solid ${s.renk}`
                : '2px solid transparent',
              color: aktifSekme === s.key ? s.renk : 'var(--muted)',
              fontWeight: aktifSekme === s.key ? 600 : 400,
              fontSize: 13,
              cursor: 'pointer',
              transition: 'all 0.15s',
              whiteSpace: 'nowrap',
              marginBottom: -1,
            }}
          >
            {s.label}
            {aktifSekme !== s.key && (
              <span style={{
                marginLeft: 6, fontSize: 11,
                background: 'var(--surface2)',
                padding: '1px 6px', borderRadius: 10,
                color: 'var(--muted)',
              }}>
                {s.key === 'dokumanlar' ? ist.dokumanlar ?? '–'
                : s.key === 'testler'    ? ist.testler    ?? '–'
                : s.key === 'raporlar'   ? ist.raporlar   ?? '–'
                : ist.denemeler ?? '–'}
              </span>
            )}
          </button>
        ))}
      </div>

      {/* Sekme içeriği */}
      <div style={{
        background: 'var(--surface)',
        border: '1px solid var(--border)',
        borderRadius: 12,
        padding: '1.25rem',
      }}>
        {aktifSekme === 'dokumanlar' && <DokumanlarTab onYenile={yukleIstatistik} />}
        {aktifSekme === 'testler'    && <TestlerTab    onYenile={yukleIstatistik} />}
        {aktifSekme === 'raporlar'   && <RaporlarTab   onYenile={yukleIstatistik} />}
        {aktifSekme === 'denemeler'  && <DenemelerTab  onYenile={yukleIstatistik} />}
      </div>

      {/* Alt not */}
      <div style={{ marginTop: '1rem', fontSize: 12, color: 'var(--muted)', textAlign: 'center' }}>
        Silme işlemleri geri alınamaz. Lütfen dikkatli olun.
      </div>
    </div>
  );
}
