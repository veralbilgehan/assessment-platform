const { Router } = require('express');
const { body } = require('express-validator');
const pool = require('../db/pool');
const { validate } = require('../middleware/errorHandler');
const { makaleUret, makaleUretStream } = require('../services/aiService');

const router = Router();

// POST /api/degerlendirmeler
// Yeni değerlendirme oluştur (makale + sorular otomatik)
router.post('/',
  body('pozisyon_id').isInt({ min: 1 }).withMessage('Geçerli bir pozisyon_id girin'),
  body('aday_ad').optional().isString().trim(),
  body('aday_eposta').optional().isEmail().withMessage('Geçerli e-posta girin'),
  validate,
  async (req, res, next) => {
    try {
      const { pozisyon_id, aday_ad = null, aday_eposta = null } = req.body;

      const { rows } = await pool.query(
        `SELECT degerlendirme_olustur($1, $2, $3) AS id`,
        [pozisyon_id, aday_ad, aday_eposta]
      );

      const id = rows[0].id;
      // Oluşturulan kaydı tam olarak döndür
      const detail = await pool.query(
        `SELECT * FROM v_degerlendirme_ozet WHERE degerlendirme_id = $1`,
        [id]
      );

      res.status(201).json({
        id,
        mesaj: 'Değerlendirme oluşturuldu',
        ozet: detail.rows[0]
      });
    } catch (err) {
      next(err);
    }
  }
);

// GET /api/degerlendirmeler/:id
// Değerlendirme detayı — üretilen makale dahil
router.get('/:id', async (req, res, next) => {
  try {
    const { rows } = await pool.query(
      `SELECT d.*, ms.ad AS sablon_adi
       FROM degerlendirmeler d
       LEFT JOIN makale_sablonlari ms ON ms.id = d.sablon_id
       WHERE d.id = $1`,
      [req.params.id]
    );
    if (!rows.length) return res.status(404).json({ hata: 'Değerlendirme bulunamadı' });

    // Atanan sorular
    const sorular = await pool.query(
      `SELECT ds.sira_no, sh.soru_metni, st.ad AS soru_tipi,
              sh.zorluk, sh.secenekler, sh.sure_saniye, y.ad AS yetkinlik
       FROM degerlendirme_sorulari ds
       JOIN soru_havuzu sh ON sh.id = ds.soru_id
       JOIN soru_tipleri st ON st.id = sh.soru_tipi_id
       JOIN yetkinlikler y  ON y.id  = sh.yetkinlik_id
       WHERE ds.degerlendirme_id = $1
       ORDER BY ds.sira_no`,
      [req.params.id]
    );

    res.json({ ...rows[0], sorular: sorular.rows });
  } catch (err) {
    next(err);
  }
});

// GET /api/degerlendirmeler
// Tüm değerlendirmeler (özet liste)
router.get('/', async (req, res, next) => {
  try {
    const { durum, sektor } = req.query;
    let query = 'SELECT * FROM v_degerlendirme_ozet WHERE 1=1';
    const params = [];

    if (durum) {
      params.push(durum);
      query += ` AND durum = $${params.length}`;
    }
    if (sektor) {
      params.push(`%${sektor}%`);
      query += ` AND sektor_adi ILIKE $${params.length}`;
    }
    query += ' ORDER BY olusturma DESC';

    const { rows } = await pool.query(query, params);
    res.json(rows);
  } catch (err) {
    next(err);
  }
});

// PUT /api/degerlendirmeler/:id/puan
// Yetkinlik puanlarını kaydet
router.put('/:id/puan',
  body('puanlar').isArray({ min: 1 }).withMessage('puanlar dizisi zorunlu'),
  body('puanlar.*.yetkinlik_id').isInt(),
  body('puanlar.*.puan').isInt({ min: 1, max: 5 }),
  validate,
  async (req, res, next) => {
    const client = await pool.connect();
    try {
      await client.query('BEGIN');

      for (const p of req.body.puanlar) {
        await client.query(
          `INSERT INTO degerlendirme_puanlari (degerlendirme_id, yetkinlik_id, puan, degerlendirici_notu)
           VALUES ($1, $2, $3, $4)
           ON CONFLICT (degerlendirme_id, yetkinlik_id)
           DO UPDATE SET puan = EXCLUDED.puan, degerlendirici_notu = EXCLUDED.degerlendirici_notu`,
          [req.params.id, p.yetkinlik_id, p.puan, p.not || null]
        );
      }

      // Tüm yetkinlikler puanlandıysa durumu güncelle
      await client.query(
        `UPDATE degerlendirmeler
         SET durum = 'tamamlandi', tamamlanma = NOW()
         WHERE id = $1
           AND (SELECT COUNT(*) FROM degerlendirme_puanlari WHERE degerlendirme_id = $1)
               >= (SELECT COUNT(*) FROM degerlendirme_sorulari WHERE degerlendirme_id = $1)`,
        [req.params.id]
      );

      await client.query('COMMIT');

      const { rows } = await pool.query(
        'SELECT * FROM v_degerlendirme_ozet WHERE degerlendirme_id = $1',
        [req.params.id]
      );
      res.json({ mesaj: 'Puanlar kaydedildi', ozet: rows[0] });
    } catch (err) {
      await client.query('ROLLBACK');
      next(err);
    } finally {
      client.release();
    }
  }
);

// POST /api/degerlendirmeler/:id/ai-makale
// Değerlendirme için AI destekli makale üret (JSON yanıt)
router.post('/:id/ai-makale', async (req, res, next) => {
  try {
    const { rows } = await pool.query(
      `SELECT d.uretilen_makale, d.sablon_id,
              p.ad AS pozisyon_adi, p.seviye,
              dep.ad AS departman_adi,
              s.ad AS sektor_adi,
              ms.ad AS sablon_tipi
       FROM degerlendirmeler d
       JOIN pozisyonlar p   ON p.id   = d.pozisyon_id
       JOIN departmanlar dep ON dep.id = p.departman_id
       JOIN sektorler s     ON s.id   = dep.sektor_id
       LEFT JOIN makale_sablonlari ms ON ms.id = d.sablon_id
       WHERE d.id = $1`,
      [req.params.id]
    );
    if (!rows.length) return res.status(404).json({ hata: 'Değerlendirme bulunamadı' });

    const row = rows[0];

    const yetkinlikler = await pool.query(
      `SELECT DISTINCT y.ad
       FROM degerlendirme_sorulari ds
       JOIN soru_havuzu sh ON sh.id = ds.soru_id
       JOIN yetkinlikler y ON y.id  = sh.yetkinlik_id
       WHERE ds.degerlendirme_id = $1`,
      [req.params.id]
    );

    const aday = await pool.query(
      `SELECT aday_ad FROM degerlendirmeler WHERE id = $1`,
      [req.params.id]
    );

    const makale = await makaleUret({
      sektorAdi:    row.sektor_adi,
      departmanAdi: row.departman_adi,
      pozisyonAdi:  row.pozisyon_adi,
      seviye:       row.seviye,
      yetkinlikler: yetkinlikler.rows.map(r => r.ad),
      adaySoyad:    aday.rows[0]?.aday_ad || null,
      sablonTipi:   row.sablon_tipi,
      temelIcerik:  row.uretilen_makale || '',
    });

    // Üretilen makaleyi veritabanına kaydet
    await pool.query(
      `UPDATE degerlendirmeler SET uretilen_makale = $1 WHERE id = $2`,
      [makale, req.params.id]
    );

    res.json({ id: req.params.id, makale });
  } catch (err) {
    next(err);
  }
});

// GET /api/degerlendirmeler/:id/ai-makale/stream
// Değerlendirme için AI destekli makale üret (SSE stream)
router.get('/:id/ai-makale/stream', async (req, res, next) => {
  try {
    const { rows } = await pool.query(
      `SELECT d.uretilen_makale, d.sablon_id,
              p.ad AS pozisyon_adi, p.seviye, d.aday_ad,
              dep.ad AS departman_adi,
              s.ad AS sektor_adi,
              ms.ad AS sablon_tipi
       FROM degerlendirmeler d
       JOIN pozisyonlar p    ON p.id   = d.pozisyon_id
       JOIN departmanlar dep ON dep.id = p.departman_id
       JOIN sektorler s      ON s.id   = dep.sektor_id
       LEFT JOIN makale_sablonlari ms ON ms.id = d.sablon_id
       WHERE d.id = $1`,
      [req.params.id]
    );
    if (!rows.length) return res.status(404).json({ hata: 'Değerlendirme bulunamadı' });

    const row = rows[0];

    const yetkinlikler = await pool.query(
      `SELECT DISTINCT y.ad
       FROM degerlendirme_sorulari ds
       JOIN soru_havuzu sh ON sh.id = ds.soru_id
       JOIN yetkinlikler y ON y.id  = sh.yetkinlik_id
       WHERE ds.degerlendirme_id = $1`,
      [req.params.id]
    );

    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'keep-alive');

    await makaleUretStream(
      {
        sektorAdi:    row.sektor_adi,
        departmanAdi: row.departman_adi,
        pozisyonAdi:  row.pozisyon_adi,
        seviye:       row.seviye,
        yetkinlikler: yetkinlikler.rows.map(r => r.ad),
        adaySoyad:    row.aday_ad || null,
        sablonTipi:   row.sablon_tipi,
        temelIcerik:  row.uretilen_makale || '',
      },
      res
    );
  } catch (err) {
    next(err);
  }
});

module.exports = router;
