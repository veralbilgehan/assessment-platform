import client from './client.js';

// Auth
export const postGiris       = (b)  => client.post('/api/auth/giris', b).then(r => r.data);
export const getBen          = ()   => client.get('/api/auth/ben').then(r => r.data);
export const postKayit       = (b)  => client.post('/api/auth/kayit', b).then(r => r.data);
export const putSifre        = (b)  => client.put('/api/auth/sifre', b).then(r => r.data);

// Dashboard
export const getDashboard    = ()   => client.get('/api/dashboard').then(r => r.data);

// Markalar
export const getMarkalar     = ()   => client.get('/api/markalar').then(r => r.data);
export const postMarka       = (b)  => client.post('/api/markalar', b).then(r => r.data);

// Kategoriler
export const getKategoriler  = ()   => client.get('/api/kategoriler').then(r => r.data);
export const postKategori    = (b)  => client.post('/api/kategoriler', b).then(r => r.data);

// Ürünler
export const getUrunler      = (p)  => client.get('/api/urunler', { params: p }).then(r => r.data);
export const getUrun         = (id) => client.get(`/api/urunler/${id}`).then(r => r.data);
export const postUrun        = (b)  => client.post('/api/urunler', b).then(r => r.data);
export const putUrun         = (id, b) => client.put(`/api/urunler/${id}`, b).then(r => r.data);
export const deleteUrun      = (id) => client.delete(`/api/urunler/${id}`).then(r => r.data);

// Stok
export const getStok         = ()   => client.get('/api/stok').then(r => r.data);
export const postStokHareket = (b)  => client.post('/api/stok/hareket', b).then(r => r.data);

// Bayiler
export const getBayiler      = ()   => client.get('/api/bayiler').then(r => r.data);
export const getBayi         = (id) => client.get(`/api/bayiler/${id}`).then(r => r.data);
export const postBayi        = (b)  => client.post('/api/bayiler', b).then(r => r.data);
export const putBayi         = (id, b) => client.put(`/api/bayiler/${id}`, b).then(r => r.data);

// Cari Hesaplar
export const getCariHesaplar = ()   => client.get('/api/cari-hesaplar').then(r => r.data);
export const getCariHesap    = (id) => client.get(`/api/cari-hesaplar/${id}`).then(r => r.data);
export const getRiskli       = ()   => client.get('/api/cari-hesaplar/riskli').then(r => r.data);
export const postCariHareket = (bayiId, b) => client.post(`/api/cari-hesaplar/${bayiId}/hareket`, b).then(r => r.data);

// Siparişler
export const getSiparisler   = (p)  => client.get('/api/siparisler', { params: p }).then(r => r.data);
export const getSiparis      = (id) => client.get(`/api/siparisler/${id}`).then(r => r.data);
export const postSiparis     = (b)  => client.post('/api/siparisler', b).then(r => r.data);
export const putSiparisDurum = (id, durum) => client.put(`/api/siparisler/${id}/durum`, { durum }).then(r => r.data);

// Faturalar
export const getFaturalar    = (p)  => client.get('/api/faturalar', { params: p }).then(r => r.data);
export const getFatura       = (id) => client.get(`/api/faturalar/${id}`).then(r => r.data);

// Tahsilatlar
export const getTahsilatlar  = (p)  => client.get('/api/tahsilatlar', { params: p }).then(r => r.data);
export const getTahsilat     = (id) => client.get(`/api/tahsilatlar/${id}`).then(r => r.data);
export const postTahsilat    = (b)  => client.post('/api/tahsilatlar', b).then(r => r.data);
