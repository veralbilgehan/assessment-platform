/**
 * CV deposu — sunucu (veritabanı) kullanılabilir değilse tarayıcıda (localStorage) saklar.
 * Yerel kayıtların id'si 'yerel-' ile başlar ve `yerel: true` taşır.
 * Veritabanı kurulduğunda yeni kayıtlar otomatik olarak sunucuya gider.
 */
import client from './client.js';

const ANAHTAR = 'cv_profilleri';

function yerelOku() {
  try { return JSON.parse(localStorage.getItem(ANAHTAR)) || []; } catch { return []; }
}
function yerelYaz(liste) {
  try { localStorage.setItem(ANAHTAR, JSON.stringify(liste)); }
  catch { throw new Error('Tarayıcı depolaması kullanılamıyor (gizli pencere olabilir).'); }
}
const yerelMi = (id) => String(id).startsWith('yerel-');

// Ağ hatası veya 5xx → sunucu/veritabanı yok, yerele düş. 4xx gerçek hatadır.
const sunucuYok = (e) => !e.response || e.response.status >= 500;

function ozet(c) {
  return {
    id: c.id, ad_soyad: c.ad_soyad, unvan: c.unvan, guncelleme: c.guncelleme, yerel: true,
    deneyim_sayisi: c.deneyimler.length, sertifika_sayisi: c.sertifikalar.length,
  };
}

function yerelKaydet(id, data) {
  if (!String(data.ad_soyad || '').trim()) {
    const e = new Error('Ad soyad zorunludur'); e.response = { data: { hata: e.message } }; throw e;
  }
  const liste = yerelOku();
  const kayit = { ...data, id: id || `yerel-${Date.now()}`, yerel: true, guncelleme: new Date().toISOString() };
  const i = liste.findIndex(c => c.id === kayit.id);
  if (i >= 0) liste[i] = kayit; else liste.unshift(kayit);
  yerelYaz(liste);
  return kayit;
}

export async function getCVler() {
  const yerel = yerelOku().map(ozet);
  try {
    const sunucu = (await client.get('/api/cvler')).data;
    return [...yerel, ...sunucu];
  } catch {
    // Sunucu yoksa ya da oturum geçersizse (401) yerel CV'ler yine de görünür kalmalı
    return yerel;
  }
}

export async function getCV(id) {
  if (yerelMi(id)) {
    const c = yerelOku().find(x => x.id === id);
    if (!c) throw new Error('CV bulunamadı');
    return c;
  }
  return (await client.get(`/api/cvler/${id}`)).data;
}

export async function postCV(data) {
  try {
    return (await client.post('/api/cvler', data)).data;
  } catch (e) {
    if (sunucuYok(e)) return yerelKaydet(null, data);
    throw e;
  }
}

export async function putCV(id, data) {
  if (yerelMi(id)) return yerelKaydet(id, data);
  return (await client.put(`/api/cvler/${id}`, data)).data;
}

export async function deleteCV(id) {
  if (yerelMi(id)) {
    yerelYaz(yerelOku().filter(c => c.id !== id));
    return { silindi: true };
  }
  return (await client.delete(`/api/cvler/${id}`)).data;
}

/**
 * Yerel CV'yi veritabanına taşır. Sunucu kaydı başarılı olursa yerel kopya silinir;
 * sunucu hâlâ yoksa hata fırlatır ve yerel kopya korunur.
 */
export async function aktarCV(id) {
  const c = yerelOku().find(x => x.id === id);
  if (!c) throw new Error('CV bulunamadı');
  const veri = { ...c };
  delete veri.id; delete veri.yerel; delete veri.guncelleme;
  let kayit;
  try {
    kayit = (await client.post('/api/cvler', veri)).data;
  } catch (e) {
    if (sunucuYok(e)) throw new Error('Veritabanına ulaşılamadı; CV tarayıcıda kalmaya devam ediyor.', { cause: e });
    throw e;
  }
  yerelYaz(yerelOku().filter(x => x.id !== id));
  return kayit;
}
