/**
 * E-posta Servisi — nodemailer tabanlı
 * Ortam değişkenleri: SMTP_HOST, SMTP_PORT, SMTP_USER, SMTP_PASS, EMAIL_FROM
 */
const nodemailer = require('nodemailer');

/* ─── DB ayarlarını oku ─────────────────────────────── */
async function getSmtpAyarlari() {
  const env = {
    host: process.env.SMTP_HOST || 'smtp.gmail.com',
    port: parseInt(process.env.SMTP_PORT || '587'),
    user: process.env.SMTP_USER || '',
    pass: process.env.SMTP_PASS || '',
    from: process.env.EMAIL_FROM || '',
  };
  try {
    const pool = require('../db/pool');
    const { rows } = await pool.query(
      "SELECT anahtar, deger FROM sistem_ayarlari WHERE anahtar LIKE 'smtp%' OR anahtar = 'email_from'"
    );
    for (const { anahtar, deger } of rows) {
      if (anahtar === 'smtp_host' && deger) env.host = deger;
      if (anahtar === 'smtp_port' && deger) env.port = parseInt(deger);
      if (anahtar === 'smtp_user' && deger) env.user = deger;
      if (anahtar === 'smtp_pass' && deger) env.pass = deger;
      if (anahtar === 'email_from' && deger) env.from = deger;
    }
  } catch { /* DB yoksa env kullan */ }
  return env;
}

/* ─── Transporter oluştur ───────────────────────────── */
async function buildTransporter() {
  const s = await getSmtpAyarlari();
  return { t: nodemailer.createTransport({ host: s.host, port: s.port, secure: s.port === 465, auth: { user: s.user, pass: s.pass } }), s };
}

/* ─── Klasman Hesaplayıcı ───────────────────────────── */
const KLASMAN = [
  { min: 80, durum: 'Çok İyi İş Çıkaranlar',  renk: '#22c55e' },
  { min: 70, durum: 'İyi / Geleceği Parlak',   renk: '#6366f1' },
  { min: 60, durum: 'Beklenen Performans',      renk: '#f59e0b' },
  { min: 50, durum: 'Sınırda / Riskli',         renk: '#f97316' },
  { min: 0,  durum: 'Yetkin Olmayan Kişiler',   renk: '#ef4444' },
];
function getKlasman(oran) { return KLASMAN.find(k => oran >= k.min) || KLASMAN[4]; }

/* ─── Araç gruplarını oluştur ───────────────────────── */
function hesaplaGruplar(detay = []) {
  const grubBuyu = Math.max(1, Math.ceil(detay.length / 5));
  return Array.from({ length: 5 }, (_, i) => {
    const dilim = detay.slice(i * grubBuyu, (i + 1) * grubBuyu);
    if (!dilim.length) return null;
    const dogru = dilim.filter(s => s.dogru_mu === true).length;
    return { dogru, toplam: dilim.length, oran: Math.round((dogru / dilim.length) * 100) };
  }).filter(Boolean);
}

/* ─── HTML Rapor Şablonu ────────────────────────────── */
function olusturHTMLRapor({ oturum, detay }) {
  const basari = parseFloat(oturum.basari_yuzdesi || 0);
  const klas   = getKlasman(basari);
  const gruplar = hesaplaGruplar(detay);

  const aracRenk = (oran) => oran >= 80 ? '#22c55e' : oran >= 70 ? '#6366f1' : oran >= 60 ? '#f59e0b' : oran >= 50 ? '#f97316' : '#ef4444';
  const aracEtiket = (oran) => oran >= 70 ? 'Güçlü Alan' : oran >= 60 ? 'Beklenen' : oran >= 50 ? 'Sınırda' : 'Gelişim Alanı';

  const tarih = new Date(oturum.bitis || oturum.baslangic).toLocaleDateString('tr-TR', {
    day: '2-digit', month: 'long', year: 'numeric'
  });

  /* Klasman tablosu satırları */
  const klasmanSatirlari = [
    { aralik: '%80 — %100', durum: 'Çok İyi İş Çıkaranlar',  renk: '#22c55e', vurgu: basari >= 80 },
    { aralik: '%70 — %79',  durum: 'İyi / Geleceği Parlak',   renk: '#6366f1', vurgu: basari >= 70 && basari < 80 },
    { aralik: '%60 — %69',  durum: 'Beklenen Performans',      renk: '#f59e0b', vurgu: basari >= 60 && basari < 70 },
    { aralik: '%50 — %59',  durum: 'Sınırda / Riskli',         renk: '#f97316', vurgu: basari >= 50 && basari < 60 },
    { aralik: '%0 — %49',   durum: 'Yetkin Olmayan Kişiler',   renk: '#ef4444', vurgu: basari < 50  },
  ].map(s => `
    <tr style="background:${s.vurgu ? s.renk + '18' : 'transparent'}; border-bottom:1px solid #e5e7eb;">
      <td style="padding:10px 14px; font-weight:${s.vurgu ? '800' : '400'}; color:${s.vurgu ? s.renk : '#6b7280'};">${s.aralik}</td>
      <td style="padding:10px 14px; font-weight:${s.vurgu ? '700' : '400'}; color:${s.vurgu ? '#111827' : '#6b7280'};">
        ${s.durum}${s.vurgu ? ' <span style="background:' + s.renk + ';color:#fff;padding:2px 8px;border-radius:10px;font-size:10px;font-weight:800;">SİZ</span>' : ''}
      </td>
    </tr>`).join('');

  /* Araç satırları */
  const aracSatirlari = gruplar.map((g, i) => {
    const renk = aracRenk(g.oran);
    const doluluk = Math.round(g.oran * 3); // 0-300px genişlik
    return `
    <div style="margin-bottom:12px;">
      <div style="display:flex; align-items:center; justify-content:space-between; margin-bottom:4px;">
        <span style="font-size:13px; font-weight:700; color:#374151;">${i + 1}. Araç</span>
        <div>
          <span style="font-size:11px; background:${renk}22; color:${renk}; padding:2px 8px; border-radius:8px; font-weight:700; margin-right:6px;">${aracEtiket(g.oran)}</span>
          <span style="font-size:14px; font-weight:800; color:${renk};">${g.oran}%</span>
        </div>
      </div>
      <div style="height:8px; background:#e5e7eb; border-radius:4px; overflow:hidden;">
        <div style="height:100%; width:${g.oran}%; background:${renk}; border-radius:4px;"></div>
      </div>
      <div style="font-size:11px; color:#9ca3af; margin-top:3px;">${g.dogru}/${g.toplam} doğru cevap</div>
    </div>`;
  }).join('');

  return `<!DOCTYPE html>
<html lang="tr">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Performans Raporu — ${oturum.aday_ad} ${oturum.aday_soyad}</title>
</head>
<body style="margin:0; padding:0; font-family:'Segoe UI',Arial,sans-serif; background:#f3f4f6;">
<div style="max-width:640px; margin:0 auto; padding:24px 16px;">

  <!-- BAŞLIK -->
  <div style="background:linear-gradient(135deg,${klas.renk},${klas.renk}bb); border-radius:16px 16px 0 0; padding:32px; color:#fff; text-align:center;">
    <div style="font-size:11px; font-weight:800; letter-spacing:0.1em; text-transform:uppercase; opacity:0.8; margin-bottom:8px;">
      TEST DEĞERLENDİRME VE PERFORMANS RAPORU
    </div>
    <div style="font-size:26px; font-weight:900; margin-bottom:6px;">${oturum.aday_ad} ${oturum.aday_soyad}</div>
    <div style="font-size:13px; opacity:0.85; margin-bottom:16px;">
      ${oturum.aday_pozisyon ? oturum.aday_pozisyon + ' · ' : ''}${oturum.aday_sirket || ''}
    </div>
    <div style="display:inline-block; background:rgba(255,255,255,0.25); border-radius:50%; width:90px; height:90px; line-height:90px; font-size:36px; font-weight:900; margin:8px 0;">
      ${Math.round(basari)}
    </div>
    <div style="font-size:12px; opacity:0.8; margin-top:4px;">100 Üzerinden Puan</div>
    <div style="margin-top:10px; font-size:14px; font-weight:800; background:rgba(255,255,255,0.2); border-radius:20px; padding:5px 18px; display:inline-block;">
      ${klas.durum}
    </div>
  </div>

  <!-- META BİLGİ -->
  <div style="background:#fff; padding:14px 24px; border-left:1px solid #e5e7eb; border-right:1px solid #e5e7eb; display:flex; gap:24px; flex-wrap:wrap;">
    <div><span style="font-size:10px; color:#9ca3af; text-transform:uppercase; font-weight:700;">Değerlendirme Tarihi</span><br><span style="font-size:13px; font-weight:600;">${tarih}</span></div>
    <div><span style="font-size:10px; color:#9ca3af; text-transform:uppercase; font-weight:700;">Toplam Soru</span><br><span style="font-size:13px; font-weight:600;">${detay.length} Soru</span></div>
    <div><span style="font-size:10px; color:#9ca3af; text-transform:uppercase; font-weight:700;">Test Adı</span><br><span style="font-size:13px; font-weight:600;">${oturum.proje_adi || '—'}</span></div>
    <div><span style="font-size:10px; color:#9ca3af; text-transform:uppercase; font-weight:700;">Doğru / Yanlış</span><br><span style="font-size:13px; font-weight:600;"><span style="color:#22c55e;">${oturum.dogru_sayisi || 0} ✓</span> / <span style="color:#ef4444;">${oturum.yanlis_sayisi || 0} ✗</span></span></div>
  </div>

  <!-- BÖLÜM 1: KLASMAN TABLOSU -->
  <div style="background:#fff; border:1px solid #e5e7eb; border-radius:0; padding:24px; margin-top:2px;">
    <h2 style="font-size:14px; font-weight:800; color:#111827; margin:0 0 16px; padding-bottom:10px; border-bottom:2px solid #f3f4f6;">
      🏅 1. Performans Klasman Tablosu
    </h2>
    <table style="width:100%; border-collapse:collapse; font-size:13px;">
      <thead>
        <tr style="border-bottom:2px solid #e5e7eb;">
          <th style="padding:8px 14px; text-align:left; font-size:10px; color:#9ca3af; text-transform:uppercase; font-weight:700;">Doğru Cevap Oranı</th>
          <th style="padding:8px 14px; text-align:left; font-size:10px; color:#9ca3af; text-transform:uppercase; font-weight:700;">Çalışan Statüsü</th>
        </tr>
      </thead>
      <tbody>${klasmanSatirlari}</tbody>
    </table>
    <p style="font-size:11px; color:#9ca3af; margin:10px 0 0; font-style:italic;">
      ℹ️ Doğru cevap sayısı ne kadar yüksekse, gelecekteki iş üretkenliği ve başarısı o kadar katlanarak artar.
    </p>
  </div>

  <!-- BÖLÜM 2: ARAÇ ANALİZİ -->
  <div style="background:#fff; border:1px solid #e5e7eb; padding:24px; margin-top:2px;">
    <h2 style="font-size:14px; font-weight:800; color:#111827; margin:0 0 16px; padding-bottom:10px; border-bottom:2px solid #f3f4f6;">
      📊 2. Geçmiş Dönem Performans Analizi (Araç Bazlı)
    </h2>
    ${aracSatirlari}
  </div>

  <!-- BÖLÜM 3: YOL HARİTASI -->
  <div style="background:#fff; border:1px solid #e5e7eb; padding:24px; margin-top:2px;">
    <h2 style="font-size:14px; font-weight:800; color:#111827; margin:0 0 16px; padding-bottom:10px; border-bottom:2px solid #f3f4f6;">
      🗺️ 3. Geleceğe Yönelik Yol Haritası ve Aksiyon Planı
    </h2>
    <div style="background:#eef2ff; border-left:4px solid #6366f1; border-radius:0 8px 8px 0; padding:10px 14px; margin-bottom:14px; font-size:12px; color:#374151; line-height:1.6;">
      <strong style="color:#6366f1;">⚡ Kritik Kural:</strong> Doğru cevap sayısı ne kadar yüksekse, kişinin gelecekteki iş üretkenliği ve başarısı o kadar katlanarak artacaktır.
    </div>
    ${[
      { ikon: '🔍', baslik: 'Hata Analizi Odaklı Gelişim', renk: '#6366f1', metin: '3., 4. ve 5. araçlarda yapılan yanlışların nedenleri (bilgi eksikliği mi, süre yönetimi mi, yöresel algı farkı mı?) tek tek tespit edilmeli ve bu alanlarda lokal eğitimler verilmelidir.' },
      { ikon: '📈', baslik: 'Verimlilik Artışı',           renk: '#22c55e', metin: `%80 barajına yaklaşmak için hata yapılan spesifik soru tipleri üzerinde pratik yapılmalı; doğru sayısı yavaş yavaş ve istikrarlı şekilde yukarı çekilmelidir. Mevcut başarı: %${Math.round(basari)}.` },
      { ikon: '🗺️', baslik: 'Gelecek Planlaması',          renk: '#f59e0b', metin: 'Kişi, başarılı olduğu ilk iki araçtaki güçlü reflekslerini, zayıf olduğu son araçlara da entegre etmeyi öğrenmelidir.' },
    ].map(a => `
    <div style="display:flex; gap:12px; padding:12px; background:#f9fafb; border-radius:8px; border-left:4px solid ${a.renk}; margin-bottom:10px;">
      <span style="font-size:20px; flex-shrink:0;">${a.ikon}</span>
      <div>
        <div style="font-size:13px; font-weight:700; color:${a.renk}; margin-bottom:3px;">${a.baslik}</div>
        <div style="font-size:12px; color:#6b7280; line-height:1.6;">${a.metin}</div>
      </div>
    </div>`).join('')}
  </div>

  <!-- BÖLÜM 4: NİHAİ SKOR -->
  <div style="background:#fff; border:1px solid #e5e7eb; border-radius:0 0 16px 16px; padding:24px; margin-top:2px;">
    <h2 style="font-size:14px; font-weight:800; color:#111827; margin:0 0 16px; padding-bottom:10px; border-bottom:2px solid #f3f4f6;">
      💯 4. Nihai Değerlendirme ve Skorlama
    </h2>
    <div style="background:${klas.renk}11; border:2px solid ${klas.renk}44; border-radius:12px; padding:24px; text-align:center; margin-bottom:16px;">
      <div style="font-size:11px; font-weight:800; color:${klas.renk}; letter-spacing:0.1em; text-transform:uppercase; margin-bottom:8px;">💯 Genel Başarı Skoru</div>
      <div style="font-size:52px; font-weight:900; color:${klas.renk}; line-height:1;">${Math.round(basari)}</div>
      <div style="font-size:14px; color:#9ca3af; margin:4px 0 12px;">100 Üzerinden Puan</div>
      <!-- İlerleme barı -->
      <div style="height:8px; background:#e5e7eb; border-radius:4px; max-width:360px; margin:0 auto;">
        <div style="height:100%; width:${basari}%; background:linear-gradient(90deg,${klas.renk}88,${klas.renk}); border-radius:4px;"></div>
      </div>
      <p style="font-size:11px; color:#9ca3af; margin:10px 0 0; font-style:italic; max-width:400px; margin-left:auto; margin-right:auto;">
        Doğru cevap sayısı arttıkça bu skor 100'e yaklaşacak ve kişinin işe kabul/devam/terfi şansı yavaş yavaş en üst seviyeye çıkacaktır.
      </p>
    </div>

    <table style="width:100%; border-collapse:collapse; font-size:13px;">
      <tr style="border-bottom:1px solid #e5e7eb;">
        <td style="padding:10px; color:#9ca3af; font-size:11px; text-transform:uppercase; font-weight:700;">Toplam Doğru Cevap Oranı</td>
        <td style="padding:10px; font-weight:800; color:${klas.renk}; text-align:right;">%${Math.round(basari)}</td>
      </tr>
      <tr style="border-bottom:1px solid #e5e7eb;">
        <td style="padding:10px; color:#9ca3af; font-size:11px; text-transform:uppercase; font-weight:700;">Geçmiş Performans Notu</td>
        <td style="padding:10px; font-weight:700; text-align:right;">${klas.durum}</td>
      </tr>
      <tr>
        <td style="padding:10px; color:#9ca3af; font-size:11px; text-transform:uppercase; font-weight:700;">Gelecek Potansiyel Notu</td>
        <td style="padding:10px; font-weight:700; color:${basari >= 70 ? '#22c55e' : basari >= 50 ? '#f59e0b' : '#ef4444'}; text-align:right;">
          ${basari >= 80 ? 'Liderliğe Hazır' : basari >= 70 ? 'Gelişime Açık, Verimliliği Artırılabilir' : basari >= 60 ? 'Standartlarda, Gelişim Gerekli' : basari >= 50 ? 'Yoğun Destek Gerekli' : 'Radikal Değişim Gerekli'}
        </td>
      </tr>
    </table>

    <!-- İmza alanı -->
    <div style="margin-top:20px; padding-top:16px; border-top:2px dashed #e5e7eb; display:flex; justify-content:space-between; flex-wrap:wrap; gap:12px; font-size:12px;">
      <div>
        <div style="color:#9ca3af; font-size:10px; text-transform:uppercase; font-weight:700; margin-bottom:2px;">Aday / Çalışan</div>
        <div style="font-weight:700;">${oturum.aday_ad} ${oturum.aday_soyad}</div>
        ${oturum.aday_pozisyon ? `<div style="color:#9ca3af;">${oturum.aday_pozisyon}</div>` : ''}
        ${oturum.aday_sirket ? `<div style="color:#9ca3af;">${oturum.aday_sirket}</div>` : ''}
      </div>
      <div style="text-align:right;">
        <div style="color:#9ca3af; font-size:10px; text-transform:uppercase; font-weight:700; margin-bottom:2px;">Değerlendirme Tarihi</div>
        <div style="font-weight:700;">${tarih}</div>
        <div style="color:#22c55e; font-weight:600; margin-top:4px;">✅ İmza Onaylandı</div>
      </div>
    </div>
  </div>

  <!-- ALT YAZI -->
  <div style="text-align:center; padding:16px; font-size:11px; color:#9ca3af;">
    Bu rapor Değerlendirme Sistemi tarafından otomatik olarak oluşturulmuştur.
  </div>

</div>
</body>
</html>`;
}

/* ─── Ana Gönderme Fonksiyonu ───────────────────────── */
async function raporGonder({ alici, aliciAd, oturum, detay }) {
  const { t, s } = await buildTransporter();
  if (!s.user) {
    throw new Error('SMTP ayarları yapılandırılmamış. Ayarlar sayfasından veya .env dosyasından SMTP bilgilerini girin.');
  }

  const html = olusturHTMLRapor({ oturum, detay });
  const basari = parseFloat(oturum.basari_yuzdesi || 0);
  const klas   = getKlasman(basari);
  const tarih  = new Date(oturum.bitis || oturum.baslangic).toLocaleDateString('tr-TR');

  const bilgi = await t.sendMail({
    from:    s.from || `"Değerlendirme Sistemi" <${s.user}>`,
    to:      `"${aliciAd}" <${alici}>`,
    subject: `📊 Performans Raporu — ${oturum.aday_ad} ${oturum.aday_soyad} | %${Math.round(basari)} | ${klas.durum}`,
    text:    `${oturum.aday_ad} ${oturum.aday_soyad} — ${tarih}\nGenel Başarı: %${Math.round(basari)}\nStatü: ${klas.durum}\nTest: ${oturum.proje_adi || '—'}`,
    html,
  });

  return { mesaj_id: bilgi.messageId, alici };
}

/* ─── Test Davet E-postası ──────────────────────────── */
async function davetGonder({ alici, aliciAd, testLinki, proje_adi, pozisyon, davet_eden }) {
  const { t, s } = await buildTransporter();
  if (!s.user) {
    throw new Error('SMTP ayarları yapılandırılmamış. Ayarlar sayfasından SMTP bilgilerini girin.');
  }

  const pozText = pozisyon || proje_adi || 'Yetkinlik Değerlendirmesi';
  const html = `<!DOCTYPE html>
<html lang="tr">
<head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1.0"></head>
<body style="margin:0;padding:0;font-family:'Segoe UI',Arial,sans-serif;background:#f3f4f6;">
<div style="max-width:600px;margin:0 auto;padding:24px 16px;">

  <div style="background:linear-gradient(135deg,#057c3c,#6366f1);border-radius:16px 16px 0 0;padding:32px;color:#fff;text-align:center;">
    <div style="font-size:11px;font-weight:800;letter-spacing:0.1em;text-transform:uppercase;opacity:0.8;margin-bottom:8px;">DEĞERLENDİRME SİSTEMİ — TEST DAVETİ</div>
    <div style="font-size:32px;margin-bottom:8px;">🧪</div>
    <div style="font-size:22px;font-weight:900;margin-bottom:6px;">Test Davetiniz Hazır</div>
    <div style="font-size:14px;opacity:0.85;">Sayın ${aliciAd}</div>
  </div>

  <div style="background:#fff;border:1px solid #e5e7eb;border-top:none;padding:28px;border-radius:0 0 16px 16px;">
    <p style="font-size:15px;color:#374151;line-height:1.7;margin:0 0 20px;">
      <strong>${davet_eden || 'Değerlendirme ekibi'}</strong> sizi <strong>${pozText}</strong> pozisyonu için bir yetkinlik değerlendirme testine davet etti.
    </p>

    ${proje_adi ? `
    <div style="background:#f9fafb;border:1px solid #e5e7eb;border-radius:10px;padding:16px;margin-bottom:20px;">
      <div style="font-size:10px;color:#9ca3af;text-transform:uppercase;font-weight:700;margin-bottom:4px;">Test Adı</div>
      <div style="font-size:15px;font-weight:700;color:#111827;">${proje_adi}</div>
    </div>` : ''}

    ${testLinki ? `
    <div style="text-align:center;margin:24px 0;">
      <a href="${testLinki}" style="display:inline-block;background:linear-gradient(135deg,#057c3c,#6366f1);color:#fff;text-decoration:none;padding:14px 32px;border-radius:10px;font-size:15px;font-weight:800;letter-spacing:0.02em;">
        🚀 Teste Başla
      </a>
    </div>
    <div style="text-align:center;font-size:11px;color:#9ca3af;margin-bottom:20px;">veya bu linki tarayıcınıza yapıştırın:<br><span style="color:#6366f1;word-break:break-all;">${testLinki}</span></div>
    ` : ''}

    <div style="border-top:1px solid #f3f4f6;padding-top:16px;font-size:12px;color:#9ca3af;">
      Bu e-posta Değerlendirme Sistemi tarafından otomatik olarak gönderilmiştir.
    </div>
  </div>
</div>
</body></html>`;

  await t.sendMail({
    from:    s.from || `"Değerlendirme Sistemi" <${s.user}>`,
    to:      `"${aliciAd}" <${alici}>`,
    subject: `🧪 Test Daveti — ${pozText}`,
    text:    `Sayın ${aliciAd},\n\n${davet_eden || 'Değerlendirme ekibi'} sizi ${pozText} pozisyonu için bir yetkinlik değerlendirme testine davet etti.\n\nTest linki: ${testLinki || '—'}`,
    html,
  });
}

module.exports = { raporGonder, davetGonder, olusturHTMLRapor, hesaplaGruplar };
