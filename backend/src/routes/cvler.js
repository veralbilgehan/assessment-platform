/**
 * CV Oluşturucu
 *
 * GET    /api/cvler        — kullanıcının CV listesi (admin: tümü)
 * GET    /api/cvler/:id    — CV detayı
 * POST   /api/cvler        — yeni CV
 * PUT    /api/cvler/:id    — CV güncelle
 * DELETE /api/cvler/:id    — CV sil
 */
const { Router } = require('express');
const pool = require('../db/pool');
const { requireAuth } = require('../middleware/auth');

const router = Router();

const DM_KATEGORILER = ['insan', 'makine', 'metot', 'malzeme'];
const LISTE_ALANLARI = ['egitimler', 'sertifikalar', 'deneyimler', 'beceriler', 'yetkinlikler'];

function seviye(v) {
  const n = parseInt(v, 10);
  return Number.isFinite(n) ? Math.min(5, Math.max(1, n)) : 3;
}

function dogrula(body) {
  const hatalar = [];
  if (!body.ad_soyad || !String(body.ad_soyad).trim()) hatalar.push({ alan: 'ad_soyad', mesaj: 'Ad soyad zorunludur' });
  for (const alan of LISTE_ALANLARI) {
    if (body[alan] !== undefined && !Array.isArray(body[alan])) hatalar.push({ alan, mesaj: 'Liste olmalıdır' });
  }
  (body.beceriler || []).forEach((b, i) => {
    if (!DM_KATEGORILER.includes(b?.kategori)) hatalar.push({ alan: `beceriler[${i}].kategori`, mesaj: '4M kategorisi geçersiz' });
  });
  return hatalar;
}

function temizle(body) {
  return {
    ad_soyad: String(body.ad_soyad).trim(),
    unvan:    body.unvan   || null,
    eposta:   body.eposta  || null,
    telefon:  body.telefon || null,
    adres:    body.adres   || null,
    ozet:     body.ozet    || null,
    egitimler:    (body.egitimler    || []).filter(e => e?.okul),
    sertifikalar: (body.sertifikalar || []).filter(s => s?.ad),
    deneyimler:   (body.deneyimler   || []).filter(d => d?.sirket || d?.pozisyon),
    beceriler:    (body.beceriler    || []).filter(b => b?.ad).map(b => ({ kategori: b.kategori, ad: b.ad, seviye: seviye(b.seviye) })),
    yetkinlikler: (body.yetkinlikler || []).filter(y => y?.ad).map(y => ({ ad: y.ad, seviye: seviye(y.seviye), kanit: y.kanit || '' })),
  };
}

// Sahiplik kontrolü: admin her CV'ye erişir, diğerleri yalnızca kendi CV'sine
function sahiplikKosulu(req, baslangicIndeks) {
  return req.user.rol === 'admin'
    ? { sql: '', params: [] }
    : { sql: ` AND kullanici_id = $${baslangicIndeks}`, params: [req.user.id] };
}

router.get('/', requireAuth, async (req, res, next) => {
  try {
    const k = sahiplikKosulu(req, 1);
    const { rows } = await pool.query(
      `SELECT id, ad_soyad, unvan, guncelleme,
              jsonb_array_length(deneyimler)   AS deneyim_sayisi,
              jsonb_array_length(sertifikalar) AS sertifika_sayisi
       FROM cv_profilleri WHERE TRUE${k.sql}
       ORDER BY guncelleme DESC`,
      k.params
    );
    res.json(rows);
  } catch (err) { next(err); }
});

router.get('/:id', requireAuth, async (req, res, next) => {
  try {
    const k = sahiplikKosulu(req, 2);
    const { rows } = await pool.query(`SELECT * FROM cv_profilleri WHERE id = $1${k.sql}`, [req.params.id, ...k.params]);
    if (!rows.length) return res.status(404).json({ hata: 'CV bulunamadı' });
    res.json(rows[0]);
  } catch (err) { next(err); }
});

router.post('/', requireAuth, async (req, res, next) => {
  try {
    const hatalar = dogrula(req.body);
    if (hatalar.length) return res.status(400).json({ hatalar });
    const c = temizle(req.body);
    const { rows } = await pool.query(
      `INSERT INTO cv_profilleri
         (kullanici_id, ad_soyad, unvan, eposta, telefon, adres, ozet,
          egitimler, sertifikalar, deneyimler, beceriler, yetkinlikler)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12)
       RETURNING *`,
      [req.user.id, c.ad_soyad, c.unvan, c.eposta, c.telefon, c.adres, c.ozet,
       JSON.stringify(c.egitimler), JSON.stringify(c.sertifikalar), JSON.stringify(c.deneyimler),
       JSON.stringify(c.beceriler), JSON.stringify(c.yetkinlikler)]
    );
    res.status(201).json(rows[0]);
  } catch (err) { next(err); }
});

router.put('/:id', requireAuth, async (req, res, next) => {
  try {
    const hatalar = dogrula(req.body);
    if (hatalar.length) return res.status(400).json({ hatalar });
    const c = temizle(req.body);
    const k = sahiplikKosulu(req, 13);
    const { rows } = await pool.query(
      `UPDATE cv_profilleri SET
         ad_soyad=$2, unvan=$3, eposta=$4, telefon=$5, adres=$6, ozet=$7,
         egitimler=$8, sertifikalar=$9, deneyimler=$10, beceriler=$11, yetkinlikler=$12,
         guncelleme=NOW()
       WHERE id=$1${k.sql}
       RETURNING *`,
      [req.params.id, c.ad_soyad, c.unvan, c.eposta, c.telefon, c.adres, c.ozet,
       JSON.stringify(c.egitimler), JSON.stringify(c.sertifikalar), JSON.stringify(c.deneyimler),
       JSON.stringify(c.beceriler), JSON.stringify(c.yetkinlikler), ...k.params]
    );
    if (!rows.length) return res.status(404).json({ hata: 'CV bulunamadı' });
    res.json(rows[0]);
  } catch (err) { next(err); }
});

router.delete('/:id', requireAuth, async (req, res, next) => {
  try {
    const k = sahiplikKosulu(req, 2);
    const { rowCount } = await pool.query(`DELETE FROM cv_profilleri WHERE id = $1${k.sql}`, [req.params.id, ...k.params]);
    if (!rowCount) return res.status(404).json({ hata: 'CV bulunamadı' });
    res.json({ silindi: true });
  } catch (err) { next(err); }
});

module.exports = router;
