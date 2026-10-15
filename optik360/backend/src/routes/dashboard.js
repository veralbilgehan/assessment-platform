const { Router } = require('express');
const pool = require('../db/pool');
const { requireAuth } = require('../middleware/auth');

const router = Router();

// GET /api/dashboard
router.get('/', requireAuth, async (req, res, next) => {
  try {
    const [
      { rows: [bugun] },
      { rows: [aylik] },
      { rows: [alacak] },
      { rows: [bayiSayisi] },
      { rows: kritikStok },
      { rows: sonSiparisler },
      { rows: haftalikSatis },
    ] = await Promise.all([
      // Günlük satış
      pool.query(`
        SELECT COALESCE(SUM(genel_toplam), 0) AS tutar, COUNT(*) AS adet
        FROM siparisler
        WHERE durum='tamamlandi' AND olusturuldu::date = CURRENT_DATE
      `),
      // Aylık satış
      pool.query(`
        SELECT COALESCE(SUM(genel_toplam), 0) AS tutar, COUNT(*) AS adet
        FROM siparisler
        WHERE durum='tamamlandi'
          AND DATE_TRUNC('month', olusturuldu) = DATE_TRUNC('month', CURRENT_DATE)
      `),
      // Toplam alacak
      pool.query(`
        SELECT
          COALESCE(SUM(kalan_tutar), 0)                                             AS tahsil_edilecek,
          COALESCE(SUM(CASE WHEN vade_tarihi < CURRENT_DATE THEN kalan_tutar END),0) AS vadesi_gecen
        FROM faturalar WHERE durum <> 'odendi'
      `),
      // Aktif bayi sayısı
      pool.query(`SELECT COUNT(*) AS adet FROM bayiler WHERE aktif=TRUE`),
      // Kritik stok ürünleri
      pool.query(`
        SELECT u.id, u.ad AS urun_adi, u.sku, u.minimum_stok,
               COALESCE(SUM(s.miktar),0) AS toplam_stok
        FROM urunler u
        LEFT JOIN stok s ON s.urun_id = u.id
        WHERE u.aktif=TRUE
        GROUP BY u.id, u.ad, u.sku, u.minimum_stok
        HAVING COALESCE(SUM(s.miktar),0) <= u.minimum_stok
        ORDER BY toplam_stok ASC
        LIMIT 5
      `),
      // Son 5 sipariş
      pool.query(`
        SELECT s.id, s.siparis_no, s.durum, s.genel_toplam, s.olusturuldu,
               b.unvan AS bayi
        FROM siparisler s JOIN bayiler b ON b.id=s.bayi_id
        ORDER BY s.olusturuldu DESC LIMIT 5
      `),
      // Son 7 gün günlük satış trendi
      pool.query(`
        SELECT DATE(olusturuldu) AS gun,
               COALESCE(SUM(genel_toplam),0) AS tutar,
               COUNT(*) AS adet
        FROM siparisler
        WHERE durum='tamamlandi'
          AND olusturuldu >= CURRENT_DATE - INTERVAL '6 days'
        GROUP BY DATE(olusturuldu)
        ORDER BY gun
      `),
    ]);

    res.json({
      bugun_satis:      { tutar: Number(bugun.tutar), adet: Number(bugun.adet) },
      aylik_satis:      { tutar: Number(aylik.tutar), adet: Number(aylik.adet) },
      tahsil_edilecek:  Number(alacak.tahsil_edilecek),
      vadesi_gecen:     Number(alacak.vadesi_gecen),
      toplam_bayi:      Number(bayiSayisi.adet),
      kritik_stok:      kritikStok,
      son_siparisler:   sonSiparisler,
      haftalik_satis:   haftalikSatis,
    });
  } catch (err) { next(err); }
});

module.exports = router;
