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

// GET /api/urunler
router.get('/', requireAuth, async (req, res, next) => {
  try {
    const { marka_id, kategori_id, arama, kritik_stok } = req.query;
    const params = [];
    const where  = ['u.aktif=TRUE'];

    if (marka_id)    { params.push(marka_id);    where.push(`u.marka_id=$${params.length}`); }
    if (kategori_id) { params.push(kategori_id); where.push(`u.kategori_id=$${params.length}`); }
    if (arama)       { params.push(`%${arama}%`); where.push(`(u.ad ILIKE $${params.length} OR u.sku ILIKE $${params.length} OR u.barkod ILIKE $${params.length})`); }

    let havingClause = '';
    if (kritik_stok === '1') havingClause = 'HAVING COALESCE(SUM(s.miktar),0) <= u.minimum_stok';

    const { rows } = await pool.query(`
      SELECT u.id, u.barkod, u.sku, u.ad, u.model, u.renk, u.cam_tipi, u.cerceve_tipi,
             u.bayi_fiyati, u.tavsiye_fiyati, u.kampanya_fiyati, u.minimum_stok, u.raf_yeri, u.aktif,
             m.ad AS marka, k.ad AS kategori,
             COALESCE(SUM(s.miktar), 0) AS toplam_stok
      FROM urunler u
      LEFT JOIN markalar m ON m.id = u.marka_id
      LEFT JOIN kategoriler k ON k.id = u.kategori_id
      LEFT JOIN stok s ON s.urun_id = u.id
      WHERE ${where.join(' AND ')}
      GROUP BY u.id, m.ad, k.ad
      ${havingClause}
      ORDER BY u.ad
    `, params);
    res.json(rows);
  } catch (err) { next(err); }
});

// GET /api/urunler/:id
router.get('/:id', requireAuth, async (req, res, next) => {
  try {
    const { rows } = await pool.query(`
      SELECT u.*, m.ad AS marka, k.ad AS kategori
      FROM urunler u
      LEFT JOIN markalar m ON m.id = u.marka_id
      LEFT JOIN kategoriler k ON k.id = u.kategori_id
      WHERE u.id=$1
    `, [req.params.id]);
    if (!rows.length) return res.status(404).json({ hata: 'Ürün bulunamadı' });

    const { rows: stoklar } = await pool.query(`
      SELECT d.ad AS depo, s.miktar FROM stok s
      JOIN depolar d ON d.id = s.depo_id
      WHERE s.urun_id=$1
    `, [req.params.id]);

    res.json({ ...rows[0], stok_detay: stoklar });
  } catch (err) { next(err); }
});

// POST /api/urunler
router.post('/',
  ...requireRole('super_admin', 'toptanci'),
  body('sku').notEmpty().withMessage('SKU gerekli'),
  body('ad').notEmpty().withMessage('Ürün adı gerekli'),
  validate,
  async (req, res, next) => {
    try {
      const {
        barkod, sku, marka_id, kategori_id, ad, model, renk, cam_tipi, cerceve_tipi,
        satin_alma_fiyati, bayi_fiyati, tavsiye_fiyati, kampanya_fiyati,
        minimum_stok, raf_yeri,
      } = req.body;

      const { rows } = await pool.query(`
        INSERT INTO urunler
          (barkod, sku, marka_id, kategori_id, ad, model, renk, cam_tipi, cerceve_tipi,
           satin_alma_fiyati, bayi_fiyati, tavsiye_fiyati, kampanya_fiyati, minimum_stok, raf_yeri)
        VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15)
        RETURNING *
      `, [barkod||null, sku, marka_id||null, kategori_id||null, ad, model||null, renk||null,
          cam_tipi||null, cerceve_tipi||null, satin_alma_fiyati||null, bayi_fiyati||null,
          tavsiye_fiyati||null, kampanya_fiyati||null, minimum_stok||0, raf_yeri||null]);

      // Merkez depoda başlangıç stok kaydı oluştur (0 ile)
      await pool.query(
        'INSERT INTO stok (urun_id, depo_id, miktar) SELECT $1, id, 0 FROM depolar WHERE tip=$2',
        [rows[0].id, 'merkez']
      );

      res.status(201).json(rows[0]);
    } catch (err) {
      if (err.code === '23505') return res.status(409).json({ hata: 'Bu SKU veya barkod zaten kayıtlı' });
      next(err);
    }
  }
);

// PUT /api/urunler/:id
router.put('/:id',
  ...requireRole('super_admin', 'toptanci'),
  async (req, res, next) => {
    try {
      const {
        barkod, sku, marka_id, kategori_id, ad, model, renk, cam_tipi, cerceve_tipi,
        satin_alma_fiyati, bayi_fiyati, tavsiye_fiyati, kampanya_fiyati, minimum_stok, raf_yeri,
      } = req.body;
      const { rows } = await pool.query(`
        UPDATE urunler SET
          barkod=$1, sku=$2, marka_id=$3, kategori_id=$4, ad=$5, model=$6, renk=$7,
          cam_tipi=$8, cerceve_tipi=$9, satin_alma_fiyati=$10, bayi_fiyati=$11,
          tavsiye_fiyati=$12, kampanya_fiyati=$13, minimum_stok=$14, raf_yeri=$15
        WHERE id=$16 RETURNING *
      `, [barkod||null, sku, marka_id||null, kategori_id||null, ad, model||null, renk||null,
          cam_tipi||null, cerceve_tipi||null, satin_alma_fiyati||null, bayi_fiyati||null,
          tavsiye_fiyati||null, kampanya_fiyati||null, minimum_stok||0, raf_yeri||null,
          req.params.id]);
      if (!rows.length) return res.status(404).json({ hata: 'Ürün bulunamadı' });
      res.json(rows[0]);
    } catch (err) { next(err); }
  }
);

// DELETE /api/urunler/:id — pasifleştir
router.delete('/:id',
  ...requireRole('super_admin'),
  async (req, res, next) => {
    try {
      await pool.query('UPDATE urunler SET aktif=FALSE WHERE id=$1', [req.params.id]);
      res.json({ mesaj: 'Ürün pasifleştirildi' });
    } catch (err) { next(err); }
  }
);

module.exports = router;
