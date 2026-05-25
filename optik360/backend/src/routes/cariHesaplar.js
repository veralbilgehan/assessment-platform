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

// GET /api/cari-hesaplar/riskli — geciken & limit aşımı
// Not: Bu route :bayiId'den önce tanımlanmalı (Express path matching)
router.get('/riskli', ...requireRole('super_admin', 'toptanci'), async (req, res, next) => {
  try {
    const { rows } = await pool.query(`
      SELECT b.id, b.kod, b.unvan, b.telefon, b.seviye,
             ch.guncel_bakiye, ch.risk_limiti,
             (ch.guncel_bakiye > ch.risk_limiti) AS limit_asimi,
             COUNT(CASE WHEN ch2.vade_tarihi < CURRENT_DATE THEN 1 END) AS geciken_kalem_sayisi,
             COALESCE(SUM(CASE WHEN ch2.vade_tarihi < CURRENT_DATE AND ch2.tip='borclanma' THEN ch2.tutar ELSE 0 END), 0) AS geciken_tutar
      FROM bayiler b
      JOIN cari_hesaplar ch ON ch.bayi_id = b.id
      LEFT JOIN cari_hareketler ch2 ON ch2.bayi_id = b.id
      WHERE b.aktif=TRUE AND (ch.guncel_bakiye > ch.risk_limiti OR ch.guncel_bakiye > 0)
      GROUP BY b.id, b.kod, b.unvan, b.telefon, b.seviye, ch.guncel_bakiye, ch.risk_limiti
      HAVING ch.guncel_bakiye > 0
      ORDER BY ch.guncel_bakiye DESC
    `);
    res.json(rows);
  } catch (err) { next(err); }
});

// GET /api/cari-hesaplar — tüm liste
router.get('/', ...requireRole('super_admin', 'toptanci'), async (req, res, next) => {
  try {
    const { rows } = await pool.query(`
      SELECT b.id AS bayi_id, b.kod, b.unvan, b.il, b.seviye,
             ch.id, ch.guncel_bakiye, ch.risk_limiti, ch.varsayilan_vade, ch.guncellendi,
             ROUND(CASE WHEN ch.risk_limiti > 0 THEN (ch.guncel_bakiye / ch.risk_limiti * 100) ELSE 0 END, 1) AS risk_yuzdesi,
             MIN(CASE WHEN cr.vade_tarihi >= CURRENT_DATE AND cr.tip='borclanma' THEN cr.vade_tarihi END) AS sonraki_vade
      FROM bayiler b
      JOIN cari_hesaplar ch ON ch.bayi_id = b.id
      LEFT JOIN cari_hareketler cr ON cr.bayi_id = b.id
      WHERE b.aktif=TRUE
      GROUP BY b.id, b.kod, b.unvan, b.il, b.seviye, ch.id, ch.guncel_bakiye, ch.risk_limiti, ch.varsayilan_vade, ch.guncellendi
      ORDER BY ch.guncel_bakiye DESC
    `);
    res.json(rows);
  } catch (err) { next(err); }
});

// GET /api/cari-hesaplar/:bayiId — bayi cari detay + hareketler
router.get('/:bayiId', requireAuth, async (req, res, next) => {
  try {
    const { rows: hesap } = await pool.query(`
      SELECT b.id AS bayi_id, b.kod, b.unvan, b.eposta, b.telefon, b.seviye,
             ch.id, ch.guncel_bakiye, ch.risk_limiti, ch.varsayilan_vade
      FROM bayiler b
      JOIN cari_hesaplar ch ON ch.bayi_id = b.id
      WHERE b.id=$1
    `, [req.params.bayiId]);
    if (!hesap.length) return res.status(404).json({ hata: 'Cari hesap bulunamadı' });

    const { rows: hareketler } = await pool.query(`
      SELECT ch.*, k.ad AS kullanici_adi
      FROM cari_hareketler ch
      LEFT JOIN kullanicilar k ON k.id = ch.kullanici_id
      WHERE ch.bayi_id=$1
      ORDER BY ch.olusturuldu DESC
      LIMIT 100
    `, [req.params.bayiId]);

    // Vadesi yaklaşanlar (önümüzdeki 7 gün)
    const { rows: yaklasan } = await pool.query(`
      SELECT * FROM cari_hareketler
      WHERE bayi_id=$1 AND tip='borclanma'
        AND vade_tarihi BETWEEN CURRENT_DATE AND CURRENT_DATE + INTERVAL '7 days'
      ORDER BY vade_tarihi
    `, [req.params.bayiId]);

    res.json({ ...hesap[0], hareketler, yaklasan_vadeler: yaklasan });
  } catch (err) { next(err); }
});

// POST /api/cari-hesaplar/:bayiId/hareket — manuel hareket
router.post('/:bayiId/hareket',
  ...requireRole('super_admin', 'toptanci'),
  body('tip').isIn(['borclanma', 'odeme', 'iade', 'iskonto']),
  body('tutar').isFloat({ min: 0.01 }),
  validate,
  async (req, res, next) => {
    const client = await pool.connect();
    try {
      await client.query('BEGIN');
      const { tip, tutar, vade_tarihi, aciklama } = req.body;
      const bayiId = req.params.bayiId;

      await client.query(
        `INSERT INTO cari_hareketler (bayi_id, tip, tutar, vade_tarihi, aciklama, kullanici_id)
         VALUES ($1,$2,$3,$4,$5,$6)`,
        [bayiId, tip, tutar, vade_tarihi || null, aciklama || null, req.user.id]
      );

      const delta = (tip === 'borclanma') ? tutar : -tutar;
      await client.query(
        `UPDATE cari_hesaplar SET guncel_bakiye = guncel_bakiye + $1, guncellendi=NOW() WHERE bayi_id=$2`,
        [delta, bayiId]
      );

      await client.query('COMMIT');
      res.status(201).json({ mesaj: 'Cari hareket kaydedildi' });
    } catch (err) {
      await client.query('ROLLBACK');
      next(err);
    } finally {
      client.release();
    }
  }
);

module.exports = router;
