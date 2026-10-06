/**
 * E-posta Şablonları
 * Varsayılan şablonlar kodda durur; admin'in düzenledikleri `email_sablonlari`
 * tablosunda saklanır ve varsayılanın üzerine yazar.
 * Dinamik alanlar {{anahtar}} biçimindedir.
 */
const pool = require('../db/pool');

function kabuk(baslik, icerik) {
  return `<!DOCTYPE html>
<html lang="tr">
<head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1.0"></head>
<body style="margin:0;padding:0;font-family:'Segoe UI',Arial,sans-serif;background:#f3f4f6;">
<div style="max-width:600px;margin:0 auto;padding:24px 16px;">
  <div style="background:linear-gradient(135deg,#6366f1,#268d7c);border-radius:16px 16px 0 0;padding:28px;color:#fff;text-align:center;">
    <div style="font-size:11px;font-weight:800;letter-spacing:0.1em;text-transform:uppercase;opacity:0.85;margin-bottom:6px;">DEĞERLENDİRME SİSTEMİ</div>
    <div style="font-size:22px;font-weight:900;">${baslik}</div>
  </div>
  <div style="background:#fff;border:1px solid #e5e7eb;border-top:none;padding:28px;border-radius:0 0 16px 16px;font-size:15px;color:#374151;line-height:1.7;">
${icerik}
    <div style="border-top:1px solid #f3f4f6;margin-top:24px;padding-top:16px;font-size:12px;color:#9ca3af;">
      Bu e-posta Değerlendirme Sistemi tarafından otomatik olarak gönderilmiştir.
    </div>
  </div>
</div>
</body></html>`;
}

function dugme(url, metin) {
  return `    <div style="text-align:center;margin:24px 0;">
      <a href="${url}" style="display:inline-block;background:#6366f1;color:#fff;text-decoration:none;padding:13px 30px;border-radius:10px;font-size:15px;font-weight:800;">${metin}</a>
    </div>
    <p style="color:#6b7280;font-size:13px;margin:0 0 8px;">Bağlantı çalışmıyorsa aşağıdaki adresi tarayıcınıza kopyalayın:</p>
    <div style="background:#f9fafb;padding:12px;border-radius:6px;border-left:3px solid #6366f1;">
      <p style="color:#6366f1;font-size:12px;word-break:break-all;margin:0;font-family:monospace;">${url}</p>
    </div>`;
}

const VARSAYILANLAR = {
  sifre_sifirlama: {
    baslik: 'Şifre Sıfırlama',
    konu: 'Şifre sıfırlama talebiniz',
    degiskenler: {
      ad: 'Alıcının adı',
      sifirlamaUrl: 'Yeni şifre belirleme bağlantısı',
      gecerlilikDakika: 'Bağlantının geçerlilik süresi (dakika)',
    },
    html: kabuk('Şifre Sıfırlama', `    <p>Merhaba {{ad}},</p>
    <p>Hesabınız için şifre sıfırlama talebi aldık. Yeni şifrenizi belirlemek için aşağıdaki düğmeye tıklayın.</p>
${dugme('{{sifirlamaUrl}}', 'Şifremi Sıfırla')}
    <p style="font-size:13px;color:#6b7280;margin-top:20px;">Bu bağlantı {{gecerlilikDakika}} dakika geçerlidir. Talebi siz yapmadıysanız bu e-postayı yok sayabilirsiniz; şifreniz değişmez.</p>`),
  },

  kullanici_davet: {
    baslik: 'Kullanıcı Daveti',
    konu: '{{davetEden}} sizi Değerlendirme Sistemi\'ne davet ediyor',
    degiskenler: {
      ad: 'Davet edilen kişinin adı',
      davetEden: 'Daveti gönderen kişinin adı',
      rol: 'Atanacak rol',
      kabulUrl: 'Daveti kabul bağlantısı',
      gecerlilikGun: 'Davetin geçerlilik süresi (gün)',
    },
    html: kabuk('Davetiniz Var', `    <p>Merhaba {{ad}},</p>
    <p><strong>{{davetEden}}</strong>, sizi Değerlendirme Sistemi'ne <strong>{{rol}}</strong> rolüyle katılmaya davet ediyor.</p>
    <p>Daveti kabul ederek şifrenizi belirleyin ve hemen kullanmaya başlayın.</p>
${dugme('{{kabulUrl}}', 'Daveti Kabul Et')}
    <p style="font-size:13px;color:#6b7280;margin-top:20px;">Bu davet {{gecerlilikGun}} gün geçerlidir.</p>`),
  },

  hesap_olusturuldu: {
    baslik: 'Hesap Oluşturuldu',
    konu: 'Değerlendirme Sistemi hesabınız oluşturuldu',
    degiskenler: {
      ad: 'Alıcının adı',
      eposta: 'Giriş e-posta adresi',
      sifreBelirlemeUrl: 'Şifre belirleme bağlantısı',
      gecerlilikGun: 'Bağlantının geçerlilik süresi (gün)',
    },
    html: kabuk('Hesabınız Hazır', `    <p>Merhaba {{ad}},</p>
    <p>Sizin için bir Değerlendirme Sistemi hesabı oluşturuldu. Giriş e-postanız: <strong>{{eposta}}</strong></p>
    <p>Hesabınızı kullanmaya başlamak için şifrenizi belirleyin.</p>
${dugme('{{sifreBelirlemeUrl}}', 'Şifremi Belirle')}
    <p style="font-size:13px;color:#6b7280;margin-top:20px;">Bu bağlantı {{gecerlilikGun}} gün geçerlidir.</p>`),
  },

  hesap_onaylandi: {
    baslik: 'Kayıt Onayı',
    konu: 'Kayıt talebiniz onaylandı',
    degiskenler: {
      ad: 'Alıcının adı',
      girisUrl: 'Giriş sayfası bağlantısı',
    },
    html: kabuk('Hesabınız Onaylandı', `    <p>Merhaba {{ad}},</p>
    <p>Kayıt talebiniz yönetici tarafından onaylandı. Artık kayıt sırasında belirlediğiniz şifreyle giriş yapabilirsiniz.</p>
${dugme('{{girisUrl}}', 'Giriş Yap')}`),
  },
};

function htmlKacis(deger) {
  return String(deger ?? '')
    .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;').replace(/'/g, '&#39;');
}

/** {{anahtar}} alanlarını doldur. Bilinmeyen alanlar olduğu gibi kalır. */
function doldur(metin, degiskenler = {}, { kacis = true } = {}) {
  return String(metin || '').replace(/\{\{\s*([\w.]+)\s*\}\}/g, (tam, anahtar) =>
    Object.prototype.hasOwnProperty.call(degiskenler, anahtar)
      ? (kacis ? htmlKacis(degiskenler[anahtar]) : String(degiskenler[anahtar] ?? ''))
      : tam
  );
}

async function dbSablonlari() {
  try {
    const { rows } = await pool.query('SELECT anahtar, baslik, konu, html, guncelleme FROM email_sablonlari');
    return Object.fromEntries(rows.map(r => [r.anahtar, r]));
  } catch { return {}; }
}

/** Tüm şablonlar — varsayılan + DB'deki düzenlemeler */
async function sablonlariListele() {
  const db = await dbSablonlari();
  return Object.entries(VARSAYILANLAR).map(([anahtar, v]) => ({
    anahtar,
    baslik: db[anahtar]?.baslik || v.baslik,
    konu: db[anahtar]?.konu || v.konu,
    degiskenler: v.degiskenler,
    ozellestirildi: !!db[anahtar],
    guncelleme: db[anahtar]?.guncelleme || null,
  }));
}

async function sablonGetir(anahtar) {
  const v = VARSAYILANLAR[anahtar];
  if (!v) return null;
  const db = (await dbSablonlari())[anahtar];
  return {
    anahtar,
    baslik: db?.baslik || v.baslik,
    konu: db?.konu || v.konu,
    html: db?.html || v.html,
    degiskenler: v.degiskenler,
    ozellestirildi: !!db,
    guncelleme: db?.guncelleme || null,
  };
}

async function sablonKaydet(anahtar, { baslik, konu, html }) {
  await pool.query(`
    INSERT INTO email_sablonlari (anahtar, baslik, konu, html, guncelleme)
    VALUES ($1, $2, $3, $4, NOW())
    ON CONFLICT (anahtar) DO UPDATE
      SET baslik = EXCLUDED.baslik, konu = EXCLUDED.konu, html = EXCLUDED.html, guncelleme = NOW()
  `, [anahtar, baslik, konu, html]);
  return sablonGetir(anahtar);
}

async function sablonSifirla(anahtar) {
  await pool.query('DELETE FROM email_sablonlari WHERE anahtar = $1', [anahtar]);
  return sablonGetir(anahtar);
}

/** Konu ve HTML'i değişkenlerle doldurulmuş hâlde döndür */
function isle({ konu, html }, degiskenler) {
  return {
    konu: doldur(konu, degiskenler, { kacis: false }),
    html: doldur(html, degiskenler),
  };
}

module.exports = { VARSAYILANLAR, sablonlariListele, sablonGetir, sablonKaydet, sablonSifirla, isle };
