const { Router } = require('express');
const pool = require('../db/pool');

const router = Router();

// GET /api/pozisyonlar/liste — tüm aktif pozisyonlar (sektör/departman bilgisiyle)
router.get('/liste', async (req, res, next) => {
  try {
    const { rows } = await pool.query(
      `SELECT p.id, p.ad, p.seviye,
              d.ad  AS departman_adi,
              s.ad  AS sektor_adi,
              s.id  AS sektor_id
       FROM pozisyonlar p
       JOIN departmanlar d ON d.id = p.departman_id
       JOIN sektorler    s ON s.id = d.sektor_id
       WHERE p.aktif = TRUE
       ORDER BY s.ad, d.ad, p.ad`
    );
    res.json(rows);
  } catch (err) { next(err); }
});

// GET /api/departmanlar/:id/pozisyonlar
router.get('/departman/:departmanId', async (req, res, next) => {
  try {
    const { rows } = await pool.query(
      `SELECT p.id, p.ad, p.seviye, p.aciklama
       FROM pozisyonlar p
       WHERE p.departman_id = $1 AND p.aktif = TRUE
       ORDER BY
         ARRAY_POSITION(ARRAY['stajyer','junior','uzman','kıdemli_uzman',
                              'takım_lideri','yönetici','direktör','c_seviyesi'], p.seviye),
         p.ad`,
      [req.params.departmanId]
    );
    res.json(rows);
  } catch (err) {
    next(err);
  }
});

// GET /api/pozisyonlar/:id
// Pozisyon detayı + yetkinlik profili
router.get('/:id', async (req, res, next) => {
  try {
    const pozRes = await pool.query(
      `SELECT p.id, p.ad, p.seviye, p.aciklama,
              d.ad AS departman_adi, d.id AS departman_id,
              s.ad AS sektor_adi,   s.id AS sektor_id
       FROM pozisyonlar p
       JOIN departmanlar d ON d.id = p.departman_id
       JOIN sektorler s    ON s.id = d.sektor_id
       WHERE p.id = $1`,
      [req.params.id]
    );

    if (!pozRes.rows.length) return res.status(404).json({ hata: 'Pozisyon bulunamadı' });

    const yetRes = await pool.query(
      `SELECT * FROM v_pozisyon_yetkinlik_profili WHERE pozisyon_id = $1`,
      [req.params.id]
    );

    res.json({
      ...pozRes.rows[0],
      yetkinlikler: yetRes.rows
    });
  } catch (err) {
    next(err);
  }
});

// GET /api/pozisyonlar/:id/sorular
// Pozisyona göre zorluk dağılımlı test soruları
router.get('/:id/sorular', async (req, res, next) => {
  try {
    const { kolay = 3, orta = 5, zor = 2 } = req.query;
    const { rows } = await pool.query(
      `SELECT * FROM pozisyon_test_sorulari($1, $2, $3, $4)`,
      [req.params.id, parseInt(kolay), parseInt(orta), parseInt(zor)]
    );
    res.json(rows);
  } catch (err) {
    next(err);
  }
});

module.exports = router;
