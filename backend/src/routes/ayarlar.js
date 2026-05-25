const { Router } = require('express');
const pool = require('../db/pool');
const { requireRole } = require('../middleware/auth');
const nodemailer = require('nodemailer');

const router = Router();

async function ensureTable() {
  await pool.query(`
    CREATE TABLE IF NOT EXISTS sistem_ayarlari (
      anahtar VARCHAR(100) PRIMARY KEY,
      deger   TEXT,
      guncelleme TIMESTAMPTZ DEFAULT NOW()
    )
  `);
}

async function dbAyarlar() {
  try {
    await ensureTable();
    const { rows } = await pool.query('SELECT anahtar, deger FROM sistem_ayarlari');
    return Object.fromEntries(rows.map(r => [r.anahtar, r.deger]));
  } catch { return {}; }
}

/* GET /api/ayarlar — admin: mevcut ayarlar (şifreler maskelenmiş) */
router.get('/', requireRole('admin'), async (req, res, next) => {
  try {
    const db = await dbAyarlar();
    const MASKELI = ['smtp_pass'];
    const cevap = {
      smtp_host:  db.smtp_host  || process.env.SMTP_HOST  || '',
      smtp_port:  db.smtp_port  || process.env.SMTP_PORT  || '587',
      smtp_user:  db.smtp_user  || process.env.SMTP_USER  || '',
      smtp_pass:  (db.smtp_pass || process.env.SMTP_PASS) ? '••••••••' : '',
      email_from: db.email_from || process.env.EMAIL_FROM || '',
    };
    res.json(cevap);
  } catch (e) { next(e); }
});

/* POST /api/ayarlar — admin: ayarları kaydet */
router.post('/', requireRole('admin'), async (req, res, next) => {
  try {
    await ensureTable();
    const izinli = ['smtp_host', 'smtp_port', 'smtp_user', 'smtp_pass', 'email_from'];
    for (const [anahtar, deger] of Object.entries(req.body)) {
      if (!izinli.includes(anahtar)) continue;
      if (deger === '••••••••') continue; // maskelenmiş — dokunma
      await pool.query(`
        INSERT INTO sistem_ayarlari (anahtar, deger, guncelleme)
        VALUES ($1, $2, NOW())
        ON CONFLICT (anahtar) DO UPDATE SET deger = EXCLUDED.deger, guncelleme = NOW()
      `, [anahtar, deger]);
    }
    res.json({ tamam: true });
  } catch (e) { next(e); }
});

/* POST /api/ayarlar/smtp-test — bağlantı testi + admin'e test maili */
router.post('/smtp-test', requireRole('admin'), async (req, res, next) => {
  try {
    const db = await dbAyarlar();
    const host  = db.smtp_host  || process.env.SMTP_HOST  || 'smtp.gmail.com';
    const port  = parseInt(db.smtp_port || process.env.SMTP_PORT || '587');
    const user  = db.smtp_user  || process.env.SMTP_USER;
    const pass  = db.smtp_pass  || process.env.SMTP_PASS;
    const from  = db.email_from || process.env.EMAIL_FROM || user;

    if (!user || !pass) {
      return res.status(400).json({ hata: 'SMTP_USER ve SMTP_PASS girilmemiş.' });
    }

    const t = nodemailer.createTransport({ host, port, secure: port === 465, auth: { user, pass } });
    await t.verify();
    await t.sendMail({
      from, to: req.user.eposta,
      subject: '✅ SMTP Test — Değerlendirme Sistemi',
      text: `SMTP bağlantısı başarıyla test edildi.\nSunucu: ${host}:${port}`,
    });

    res.json({ tamam: true, mesaj: `Test e-postası ${req.user.eposta} adresine gönderildi.` });
  } catch (e) {
    res.status(400).json({ hata: e.message });
  }
});

module.exports = router;
module.exports.dbAyarlar = dbAyarlar;
