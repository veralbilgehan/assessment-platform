/**
 * Auth Routes
 * POST /api/auth/giris   — giriş
 * POST /api/auth/kayit   — kayıt (sadece admin)
 * GET  /api/auth/ben     — mevcut kullanıcı bilgisi
 * PUT  /api/auth/sifre   — şifre değiştir
 * POST /api/auth/sifremi-unuttum — sıfırlama bağlantısı gönder
 * POST /api/auth/sifre-sifirla   — bağlantıdaki token ile yeni şifre
 * POST /api/auth/kayit-ol        — herkese açık kayıt talebi (admin onayı bekler)
 * GET  /api/auth/davet/:token    — davet bilgisi
 * POST /api/auth/davet-kabul     — daveti kabul et, hesabı oluştur
 */
const { Router } = require('express');
const bcrypt = require('bcrypt');
const pool = require('../db/pool');
const { requireAuth, requireRole, tokenUret } = require('../middleware/auth');
const { tokenHash, sifirlamaEpostasiGonder } = require('../services/hesapService');

const EPOSTA_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

const router = Router();

// POST /api/auth/giris
router.post('/giris', async (req, res, next) => {
  try {
    const { eposta, sifre } = req.body;
    if (!eposta || !sifre) return res.status(400).json({ hata: 'E-posta ve şifre gerekli' });

    const { rows } = await pool.query(
      'SELECT * FROM kullanicilar WHERE eposta=$1', [eposta.toLowerCase().trim()]
    );
    const kullanici = rows[0];
    if (!kullanici) return res.status(401).json({ hata: 'E-posta veya şifre hatalı' });

    const eslesti = await bcrypt.compare(sifre, kullanici.sifre_hash);
    if (!eslesti) return res.status(401).json({ hata: 'E-posta veya şifre hatalı' });

    if (!kullanici.aktif) {
      return res.status(403).json({
        hata: kullanici.onay_bekliyor
          ? 'Kayıt talebiniz henüz yönetici tarafından onaylanmadı'
          : 'Hesabınız pasif durumda. Yöneticinizle iletişime geçin'
      });
    }

    await pool.query('UPDATE kullanicilar SET son_giris=NOW() WHERE id=$1', [kullanici.id]);
    const token = tokenUret(kullanici);
    res.json({
      token,
      kullanici: {
        id: kullanici.id, ad: kullanici.ad,
        eposta: kullanici.eposta, rol: kullanici.rol
      }
    });
  } catch (err) { next(err); }
});

// POST /api/auth/kayit — sadece admin yapabilir
router.post('/kayit', requireRole('admin'), async (req, res, next) => {
  try {
    const { eposta, sifre, ad, rol = 'izleyici' } = req.body;
    if (!eposta || !sifre || !ad) return res.status(400).json({ hata: 'Eksik alan' });
    if (!['admin','degerlendirici','izleyici'].includes(rol))
      return res.status(400).json({ hata: 'Geçersiz rol' });

    const hash = await bcrypt.hash(sifre, 12);
    const { rows } = await pool.query(
      `INSERT INTO kullanicilar (eposta, sifre_hash, ad, rol)
       VALUES ($1,$2,$3,$4) RETURNING id, eposta, ad, rol`,
      [eposta.toLowerCase(), hash, ad, rol]
    );
    res.status(201).json(rows[0]);
  } catch (err) {
    if (err.code === '23505') return res.status(409).json({ hata: 'Bu e-posta zaten kayıtlı' });
    next(err);
  }
});

// GET /api/auth/ben
router.get('/ben', requireAuth, async (req, res, next) => {
  try {
    const { rows } = await pool.query(
      'SELECT id, eposta, ad, rol, olusturma FROM kullanicilar WHERE id=$1', [req.user.id]
    );
    if (!rows[0]) return res.status(404).json({ hata: 'Kullanıcı bulunamadı' });
    res.json(rows[0]);
  } catch (err) { next(err); }
});

// GET /api/auth/kullanicilar — sadece admin
router.get('/kullanicilar', requireRole('admin'), async (req, res, next) => {
  try {
    const { rows } = await pool.query(
      'SELECT id, eposta, ad, rol, aktif, olusturma FROM kullanicilar ORDER BY olusturma DESC'
    );
    res.json(rows);
  } catch (err) { next(err); }
});

// PUT /api/auth/sifre
router.put('/sifre', requireAuth, async (req, res, next) => {
  try {
    const { mevcut, yeni } = req.body;
    if (!mevcut || !yeni || yeni.length < 6)
      return res.status(400).json({ hata: 'Şifre en az 6 karakter olmalı' });

    const { rows } = await pool.query('SELECT sifre_hash FROM kullanicilar WHERE id=$1', [req.user.id]);
    const eslesti = await bcrypt.compare(mevcut, rows[0].sifre_hash);
    if (!eslesti) return res.status(401).json({ hata: 'Mevcut şifre hatalı' });

    const hash = await bcrypt.hash(yeni, 12);
    await pool.query('UPDATE kullanicilar SET sifre_hash=$1 WHERE id=$2', [hash, req.user.id]);
    res.json({ mesaj: 'Şifre güncellendi' });
  } catch (err) { next(err); }
});

// POST /api/auth/sifremi-unuttum — kullanıcının var olup olmadığını açığa vurmaz
router.post('/sifremi-unuttum', async (req, res, next) => {
  try {
    const eposta = String(req.body.eposta || '').toLowerCase().trim();
    if (!EPOSTA_RE.test(eposta)) return res.status(400).json({ hata: 'Geçerli bir e-posta adresi girin' });

    const { rows } = await pool.query(
      'SELECT id, eposta, ad FROM kullanicilar WHERE eposta=$1 AND aktif=true', [eposta]
    );
    if (rows[0]) {
      try { await sifirlamaEpostasiGonder(rows[0], req); }
      catch (e) { console.error('Şifre sıfırlama e-postası gönderilemedi:', e.message); }
    }
    res.json({ mesaj: 'Bu e-posta adresi kayıtlıysa şifre sıfırlama bağlantısı gönderildi.' });
  } catch (err) { next(err); }
});

// POST /api/auth/sifre-sifirla
router.post('/sifre-sifirla', async (req, res, next) => {
  try {
    const { token, yeni } = req.body;
    if (!token) return res.status(400).json({ hata: 'Bağlantı geçersiz' });
    if (!yeni || yeni.length < 6) return res.status(400).json({ hata: 'Şifre en az 6 karakter olmalı' });

    const { rows } = await pool.query(
      `SELECT id, kullanici_id FROM kullanici_tokenlari
       WHERE token_hash=$1 AND kullanildi IS NULL AND son_kullanma > NOW()`,
      [tokenHash(token)]
    );
    if (!rows[0]) return res.status(400).json({ hata: 'Bağlantının süresi dolmuş ya da daha önce kullanılmış' });

    const hash = await bcrypt.hash(yeni, 12);
    await pool.query('UPDATE kullanicilar SET sifre_hash=$1 WHERE id=$2', [hash, rows[0].kullanici_id]);
    await pool.query('UPDATE kullanici_tokenlari SET kullanildi=NOW() WHERE kullanici_id=$1 AND kullanildi IS NULL',
      [rows[0].kullanici_id]);
    res.json({ mesaj: 'Şifreniz güncellendi. Yeni şifrenizle giriş yapabilirsiniz.' });
  } catch (err) { next(err); }
});

// POST /api/auth/kayit-ol — hesap pasif açılır, admin onaylayınca aktifleşir
router.post('/kayit-ol', async (req, res, next) => {
  try {
    const ad = String(req.body.ad || '').trim();
    const soyad = String(req.body.soyad || '').trim();
    const sirket = String(req.body.sirket || '').trim() || null;
    const eposta = String(req.body.eposta || '').toLowerCase().trim();
    const { sifre } = req.body;

    if (!ad || !soyad) return res.status(400).json({ hata: 'Ad ve soyad gerekli' });
    if (!EPOSTA_RE.test(eposta)) return res.status(400).json({ hata: 'Geçerli bir e-posta adresi girin' });
    if (!sifre || sifre.length < 6) return res.status(400).json({ hata: 'Şifre en az 6 karakter olmalı' });

    const hash = await bcrypt.hash(sifre, 12);
    await pool.query(
      `INSERT INTO kullanicilar (eposta, sifre_hash, ad, soyad, sirket, rol, aktif, onay_bekliyor)
       VALUES ($1,$2,$3,$4,$5,'izleyici',false,true)`,
      [eposta, hash, ad, soyad, sirket]
    );
    res.status(201).json({ mesaj: 'Kayıt talebiniz alındı. Yönetici onayından sonra giriş yapabilirsiniz.' });
  } catch (err) {
    if (err.code === '23505') return res.status(409).json({ hata: 'Bu e-posta zaten kayıtlı' });
    next(err);
  }
});

async function gecerliDavet(token) {
  const { rows } = await pool.query(
    `SELECT d.*, k.ad AS davet_eden_ad FROM davetler d
     LEFT JOIN kullanicilar k ON k.id = d.davet_eden_id
     WHERE d.token_hash=$1 AND d.durum='bekliyor' AND d.son_kullanma > NOW()`,
    [tokenHash(token)]
  );
  return rows[0] || null;
}

// GET /api/auth/davet/:token
router.get('/davet/:token', async (req, res, next) => {
  try {
    const d = await gecerliDavet(req.params.token);
    if (!d) return res.status(404).json({ hata: 'Davet bulunamadı, süresi dolmuş ya da iptal edilmiş' });
    res.json({ eposta: d.eposta, ad: d.ad, soyad: d.soyad, sirket: d.sirket, rol: d.rol, davet_eden: d.davet_eden_ad });
  } catch (err) { next(err); }
});

// POST /api/auth/davet-kabul
router.post('/davet-kabul', async (req, res, next) => {
  const client = await pool.connect();
  try {
    const { token, sifre } = req.body;
    const ad = String(req.body.ad || '').trim();
    const soyad = String(req.body.soyad || '').trim();
    if (!sifre || sifre.length < 6) return res.status(400).json({ hata: 'Şifre en az 6 karakter olmalı' });

    const d = await gecerliDavet(token || '');
    if (!d) return res.status(404).json({ hata: 'Davet bulunamadı, süresi dolmuş ya da iptal edilmiş' });
    if (!(ad || d.ad)) return res.status(400).json({ hata: 'Ad gerekli' });

    const hash = await bcrypt.hash(sifre, 12);
    await client.query('BEGIN');
    const { rows } = await client.query(
      `INSERT INTO kullanicilar (eposta, sifre_hash, ad, soyad, sirket, rol, aktif)
       VALUES ($1,$2,$3,$4,$5,$6,true) RETURNING *`,
      [d.eposta.toLowerCase(), hash, ad || d.ad, soyad || d.soyad || null, d.sirket, d.rol]
    );
    await client.query(`UPDATE davetler SET durum='kabul_edildi', kabul_tarihi=NOW() WHERE id=$1`, [d.id]);
    await client.query('COMMIT');

    const k = rows[0];
    res.status(201).json({
      token: tokenUret(k),
      kullanici: { id: k.id, ad: k.ad, eposta: k.eposta, rol: k.rol },
    });
  } catch (err) {
    await client.query('ROLLBACK').catch(() => {});
    if (err.code === '23505') return res.status(409).json({ hata: 'Bu e-posta ile zaten bir hesap var. Giriş yapmayı deneyin' });
    next(err);
  } finally { client.release(); }
});

module.exports = router;
