/**
 * Tam hiyerarşi: Sektör → Departman → Pozisyon → Yetkinlik + Yorumlar
 * GET /api/hiyerarsi/tam    — JSON ağacı
 * GET /api/hiyerarsi/json   — İndirilebilir tam yapı
 */
const { Router } = require('express');
const pool = require('../db/pool');

const router = Router();

async function tamHiyerarsiGetir() {
  // 1. Sektörler
  const { rows: sektorler } = await pool.query(
    `SELECT id, nace_kodu, ad, aciklama FROM sektorler WHERE aktif=true ORDER BY ad`
  );

  // 2. Departmanlar
  const { rows: depts } = await pool.query(
    `SELECT id, sektor_id, ad, aciklama FROM departmanlar WHERE aktif=true ORDER BY ad`
  );

  // 3. Pozisyonlar
  const { rows: pozlar } = await pool.query(
    `SELECT id, departman_id, ad, seviye, aciklama FROM pozisyonlar WHERE aktif=true ORDER BY ad`
  );

  // 4. Yetkinlikler + kategorileri + pozisyona göre ağırlık
  const { rows: yetk } = await pool.query(
    `SELECT py.pozisyon_id, y.id, y.ad, y.aciklama, y.olcum_yontemi,
            yk.ad AS kategori_adi, yk.renk_kodu,
            py.agirlik, py.zorunlu
     FROM pozisyon_yetkinlikleri py
     JOIN yetkinlikler y ON y.id = py.yetkinlik_id
     JOIN yetkinlik_kategorileri yk ON yk.id = y.kategori_id
     ORDER BY py.pozisyon_id, py.agirlik DESC`
  );

  // 5. Yorumlar
  const { rows: yorumlar } = await pool.query(
    `SELECT yetkinlik_id, pozisyon_id, yorum, tip FROM yetkinlik_yorumlari ORDER BY tip`
  );

  // -- Hiyerarşi oluştur --
  const yorumMap = {};
  for (const y of yorumlar) {
    const key = `${y.yetkinlik_id}-${y.pozisyon_id ?? 'global'}`;
    if (!yorumMap[key]) yorumMap[key] = { olumlu: [], olumsuz: [] };
    yorumMap[key][y.tip === 'olumlu' ? 'olumlu' : 'olumsuz'].push(y.yorum);
  }
  // Global yorumlar (pozisyon_id null)
  const globalYorum = {};
  for (const y of yorumlar.filter(r => !r.pozisyon_id)) {
    if (!globalYorum[y.yetkinlik_id]) globalYorum[y.yetkinlik_id] = { olumlu: [], olumsuz: [] };
    globalYorum[y.yetkinlik_id][y.tip === 'olumlu' ? 'olumlu' : 'olumsuz'].push(y.yorum);
  }

  const yetkByPoz = {};
  for (const y of yetk) {
    if (!yetkByPoz[y.pozisyon_id]) yetkByPoz[y.pozisyon_id] = [];
    const key = `${y.id}-${y.pozisyon_id}`;
    const yorKey = `${y.id}-${y.pozisyon_id}`;
    const spesifik = yorumMap[yorKey] || { olumlu: [], olumsuz: [] };
    const genel    = globalYorum[y.id] || { olumlu: [], olumsuz: [] };
    yetkByPoz[y.pozisyon_id].push({
      yetenek_id:        y.id,
      yetenek_adi:       y.ad,
      aciklama:          y.aciklama,
      olcum_yontemi:     y.olcum_yontemi,
      kategori_adi:      y.kategori_adi,
      renk_kodu:         y.renk_kodu,
      agirlik:           y.agirlik,
      zorunlu:           y.zorunlu,
      olumlu_yorumlar:   [...new Set([...spesifik.olumlu, ...genel.olumlu])],
      olumsuz_yorumlar:  [...new Set([...spesifik.olumsuz, ...genel.olumsuz])],
    });
  }

  const pozByDept = {};
  for (const p of pozlar) {
    if (!pozByDept[p.departman_id]) pozByDept[p.departman_id] = [];
    pozByDept[p.departman_id].push({
      pozisyon_id:  p.id,
      pozisyon_adi: p.ad,
      seviye:       p.seviye,
      aciklama:     p.aciklama,
      yetenekler:   yetkByPoz[p.id] || [],
    });
  }

  const deptBySektor = {};
  for (const d of depts) {
    if (!deptBySektor[d.sektor_id]) deptBySektor[d.sektor_id] = [];
    deptBySektor[d.sektor_id].push({
      departman_id:  d.id,
      departman_adi: d.ad,
      aciklama:      d.aciklama,
      pozisyonlar:   pozByDept[d.id] || [],
    });
  }

  return sektorler.map(s => ({
    sektor_id:   s.id,
    sektor_adi:  s.ad,
    nace_kodu:   s.nace_kodu,
    aciklama:    s.aciklama,
    departmanlar: deptBySektor[s.id] || [],
  }));
}

// GET /api/hiyerarsi/tam
router.get('/tam', async (req, res, next) => {
  try {
    const data = await tamHiyerarsiGetir();
    res.json(data);
  } catch (err) { next(err); }
});

// GET /api/hiyerarsi/json — indirilebilir dosya
router.get('/json', async (req, res, next) => {
  try {
    const data = await tamHiyerarsiGetir();
    res.setHeader('Content-Disposition', 'attachment; filename="hiyerarsi.json"');
    res.setHeader('Content-Type', 'application/json; charset=utf-8');
    res.send(JSON.stringify(data, null, 2));
  } catch (err) { next(err); }
});

// GET /api/hiyerarsi/sektorler — sadece sektörler (UI için)
router.get('/sektorler', async (req, res, next) => {
  try {
    const { rows } = await pool.query(
      'SELECT id, ad, nace_kodu, aciklama FROM sektorler WHERE aktif=true ORDER BY ad'
    );
    res.json(rows);
  } catch (err) { next(err); }
});

// GET /api/hiyerarsi/departmanlar/:sektorId
router.get('/departmanlar/:sektorId', async (req, res, next) => {
  try {
    const { rows } = await pool.query(
      'SELECT id, ad, aciklama FROM departmanlar WHERE sektor_id=$1 AND aktif=true ORDER BY ad',
      [req.params.sektorId]
    );
    res.json(rows);
  } catch (err) { next(err); }
});

// GET /api/hiyerarsi/pozisyonlar/:deptId
router.get('/pozisyonlar/:deptId', async (req, res, next) => {
  try {
    const { rows } = await pool.query(
      'SELECT id, ad, seviye, aciklama FROM pozisyonlar WHERE departman_id=$1 AND aktif=true ORDER BY ad',
      [req.params.deptId]
    );
    res.json(rows);
  } catch (err) { next(err); }
});

// GET /api/hiyerarsi/yetenekler/:pozId — yetkinlikler + yorumlar
router.get('/yetenekler/:pozId', async (req, res, next) => {
  try {
    const pozId = req.params.pozId;

    const { rows: yetk } = await pool.query(
      `SELECT y.id, y.ad, y.aciklama, y.olcum_yontemi,
              yk.ad AS kategori_adi, yk.renk_kodu,
              py.agirlik, py.zorunlu
       FROM pozisyon_yetkinlikleri py
       JOIN yetkinlikler y ON y.id = py.yetkinlik_id
       JOIN yetkinlik_kategorileri yk ON yk.id = y.kategori_id
       WHERE py.pozisyon_id = $1
       ORDER BY py.agirlik DESC`,
      [pozId]
    );

    const yetkenIds = yetk.map(y => y.id);
    let yorumlar = [];
    if (yetkenIds.length) {
      const { rows } = await pool.query(
        `SELECT yetkinlik_id, yorum, tip FROM yetkinlik_yorumlari
         WHERE yetkinlik_id = ANY($1) AND (pozisyon_id=$2 OR pozisyon_id IS NULL)
         ORDER BY tip`,
        [yetkenIds, pozId]
      );
      yorumlar = rows;
    }

    const yorumMap = {};
    for (const y of yorumlar) {
      if (!yorumMap[y.yetkinlik_id]) yorumMap[y.yetkinlik_id] = { olumlu: [], olumsuz: [] };
      yorumMap[y.yetkinlik_id][y.tip === 'olumlu' ? 'olumlu' : 'olumsuz'].push(y.yorum);
    }

    const result = yetk.map(y => ({
      yetenek_id:      y.id,
      yetenek_adi:     y.ad,
      aciklama:        y.aciklama,
      olcum_yontemi:   y.olcum_yontemi,
      kategori_adi:    y.kategori_adi,
      renk_kodu:       y.renk_kodu,
      agirlik:         y.agirlik,
      zorunlu:         y.zorunlu,
      olumlu_yorumlar: yorumMap[y.id]?.olumlu || [],
      olumsuz_yorumlar:yorumMap[y.id]?.olumsuz || [],
    }));

    res.json(result);
  } catch (err) { next(err); }
});

module.exports = router;
