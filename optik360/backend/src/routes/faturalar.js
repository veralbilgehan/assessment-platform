const { Router } = require('express');
const pool = require('../db/pool');
const { requireAuth } = require('../middleware/auth');

const router = Router();

// GET /api/faturalar
router.get('/', requireAuth, async (req, res, next) => {
  try {
    const { bayi_id, durum } = req.query;
    const params = [];
    const where  = [];

    if (bayi_id) { params.push(bayi_id); where.push(`f.bayi_id=$${params.length}`); }
    if (durum)   { params.push(durum);   where.push(`f.durum=$${params.length}`); }

    // Vadesi geçmiş faturalar otomatik 'gecikti' olarak güncellenir
    await pool.query(`
      UPDATE faturalar SET durum='gecikti'
      WHERE durum='acik' AND vade_tarihi < CURRENT_DATE
    `);

    const whereClause = where.length ? `WHERE ${where.join(' AND ')}` : '';
    const { rows } = await pool.query(`
      SELECT f.id, f.fatura_no, f.durum, f.toplam_tutar, f.odenen_tutar, f.kalan_tutar,
             f.vade_tarihi, f.olusturuldu,
             b.unvan AS bayi, b.kod AS bayi_kod,
             s.siparis_no,
             (f.vade_tarihi < CURRENT_DATE AND f.durum <> 'odendi') AS gecikti
      FROM faturalar f
      JOIN bayiler b ON b.id = f.bayi_id
      LEFT JOIN siparisler s ON s.id = f.siparis_id
      ${whereClause}
      ORDER BY f.vade_tarihi ASC
    `, params);
    res.json(rows);
  } catch (err) { next(err); }
});

// GET /api/faturalar/:id
router.get('/:id', requireAuth, async (req, res, next) => {
  try {
    const { rows } = await pool.query(`
      SELECT f.*, b.unvan AS bayi, b.kod AS bayi_kod, b.eposta AS bayi_eposta,
             b.vergi_no, b.vergi_dairesi, s.siparis_no
      FROM faturalar f
      JOIN bayiler b ON b.id = f.bayi_id
      LEFT JOIN siparisler s ON s.id = f.siparis_id
      WHERE f.id=$1
    `, [req.params.id]);
    if (!rows.length) return res.status(404).json({ hata: 'Fatura bulunamadı' });
    res.json(rows[0]);
  } catch (err) { next(err); }
});

module.exports = router;
