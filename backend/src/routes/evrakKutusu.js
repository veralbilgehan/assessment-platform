/**
 * Evrak Kutusu — Birleşik Dosya Yönetimi
 *
 * GET    /api/evrak/dokumanlar     — belgeler listesi
 * GET    /api/evrak/testler        — test projeleri listesi
 * GET    /api/evrak/raporlar       — tamamlanmış oturumlar listesi
 * GET    /api/evrak/denemeler      — ücretsiz deneme raporları
 * GET    /api/evrak/istatistik     — özet sayılar
 * DELETE /api/evrak/belge/:id      — belge sil
 * DELETE /api/evrak/test/:id       — test projesi sil
 * DELETE /api/evrak/rapor/:id      — rapor (oturum) sil
 * DELETE /api/evrak/deneme/:id     — deneme raporu sil
 */
const { Router } = require('express');
const pool = require('../db/pool');
const { optionalAuth } = require('../middleware/auth');

const router = Router();

/* ─── Dökümanlar ─────────────────────────────────────── */
router.get('/dokumanlar', optionalAuth, async (req, res, next) => {
  try {
    const { siralama = 'tarih', yon = 'desc', q = '' } = req.query;
    const siralama_kolon = siralama === 'ad' ? 'orijinal_ad' : 'olusturma';
    const siralama_yon   = yon === 'asc' ? 'ASC' : 'DESC';

    const { rows } = await pool.query(
      `SELECT id, orijinal_ad AS ad, mime_type, LENGTH(icerik) AS boyut_byte,
              LEFT(ai_konu, 120) AS konu_ozeti, olusturma AS tarih
       FROM belgeler
       WHERE ($1 = '' OR orijinal_ad ILIKE $2 OR ai_konu ILIKE $2)
       ORDER BY ${siralama_kolon} ${siralama_yon}`,
      [q, `%${q}%`]
    );
    res.json(rows);
  } catch (err) { next(err); }
});

/* ─── Testler ────────────────────────────────────────── */
router.get('/testler', optionalAuth, async (req, res, next) => {
  try {
    const { siralama = 'tarih', yon = 'desc', q = '' } = req.query;
    const siralama_kolon = siralama === 'ad' ? 'tp.ad' : 'tp.olusturma';
    const siralama_yon   = yon === 'asc' ? 'ASC' : 'DESC';

    const { rows } = await pool.query(
      `SELECT tp.id, tp.ad, tp.durum, tp.zorluk, tp.soru_sayisi, tp.kaynak_modu,
              tp.olusturma AS tarih,
              s.ad AS sektor_adi, p.ad AS pozisyon_adi,
              (SELECT COUNT(*) FROM test_sorulari WHERE proje_id=tp.id) AS uretilen_soru,
              (SELECT COUNT(*) FROM test_oturumlari WHERE proje_id=tp.id) AS katilimci_sayisi,
              (SELECT COUNT(*) FROM test_oturumlari WHERE proje_id=tp.id AND durum='tamamlandi') AS tamamlayan
       FROM test_projeleri tp
       LEFT JOIN sektorler s ON s.id=tp.sektor_id
       LEFT JOIN pozisyonlar p ON p.id=tp.pozisyon_id
       WHERE ($1 = '' OR tp.ad ILIKE $2)
       ORDER BY ${siralama_kolon} ${siralama_yon}`,
      [q, `%${q}%`]
    );
    res.json(rows);
  } catch (err) { next(err); }
});

/* ─── Raporlar ───────────────────────────────────────── */
router.get('/raporlar', optionalAuth, async (req, res, next) => {
  try {
    const { siralama = 'tarih', yon = 'desc', q = '' } = req.query;
    const siralama_yon   = yon === 'asc' ? 'ASC' : 'DESC';
    const siralama_kolon = siralama === 'ad'     ? 'o.aday_ad'
                         : siralama === 'basari' ? 'o.basari_yuzdesi'
                         : 'COALESCE(o.bitis, o.baslangic)';

    const { rows } = await pool.query(
      `SELECT o.id::TEXT AS id,
              o.aday_ad, o.aday_soyad,
              CONCAT(o.aday_ad,' ',o.aday_soyad) AS aday_tam_ad,
              o.aday_pozisyon, o.aday_sirket, o.basari_yuzdesi,
              o.dogru_sayisi, o.yanlis_sayisi, o.bos_sayisi, o.sure_saniye,
              COALESCE(o.bitis, o.baslangic) AS tarih,
              tp.ad AS test_adi, tp.soru_sayisi,
              s.ad AS sektor_adi, p.ad AS pozisyon_adi
       FROM test_oturumlari o
       JOIN test_projeleri tp ON tp.id=o.proje_id
       LEFT JOIN sektorler s ON s.id=tp.sektor_id
       LEFT JOIN pozisyonlar p ON p.id=tp.pozisyon_id
       WHERE o.durum='tamamlandi'
         AND ($1 = '' OR CONCAT(o.aday_ad,' ',o.aday_soyad) ILIKE $2 OR tp.ad ILIKE $2)
       ORDER BY ${siralama_kolon} ${siralama_yon}`,
      [q, `%${q}%`]
    );
    res.json(rows);
  } catch (err) { next(err); }
});

/* ─── Deneme Raporları ───────────────────────────────── */
router.get('/denemeler', optionalAuth, async (req, res, next) => {
  try {
    const { q = '', yon = 'desc' } = req.query;
    const { rows } = await pool.query(
      `SELECT id, aday_ad, dosya_adi, dosya_tipi, basari_yuzdesi, olusturma AS tarih
       FROM deneme_yuklemeler
       WHERE ($1 = '' OR aday_ad ILIKE $2 OR dosya_adi ILIKE $2)
       ORDER BY olusturma ${yon === 'asc' ? 'ASC' : 'DESC'}`,
      [q, `%${q}%`]
    );
    res.json(rows);
  } catch (err) { next(err); }
});

/* ─── İstatistik ─────────────────────────────────────── */
router.get('/istatistik', optionalAuth, async (req, res, next) => {
  try {
    const [dok, test, rapor, deneme, ort] = await Promise.all([
      pool.query('SELECT COUNT(*) AS c FROM belgeler'),
      pool.query('SELECT COUNT(*) AS c FROM test_projeleri'),
      pool.query("SELECT COUNT(*) AS c FROM test_oturumlari WHERE durum='tamamlandi'"),
      pool.query('SELECT COUNT(*) AS c FROM deneme_yuklemeler'),
      pool.query("SELECT ROUND(AVG(basari_yuzdesi),1) AS o FROM test_oturumlari WHERE durum='tamamlandi'"),
    ]);
    res.json({
      dokumanlar:       parseInt(dok.rows[0].c),
      testler:          parseInt(test.rows[0].c),
      raporlar:         parseInt(rapor.rows[0].c),
      denemeler:        parseInt(deneme.rows[0].c),
      ortalama_basari:  parseFloat(ort.rows[0].o || 0),
    });
  } catch (err) { next(err); }
});

/* ─── Silme ──────────────────────────────────────────── */
router.delete('/belge/:id',  optionalAuth, async (req, res, next) => {
  try { await pool.query('DELETE FROM belgeler WHERE id=$1',            [req.params.id]); res.json({ mesaj: 'Belge silindi' }); }
  catch (err) { next(err); }
});
router.delete('/test/:id',   optionalAuth, async (req, res, next) => {
  try { await pool.query('DELETE FROM test_projeleri WHERE id=$1',      [req.params.id]); res.json({ mesaj: 'Test silindi' }); }
  catch (err) { next(err); }
});
router.delete('/rapor/:id',  optionalAuth, async (req, res, next) => {
  try { await pool.query('DELETE FROM test_oturumlari WHERE id=$1',     [req.params.id]); res.json({ mesaj: 'Rapor silindi' }); }
  catch (err) { next(err); }
});
router.delete('/deneme/:id', optionalAuth, async (req, res, next) => {
  try { await pool.query('DELETE FROM deneme_yuklemeler WHERE id=$1',   [req.params.id]); res.json({ mesaj: 'Deneme silindi' }); }
  catch (err) { next(err); }
});

module.exports = router;
