import { useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { apiSifreSifirla, hataMesaji } from '../api/index.js';
import { SifreAlani, Uyari, AnaDugme, Baglanti, OrtaKart } from '../components/FormAlanlari.jsx';

/* /sifre-sifirla?token=... — "Şifremi Unuttum" ve "Hesabınız oluşturuldu" e-postalarındaki bağlantı */
export default function SifreSifirla() {
  const [params] = useSearchParams();
  const navigate = useNavigate();
  const token = params.get('token') || '';
  const [yeni, setYeni] = useState('');
  const [yeni2, setYeni2] = useState('');
  const [hata, setHata] = useState('');
  const [tamam, setTamam] = useState('');
  const [yukleniyor, setYukleniyor] = useState(false);

  async function gonder(e) {
    e.preventDefault();
    setHata('');
    if (yeni !== yeni2) { setHata('Şifreler eşleşmiyor'); return; }
    setYukleniyor(true);
    try {
      const d = await apiSifreSifirla(token, yeni);
      setTamam(d.mesaj);
    } catch (err) {
      setHata(hataMesaji(err));
    } finally {
      setYukleniyor(false);
    }
  }

  const alt = <Baglanti onClick={() => navigate('/giris')}>← Giriş ekranına dön</Baglanti>;

  if (!token) {
    return (
      <OrtaKart baslik="Bağlantı Geçersiz" alt={alt}>
        <Uyari tur="hata">Bu bağlantı eksik. E-postadaki bağlantıyı tam olarak açtığınızdan emin olun.</Uyari>
      </OrtaKart>
    );
  }

  if (tamam) {
    return (
      <OrtaKart baslik="Şifreniz Güncellendi">
        <Uyari tur="bilgi">{tamam}</Uyari>
        <form onSubmit={e => { e.preventDefault(); navigate('/giris'); }}>
          <AnaDugme>Giriş Yap →</AnaDugme>
        </form>
      </OrtaKart>
    );
  }

  return (
    <OrtaKart baslik="Yeni Şifre Belirle" altBaslik="En az 6 karakterli yeni şifrenizi girin" alt={alt}>
      <form onSubmit={gonder}>
        <SifreAlani etiket="YENİ ŞİFRE" minLength={6} value={yeni} onChange={e => setYeni(e.target.value)} />
        <SifreAlani etiket="YENİ ŞİFRE (TEKRAR)" minLength={6} value={yeni2} onChange={e => setYeni2(e.target.value)} />
        <Uyari tur="hata">{hata}</Uyari>
        <AnaDugme yukleniyor={yukleniyor} yukleniyorMetni="Kaydediliyor...">Şifremi Kaydet</AnaDugme>
      </form>
    </OrtaKart>
  );
}
