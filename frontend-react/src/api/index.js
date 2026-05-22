import client, { BASE } from './client.js';

// ── Sektörler / Mevcut hiyerarşi ────────────────────────────────────
export const getSektorHiyerarsi = () =>
  client.get('/api/sektorler/hiyerarsi/tam').then(r => r.data);

// ── Cascading hiyerarşi (yeni) ───────────────────────────────────────
export const getHiyerarsiSektorler  = ()      => client.get('/api/hiyerarsi/sektorler').then(r => r.data);
export const getHiyerarsiDeptlar    = (sid)   => client.get(`/api/hiyerarsi/departmanlar/${sid}`).then(r => r.data);
export const getHiyerarsiPozisyonlar= (did)   => client.get(`/api/hiyerarsi/pozisyonlar/${did}`).then(r => r.data);
export const getHiyerarsiYetenekler = (pid)   => client.get(`/api/hiyerarsi/yetenekler/${pid}`).then(r => r.data);
export const getTamHiyerarsi        = ()      => client.get('/api/hiyerarsi/tam').then(r => r.data);

// ── Pozisyonlar ──────────────────────────────────────────────────────
export const getPozisyon       = (id) => client.get(`/api/pozisyonlar/${id}`).then(r => r.data);
export const getPozisyonSorular= (id) => client.get(`/api/pozisyonlar/${id}/sorular`).then(r => r.data);

// ── Değerlendirmeler ─────────────────────────────────────────────────
export const getDegerlendirmeler = (params = {}) =>
  client.get('/api/degerlendirmeler', { params }).then(r => r.data);
export const getDegerlendirme  = (id)    => client.get(`/api/degerlendirmeler/${id}`).then(r => r.data);
export const postDegerlendirme = (body)  => client.post('/api/degerlendirmeler', body).then(r => r.data);
export const putPuanlar        = (id, p) => client.put(`/api/degerlendirmeler/${id}/puan`, { puanlar: p }).then(r => r.data);
export const AI_STREAM_URL     = (id)    => `${BASE}/api/degerlendirmeler/${id}/ai-makale/stream`;

// ── Belgeler SSE URL'leri ────────────────────────────────────────────
export const BELGE_ANALIZ_SSE = `${BASE}/api/belgeler/analiz/stream`;
export const BELGE_KONU_SSE   = `${BASE}/api/belgeler/konu/olustur`;
export const BELGE_PROFIL_SSE = `${BASE}/api/belgeler/profil/olustur`;
export const BELGE_KARS_SSE   = `${BASE}/api/belgeler/karsilastir`;

// ── Belgeler REST ────────────────────────────────────────────────────
export const saveBelge   = (data)       => client.post('/api/belgeler', data).then(r => r.data);
export const getBelgeler = ()           => client.get('/api/belgeler').then(r => r.data);
export const deleteBelge = (id)         => client.delete(`/api/belgeler/${id}`).then(r => r.data);
export const setIzin     = (id, izin)   => client.patch(`/api/belgeler/${id}/izin`, { izin }).then(r => r.data);
export const setSakla    = (id, sakla)  => client.patch(`/api/belgeler/${id}/sakla`, { sakla }).then(r => r.data);

// ── Auth ─────────────────────────────────────────────────────────────
export const apiGiris       = (e, s) => client.post('/api/auth/giris', { eposta: e, sifre: s }).then(r => r.data);
export const apiBen         = ()     => client.get('/api/auth/ben').then(r => r.data);
export const apiKullanicilar= ()     => client.get('/api/auth/kullanicilar').then(r => r.data);
export const apiKayit       = (d)    => client.post('/api/auth/kayit', d).then(r => r.data);
