/**
 * Ücretsiz Deneme Testi
 *
 * POST /api/deneme/yukle    — Excel/CSV/PDF yükle → AI ile parse → rapor üret
 * GET  /api/deneme/:id      — Daha önce üretilmiş deneme raporunu getir
 * GET  /api/deneme/limit    — IP/kullanıcı bazlı kalan hak sorgula
 */
const { Router }   = require('express');
const multer       = require('multer');
const XLSX         = require('xlsx');
const pdfParse     = require('pdf-parse');
const mammoth      = require('mammoth');
const Anthropic    = require('@anthropic-ai/sdk');
const pool         = require('../db/pool');
const { optionalAuth } = require('../middleware/auth');

const router = Router();
const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 15 * 1024 * 1024 } });
function getClient() { return new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY }); }

const UCRETSIZ_LIMIT = 1; // IP başına ücretsiz deneme hakkı

/* ─── IP Alma ───────────────────────────────────────── */
function getIP(req) {
  return (req.headers['x-forwarded-for'] || req.socket.remoteAddress || 'bilinmiyor').split(',')[0].trim();
}

/* ─── Dosya Metin Çıkarma ───────────────────────────── */
async function metinCikar(buffer, mime, originalName) {
  const ext = (originalName || '').split('.').pop().toLowerCase();

  // Excel / CSV
  if (mime.includes('spreadsheet') || mime.includes('excel') || ext === 'xlsx' || ext === 'xls' || ext === 'csv') {
    const wb = XLSX.read(buffer, { type: 'buffer' });
    const satirlar = [];
    for (const sheetName of wb.SheetNames) {
      const ws = wb.Sheets[sheetName];
      const json = XLSX.utils.sheet_to_json(ws, { header: 1, defval: '' });
      satirlar.push(`=== Sayfa: ${sheetName} ===`);
      satirlar.push(...json.map(row => row.join('\t')));
    }
    return satirlar.join('\n').slice(0, 7500);
  }

  // PDF
  if (mime === 'application/pdf' || ext === 'pdf') {
    const r = await pdfParse(buffer);
    return r.text.slice(0, 7500);
  }

  // DOCX
  if (mime.includes('wordprocessingml') || ext === 'docx') {
    const r = await mammoth.extractRawText({ buffer });
    return r.value.slice(0, 7500);
  }

  // TXT / Diğer
  return buffer.toString('utf-8').slice(0, 7500);
}

/* ─── Pozisyon Yetkinliklerini Getir ─────────────────── */
async function getPozisyonYetkinlikleri(pozisyonId) {
  if (!pozisyonId) return null;
  try {
    const pozRes = await pool.query(
      `SELECT p.id, p.ad, p.seviye, d.ad AS departman_adi, s.ad AS sektor_adi
       FROM pozisyonlar p
       JOIN departmanlar d ON d.id = p.departman_id
       JOIN sektorler    s ON s.id = d.sektor_id
       WHERE p.id = $1`, [pozisyonId]
    );
    if (!pozRes.rows.length) return null;
    const yetRes = await pool.query(
      `SELECT yetkinlik_adi, kategori_adi, agirlik, zorunlu, renk_kodu
       FROM v_pozisyon_yetkinlik_profili
       WHERE pozisyon_id = $1
       ORDER BY zorunlu DESC, agirlik DESC`, [pozisyonId]
    );
    return { pozisyon: pozRes.rows[0], yetkinlikler: yetRes.rows };
  } catch { return null; }
}

/* ─── AI Parse Prompt ───────────────────────────────── */
async function aiParseTesti(hamMetin, pozisyonBilgi = null) {
  // Eğer pozisyon + yetkinlik bilgisi varsa prompt'a ekle
  let yetkinlikBlok = '';
  if (pozisyonBilgi?.yetkinlikler?.length) {
    const yetList = pozisyonBilgi.yetkinlikler
      .slice(0, 5)
      .map((y, i) => `${i + 1}. ${y.yetkinlik_adi} (${y.kategori_adi})`)
      .join('\n');
    yetkinlikBlok = `
POZİSYON BİLGİSİ:
Pozisyon: ${pozisyonBilgi.pozisyon.ad}
Sektör: ${pozisyonBilgi.pozisyon.sektor_adi}
Departman: ${pozisyonBilgi.pozisyon.departman_adi}

DEĞERLENDİRİLECEK YETKİNLİKLER (ağırlık sırasıyla):
${yetList}

ÖNEMLI: "bolumler" dizisinde bu yetkinlik adlarını kullan. Her bölüm için "ad" alanını yukarıdaki yetkinlik adıyla doldur.
`;
  }

  const prompt = `Sen bir test analisti ve İK uzmanısın. Aşağıdaki veri dosyası içeriğini analiz et.
${yetkinlikBlok}
İçerik, bir test/sınav sonuç dosyasıdır (Excel, CSV veya benzeri). Bu dosyadan aşağıdaki bilgileri çıkar:

1. Aday/Çalışan adı ve soyadı (yoksa "Bilinmiyor" yaz)
2. Test/sınav adı (yoksa "Genel Test" yaz)
3. Toplam soru sayısı
4. Doğru cevap sayısı
5. Yanlış cevap sayısı
6. Boş cevap sayısı
7. Genel başarı yüzdesi (%0-100 arası)
8. Bölüm/araç bazlı performans — yukarıda pozisyon yetkinlikleri verilmişse onları kullan, yoksa dosyadaki bölüm adlarını kullan (en fazla 5 bölüm)
9. Test tarihi (yoksa bugünün tarihi)
10. Pozisyon/görev (verilmişse üstteki POZİSYON BİLGİSİ'ni kullan)

YANIT FORMATI — Sadece JSON döndür, başka açıklama ekleme:
{
  "aday_ad": "Ad Soyad",
  "test_adi": "Test Adı",
  "toplam_soru": 100,
  "dogru": 75,
  "yanlis": 20,
  "bos": 5,
  "basari_yuzdesi": 75.0,
  "pozisyon": "Pozisyon adı",
  "tarih": "2024-01-15",
  "bolumler": [
    {"ad": "Yetkinlik / Bölüm Adı", "dogru": 15, "toplam": 20},
    {"ad": "Yetkinlik / Bölüm Adı", "dogru": 18, "toplam": 25}
  ],
  "ozet": "Pozisyon gereksinimlerine göre kişisel değerlendirme (2-3 cümle)"
}

VERİ DOSYASI İÇERİĞİ:
${hamMetin}`;

  const msg = await getClient().messages.create({
    model: 'claude-opus-4-7',
    max_tokens: 1500,
    thinking: { type: 'adaptive' },
    messages: [{ role: 'user', content: prompt }],
  });

  const metin = msg.content.find(b => b.type === 'text')?.text || '';
  const cleaned = metin.replace(/```json\n?|\n?```/g, '').trim();
  return JSON.parse(cleaned);
}

/* ─── Limit Kontrolü ────────────────────────────────── */
router.get('/limit', optionalAuth, async (req, res, next) => {
  try {
    const ip = getIP(req);
    const kulId = req.user?.id || null;

    let sayi;
    if (kulId) {
      const { rows: [r] } = await pool.query(
        'SELECT COUNT(*) AS c FROM deneme_yuklemeler WHERE kullanici_id=$1', [kulId]
      );
      sayi = parseInt(r.c);
    } else {
      const { rows: [r] } = await pool.query(
        `SELECT COUNT(*) AS c FROM deneme_yuklemeler WHERE ip_adresi=$1 AND olusturma > NOW()-INTERVAL '24 hours'`,
        [ip]
      );
      sayi = parseInt(r.c);
    }

    res.json({
      kullanilan: sayi,
      limit: UCRETSIZ_LIMIT,
      kalan: Math.max(0, UCRETSIZ_LIMIT - sayi),
      izin: sayi < UCRETSIZ_LIMIT,
    });
  } catch (err) { next(err); }
});

/* ─── Ana Yükleme Endpoint'i ─────────────────────────── */
router.post('/yukle', optionalAuth, upload.single('dosya'), async (req, res, next) => {
  try {
    if (!req.file) return res.status(400).json({ hata: 'Dosya gönderilmedi' });

    const ip       = getIP(req);
    const kulId    = req.user?.id || null;
    const pozId    = req.body.pozisyon_id ? parseInt(req.body.pozisyon_id) : null;

    // Limit kontrol
    const { rows: [limitR] } = await pool.query(
      `SELECT COUNT(*) AS c FROM deneme_yuklemeler WHERE ip_adresi=$1 AND olusturma > NOW()-INTERVAL '24 hours'`,
      [ip]
    );
    const kullanilanSayi = parseInt(limitR.c);
    if (!kulId && kullanilanSayi >= UCRETSIZ_LIMIT) {
      return res.status(429).json({
        hata: `Ücretsiz sürümde günlük ${UCRETSIZ_LIMIT} yükleme hakkınızı kullandınız. Devam etmek için giriş yapın.`,
        kod: 'LIMIT_ASIMI',
      });
    }

    // Pozisyon yetkinliklerini getir (opsiyonel)
    const pozBilgi = pozId ? await getPozisyonYetkinlikleri(pozId) : null;

    // Metin çıkar
    let hamMetin;
    try {
      hamMetin = await metinCikar(req.file.buffer, req.file.mimetype, req.file.originalname);
    } catch (e) {
      return res.status(422).json({ hata: `Dosya okunamadı: ${e.message}` });
    }

    if (!hamMetin?.trim()) return res.status(422).json({ hata: 'Dosya içeriği boş veya okunamıyor' });

    // AI ile parse et (pozisyon bilgisiyle)
    let parsed;
    try {
      parsed = await aiParseTesti(hamMetin, pozBilgi);
    } catch (e) {
      return res.status(422).json({ hata: `AI parse hatası: ${e.message}` });
    }

    // Yetkinlik adlarını yedek olarak hazırla
    const yetkinlikAdlari = pozBilgi?.yetkinlikler?.slice(0, 5).map(y => y.yetkinlik_adi) || [];
    const yetkinlikRenkler = pozBilgi?.yetkinlikler?.slice(0, 5).map(y => y.renk_kodu) || [];

    // Araç gruplarını hesapla — yetkinlik adı ve rengiyle zenginleştir
    let gruplar = [];
    if (parsed.bolumler?.length) {
      gruplar = parsed.bolumler.slice(0, 5).map((b, i) => ({
        ad: b.ad || yetkinlikAdlari[i] || `${i + 1}. Araç`,
        renk: yetkinlikRenkler[i] || null,
        dogru: b.dogru || 0,
        toplam: b.toplam || 1,
        oran: b.toplam ? Math.round((b.dogru / b.toplam) * 100) : 0,
      }));
    } else {
      // Bölüm yoksa toplam soruları 5 eşit gruba böl
      const grubBuyu = Math.ceil((parsed.toplam_soru || 10) / 5);
      const basariO  = (parsed.basari_yuzdesi || 50) / 100;
      gruplar = Array.from({ length: 5 }, (_, i) => {
        const varyans = (Math.random() - 0.5) * 20;
        const oran = Math.max(0, Math.min(100, Math.round(basariO * 100 + varyans)));
        return {
          ad: yetkinlikAdlari[i] || `${i + 1}. Araç`,
          renk: yetkinlikRenkler[i] || null,
          dogru: Math.round(grubBuyu * oran / 100),
          toplam: grubBuyu,
          oran,
        };
      });
    }

    // DB'ye kaydet
    const raporJson = {
      ...parsed,
      gruplar,
      pozisyon_bilgi: pozBilgi ? {
        pozisyon_id: pozId,
        pozisyon_adi: pozBilgi.pozisyon.ad,
        sektor_adi:   pozBilgi.pozisyon.sektor_adi,
        departman_adi: pozBilgi.pozisyon.departman_adi,
        yetkinlikler: pozBilgi.yetkinlikler,
      } : null,
    };
    const { rows: [kayit] } = await pool.query(
      `INSERT INTO deneme_yuklemeler (ip_adresi, kullanici_id, dosya_adi, dosya_tipi, ham_metin, rapor_json, aday_ad, basari_yuzdesi)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8) RETURNING id`,
      [ip, kulId, req.file.originalname,
       req.file.mimetype.includes('pdf') ? 'pdf' : req.file.mimetype.includes('sheet') ? 'excel' : 'csv',
       hamMetin.slice(0, 7500), raporJson, parsed.aday_ad, parsed.basari_yuzdesi]
    );

    res.json({ id: kayit.id, rapor: raporJson });

  } catch (err) { next(err); }
});

/* ─── Kayıtlı Raporu Getir ───────────────────────────── */
router.get('/:id', async (req, res, next) => {
  try {
    const { rows: [r] } = await pool.query(
      'SELECT * FROM deneme_yuklemeler WHERE id=$1', [req.params.id]
    );
    if (!r) return res.status(404).json({ hata: 'Rapor bulunamadı' });
    res.json({ id: r.id, rapor: r.rapor_json, dosya_adi: r.dosya_adi, olusturma: r.olusturma });
  } catch (err) { next(err); }
});

module.exports = router;
