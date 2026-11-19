import { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { apiDavetBilgi, apiDavetKabul, hataMesaji } from '../api/index.js';
import { useAuth } from '../context/AuthContext.jsx';
import { Alan, SifreAlani, Uyari, AnaDugme, Baglanti, OrtaKart } from '../components/FormAlanlari.jsx';

const ROL_ADLARI = { admin: 'Admin', degerlendirici: 'Değerlendirici', izleyici: 'İzleyici' };

/* /davet?token=... — kullanıcı davet e-postasındaki bağlantı */
export default function DavetKabul() {
  const [params] = useSearchParams();
  const navigate = useNavigate();
  const { oturumAc } = useAuth();
  const token = params.get('token') || '';

  const [davet, setDavet] = useState(null);
  const [yuklemeHatasi, setYuklemeHatasi] = useState(token ? '' : 'Bu bağlantı eksik.');
  const [form, setForm] = useState({ ad: '', soyad: '', sifre: '', sifre2: '' });
  const [hata, setHata] = useState('');
  const [yukleniyor, setYukleniyor] = useState(false);

  useEffect(() => {
    if (!token) return;
    apiDavetBilgi(token)
      .then(d => {
        setDavet(d);
        setForm(f => ({ ...f, ad: d.ad || '', soyad: d.soyad || '' }));
      })
      .catch(err => setYuklemeHatasi(hataMesaji(err)));
  }, [token]);

  const alan = (k) => ({ value: form[k], onChange: e => setForm(f => ({ ...f, [k]: e.target.value })) });

  async function gonder(e) {
    e.preventDefault();
    setHata('');
    if (form.sifre !== form.sifre2) { setHata('Şifreler eşleşmiyor'); return; }
    setYukleniyor(true);
    try {
      const d = await apiDavetKabul({ token, ad: form.ad, soyad: form.soyad, sifre: form.sifre });
      oturumAc(d.token, d.kullanici);
      navigate('/app');
    } catch (err) {
      setHata(hataMesaji(err));
    } finally {
      setYukleniyor(false);
    }
  }

  const alt = <Baglanti onClick={() => navigate('/giris')}>← Giriş ekranına dön</Baglanti>;

  if (yuklemeHatasi) {
    return (
      <OrtaKart baslik="Davet Geçersiz" alt={alt}>
        <Uyari tur="hata">{yuklemeHatasi}</Uyari>
        <p style={{ fontSize: 13, color: 'var(--muted)', margin: 0 }}>
          Yeni bir davet için sizi davet eden kişiyle iletişime geçin.
        </p>
      </OrtaKart>
    );
  }

  if (!davet) {
    return <OrtaKart baslik="Davet kontrol ediliyor..." />;
  }

  return (
    <OrtaKart
      baslik="Daveti Kabul Et"
      altBaslik={`${davet.davet_eden || 'Yönetici'} sizi ${ROL_ADLARI[davet.rol] || davet.rol} rolüyle davet etti`}
      alt={alt}
    >
      <form onSubmit={gonder}>
        <Alan etiket="E-POSTA ADRESİ" value={davet.eposta} disabled readOnly />
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
          <Alan etiket="AD" zorunlu {...alan('ad')} />
          <Alan etiket="SOYAD" {...alan('soyad')} />
        </div>
        <SifreAlani etiket="ŞİFRE" minLength={6} {...alan('sifre')} />
        <SifreAlani etiket="ŞİFRE (TEKRAR)" minLength={6} {...alan('sifre2')} />
        <Uyari tur="hata">{hata}</Uyari>
        <AnaDugme yukleniyor={yukleniyor} yukleniyorMetni="Hesap oluşturuluyor...">Hesabımı Oluştur →</AnaDugme>
      </form>
    </OrtaKart>
  );
}
