/**
 * Hesap yardımcıları — tek kullanımlık bağlantı token'ları, uygulama adresi,
 * şifre sıfırlama / belirleme e-postası
 */
const crypto = require('crypto');
const pool = require('../db/pool');
const { sablonluGonder } = require('./emailService');

const SIFIRLAMA_DAKIKA   = 60;       // "Şifremi Unuttum" bağlantısı
const SIFRE_BELIRLEME_GUN = 3;       // admin'in oluşturduğu hesaplar
const DAVET_GUN          = 7;

function tokenUret() {
  return crypto.randomBytes(32).toString('hex');
}

function tokenHash(token) {
  return crypto.createHash('sha256').update(String(token)).digest('hex');
}

/** E-postalardaki bağlantıların kökü. Üretimde APP_URL tanımlanmalı. */
function uygulamaAdresi(req) {
  if (process.env.APP_URL) return process.env.APP_URL.replace(/\/+$/, '');
  return `${req.protocol}://${req.get('host')}`;
}

/** Kullanıcıya yeni bir şifre sıfırlama token'ı açar; öncekileri geçersiz kılar. */
async function sifirlamaTokeniOlustur(kullaniciId, dakika) {
  const token = tokenUret();
  await pool.query(
    'UPDATE kullanici_tokenlari SET kullanildi = NOW() WHERE kullanici_id = $1 AND kullanildi IS NULL',
    [kullaniciId]
  );
  await pool.query(
    `INSERT INTO kullanici_tokenlari (kullanici_id, token_hash, son_kullanma)
     VALUES ($1, $2, NOW() + ($3 || ' minutes')::interval)`,
    [kullaniciId, tokenHash(token), String(dakika)]
  );
  return token;
}

/** "Şifremi Unuttum" e-postası */
async function sifirlamaEpostasiGonder(kullanici, req) {
  const token = await sifirlamaTokeniOlustur(kullanici.id, SIFIRLAMA_DAKIKA);
  await sablonluGonder({
    anahtar: 'sifre_sifirlama',
    alici: kullanici.eposta,
    aliciAd: kullanici.ad,
    degiskenler: {
      ad: kullanici.ad,
      sifirlamaUrl: `${uygulamaAdresi(req)}/sifre-sifirla?token=${token}`,
      gecerlilikDakika: SIFIRLAMA_DAKIKA,
    },
  });
}

/** Admin'in şifresiz oluşturduğu hesaba "şifreni belirle" e-postası */
async function hesapOlusturulduEpostasiGonder(kullanici, req) {
  const token = await sifirlamaTokeniOlustur(kullanici.id, SIFRE_BELIRLEME_GUN * 24 * 60);
  await sablonluGonder({
    anahtar: 'hesap_olusturuldu',
    alici: kullanici.eposta,
    aliciAd: kullanici.ad,
    degiskenler: {
      ad: kullanici.ad,
      eposta: kullanici.eposta,
      sifreBelirlemeUrl: `${uygulamaAdresi(req)}/sifre-sifirla?token=${token}`,
      gecerlilikGun: SIFRE_BELIRLEME_GUN,
    },
  });
}

module.exports = {
  DAVET_GUN, tokenUret, tokenHash, uygulamaAdresi,
  sifirlamaEpostasiGonder, hesapOlusturulduEpostasiGonder,
};
