/**
 * JWT kimlik doğrulama & rol yetkilendirme middleware
 */
const jwt = require('jsonwebtoken');

function getSecret() {
  return process.env.JWT_SECRET || 'dev-secret-change-in-prod';
}

/**
 * Token doğrula → req.user'a yükle
 */
function requireAuth(req, res, next) {
  const header = req.headers['authorization'];
  if (!header || !header.startsWith('Bearer ')) {
    return res.status(401).json({ hata: 'Kimlik doğrulama gerekli' });
  }
  const token = header.slice(7);
  try {
    req.user = jwt.verify(token, getSecret());
    next();
  } catch {
    res.status(401).json({ hata: 'Geçersiz veya süresi dolmuş token' });
  }
}

/**
 * Opsiyonel auth — token varsa doğrula, yoksa devam et
 */
function optionalAuth(req, res, next) {
  const header = req.headers['authorization'];
  if (header && header.startsWith('Bearer ')) {
    try {
      req.user = jwt.verify(header.slice(7), getSecret());
    } catch { /* ignore */ }
  }
  next();
}

/**
 * Rol bazlı erişim — kullanım: requireRole('admin') veya requireRole(['admin','degerlendirici'])
 */
function requireRole(...roles) {
  const allowed = roles.flat();
  return [requireAuth, (req, res, next) => {
    if (!allowed.includes(req.user.rol)) {
      return res.status(403).json({ hata: 'Bu işlem için yetkiniz yok', gerekli: allowed });
    }
    next();
  }];
}

/**
 * Token üret
 */
function tokenUret(kullanici) {
  return jwt.sign(
    { id: kullanici.id, eposta: kullanici.eposta, ad: kullanici.ad, rol: kullanici.rol },
    getSecret(),
    { expiresIn: '8h' }
  );
}

module.exports = { requireAuth, optionalAuth, requireRole, tokenUret };
