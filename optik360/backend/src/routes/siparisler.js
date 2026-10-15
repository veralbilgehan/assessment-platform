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

function siparisNoUret() {
  const d = new Date();
  return `SP-${d.getFullYear()}${String(d.getMonth()+1).padStart(2,'0')}${String(d.getDate()).padStart(2,'0')}-${Math.floor(Math.random()*10000).toString().padStart(4,'0')}`;
}

// GET /api/siparisler
router.get('/', requireAuth, async (req, res, next) => {
  try {
    const { durum, bayi_id } = req.query;
    const params = [];
    const where  = [];

    if (durum)   { params.push(durum);   where.push(`s.durum=$${params.length}`); }
    if (bayi_id) { params.push(bayi_id); where.push(`s.bayi_id=$${params.length}`); }

    // Bayi rolü sadece kendi siparişlerini görebilir
    if (req.user.rol === 'bayi') {
      const { rows: bk } = await pool.query(
        'SELECT bayi_id FROM bayi_kullanicilari WHERE kullanici_id=$1', [req.user.id]
      );
      if (bk.length) { params.push(bk[0].bayi_id); where.push(`s.bayi_id=$${params.length}`); }
    }

    const whereClause = where.length ? `WHERE ${where.join(' AND ')}` : '';

    const { rows } = await pool.query(`
      SELECT s.id, s.siparis_no, s.durum, s.toplam_tutar, s.kdv_tutari, s.genel_toplam,
             s.vade_gun, s.notlar, s.olusturuldu,
             b.unvan AS bayi, b.kod AS bayi_kod,
             k.ad AS kullanici
      FROM siparisler s
      JOIN bayiler b ON b.id = s.bayi_id
      LEFT JOIN kullanicilar k ON k.id = s.kullanici_id
      ${whereClause}
      ORDER BY s.olusturuldu DESC
    `, params);
    res.json(rows);
  } catch (err) { next(err); }
});

// GET /api/siparisler/:id
router.get('/:id', requireAuth, async (req, res, next) => {
  try {
    const { rows } = await pool.query(`
      SELECT s.*, b.unvan AS bayi, b.kod AS bayi_kod, b.il, b.ilce
      FROM siparisler s JOIN bayiler b ON b.id = s.bayi_id
      WHERE s.id=$1
    `, [req.params.id]);
    if (!rows.length) return res.status(404).json({ hata: 'Sipariş bulunamadı' });

    const { rows: kalemler } = await pool.query(`
      SELECT sk.*, u.ad AS urun_adi, u.sku, u.barkod, m.ad AS marka
      FROM siparis_kalemleri sk
      JOIN urunler u ON u.id = sk.urun_id
      LEFT JOIN markalar m ON m.id = u.marka_id
      WHERE sk.siparis_id=$1
    `, [req.params.id]);

    res.json({ ...rows[0], kalemler });
  } catch (err) { next(err); }
});

// POST /api/siparisler
router.post('/',
  requireAuth,
  body('bayi_id').isInt(),
  body('kalemler').isArray({ min: 1 }),
  validate,
  async (req, res, next) => {
    const client = await pool.connect();
    try {
      await client.query('BEGIN');
      const { bayi_id, kalemler, vade_gun, notlar } = req.body;

      let toplamTutar = 0;
      let kdvTutari   = 0;

      // Kalemleri hesapla
      const hesaplananKalemler = kalemler.map(k => {
        const brut = k.miktar * k.birim_fiyat * (1 - (k.iskonto_yuzdesi || 0) / 100);
        const kdv  = brut * (k.kdv_yuzdesi || 20) / 100;
        toplamTutar += brut;
        kdvTutari   += kdv;
        return { ...k, toplam: brut + kdv };
      });

      const genelToplam = toplamTutar + kdvTutari;
      const siparisNo   = siparisNoUret();

      const { rows } = await client.query(`
        INSERT INTO siparisler (siparis_no, bayi_id, kullanici_id, toplam_tutar, kdv_tutari, genel_toplam, vade_gun, notlar)
        VALUES ($1,$2,$3,$4,$5,$6,$7,$8) RETURNING *
      `, [siparisNo, bayi_id, req.user.id, toplamTutar, kdvTutari, genelToplam, vade_gun||30, notlar||null]);

      const siparis = rows[0];

      for (const k of hesaplananKalemler) {
        await client.query(`
          INSERT INTO siparis_kalemleri (siparis_id, urun_id, miktar, birim_fiyat, iskonto_yuzdesi, kdv_yuzdesi, toplam)
          VALUES ($1,$2,$3,$4,$5,$6,$7)
        `, [siparis.id, k.urun_id, k.miktar, k.birim_fiyat, k.iskonto_yuzdesi||0, k.kdv_yuzdesi||20, k.toplam]);
      }

      await client.query('COMMIT');
      res.status(201).json(siparis);
    } catch (err) {
      await client.query('ROLLBACK');
      next(err);
    } finally {
      client.release();
    }
  }
);

// PUT /api/siparisler/:id/durum
router.put('/:id/durum',
  ...requireRole('super_admin', 'toptanci'),
  body('durum').isIn(['taslak','onay_bekliyor','hazirlaniyor','kargoda','teslim_edildi','tamamlandi','iptal']),
  validate,
  async (req, res, next) => {
    const client = await pool.connect();
    try {
      await client.query('BEGIN');
      const { rows } = await client.query(
        'UPDATE siparisler SET durum=$1, guncellendi=NOW() WHERE id=$2 RETURNING *',
        [req.body.durum, req.params.id]
      );
      if (!rows.length) return res.status(404).json({ hata: 'Sipariş bulunamadı' });

      // Sipariş tamamlandığında otomatik fatura oluştur
      if (req.body.durum === 'tamamlandi') {
        const siparis = rows[0];
        const faturaNo = `FT-${siparis.siparis_no.replace('SP-','')}`;
        const vadeTarihi = new Date();
        vadeTarihi.setDate(vadeTarihi.getDate() + siparis.vade_gun);

        await client.query(`
          INSERT INTO faturalar (fatura_no, siparis_id, bayi_id, toplam_tutar, kalan_tutar, vade_tarihi)
          VALUES ($1,$2,$3,$4,$4,$5)
          ON CONFLICT (fatura_no) DO NOTHING
        `, [faturaNo, siparis.id, siparis.bayi_id, siparis.genel_toplam, vadeTarihi.toISOString().split('T')[0]]);
      }

      await client.query('COMMIT');
      res.json(rows[0]);
    } catch (err) {
      await client.query('ROLLBACK');
      next(err);
    } finally {
      client.release();
    }
  }
);

module.exports = router;
