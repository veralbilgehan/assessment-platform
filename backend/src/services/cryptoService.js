/**
 * AES-256-GCM uygulama katmanı şifreleme
 * process.env.ENCRYPTION_KEY — 32 byte hex (64 karakter)
 */
const crypto = require('crypto');

const ALGO = 'aes-256-gcm';

function getKey() {
  const k = process.env.ENCRYPTION_KEY;
  if (!k || k.length !== 64) {
    // Anahtar yoksa şifreleme devre dışı (geliştirme modu)
    return null;
  }
  return Buffer.from(k, 'hex');
}

/**
 * Metni şifrele → "iv:authTag:ciphertext" formatında string
 */
function sifrele(metin) {
  const key = getKey();
  if (!key || !metin) return metin; // anahtar yoksa olduğu gibi dön

  const iv = crypto.randomBytes(12);
  const cipher = crypto.createCipheriv(ALGO, key, iv);
  const encrypted = Buffer.concat([cipher.update(metin, 'utf8'), cipher.final()]);
  const tag = cipher.getAuthTag();

  return [iv.toString('hex'), tag.toString('hex'), encrypted.toString('hex')].join(':');
}

/**
 * Şifrelenmiş string'i çöz
 */
function coz(sifrelenmis) {
  const key = getKey();
  if (!key || !sifrelenmis || !sifrelenmis.includes(':')) return sifrelenmis;

  const [ivHex, tagHex, dataHex] = sifrelenmis.split(':');
  const decipher = crypto.createDecipheriv(ALGO, key, Buffer.from(ivHex, 'hex'));
  decipher.setAuthTag(Buffer.from(tagHex, 'hex'));
  return decipher.update(Buffer.from(dataHex, 'hex'), undefined, 'utf8') + decipher.final('utf8');
}

module.exports = { sifrele, coz };
