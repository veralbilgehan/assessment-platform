/**
 * Kullanıcı Yönetimi (yalnızca admin)
 * GET    /api/kullanicilar                     — liste (ara, rol, durum, sayfa, limit)
 * POST   /api/kullanicilar                     — kullanıcı oluştur
 * PATCH  /api/kullanicilar/:id                 — ad, soyad, şirket, rol, aktiflik
 * POST   /api/kullanicilar/:id/sifre-sifirlama — sıfırlama bağlantısı gönder
 * GET    /api/kullanicilar/davetler            — davet listesi
 * POST   /api/kullanicilar/davetler            — davet gönder
 * POST   /api/kullanicilar/davetler/:id/yeniden-gonder
 * POST   /api/kullanicilar/davetler/:id/iptal
 */
const { Router } = require('express');
const bcrypt = require('bcrypt');
const pool = require('../db/pool');
const { requireRole } = require('../middleware/auth');
const { sablonluGonder } = require('../services/emailService');
const {
  DAVET_GUN, tokenUret, tokenHash, uygulamaAdresi,
  sifirlamaEpostasiGonder, hesapOlusturulduEpostasiGonder,
} = require('../services/hesapService');

const router = Router();
router.use(requireRole('admin'));

const ROLLER = ['admin', 'degerlendirici', 'izleyici'];
const ROL_ADLARI = { admin: 'Admin', degerlendirici: 'Değerlendirici', izleyici: 'İzleyici' };
const EPOSTA_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const KULLANICI_ALANLARI = 'id, eposta, ad, soyad, sirket, rol, aktif, onay_bekliyor, son_giris, olusturma';

function temiz(v) {
  const s = String(v ?? '').trim();
  return s || null;
}

/* ─── Kullanıcılar ──────────────────────────────────── */

router.get('/', async (req, res, next) => {
  try {
    const { ara, rol, durum } = req.query;
    const limit = Math.min(Math.max(parseInt(req.query.limit) || 10, 1), 100);
    const sayfa = Math.max(parseInt(req.query.sayfa) || 1, 1);

    const kosullar = [];
    const params = [];
    if (ara) {
      params.push(`%${ara.toLowerCase()}%`);
      kosullar.push(`(LOWER(ad) LIKE $${params.length} OR LOWER(COALESCE(soyad,'')) LIKE $${params.length} OR eposta LIKE $${params.length})`);
    }
    if (rol && ROLLER.includes(rol)) { params.push(rol); kosullar.push(`rol = $${params.length}`); }
    if (durum === 'aktif')         kosullar.push('aktif = true');
    if (durum === 'pasif')         kosullar.push('aktif = false AND COALESCE(onay_bekliyor,false) = false');
    if (durum === 'onay_bekliyor') kosullar.push('onay_bekliyor = true');
    const where = kosullar.length ? `WHERE ${kosullar.join(' AND ')}` : '';

    const toplam = (await pool.query(`SELECT COUNT(*)::int AS n FROM kullanicilar ${where}`, params)).rows[0].n;
    params.push(limit, (sayfa - 1) * limit);
    const { rows } = await pool.query(
      `SELECT ${KULLANICI_ALANLARI} FROM kullanicilar ${where}
       ORDER BY onay_bekliyor DESC NULLS LAST, olusturma DESC
       LIMIT $${params.length - 1} OFFSET $${params.length}`,
      params
    );
    const bekleyen = (await pool.query('SELECT COUNT(*)::int AS n FROM kullanicilar WHERE onay_bekliyor = true')).rows[0].n;
    res.json({ kayitlar: rows, toplam, sayfa, limit, onay_bekleyen: bekleyen });
  } catch (err) { next(err); }
});

router.post('/', async (req, res, next) => {
  try {
    const ad = temiz(req.body.ad);
    const soyad = temiz(req.body.soyad);
    const sirket = temiz(req.body.sirket);
    const eposta = String(req.body.eposta || '').toLowerCase().trim();
    const rol = req.body.rol || 'izleyici';
    const geciciSifre = req.body.gecici_sifre || '';

    if (!ad || !soyad) return res.status(400).json({ hata: 'Ad ve soyad gerekli' });
    if (!EPOSTA_RE.test(eposta)) return res.status(400).json({ hata: 'Geçerli bir e-posta adresi girin' });
    if (!ROLLER.includes(rol)) return res.status(400).json({ hata: 'Geçersiz rol' });
    if (geciciSifre && geciciSifre.length < 6) return res.status(400).json({ hata: 'Geçici şifre en az 6 karakter olmalı' });

    // Geçici şifre verilmezse rastgele bir şifre atanır ve kullanıcıya şifre belirleme bağlantısı gider
    const hash = await bcrypt.hash(geciciSifre || tokenUret(), 12);
    const { rows } = await pool.query(
      `INSERT INTO kullanicilar (eposta, sifre_hash, ad, soyad, sirket, rol, aktif)
       VALUES ($1,$2,$3,$4,$5,$6,true) RETURNING ${KULLANICI_ALANLARI}`,
      [eposta, hash, ad, soyad, sirket, rol]
    );

    let eposta_gonderildi = false;
    let eposta_hatasi = null;
    if (!geciciSifre) {
      try { await hesapOlusturulduEpostasiGonder(rows[0], req); eposta_gonderildi = true; }
      catch (e) { eposta_hatasi = e.message; }
    }
    res.status(201).json({ kullanici: rows[0], eposta_gonderildi, eposta_hatasi });
  } catch (err) {
    if (err.code === '23505') return res.status(409).json({ hata: 'Bu e-posta zaten kayıtlı' });
    next(err);
  }
});

router.patch('/:id', async (req, res, next) => {
  try {
    const id = parseInt(req.params.id);
    const { rows: mevcut } = await pool.query(`SELECT ${KULLANICI_ALANLARI} FROM kullanicilar WHERE id=$1`, [id]);
    const k = mevcut[0];
    if (!k) return res.status(404).json({ hata: 'Kullanıcı bulunamadı' });

    const b = req.body;
    if (b.rol !== undefined && !ROLLER.includes(b.rol)) return res.status(400).json({ hata: 'Geçersiz rol' });
    if (id === req.user.id && (b.aktif === false || (b.rol && b.rol !== 'admin'))) {
      return res.status(400).json({ hata: 'Kendi admin yetkinizi kaldıramaz veya hesabınızı pasifleştiremezsiniz' });
    }

    const yeni = {
      ad:     b.ad     !== undefined ? temiz(b.ad) || k.ad : k.ad,
      soyad:  b.soyad  !== undefined ? temiz(b.soyad)  : k.soyad,
      sirket: b.sirket !== undefined ? temiz(b.sirket) : k.sirket,
      rol:    b.rol ?? k.rol,
      aktif:  b.aktif !== undefined ? !!b.aktif : k.aktif,
    };
    const onaylandi = k.onay_bekliyor && yeni.aktif;

    const { rows } = await pool.query(
      `UPDATE kullanicilar
       SET ad=$1, soyad=$2, sirket=$3, rol=$4, aktif=$5,
           onay_bekliyor = CASE WHEN $5 THEN false ELSE onay_bekliyor END
       WHERE id=$6 RETURNING ${KULLANICI_ALANLARI}`,
      [yeni.ad, yeni.soyad, yeni.sirket, yeni.rol, yeni.aktif, id]
    );

    let eposta_hatasi = null;
    if (onaylandi) {
      try {
        await sablonluGonder({
          anahtar: 'hesap_onaylandi', alici: k.eposta, aliciAd: yeni.ad,
          degiskenler: { ad: yeni.ad, girisUrl: `${uygulamaAdresi(req)}/giris` },
        });
      } catch (e) { eposta_hatasi = e.message; }
    }
    res.json({ kullanici: rows[0], eposta_hatasi });
  } catch (err) { next(err); }
});

// Onay bekleyen kayıt talebini reddet (kaydı sil)
router.delete('/:id', async (req, res, next) => {
  try {
    const { rowCount } = await pool.query(
      'DELETE FROM kullanicilar WHERE id=$1 AND onay_bekliyor = true', [parseInt(req.params.id)]
    );
    if (!rowCount) return res.status(400).json({ hata: 'Yalnızca onay bekleyen kayıt talepleri silinebilir' });
    res.json({ tamam: true });
  } catch (err) { next(err); }
});

router.post('/:id/sifre-sifirlama', async (req, res, next) => {
  try {
    const { rows } = await pool.query('SELECT id, eposta, ad FROM kullanicilar WHERE id=$1', [parseInt(req.params.id)]);
    if (!rows[0]) return res.status(404).json({ hata: 'Kullanıcı bulunamadı' });
    try { await sifirlamaEpostasiGonder(rows[0], req); }
    catch (e) { return res.status(400).json({ hata: e.message }); }
    res.json({ mesaj: `Şifre sıfırlama bağlantısı ${rows[0].eposta} adresine gönderildi.` });
  } catch (err) { next(err); }
});

/* ─── Davetler ──────────────────────────────────────── */

router.get('/davetler', async (req, res, next) => {
  try {
    const { rows } = await pool.query(`
      SELECT d.id, d.eposta, d.ad, d.soyad, d.sirket, d.rol, d.olusturma, d.son_kullanma, d.kabul_tarihi,
             CASE WHEN d.durum = 'bekliyor' AND d.son_kullanma < NOW() THEN 'suresi_doldu' ELSE d.durum END AS durum,
             k.ad AS davet_eden
      FROM davetler d LEFT JOIN kullanicilar k ON k.id = d.davet_eden_id
      ORDER BY d.olusturma DESC
      LIMIT 200
    `);
    res.json(rows);
  } catch (err) { next(err); }
});

async function davetEpostasiGonder(davet, token, req) {
  await sablonluGonder({
    anahtar: 'kullanici_davet',
    alici: davet.eposta,
    aliciAd: davet.ad,
    degiskenler: {
      ad: davet.ad || davet.eposta,
      davetEden: req.user.ad,
      rol: ROL_ADLARI[davet.rol] || davet.rol,
      kabulUrl: `${uygulamaAdresi(req)}/davet?token=${token}`,
      gecerlilikGun: DAVET_GUN,
    },
  });
}

router.post('/davetler', async (req, res, next) => {
  try {
    const eposta = String(req.body.eposta || '').toLowerCase().trim();
    const rol = req.body.rol || 'izleyici';
    if (!EPOSTA_RE.test(eposta)) return res.status(400).json({ hata: 'Geçerli bir e-posta adresi girin' });
    if (!ROLLER.includes(rol)) return res.status(400).json({ hata: 'Geçersiz rol' });

    const varMi = await pool.query('SELECT 1 FROM kullanicilar WHERE eposta=$1', [eposta]);
    if (varMi.rows[0]) return res.status(409).json({ hata: 'Bu e-posta ile zaten bir hesap var' });

    // Aynı adrese bekleyen eski davetler iptal edilir
    await pool.query(`UPDATE davetler SET durum='iptal' WHERE LOWER(eposta)=$1 AND durum='bekliyor'`, [eposta]);

    const token = tokenUret();
    const { rows } = await pool.query(
      `INSERT INTO davetler (eposta, ad, soyad, sirket, rol, token_hash, davet_eden_id, son_kullanma)
       VALUES ($1,$2,$3,$4,$5,$6,$7, NOW() + ($8 || ' days')::interval) RETURNING *`,
      [eposta, temiz(req.body.ad), temiz(req.body.soyad), temiz(req.body.sirket), rol,
       tokenHash(token), req.user.id, String(DAVET_GUN)]
    );

    try { await davetEpostasiGonder(rows[0], token, req); }
    catch (e) {
      await pool.query(`UPDATE davetler SET durum='iptal' WHERE id=$1`, [rows[0].id]);
      return res.status(400).json({ hata: `Davet e-postası gönderilemedi: ${e.message}` });
    }
    res.status(201).json({ mesaj: `Davet ${eposta} adresine gönderildi.` });
  } catch (err) { next(err); }
});

router.post('/davetler/:id/yeniden-gonder', async (req, res, next) => {
  try {
    const { rows } = await pool.query(
      `SELECT * FROM davetler WHERE id=$1 AND durum='bekliyor'`, [parseInt(req.params.id)]
    );
    if (!rows[0]) return res.status(404).json({ hata: 'Bekleyen davet bulunamadı' });

    // Yeni token ve süre — eski bağlantı geçersiz olur
    const token = tokenUret();
    await pool.query(
      `UPDATE davetler SET token_hash=$1, son_kullanma = NOW() + ($2 || ' days')::interval WHERE id=$3`,
      [tokenHash(token), String(DAVET_GUN), rows[0].id]
    );
    try { await davetEpostasiGonder(rows[0], token, req); }
    catch (e) { return res.status(400).json({ hata: `Davet e-postası gönderilemedi: ${e.message}` }); }
    res.json({ mesaj: `Davet ${rows[0].eposta} adresine yeniden gönderildi.` });
  } catch (err) { next(err); }
});

router.post('/davetler/:id/iptal', async (req, res, next) => {
  try {
    const { rowCount } = await pool.query(
      `UPDATE davetler SET durum='iptal' WHERE id=$1 AND durum='bekliyor'`, [parseInt(req.params.id)]
    );
    if (!rowCount) return res.status(404).json({ hata: 'Bekleyen davet bulunamadı' });
    res.json({ tamam: true });
  } catch (err) { next(err); }
});

module.exports = router;
