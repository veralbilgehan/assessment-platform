const { Router } = require('express');
const pool = require('../db/pool');

const router = Router();

// GET /api/sektorler
// Tüm sektörler (dropdown için)
router.get('/', async (req, res, next) => {
  try {
    const { rows } = await pool.query(
      'SELECT id, nace_kodu, ad, aciklama FROM sektorler WHERE aktif = TRUE ORDER BY ad'
    );
    res.json(rows);
  } catch (err) {
    next(err);
  }
});

// GET /api/sektorler/:id/departmanlar
// Seçilen sektörün departmanları
router.get('/:id/departmanlar', async (req, res, next) => {
  try {
    const { rows } = await pool.query(
      `SELECT d.id, d.ad, d.aciklama
       FROM departmanlar d
       WHERE d.sektor_id = $1 AND d.aktif = TRUE
       ORDER BY d.ad`,
      [req.params.id]
    );
    if (!rows.length) return res.status(404).json({ hata: 'Sektör bulunamadı veya departmanı yok' });
    res.json(rows);
  } catch (err) {
    next(err);
  }
});

// GET /api/sektorler/hiyerarsi
// Tam ağaç: sektör → departman → pozisyon (tek istekte)
router.get('/hiyerarsi/tam', async (req, res, next) => {
  try {
    const { rows } = await pool.query(`SELECT * FROM v_hiyerarsi`);

    // Düz listeyi ağaç yapısına çevir
    const sektorMap = {};
    for (const r of rows) {
      if (!sektorMap[r.sektor_id]) {
        sektorMap[r.sektor_id] = {
          id: r.sektor_id, nace_kodu: r.nace_kodu, ad: r.sektor_adi,
          departmanlar: {}
        };
      }
      const s = sektorMap[r.sektor_id];
      if (!s.departmanlar[r.departman_id]) {
        s.departmanlar[r.departman_id] = { id: r.departman_id, ad: r.departman_adi, pozisyonlar: [] };
      }
      s.departmanlar[r.departman_id].pozisyonlar.push({
        id: r.pozisyon_id, ad: r.pozisyon_adi, seviye: r.seviye
      });
    }

    const sonuc = Object.values(sektorMap).map(s => ({
      ...s,
      departmanlar: Object.values(s.departmanlar)
    }));

    res.json(sonuc);
  } catch (err) {
    next(err);
  }
});

module.exports = router;
