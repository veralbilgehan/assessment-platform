const { Router } = require('express');
const bcrypt = require('bcrypt');
const { body, validationResult } = require('express-validator');
const pool = require('../db/pool');
const { requireAuth, requireRole, tokenUret } = require('../middleware/auth');

const router = Router();

function validate(req, res, next) {
  const errors = validationResult(req);
  if (!errors.isEmpty()) return res.status(400).json({ hatalar: errors.array() });
  next();
}

// POST /api/auth/giris
router.post('/giris',
  body('eposta').isEmail().withMessage('Geçerli e-posta girin'),
  body('sifre').notEmpty().withMessage('Şifre gerekli'),
  validate,
  async (req, res, next) => {
    try {
      const { eposta, sifre } = req.body;
      const { rows } = await pool.query(
        'SELECT * FROM kullanicilar WHERE eposta=$1 AND aktif=TRUE',
        [eposta.toLowerCase()]
      );
      if (!rows.length) return res.status(401).json({ hata: 'E-posta veya şifre hatalı' });

      const kullanici = rows[0];
      const eslesti = await bcrypt.compare(sifre, kullanici.sifre_hash);
      if (!eslesti) return res.status(401).json({ hata: 'E-posta veya şifre hatalı' });

      const token = tokenUret(kullanici);
      res.json({
        token,
        kullanici: { id: kullanici.id, eposta: kullanici.eposta, ad: kullanici.ad, soyad: kullanici.soyad, rol: kullanici.rol },
      });
    } catch (err) { next(err); }
  }
);

// GET /api/auth/ben
router.get('/ben', requireAuth, async (req, res, next) => {
  try {
    const { rows } = await pool.query(
      'SELECT id, eposta, ad, soyad, telefon, rol, olusturuldu FROM kullanicilar WHERE id=$1',
      [req.user.id]
    );
    if (!rows.length) return res.status(404).json({ hata: 'Kullanıcı bulunamadı' });
    res.json(rows[0]);
  } catch (err) { next(err); }
});

// POST /api/auth/kayit — sadece super_admin
router.post('/kayit',
  ...requireRole('super_admin'),
  body('eposta').isEmail(),
  body('sifre').isLength({ min: 6 }).withMessage('Şifre en az 6 karakter olmalı'),
  body('ad').notEmpty(),
  body('rol').isIn(['super_admin','toptanci','satis_temsilcisi','bayi']),
  validate,
  async (req, res, next) => {
    try {
      const { eposta, sifre, ad, soyad, telefon, rol } = req.body;
      const hash = await bcrypt.hash(sifre, 10);
      const { rows } = await pool.query(
        `INSERT INTO kullanicilar (eposta, sifre_hash, ad, soyad, telefon, rol)
         VALUES ($1,$2,$3,$4,$5,$6) RETURNING id, eposta, ad, soyad, rol`,
        [eposta.toLowerCase(), hash, ad, soyad || null, telefon || null, rol]
      );
      res.status(201).json(rows[0]);
    } catch (err) {
      if (err.code === '23505') return res.status(409).json({ hata: 'Bu e-posta zaten kayıtlı' });
      next(err);
    }
  }
);

// PUT /api/auth/sifre
router.put('/sifre',
  requireAuth,
  body('eski_sifre').notEmpty(),
  body('yeni_sifre').isLength({ min: 6 }),
  validate,
  async (req, res, next) => {
    try {
      const { eski_sifre, yeni_sifre } = req.body;
      const { rows } = await pool.query('SELECT sifre_hash FROM kullanicilar WHERE id=$1', [req.user.id]);
      const eslesti = await bcrypt.compare(eski_sifre, rows[0].sifre_hash);
      if (!eslesti) return res.status(401).json({ hata: 'Mevcut şifre hatalı' });

      const hash = await bcrypt.hash(yeni_sifre, 10);
      await pool.query('UPDATE kullanicilar SET sifre_hash=$1 WHERE id=$2', [hash, req.user.id]);
      res.json({ mesaj: 'Şifre güncellendi' });
    } catch (err) { next(err); }
  }
);

module.exports = router;
