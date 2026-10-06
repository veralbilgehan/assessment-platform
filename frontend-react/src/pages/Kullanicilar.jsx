import { useState } from 'react';
import { useQuery, useMutation, useQueryClient, keepPreviousData } from '@tanstack/react-query';
import {
  getKullaniciListesi, postKullanici, patchKullanici, deleteKayitTalebi, postSifreSifirlamaGonder,
  getDavetler, postDavet, postDavetYenidenGonder, postDavetIptal, hataMesaji,
} from '../api/index.js';
import { useAuth } from '../context/AuthContext.jsx';
import Badge from '../components/Badge.jsx';

const ROLLER = [
  { deger: 'admin',          ad: 'Admin',          renk: 'red'  },
  { deger: 'degerlendirici', ad: 'Değerlendirici', renk: 'blue' },
  { deger: 'izleyici',       ad: 'İzleyici',       renk: 'gray' },
];
const rolBilgi = (r) => ROLLER.find(x => x.deger === r) || { ad: r, renk: 'gray' };

const DAVET_DURUM = {
  bekliyor:     ['Bekliyor', 'yellow'],
  kabul_edildi: ['Kabul Edildi', 'green'],
  iptal:        ['İptal', 'gray'],
  suresi_doldu: ['Süresi Doldu', 'red'],
};

function tarih(iso, saatli = false) {
  if (!iso) return '—';
  return new Date(iso).toLocaleString('tr-TR', {
    day: '2-digit', month: '2-digit', year: 'numeric',
    ...(saatli && { hour: '2-digit', minute: '2-digit' }),
  });
}

function tamAd(k) {
  return [k.ad, k.soyad].filter(Boolean).join(' ') || k.eposta;
}

/* ─── Ortak UI ──────────────────────────────────────── */
function Kart({ children, style }) {
  return <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 'var(--radius)', ...style }}>{children}</div>;
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

function Lbl({ children, zorunlu }) {
  return (
    <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--text)', marginBottom: 5 }}>
      {children}{zorunlu && <span style={{ color: '#ef4444', marginLeft: 3 }}>*</span>}
    </div>
  );
}

function Modal({ baslik, onKapat, children, altKisim }) {
  return (
    <div
      onClick={onKapat}
      style={{ position: 'fixed', inset: 0, background: 'rgba(15,20,40,0.45)', zIndex: 200, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '1rem' }}
    >
      <div
        onClick={e => e.stopPropagation()}
        style={{ width: '100%', maxWidth: 560, background: 'var(--surface)', borderRadius: 14, boxShadow: '0 12px 40px rgba(0,0,0,0.25)', maxHeight: '90vh', display: 'flex', flexDirection: 'column' }}
      >
        <div style={{ padding: '1.1rem 1.5rem', borderBottom: '1px solid var(--border)', fontSize: 16, fontWeight: 700 }}>{baslik}</div>
        <div style={{ padding: '1.25rem 1.5rem', overflowY: 'auto' }}>{children}</div>
        <div style={{ padding: '0.9rem 1.5rem', borderTop: '1px solid var(--border)', display: 'flex', justifyContent: 'flex-end', gap: 8 }}>
          {altKisim}
        </div>
      </div>
    </div>
  );
}

function HataKutusu({ children }) {
  if (!children) return null;
  return (
    <div style={{ background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.3)', color: 'var(--red)', borderRadius: 8, padding: '0.6rem 0.85rem', fontSize: 13, marginTop: 12 }}>
      ⚠️ {children}
    </div>
  );
}

function RolSecimi({ value, onChange }) {
  return (
    <select value={value} onChange={e => onChange(e.target.value)} style={{ width: '100%' }}>
      {ROLLER.map(r => <option key={r.deger} value={r.deger}>{r.ad}</option>)}
    </select>
  );
}

/* ─── Kullanıcı formu (oluştur / düzenle / davet) ───── */
function KullaniciFormu({ form, setForm, alanlar }) {
  const set = (k) => (e) => setForm(f => ({ ...f, [k]: e.target.value }));
  return (
    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
      {alanlar.includes('ad') && (
        <div><Lbl zorunlu={alanlar.includes('ad*')}>Ad</Lbl><input value={form.ad} onChange={set('ad')} style={{ width: '100%' }} /></div>
      )}
      {alanlar.includes('soyad') && (
        <div><Lbl zorunlu={alanlar.includes('soyad*')}>Soyad</Lbl><input value={form.soyad} onChange={set('soyad')} style={{ width: '100%' }} /></div>
      )}
      {alanlar.includes('eposta') && (
        <div style={{ gridColumn: '1/-1' }}>
          <Lbl zorunlu>E-posta</Lbl>
          <input type="email" value={form.eposta} onChange={set('eposta')} placeholder="ornek@sirket.com" style={{ width: '100%' }} />
        </div>
      )}
      <div><Lbl>Rol</Lbl><RolSecimi value={form.rol} onChange={v => setForm(f => ({ ...f, rol: v }))} /></div>
      <div><Lbl>Şirket</Lbl><input value={form.sirket} onChange={set('sirket')} placeholder="İsteğe bağlı" style={{ width: '100%' }} /></div>
      {alanlar.includes('gecici_sifre') && (
        <div style={{ gridColumn: '1/-1' }}>
          <Lbl>Geçici Şifre (opsiyonel)</Lbl>
          <input type="text" value={form.gecici_sifre} onChange={set('gecici_sifre')} placeholder="Boş bırakılırsa kullanıcıya şifre belirleme e-postası gider" style={{ width: '100%' }} />
        </div>
      )}
    </div>
  );
}

const BOS_FORM = { ad: '', soyad: '', eposta: '', rol: 'izleyici', sirket: '', gecici_sifre: '' };

function OlusturModal({ onKapat, onBasari }) {
  const [form, setForm] = useState(BOS_FORM);
  const mut = useMutation({
    mutationFn: () => postKullanici(form),
    onSuccess: (d) => {
      const ek = form.gecici_sifre
        ? ' Geçici şifreyi kullanıcıyla paylaşın.'
        : d.eposta_gonderildi ? ' Şifre belirleme e-postası gönderildi.'
        : ` Ancak e-posta gönderilemedi: ${d.eposta_hatasi}`;
      onBasari(`${tamAd(d.kullanici)} oluşturuldu.${ek}`, !d.eposta_gonderildi && !form.gecici_sifre);
    },
  });
  return (
    <Modal
      baslik="Yeni Kullanıcı Oluştur"
      onKapat={onKapat}
      altKisim={<>
        <Dugme onClick={onKapat}>İptal</Dugme>
        <Dugme tur="birincil" disabled={mut.isPending} onClick={() => mut.mutate()}>{mut.isPending ? 'Oluşturuluyor...' : 'Oluştur'}</Dugme>
      </>}
    >
      <KullaniciFormu form={form} setForm={setForm} alanlar={['ad', 'ad*', 'soyad', 'soyad*', 'eposta', 'gecici_sifre']} />
      <HataKutusu>{mut.isError && hataMesaji(mut.error)}</HataKutusu>
    </Modal>
  );
}

function DavetModal({ onKapat, onBasari }) {
  const [form, setForm] = useState(BOS_FORM);
  const mut = useMutation({
    mutationFn: () => postDavet(form),
    onSuccess: (d) => onBasari(d.mesaj),
  });
  return (
    <Modal
      baslik="Kullanıcı Davet Et"
      onKapat={onKapat}
      altKisim={<>
        <Dugme onClick={onKapat}>İptal</Dugme>
        <Dugme tur="birincil" disabled={mut.isPending} onClick={() => mut.mutate()}>{mut.isPending ? 'Gönderiliyor...' : '📧 Davet Gönder'}</Dugme>
      </>}
    >
      <p style={{ fontSize: 13, color: 'var(--muted)', margin: '0 0 14px' }}>
        Kişiye davet e-postası gider. Bağlantıya tıklayıp şifresini belirleyince hesabı seçtiğiniz rolle açılır. Davet 7 gün geçerlidir.
      </p>
      <KullaniciFormu form={form} setForm={setForm} alanlar={['eposta', 'ad', 'soyad']} />
      <HataKutusu>{mut.isError && hataMesaji(mut.error)}</HataKutusu>
    </Modal>
  );
}

function DuzenleModal({ kullanici, onKapat, onBasari }) {
  const [form, setForm] = useState({
    ad: kullanici.ad || '', soyad: kullanici.soyad || '', sirket: kullanici.sirket || '', rol: kullanici.rol,
  });
  const mut = useMutation({
    mutationFn: () => patchKullanici(kullanici.id, form),
    onSuccess: () => onBasari(`${form.ad} güncellendi.`),
  });
  return (
    <Modal
      baslik={`Düzenle — ${kullanici.eposta}`}
      onKapat={onKapat}
      altKisim={<>
        <Dugme onClick={onKapat}>İptal</Dugme>
        <Dugme tur="birincil" disabled={mut.isPending} onClick={() => mut.mutate()}>{mut.isPending ? 'Kaydediliyor...' : 'Kaydet'}</Dugme>
      </>}
    >
      <KullaniciFormu form={form} setForm={setForm} alanlar={['ad', 'ad*', 'soyad']} />
      <HataKutusu>{mut.isError && hataMesaji(mut.error)}</HataKutusu>
    </Modal>
  );
}

/* ─── Satır işlem menüsü ────────────────────────────── */
function IslemMenusu({ kullanici, benimId, onIslem }) {
  const [acik, setAcik] = useState(false);
  const ben = kullanici.id === benimId;
  const ogeler = kullanici.onay_bekliyor
    ? [
        { anahtar: 'onayla', etiket: '✓ Kaydı Onayla' },
        { anahtar: 'reddet', etiket: '✕ Talebi Reddet', tehlike: true },
      ]
    : [
        { anahtar: 'duzenle', etiket: '✏️ Düzenle' },
        { anahtar: 'sifre', etiket: '🔑 Şifre sıfırlama bağlantısı gönder' },
        ...(!ben ? [kullanici.aktif
          ? { anahtar: 'pasif', etiket: '⏸ Pasifleştir', tehlike: true }
          : { anahtar: 'aktif', etiket: '▶ Aktifleştir' }] : []),
      ];

  return (
    <div style={{ position: 'relative', display: 'inline-block' }}>
      <button
        onClick={() => setAcik(v => !v)}
        onBlur={() => setTimeout(() => setAcik(false), 150)}
        style={{ width: 30, height: 30, borderRadius: 6, border: 'none', background: acik ? 'var(--surface2)' : 'transparent', cursor: 'pointer', fontSize: 18, color: 'var(--muted)' }}
        title="İşlemler"
      >⋮</button>
      {acik && (
        <div style={{ position: 'absolute', right: 0, top: 32, zIndex: 20, minWidth: 240, background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 10, boxShadow: 'var(--shadow)', overflow: 'hidden' }}>
          {ogeler.map(o => (
            <button
              key={o.anahtar}
              onMouseDown={() => { setAcik(false); onIslem(o.anahtar, kullanici); }}
              style={{ display: 'block', width: '100%', textAlign: 'left', padding: '0.6rem 1rem', border: 'none', background: 'transparent', fontSize: 13, cursor: 'pointer', color: o.tehlike ? 'var(--red)' : 'var(--text)' }}
              onMouseEnter={e => (e.currentTarget.style.background = 'var(--surface2)')}
              onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
            >
              {o.etiket}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

const th = { padding: '0.75rem 1rem', textAlign: 'left', fontSize: 12, fontWeight: 600, color: 'var(--muted)', borderBottom: '1px solid var(--border)', whiteSpace: 'nowrap' };
const td = { padding: '0.8rem 1rem', fontSize: 13, borderBottom: '1px solid var(--border)', verticalAlign: 'middle' };

/* ─── Davetler görünümü ─────────────────────────────── */
function DavetlerTablosu({ bildir }) {
  const qc = useQueryClient();
  const { data = [], isLoading } = useQuery({ queryKey: ['davetler'], queryFn: getDavetler });
  const yenile = () => qc.invalidateQueries({ queryKey: ['davetler'] });

  const yenidenGonder = useMutation({
    mutationFn: postDavetYenidenGonder,
    onSuccess: (d) => { bildir(d.mesaj); yenile(); },
    onError: (e) => bildir(hataMesaji(e), true),
  });
  const iptal = useMutation({
    mutationFn: postDavetIptal,
    onSuccess: () => { bildir('Davet iptal edildi.'); yenile(); },
    onError: (e) => bildir(hataMesaji(e), true),
  });

  if (isLoading) return <div style={{ padding: '2rem', color: 'var(--muted)' }}>Yükleniyor...</div>;
  if (!data.length) return <div style={{ padding: '3rem', textAlign: 'center', color: 'var(--muted)' }}>Henüz davet gönderilmedi.</div>;

  return (
    <div style={{ overflowX: 'auto' }}>
      <table style={{ width: '100%', borderCollapse: 'collapse' }}>
        <thead>
          <tr>
            <th style={th}>E-posta</th><th style={th}>Ad</th><th style={th}>Rol</th><th style={th}>Durum</th>
            <th style={th}>Davet Eden</th><th style={th}>Gönderim</th><th style={th}>Son Geçerlilik</th><th style={th}>İşlemler</th>
          </tr>
        </thead>
        <tbody>
          {data.map(d => {
            const [durumAd, durumRenk] = DAVET_DURUM[d.durum] || [d.durum, 'gray'];
            const r = rolBilgi(d.rol);
            return (
              <tr key={d.id}>
                <td style={td}>{d.eposta}</td>
                <td style={td}>{[d.ad, d.soyad].filter(Boolean).join(' ') || '—'}</td>
                <td style={td}><Badge variant={r.renk}>{r.ad}</Badge></td>
                <td style={td}><Badge variant={durumRenk}>{durumAd}</Badge></td>
                <td style={td}>{d.davet_eden || '—'}</td>
                <td style={td}>{tarih(d.olusturma, true)}</td>
                <td style={td}>{d.durum === 'kabul_edildi' ? `Kabul: ${tarih(d.kabul_tarihi)}` : tarih(d.son_kullanma)}</td>
                <td style={{ ...td, whiteSpace: 'nowrap' }}>
                  {(d.durum === 'bekliyor' || d.durum === 'suresi_doldu') && (
                    <Dugme style={{ padding: '0.3rem 0.7rem', fontSize: 12, marginRight: 6 }} disabled={yenidenGonder.isPending}
                      onClick={() => yenidenGonder.mutate(d.id)}>↻ Yeniden Gönder</Dugme>
                  )}
                  {d.durum === 'bekliyor' && (
                    <Dugme tur="tehlike" style={{ padding: '0.3rem 0.7rem', fontSize: 12 }} disabled={iptal.isPending}
                      onClick={() => { if (confirm(`${d.eposta} davetini iptal etmek istiyor musunuz?`)) iptal.mutate(d.id); }}>İptal Et</Dugme>
                  )}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

/* ─── Ana sayfa ─────────────────────────────────────── */
export default function Kullanicilar() {
  const { user } = useAuth();
  const qc = useQueryClient();
  const [gorunum, setGorunum] = useState('kullanicilar'); // 'kullanicilar' | 'davetler'
  const [ara, setAra] = useState('');
  const [rol, setRol] = useState('');
  const [durum, setDurum] = useState('');
  const [sayfa, setSayfa] = useState(1);
  const [limit, setLimit] = useState(10);
  const [modal, setModal] = useState(null); // { tur: 'olustur'|'davet'|'duzenle', kullanici? }
  const [bildirim, setBildirim] = useState(null);

  const { data, isLoading } = useQuery({
    queryKey: ['kullanicilar', ara, rol, durum, sayfa, limit],
    queryFn: () => getKullaniciListesi({ ara: ara || undefined, rol: rol || undefined, durum: durum || undefined, sayfa, limit }),
    placeholderData: keepPreviousData,
    enabled: user?.rol === 'admin',
  });
  const kayitlar = data?.kayitlar || [];
  const toplam = data?.toplam || 0;

  function bildir(metin, hata = false) {
    setBildirim({ metin, hata });
    setTimeout(() => setBildirim(b => (b?.metin === metin ? null : b)), 6000);
  }
  function yenile() {
    qc.invalidateQueries({ queryKey: ['kullanicilar'] });
  }
  function filtre(setter) {
    return (v) => { setter(v); setSayfa(1); };
  }

  const islem = useMutation({
    mutationFn: async ({ anahtar, k }) => {
      if (anahtar === 'onayla') return { sonuc: await patchKullanici(k.id, { aktif: true }), anahtar, k };
      if (anahtar === 'aktif')  return { sonuc: await patchKullanici(k.id, { aktif: true }), anahtar, k };
      if (anahtar === 'pasif')  return { sonuc: await patchKullanici(k.id, { aktif: false }), anahtar, k };
      if (anahtar === 'reddet') return { sonuc: await deleteKayitTalebi(k.id), anahtar, k };
      if (anahtar === 'sifre')  return { sonuc: await postSifreSifirlamaGonder(k.id), anahtar, k };
    },
    onSuccess: ({ sonuc, anahtar, k }) => {
      const ad = tamAd(k);
      const mesajlar = {
        onayla: sonuc.eposta_hatasi
          ? `${ad} onaylandı, ancak bilgilendirme e-postası gönderilemedi: ${sonuc.eposta_hatasi}`
          : `${ad} onaylandı ve bilgilendirildi.`,
        aktif: `${ad} aktifleştirildi.`,
        pasif: `${ad} pasifleştirildi; artık giriş yapamaz.`,
        reddet: `${ad} kayıt talebi reddedildi.`,
        sifre: sonuc.mesaj,
      };
      bildir(mesajlar[anahtar], anahtar === 'onayla' && !!sonuc.eposta_hatasi);
      yenile();
    },
    onError: (e) => bildir(hataMesaji(e), true),
  });

  function onIslem(anahtar, k) {
    if (anahtar === 'duzenle') { setModal({ tur: 'duzenle', kullanici: k }); return; }
    if (anahtar === 'pasif' && !confirm(`${tamAd(k)} pasifleştirilsin mi? Kullanıcı giriş yapamayacak.`)) return;
    if (anahtar === 'reddet' && !confirm(`${tamAd(k)} kayıt talebi reddedilip silinsin mi?`)) return;
    islem.mutate({ anahtar, k });
  }

  function modalBasari(metin, hata = false) {
    setModal(null);
    bildir(metin, hata);
    yenile();
    qc.invalidateQueries({ queryKey: ['davetler'] });
  }

  if (user?.rol !== 'admin') {
    return (
      <Kart style={{ textAlign: 'center', padding: '3rem' }}>
        <div style={{ fontSize: 40, marginBottom: 12 }}>🔒</div>
        <div style={{ fontSize: 15, fontWeight: 700 }}>Bu sayfa yalnızca adminlere açıktır.</div>
      </Kart>
    );
  }

  const ilk = toplam ? (sayfa - 1) * limit + 1 : 0;
  const son = Math.min(sayfa * limit, toplam);

  return (
    <div style={{ animation: 'fadeIn 0.2s' }}>
      {/* Başlık */}
      <div style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between', gap: 12, flexWrap: 'wrap', marginBottom: '1.25rem' }}>
        <div>
          {gorunum === 'davetler' && (
            <button onClick={() => setGorunum('kullanicilar')} style={{ background: 'none', border: 'none', color: 'var(--accent)', cursor: 'pointer', padding: 0, fontSize: 13, marginBottom: 6 }}>
              ← Kullanıcılara Dön
            </button>
          )}
          <h1 style={{ fontSize: '1.5rem', fontWeight: 800, margin: 0 }}>{gorunum === 'davetler' ? 'Davetler' : 'Tüm Kullanıcılar'}</h1>
          <p style={{ fontSize: 13, color: 'var(--muted)', margin: '4px 0 0' }}>
            {gorunum === 'davetler' ? 'Gönderilen kullanıcı davetlerini izleyin' : 'Sistemdeki tüm kullanıcıları görüntüleyin ve yönetin'}
          </p>
        </div>
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
          {gorunum === 'kullanicilar' && <Dugme onClick={() => setGorunum('davetler')}>✉️ Davetler</Dugme>}
          <Dugme onClick={() => setModal({ tur: 'olustur' })}>Kullanıcı Oluştur</Dugme>
          <Dugme tur="birincil" onClick={() => setModal({ tur: 'davet' })}>+ Kullanıcı Davet Et</Dugme>
        </div>
      </div>

      {bildirim && (
        <div style={{
          marginBottom: 12, padding: '0.65rem 1rem', borderRadius: 8, fontSize: 13,
          background: bildirim.hata ? 'rgba(239,68,68,0.08)' : 'rgba(34,197,94,0.10)',
          border: `1px solid ${bildirim.hata ? 'rgba(239,68,68,0.3)' : 'rgba(34,197,94,0.3)'}`,
          color: bildirim.hata ? 'var(--red)' : 'var(--green)',
        }}>
          {bildirim.hata ? '⚠️' : '✅'} {bildirim.metin}
        </div>
      )}

      {gorunum === 'davetler' ? (
        <Kart><DavetlerTablosu bildir={bildir} /></Kart>
      ) : (
        <>
          {data?.onay_bekleyen > 0 && durum !== 'onay_bekliyor' && (
            <div style={{ marginBottom: 12, padding: '0.65rem 1rem', borderRadius: 8, fontSize: 13, background: 'rgba(234,179,8,0.10)', border: '1px solid rgba(234,179,8,0.35)', display: 'flex', alignItems: 'center', gap: 10 }}>
              <span>⏳ <strong>{data.onay_bekleyen}</strong> kayıt talebi onayınızı bekliyor.</span>
              <button onClick={() => filtre(setDurum)('onay_bekliyor')} style={{ background: 'none', border: 'none', color: 'var(--accent)', cursor: 'pointer', fontWeight: 600, fontSize: 13 }}>Göster →</button>
            </div>
          )}

          {/* Filtreler */}
          <Kart style={{ padding: '1rem', marginBottom: 12, display: 'flex', gap: 10, flexWrap: 'wrap' }}>
            <input
              value={ara}
              onChange={e => filtre(setAra)(e.target.value)}
              placeholder="🔍 Ad, soyad veya e-posta ile ara..."
              style={{ flex: '1 1 260px', minWidth: 0 }}
            />
            <select value={rol} onChange={e => filtre(setRol)(e.target.value)} style={{ flex: '0 0 170px' }}>
              <option value="">Tüm Roller</option>
              {ROLLER.map(r => <option key={r.deger} value={r.deger}>{r.ad}</option>)}
            </select>
            <select value={durum} onChange={e => filtre(setDurum)(e.target.value)} style={{ flex: '0 0 170px' }}>
              <option value="">Tüm Durumlar</option>
              <option value="aktif">Aktif</option>
              <option value="pasif">Pasif</option>
              <option value="onay_bekliyor">Onay Bekliyor</option>
            </select>
          </Kart>

          {/* Tablo */}
          <Kart>
            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                <thead>
                  <tr>
                    <th style={th}>Kullanıcı</th><th style={th}>E-posta</th><th style={th}>Rol</th><th style={th}>Durum</th>
                    <th style={th}>Kayıt Tarihi</th><th style={th}>Son Giriş</th><th style={{ ...th, textAlign: 'right' }}>İşlemler</th>
                  </tr>
                </thead>
                <tbody>
                  {isLoading ? (
                    <tr><td colSpan={7} style={{ ...td, color: 'var(--muted)', textAlign: 'center', padding: '2rem' }}>Yükleniyor...</td></tr>
                  ) : kayitlar.length === 0 ? (
                    <tr><td colSpan={7} style={{ ...td, color: 'var(--muted)', textAlign: 'center', padding: '2.5rem' }}>Kriterlere uyan kullanıcı yok.</td></tr>
                  ) : kayitlar.map(k => {
                    const r = rolBilgi(k.rol);
                    const [durumAd, durumRenk] = k.onay_bekliyor ? ['Onay Bekliyor', 'yellow'] : k.aktif ? ['Aktif', 'green'] : ['Pasif', 'gray'];
                    return (
                      <tr key={k.id}>
                        <td style={td}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                            <div style={{ width: 34, height: 34, borderRadius: '50%', background: 'var(--surface2)', border: '1px solid var(--border)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 700, color: 'var(--muted)', flexShrink: 0 }}>
                              {(k.ad || k.eposta)[0].toLocaleUpperCase('tr-TR')}
                            </div>
                            <div>
                              <div style={{ fontWeight: 600 }}>{tamAd(k)}{k.id === user.id && <span style={{ color: 'var(--muted)', fontWeight: 400 }}> (siz)</span>}</div>
                              {k.sirket && <div style={{ fontSize: 11, color: 'var(--muted)' }}>{k.sirket}</div>}
                            </div>
                          </div>
                        </td>
                        <td style={td}>{k.eposta}</td>
                        <td style={td}><Badge variant={r.renk}>{r.ad}</Badge></td>
                        <td style={td}><Badge variant={durumRenk}>{durumAd}</Badge></td>
                        <td style={td}>{tarih(k.olusturma)}</td>
                        <td style={td}>{tarih(k.son_giris, true)}</td>
                        <td style={{ ...td, textAlign: 'right' }}>
                          <IslemMenusu kullanici={k} benimId={user.id} onIslem={onIslem} />
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            {/* Sayfalama */}
            <div style={{ display: 'flex', justifyContent: 'flex-end', alignItems: 'center', gap: 18, padding: '0.75rem 1rem', fontSize: 13, color: 'var(--muted)' }}>
              <span>
                Sayfa başına:{' '}
                <select value={limit} onChange={e => { setLimit(+e.target.value); setSayfa(1); }} style={{ marginLeft: 4 }}>
                  {[10, 25, 50].map(n => <option key={n} value={n}>{n}</option>)}
                </select>
              </span>
              <span>{ilk}–{son} / {toplam}</span>
              <span style={{ display: 'flex', gap: 4 }}>
                <Dugme style={{ padding: '0.25rem 0.6rem' }} disabled={sayfa <= 1} onClick={() => setSayfa(s => s - 1)}>‹</Dugme>
                <Dugme style={{ padding: '0.25rem 0.6rem' }} disabled={son >= toplam} onClick={() => setSayfa(s => s + 1)}>›</Dugme>
              </span>
            </div>
          </Kart>
        </>
      )}

      {modal?.tur === 'olustur' && <OlusturModal onKapat={() => setModal(null)} onBasari={modalBasari} />}
      {modal?.tur === 'davet' && <DavetModal onKapat={() => setModal(null)} onBasari={modalBasari} />}
      {modal?.tur === 'duzenle' && <DuzenleModal kullanici={modal.kullanici} onKapat={() => setModal(null)} onBasari={modalBasari} />}
    </div>
  );
}
