/**
 * Auth Routes
 * POST /api/auth/giris   — giriş
 * POST /api/auth/kayit   — kayıt (sadece admin)
 * GET  /api/auth/ben     — mevcut kullanıcı bilgisi
 * PUT  /api/auth/sifre   — şifre değiştir
 */
const { Router } = require('express');
const bcrypt = require('bcrypt');
const pool = require('../db/pool');
const { requireAuth, requireRole, tokenUret } = require('../middleware/auth');

const router = Router();

// POST /api/auth/giris
router.post('/giris', async (req, res, next) => {
  try {
    const { eposta, sifre } = req.body;
    if (!eposta || !sifre) return res.status(400).json({ hata: 'E-posta ve şifre gerekli' });

    const { rows } = await pool.query(
      'SELECT * FROM kullanicilar WHERE eposta=$1 AND aktif=true', [eposta.toLowerCase()]
    );
    const kullanici = rows[0];
    if (!kullanici) return res.status(401).json({ hata: 'E-posta veya şifre hatalı' });

    const eslesti = await bcrypt.compare(sifre, kullanici.sifre_hash);
    if (!eslesti) return res.status(401).json({ hata: 'E-posta veya şifre hatalı' });

    const token = tokenUret(kullanici);
    res.json({
      token,
      kullanici: {
        id: kullanici.id, ad: kullanici.ad,
        eposta: kullanici.eposta, rol: kullanici.rol
      }
    });
  } catch (err) { next(err); }
});

// POST /api/auth/kayit — sadece admin yapabilir
router.post('/kayit', requireRole('admin'), async (req, res, next) => {
  try {
    const { eposta, sifre, ad, rol = 'izleyici' } = req.body;
    if (!eposta || !sifre || !ad) return res.status(400).json({ hata: 'Eksik alan' });
    if (!['admin','degerlendirici','izleyici'].includes(rol))
      return res.status(400).json({ hata: 'Geçersiz rol' });

    const hash = await bcrypt.hash(sifre, 12);
    const { rows } = await pool.query(
      `INSERT INTO kullanicilar (eposta, sifre_hash, ad, rol)
       VALUES ($1,$2,$3,$4) RETURNING id, eposta, ad, rol`,
      [eposta.toLowerCase(), hash, ad, rol]
    );
    res.status(201).json(rows[0]);
  } catch (err) {
    if (err.code === '23505') return res.status(409).json({ hata: 'Bu e-posta zaten kayıtlı' });
    next(err);
  }
});

// GET /api/auth/ben
router.get('/ben', requireAuth, async (req, res, next) => {
  try {
    const { rows } = await pool.query(
      'SELECT id, eposta, ad, rol, olusturma FROM kullanicilar WHERE id=$1', [req.user.id]
    );
    if (!rows[0]) return res.status(404).json({ hata: 'Kullanıcı bulunamadı' });
    res.json(rows[0]);
  } catch (err) { next(err); }
});

// GET /api/auth/kullanicilar — sadece admin
router.get('/kullanicilar', requireRole('admin'), async (req, res, next) => {
  try {
    const { rows } = await pool.query(
      'SELECT id, eposta, ad, rol, aktif, olusturma FROM kullanicilar ORDER BY olusturma DESC'
    );
    res.json(rows);
  } catch (err) { next(err); }
});

// PUT /api/auth/sifre
router.put('/sifre', requireAuth, async (req, res, next) => {
  try {
    const { mevcut, yeni } = req.body;
    if (!mevcut || !yeni || yeni.length < 6)
      return res.status(400).json({ hata: 'Şifre en az 6 karakter olmalı' });

    const { rows } = await pool.query('SELECT sifre_hash FROM kullanicilar WHERE id=$1', [req.user.id]);
    const eslesti = await bcrypt.compare(mevcut, rows[0].sifre_hash);
    if (!eslesti) return res.status(401).json({ hata: 'Mevcut şifre hatalı' });

    const hash = await bcrypt.hash(yeni, 12);
    await pool.query('UPDATE kullanicilar SET sifre_hash=$1 WHERE id=$2', [hash, req.user.id]);
    res.json({ mesaj: 'Şifre güncellendi' });
  } catch (err) { next(err); }
});

module.exports = router;
