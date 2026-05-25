const { Router } = require('express');
const { body, validationResult } = require('express-validator');
const pool = require('../db/pool');
const { requireAuth, requireRole } = require('../middleware/auth');
const { islemYap } = require('../services/posService');

const router = Router();

function validate(req, res, next) {
  const errors = validationResult(req);
  if (!errors.isEmpty()) return res.status(400).json({ hatalar: errors.array() });
  next();
}

function tahsilatNoUret() {
  const d = new Date();
  return `TH-${d.getFullYear()}${String(d.getMonth()+1).padStart(2,'0')}${String(d.getDate()).padStart(2,'0')}-${Math.floor(Math.random()*10000).toString().padStart(4,'0')}`;
}

// GET /api/tahsilatlar
router.get('/', requireAuth, async (req, res, next) => {
  try {
    const { bayi_id, durum } = req.query;
    const params = [];
    const where  = [];

    if (bayi_id) { params.push(bayi_id); where.push(`t.bayi_id=$${params.length}`); }
    if (durum)   { params.push(durum);   where.push(`t.durum=$${params.length}`); }

    const whereClause = where.length ? `WHERE ${where.join(' AND ')}` : '';
    const { rows } = await pool.query(`
      SELECT t.id, t.tahsilat_no, t.tutar, t.odeme_yontemi, t.taksit_sayisi,
             t.komisyon_tutari, t.durum, t.onay_kodu, t.odeme_tarihi, t.olusturuldu,
             b.unvan AS bayi, b.kod AS bayi_kod,
             f.fatura_no, k.ad AS kullanici
      FROM tahsilatlar t
      JOIN bayiler b ON b.id = t.bayi_id
      LEFT JOIN faturalar f ON f.id = t.fatura_id
      LEFT JOIN kullanicilar k ON k.id = t.kullanici_id
      ${whereClause}
      ORDER BY t.olusturuldu DESC
    `, params);
    res.json(rows);
  } catch (err) { next(err); }
});

// GET /api/tahsilatlar/:id — dijital fiş
router.get('/:id', requireAuth, async (req, res, next) => {
  try {
    const { rows } = await pool.query(`
      SELECT t.*, b.unvan AS bayi, b.kod AS bayi_kod, b.vergi_no, b.adres, b.il, b.ilce,
             f.fatura_no, f.vade_tarihi AS fatura_vade,
             k.ad AS kullanici
      FROM tahsilatlar t
      JOIN bayiler b ON b.id = t.bayi_id
      LEFT JOIN faturalar f ON f.id = t.fatura_id
      LEFT JOIN kullanicilar k ON k.id = t.kullanici_id
      WHERE t.id=$1
    `, [req.params.id]);
    if (!rows.length) return res.status(404).json({ hata: 'Tahsilat bulunamadı' });
    res.json(rows[0]);
  } catch (err) { next(err); }
});

// POST /api/tahsilatlar
router.post('/',
  requireAuth,
  body('bayi_id').isInt(),
  body('tutar').isFloat({ min: 0.01 }),
  body('odeme_yontemi').isIn(['kredi_karti','havale','nakit','cek','senet']),
  validate,
  async (req, res, next) => {
    const client = await pool.connect();
    try {
      await client.query('BEGIN');
      const {
        bayi_id, fatura_id, tutar, odeme_yontemi, taksit_sayisi,
        komisyon_yuzdesi, aciklama,
      } = req.body;

      // Kredi kartı için mock POS
      let onayKodu = null;
      if (odeme_yontemi === 'kredi_karti') {
        const pos = await islemYap({ tutar, taksit: taksit_sayisi || 1, odeme_yontemi });
        if (!pos.basarili) {
          await client.query('ROLLBACK');
          return res.status(402).json({ hata: 'POS işlemi başarısız' });
        }
        onayKodu = pos.onay_kodu;
      }

      const komisyonTutar = tutar * ((komisyon_yuzdesi || 0) / 100);
      const tahsilatNo    = tahsilatNoUret();

      const { rows } = await client.query(`
        INSERT INTO tahsilatlar
          (tahsilat_no, bayi_id, fatura_id, tutar, odeme_yontemi, taksit_sayisi,
           komisyon_yuzdesi, komisyon_tutari, durum, onay_kodu, odeme_tarihi, aciklama, kullanici_id)
        VALUES ($1,$2,$3,$4,$5,$6,$7,$8,'tamamlandi',$9,CURRENT_DATE,$10,$11)
        RETURNING *
      `, [tahsilatNo, bayi_id, fatura_id||null, tutar, odeme_yontemi, taksit_sayisi||1,
          komisyon_yuzdesi||0, komisyonTutar, onayKodu, aciklama||null, req.user.id]);

      await client.query('COMMIT');
      res.status(201).json(rows[0]);
    } catch (err) {
      await client.query('ROLLBACK');
      next(err);
    } finally {
      client.release();
    }
  }
);

module.exports = router;
