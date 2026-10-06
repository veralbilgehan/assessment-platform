import { useState, useRef, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  getEmailSablonlari, getEmailSablonu, putEmailSablonu, deleteEmailSablonu, postEmailOnizle, hataMesaji,
} from '../api/index.js';
import { useAuth } from '../context/AuthContext.jsx';
import Badge from '../components/Badge.jsx';

/* Önizlemede değişkenlere hazır gelen örnek değerler */
const ORNEK_DEGERLER = {
  ad: 'Ali', eposta: 'ali@ornek.com', davetEden: 'Ayşe Yılmaz', rol: 'Değerlendirici',
  gecerlilikDakika: '60', gecerlilikGun: '7',
  sifirlamaUrl: 'https://ornek.com/sifre-sifirla?token=ornek',
  sifreBelirlemeUrl: 'https://ornek.com/sifre-sifirla?token=ornek',
  kabulUrl: 'https://ornek.com/davet?token=ornek',
  girisUrl: 'https://ornek.com/giris',
};

function Kart({ children, style }) {
  return <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 'var(--radius)', ...style }}>{children}</div>;
}

function Lbl({ children, zorunlu, alt }) {
  return (
    <div style={{ marginBottom: 6 }}>
      <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--text)' }}>
        {children}{zorunlu && <span style={{ color: '#ef4444', marginLeft: 3 }}>*</span>}
      </div>
      {alt && <div style={{ fontSize: 11, color: 'var(--muted)', marginTop: 2 }}>{alt}</div>}
    </div>
  );
}

function Dugme({ tur = 'ikincil', children, style, ...props }) {
  const birincil = tur === 'birincil';
  return (
    <button
      style={{
        padding: '0.5rem 1rem', borderRadius: 8, fontSize: 13, fontWeight: 600, cursor: 'pointer',
        border: birincil ? 'none' : '1px solid var(--border)',
        background: birincil ? 'var(--accent)' : 'var(--surface)',
        color: birincil ? '#fff' : tur === 'tehlike' ? 'var(--red)' : 'var(--accent)',
        opacity: props.disabled ? 0.6 : 1,
        ...style,
      }}
      {...props}
    >
      {children}
    </button>
  );
}

/* ─── Önizleme penceresi ────────────────────────────── */
function OnizlemeModal({ form, degiskenler, onKapat }) {
  const ilkJson = JSON.stringify(
    Object.fromEntries(Object.keys(degiskenler).map(k => [k, ORNEK_DEGERLER[k] ?? ''])), null, 2
  );
  const [json, setJson] = useState(ilkJson);
  const [jsonHata, setJsonHata] = useState('');

  const mut = useMutation({ mutationFn: postEmailOnizle });

  function yenile() {
    let d;
    try {
      d = JSON.parse(json || '{}');
      if (typeof d !== 'object' || Array.isArray(d) || d === null) throw new Error();
    } catch {
      setJsonHata('Geçerli bir JSON nesnesi girin, örn. { "ad": "Ali" }');
      return;
    }
    setJsonHata('');
    mut.mutate({ konu: form.konu, html: form.html, degiskenler: d });
  }

  // İlk açılışta örnek değerlerle doldur
  useEffect(() => {
    mut.mutate({ konu: form.konu, html: form.html, degiskenler: JSON.parse(ilkJson) });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div onClick={onKapat} style={{ position: 'fixed', inset: 0, background: 'rgba(15,20,40,0.45)', zIndex: 200, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '1rem' }}>
      <div onClick={e => e.stopPropagation()} style={{ width: '100%', maxWidth: 900, height: '90vh', background: 'var(--surface)', borderRadius: 14, display: 'flex', flexDirection: 'column', boxShadow: '0 12px 40px rgba(0,0,0,0.25)' }}>
        <div style={{ padding: '1rem 1.5rem', borderBottom: '1px solid var(--border)', fontSize: 16, fontWeight: 700 }}>
          E-posta Şablonu Önizleme: {mut.data?.konu || form.konu}
        </div>
        <div style={{ padding: '1rem 1.5rem', overflowY: 'auto', flex: 1, display: 'flex', flexDirection: 'column', gap: 12 }}>
          <div>
            <Lbl alt='Örn: { "ad": "Ali", "sifirlamaUrl": "https://..." }'>Test Değişkenleri (JSON)</Lbl>
            <textarea value={json} onChange={e => setJson(e.target.value)} rows={6}
              style={{ width: '100%', boxSizing: 'border-box', fontFamily: 'monospace', fontSize: 12 }} />
            {jsonHata && <div style={{ color: 'var(--red)', fontSize: 12, marginTop: 4 }}>⚠️ {jsonHata}</div>}
            {mut.isError && <div style={{ color: 'var(--red)', fontSize: 12, marginTop: 4 }}>⚠️ {hataMesaji(mut.error)}</div>}
            <Dugme style={{ marginTop: 8 }} onClick={yenile} disabled={mut.isPending}>
              {mut.isPending ? 'Hazırlanıyor...' : 'Önizlemeyi Yenile'}
            </Dugme>
          </div>
          <div style={{ flex: 1, minHeight: 360, background: '#f3f4f6', borderRadius: 8, overflow: 'hidden', border: '1px solid var(--border)' }}>
            {/* sandbox: şablondaki script'ler çalışmaz */}
            <iframe title="E-posta önizleme" sandbox="" srcDoc={mut.data?.html || ''} style={{ width: '100%', height: '100%', border: 'none', background: '#fff' }} />
          </div>
        </div>
        <div style={{ padding: '0.8rem 1.5rem', borderTop: '1px solid var(--border)', display: 'flex', justifyContent: 'flex-end' }}>
          <Dugme onClick={onKapat}>Kapat</Dugme>
        </div>
      </div>
    </div>
  );
}

/* ─── Düzenleyici ───────────────────────────────────── */
function Duzenleyici({ anahtar, onGeri }) {
  const qc = useQueryClient();
  const htmlRef = useRef(null);
  const [form, setForm] = useState(null);
  const [onizleme, setOnizleme] = useState(false);
  const [mesaj, setMesaj] = useState(null);

  const { data: sablon, isLoading } = useQuery({
    queryKey: ['email-sablonu', anahtar],
    queryFn: () => getEmailSablonu(anahtar),
  });
  // Şablon yüklendiğinde (veya kaydedildiğinde) formu ondan doldur
  const [yuklenenSurum, setYuklenenSurum] = useState(null);
  if (sablon && yuklenenSurum !== sablon) {
    setYuklenenSurum(sablon);
    setForm({ baslik: sablon.baslik, konu: sablon.konu, html: sablon.html });
  }

  function guncelle(yeni, metin) {
    qc.setQueryData(['email-sablonu', anahtar], yeni);
    qc.invalidateQueries({ queryKey: ['email-sablonlari'] });
    setMesaj({ metin });
  }

  const kaydet = useMutation({
    mutationFn: () => putEmailSablonu(anahtar, form),
    onSuccess: (d) => guncelle(d, 'Şablon kaydedildi.'),
    onError: (e) => setMesaj({ metin: hataMesaji(e), hata: true }),
  });
  const sifirla = useMutation({
    mutationFn: () => deleteEmailSablonu(anahtar),
    onSuccess: (d) => guncelle(d, 'Şablon varsayılana döndürüldü.'),
    onError: (e) => setMesaj({ metin: hataMesaji(e), hata: true }),
  });

  function degiskenEkle(ad) {
    const etiket = `{{${ad}}}`;
    const el = htmlRef.current;
    if (!el) return;
    const bas = el.selectionStart ?? form.html.length;
    const bit = el.selectionEnd ?? bas;
    setForm(f => ({ ...f, html: f.html.slice(0, bas) + etiket + f.html.slice(bit) }));
    requestAnimationFrame(() => { el.focus(); el.selectionStart = el.selectionEnd = bas + etiket.length; });
  }

  if (isLoading || !form) return <div style={{ padding: '2rem', color: 'var(--muted)' }}>Yükleniyor...</div>;

  const degisti = form.baslik !== sablon.baslik || form.konu !== sablon.konu || form.html !== sablon.html;

  return (
    <div style={{ animation: 'fadeIn 0.2s' }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12, flexWrap: 'wrap', marginBottom: '1.25rem' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <button onClick={onGeri} title="Geri" style={{ background: 'none', border: 'none', fontSize: 20, cursor: 'pointer', color: 'var(--muted)' }}>←</button>
          <div>
            <h1 style={{ fontSize: '1.5rem', fontWeight: 800, margin: 0 }}>✉️ E-posta Şablonunu Düzenle</h1>
            <p style={{ fontSize: 13, color: 'var(--muted)', margin: '4px 0 0' }}>Mevcut e-posta şablonunu düzenleyin</p>
          </div>
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          {sablon.ozellestirildi && (
            <Dugme tur="tehlike" disabled={sifirla.isPending}
              onClick={() => { if (confirm('Yaptığınız değişiklikler silinip varsayılan şablon geri yüklensin mi?')) sifirla.mutate(); }}>
              Varsayılana Döndür
            </Dugme>
          )}
          <Dugme onClick={() => setOnizleme(true)}>👁 Önizle</Dugme>
          <Dugme tur="birincil" disabled={kaydet.isPending || !degisti} onClick={() => kaydet.mutate()}>
            {kaydet.isPending ? 'Kaydediliyor...' : '💾 Kaydet'}
          </Dugme>
        </div>
      </div>

      {mesaj && (
        <div style={{ marginBottom: 12, padding: '0.6rem 1rem', borderRadius: 8, fontSize: 13, color: mesaj.hata ? 'var(--red)' : 'var(--green)', background: mesaj.hata ? 'rgba(239,68,68,0.08)' : 'rgba(34,197,94,0.10)' }}>
          {mesaj.hata ? '⚠️' : '✅'} {mesaj.metin}
        </div>
      )}

      <Kart style={{ padding: '1.5rem', display: 'flex', flexDirection: 'column', gap: 16 }}>
        <div>
          <Lbl zorunlu alt="Anahtar düzenlenemez; sistem e-postayı bu anahtarla bulur.">Anahtar (Key)</Lbl>
          <input value={anahtar} disabled style={{ width: '100%', fontFamily: 'monospace' }} />
        </div>
        <div>
          <Lbl zorunlu alt="Şablonun panelde görünen adı">Başlık</Lbl>
          <input value={form.baslik} onChange={e => setForm(f => ({ ...f, baslik: e.target.value }))} style={{ width: '100%' }} />
        </div>
        <div>
          <Lbl zorunlu alt="Dinamik alanlar için {{anahtar}} kullanabilirsiniz (örn: Merhaba {{ad}})">Konu (Subject)</Lbl>
          <input value={form.konu} onChange={e => setForm(f => ({ ...f, konu: e.target.value }))} style={{ width: '100%' }} />
        </div>
        <div>
          <Lbl>Kullanılabilir Değişkenler</Lbl>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
            {Object.entries(sablon.degiskenler).map(([ad, aciklama]) => (
              <button key={ad} onClick={() => degiskenEkle(ad)} title={`${aciklama} — HTML'de imlecin olduğu yere ekle`}
                style={{ padding: '3px 10px', borderRadius: 20, border: '1px solid var(--border)', background: 'var(--surface2)', fontSize: 12, fontFamily: 'monospace', cursor: 'pointer', color: 'var(--accent)' }}>
                {`{{${ad}}}`}
              </button>
            ))}
          </div>
          <div style={{ fontSize: 11, color: 'var(--muted)', marginTop: 6 }}>
            {Object.entries(sablon.degiskenler).map(([ad, a]) => `${ad}: ${a}`).join(' · ')}
          </div>
        </div>
        <div>
          <Lbl zorunlu>HTML İçeriği</Lbl>
          <textarea
            ref={htmlRef}
            value={form.html}
            onChange={e => setForm(f => ({ ...f, html: e.target.value }))}
            spellCheck={false}
            rows={22}
            style={{ width: '100%', boxSizing: 'border-box', fontFamily: 'monospace', fontSize: 12.5, lineHeight: 1.55, whiteSpace: 'pre', overflowX: 'auto' }}
          />
        </div>
      </Kart>

      {onizleme && <OnizlemeModal form={form} degiskenler={sablon.degiskenler} onKapat={() => setOnizleme(false)} />}
    </div>
  );
}

/* ─── Liste ─────────────────────────────────────────── */
export default function EmailSablonlari() {
  const { user } = useAuth();
  const [secili, setSecili] = useState(null);
  const { data = [], isLoading } = useQuery({
    queryKey: ['email-sablonlari'],
    queryFn: getEmailSablonlari,
    enabled: user?.rol === 'admin',
  });

  if (user?.rol !== 'admin') {
    return (
      <Kart style={{ textAlign: 'center', padding: '3rem' }}>
        <div style={{ fontSize: 40, marginBottom: 12 }}>🔒</div>
        <div style={{ fontSize: 15, fontWeight: 700 }}>Bu sayfa yalnızca adminlere açıktır.</div>
      </Kart>
    );
  }

  if (secili) return <Duzenleyici anahtar={secili} onGeri={() => setSecili(null)} />;

  return (
    <div style={{ animation: 'fadeIn 0.2s', maxWidth: 960 }}>
      <div style={{ marginBottom: '1.25rem' }}>
        <h1 style={{ fontSize: '1.5rem', fontWeight: 800, margin: 0 }}>✉️ E-posta Şablonları</h1>
        <p style={{ fontSize: 13, color: 'var(--muted)', margin: '4px 0 0' }}>
          Sistemin gönderdiği e-postaların konu ve içeriğini düzenleyin. Gönderim için Ayarlar'da SMTP tanımlı olmalıdır.
        </p>
      </div>

      <Kart>
        {isLoading ? (
          <div style={{ padding: '2rem', color: 'var(--muted)' }}>Yükleniyor...</div>
        ) : data.map((s, i) => (
          <div
            key={s.anahtar}
            onClick={() => setSecili(s.anahtar)}
            style={{ padding: '1rem 1.25rem', display: 'flex', alignItems: 'center', gap: 14, cursor: 'pointer', borderTop: i ? '1px solid var(--border)' : 'none' }}
            onMouseEnter={e => (e.currentTarget.style.background = 'var(--surface2)')}
            onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
          >
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontWeight: 600, marginBottom: 3 }}>{s.baslik}</div>
              <div style={{ fontSize: 12, color: 'var(--muted)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                <span style={{ fontFamily: 'monospace' }}>{s.anahtar}</span> · Konu: {s.konu}
              </div>
            </div>
            {s.ozellestirildi
              ? <Badge variant="blue">Düzenlendi · {new Date(s.guncelleme).toLocaleDateString('tr-TR')}</Badge>
              : <Badge variant="gray">Varsayılan</Badge>}
            <span style={{ color: 'var(--muted)' }}>›</span>
          </div>
        ))}
      </Kart>
    </div>
  );
}
