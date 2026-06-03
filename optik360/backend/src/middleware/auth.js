const jwt = require('jsonwebtoken');

function getSecret() {
  return process.env.JWT_SECRET || 'dev-secret-change-in-prod';
}

function requireAuth(req, res, next) {
  const header = req.headers['authorization'];
  if (!header || !header.startsWith('Bearer ')) {
    return res.status(401).json({ hata: 'Kimlik doğrulama gerekli' });
  }
  try {
    req.user = jwt.verify(header.slice(7), getSecret());
    next();
  } catch {
    res.status(401).json({ hata: 'Geçersiz veya süresi dolmuş token' });
  }
}

function optionalAuth(req, res, next) {
  const header = req.headers['authorization'];
  if (header && header.startsWith('Bearer ')) {
    try { req.user = jwt.verify(header.slice(7), getSecret()); } catch {}
  }
  next();
}

function requireRole(...roles) {
  return [
    requireAuth,
    (req, res, next) => {
      if (!roles.includes(req.user.rol)) {
        return res.status(403).json({ hata: 'Bu işlem için yetkiniz yok', gerekli: roles });
      }
      next();
    },
  ];
}

function tokenUret(kullanici) {
  return jwt.sign(
    { id: kullanici.id, eposta: kullanici.eposta, ad: kullanici.ad, rol: kullanici.rol },
    getSecret(),
    { expiresIn: '8h' }
  );
}

module.exports = { requireAuth, optionalAuth, requireRole, tokenUret };
