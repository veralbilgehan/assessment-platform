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

// GET /api/bayiler
router.get('/', requireAuth, async (req, res, next) => {
  try {
    const { rows } = await pool.query(`
      SELECT b.id, b.kod, b.unvan, b.eposta, b.telefon, b.il, b.ilce, b.seviye, b.aktif, b.olusturuldu,
             k.ad AS temsilci_ad,
             ch.guncel_bakiye, ch.risk_limiti
      FROM bayiler b
      LEFT JOIN kullanicilar k ON k.id = b.satis_temsilcisi_id
      LEFT JOIN cari_hesaplar ch ON ch.bayi_id = b.id
      WHERE b.aktif=TRUE
      ORDER BY b.unvan
    `);
    res.json(rows);
  } catch (err) { next(err); }
});

// GET /api/bayiler/:id
router.get('/:id', requireAuth, async (req, res, next) => {
  try {
    const { rows } = await pool.query(`
      SELECT b.*, k.ad AS temsilci_ad,
             ch.guncel_bakiye, ch.risk_limiti, ch.varsayilan_vade
      FROM bayiler b
      LEFT JOIN kullanicilar k ON k.id = b.satis_temsilcisi_id
      LEFT JOIN cari_hesaplar ch ON ch.bayi_id = b.id
      WHERE b.id=$1
    `, [req.params.id]);
    if (!rows.length) return res.status(404).json({ hata: 'Bayi bulunamadı' });

    const { rows: sonSiparisler } = await pool.query(`
      SELECT id, siparis_no, durum, genel_toplam, olusturuldu
      FROM siparisler WHERE bayi_id=$1 ORDER BY olusturuldu DESC LIMIT 5
    `, [req.params.id]);

    res.json({ ...rows[0], son_siparisler: sonSiparisler });
  } catch (err) { next(err); }
});

// POST /api/bayiler
router.post('/',
  ...requireRole('super_admin', 'toptanci'),
  body('kod').notEmpty().withMessage('Bayi kodu gerekli'),
  body('unvan').notEmpty().withMessage('Ünvan gerekli'),
  validate,
  async (req, res, next) => {
    const client = await pool.connect();
    try {
      await client.query('BEGIN');
      const {
        kod, unvan, eposta, telefon, adres, il, ilce,
        vergi_no, vergi_dairesi, seviye, satis_temsilcisi_id, risk_limiti, varsayilan_vade,
      } = req.body;

      const { rows } = await client.query(`
        INSERT INTO bayiler (kod, unvan, eposta, telefon, adres, il, ilce, vergi_no, vergi_dairesi, seviye, satis_temsilcisi_id)
        VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11) RETURNING *
      `, [kod, unvan, eposta||null, telefon||null, adres||null, il||null, ilce||null,
          vergi_no||null, vergi_dairesi||null, seviye||'standart', satis_temsilcisi_id||null]);

      const bayi = rows[0];

      // Otomatik cari hesap aç
      await client.query(
        `INSERT INTO cari_hesaplar (bayi_id, risk_limiti, varsayilan_vade) VALUES ($1,$2,$3)`,
        [bayi.id, risk_limiti || 0, varsayilan_vade || 30]
      );

      await client.query('COMMIT');
      res.status(201).json(bayi);
    } catch (err) {
      await client.query('ROLLBACK');
      if (err.code === '23505') return res.status(409).json({ hata: 'Bu bayi kodu zaten kullanımda' });
      next(err);
    } finally {
      client.release();
    }
  }
);

// PUT /api/bayiler/:id
router.put('/:id',
  ...requireRole('super_admin', 'toptanci'),
  async (req, res, next) => {
    try {
      const {
        kod, unvan, eposta, telefon, adres, il, ilce,
        vergi_no, vergi_dairesi, seviye, satis_temsilcisi_id,
      } = req.body;
      const { rows } = await pool.query(`
        UPDATE bayiler SET
          kod=$1, unvan=$2, eposta=$3, telefon=$4, adres=$5, il=$6, ilce=$7,
          vergi_no=$8, vergi_dairesi=$9, seviye=$10, satis_temsilcisi_id=$11
        WHERE id=$12 RETURNING *
      `, [kod, unvan, eposta||null, telefon||null, adres||null, il||null, ilce||null,
          vergi_no||null, vergi_dairesi||null, seviye||'standart', satis_temsilcisi_id||null,
          req.params.id]);
      if (!rows.length) return res.status(404).json({ hata: 'Bayi bulunamadı' });
      res.json(rows[0]);
    } catch (err) { next(err); }
  }
);

module.exports = router;
