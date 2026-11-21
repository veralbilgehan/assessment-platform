/**
 * Basit giriş: tek yönetici şifresi (MALIYET_SIFRE) → 8 saatlik JWT
 */
const crypto = require('crypto');
const jwt = require('jsonwebtoken');

function gizli() {
  if (!process.env.JWT_SECRET) throw new Error('JWT_SECRET tanımlı değil');
  return process.env.JWT_SECRET;
}

function sifreDogru(girilen) {
  const beklenen = process.env.MALIYET_SIFRE;
  if (!beklenen || typeof girilen !== 'string') return false;
  const a = crypto.createHash('sha256').update(girilen).digest();
  const b = crypto.createHash('sha256').update(beklenen).digest();
  return crypto.timingSafeEqual(a, b);
}

function girisYap(req, res) {
  if (!sifreDogru(req.body?.sifre)) return res.status(401).json({ hata: 'Şifre hatalı' });
  const token = jwt.sign({ rol: 'admin' }, gizli(), { expiresIn: '8h' });
  res.json({ token });
}

function requireAuth(req, res, next) {
  const baslik = req.headers.authorization || '';
  const token = baslik.startsWith('Bearer ') ? baslik.slice(7) : null;
  if (!token) return res.status(401).json({ hata: 'Giriş yapmanız gerekiyor' });
  try {
    req.user = jwt.verify(token, gizli());
    next();
  } catch {
    res.status(401).json({ hata: 'Oturum süresi doldu, yeniden giriş yapın' });
  }
}

function requireRole(...roller) {
  const izinli = roller.flat();
  return [requireAuth, (req, res, next) => {
    if (!izinli.includes(req.user.rol)) return res.status(403).json({ hata: 'Bu işlem için yetkiniz yok' });
    next();
  }];
}

module.exports = { girisYap, requireAuth, requireRole };
