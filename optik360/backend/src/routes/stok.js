const { Router } = require('express');
const { body, validationResult } = require('express-validator');
const pool = require('../db/pool');
const { requireAuth, requireRole } = require('../middleware/auth');

const router = Router();

function validate(req, res, next) {
  const errors = validationResult(req);
  if (!errors.isEmpty()) return res.status(400).json({ hatalar: errors.array() });
  next();
}

// GET /api/stok — genel görünüm + kritik stok uyarıları
router.get('/', requireAuth, async (req, res, next) => {
  try {
    const { rows } = await pool.query(`
      SELECT u.id AS urun_id, u.sku, u.ad AS urun_adi, u.minimum_stok,
             m.ad AS marka, k.ad AS kategori,
             d.id AS depo_id, d.ad AS depo,
             COALESCE(s.miktar, 0) AS miktar,
             CASE WHEN COALESCE(s.miktar, 0) <= u.minimum_stok THEN TRUE ELSE FALSE END AS kritik
      FROM urunler u
      LEFT JOIN markalar m ON m.id = u.marka_id
      LEFT JOIN kategoriler k ON k.id = u.kategori_id
      CROSS JOIN depolar d
      LEFT JOIN stok s ON s.urun_id = u.id AND s.depo_id = d.id
      WHERE u.aktif=TRUE AND d.aktif=TRUE
      ORDER BY kritik DESC, u.ad, d.ad
    `);
    res.json(rows);
  } catch (err) { next(err); }
});

// POST /api/stok/hareket
router.post('/hareket',
  ...requireRole('super_admin', 'toptanci'),
  body('urun_id').isInt(),
  body('depo_id').isInt(),
  body('tip').isIn(['giris', 'cikis', 'transfer', 'sayim']),
  body('miktar').isInt({ min: 1 }),
  validate,
  async (req, res, next) => {
    const client = await pool.connect();
    try {
      await client.query('BEGIN');
      const { urun_id, depo_id, tip, miktar, notlar } = req.body;

      // Hareketi kaydet
      await client.query(
        `INSERT INTO stok_hareketleri (urun_id, depo_id, tip, miktar, notlar, kullanici_id)
         VALUES ($1,$2,$3,$4,$5,$6)`,
        [urun_id, depo_id, tip, miktar, notlar || null, req.user.id]
      );

      // Stok miktarını güncelle
      const delta = (tip === 'giris' || tip === 'sayim') ? miktar : -miktar;
      await client.query(`
        INSERT INTO stok (urun_id, depo_id, miktar) VALUES ($1, $2, $3)
        ON CONFLICT (urun_id, depo_id) DO UPDATE
          SET miktar = stok.miktar + $3
      `, [urun_id, depo_id, delta]);

      await client.query('COMMIT');
      res.status(201).json({ mesaj: 'Stok hareketi kaydedildi' });
    } catch (err) {
      await client.query('ROLLBACK');
      next(err);
    } finally {
      client.release();
    }
  }
);

module.exports = router;
