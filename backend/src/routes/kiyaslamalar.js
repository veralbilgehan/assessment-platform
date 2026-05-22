/**
 * Aday CV Kıyaslama & Puanlama Matrisi
 *
 * GET    /api/kiyaslamalar/kriterler          — kriter listesi
 * POST   /api/kiyaslamalar/kriterler          — yeni kriter
 * PUT    /api/kiyaslamalar/kriterler/:id      — kriter güncelle
 * DELETE /api/kiyaslamalar/kriterler/:id      — kriter sil
 * PUT    /api/kiyaslamalar/kriterler/agirlik  — toplu ağırlık güncelle
 *
 * POST   /api/kiyaslamalar                   — kıyaslama oluştur
 * GET    /api/kiyaslamalar                   — liste
 * GET    /api/kiyaslamalar/:id               — detay + puanlar
 * DELETE /api/kiyaslamalar/:id               — sil
 * POST   /api/kiyaslamalar/:id/puan          — manuel puan gir
 * POST   /api/kiyaslamalar/:id/ai-puan       — AI otomatik puanlama (SSE)
 */
const { Router } = require('express');
const multer     = require('multer');
const pdfParse   = require('pdf-parse');
const mammoth    = require('mammoth');
const Anthropic  = require('@anthropic-ai/sdk');
const pool       = require('../db/pool');
const { optionalAuth } = require('../middleware/auth');

const router = Router();
const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 10 * 1024 * 1024 } });
function getClient() { return new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY }); }

async function metinCikar(buffer, mime) {
  if (mime === 'application/pdf')
    return (await pdfParse(buffer)).text;
  if (mime === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document')
    return (await mammoth.extractRawText({ buffer })).value;
  return buffer.toString('utf-8');
}

/* ─── KRİTERLER ─────────────────────────────────────────── */

// GET /api/kiyaslamalar/kriterler
router.get('/kriterler', async (req, res, next) => {
  try {
    const { rows } = await pool.query(
      'SELECT * FROM kiyaslama_kriterleri WHERE aktif=true ORDER BY sira_no, id'
    );
    res.json(rows);
  } catch (err) { next(err); }
});

// POST /api/kiyaslamalar/kriterler
router.post('/kriterler', optionalAuth, async (req, res, next) => {
  try {
    const { kategori = 'ozel', ad, aciklama = '', agirlik = 5 } = req.body;
    if (!ad) return res.status(400).json({ hata: 'Kriter adı gerekli' });
    const { rows: [maxRow] } = await pool.query('SELECT COALESCE(MAX(sira_no),0)+1 AS s FROM kiyaslama_kriterleri');
    const { rows: [k] } = await pool.query(
      'INSERT INTO kiyaslama_kriterleri (kategori,ad,aciklama,agirlik,sira_no) VALUES ($1,$2,$3,$4,$5) RETURNING *',
      [kategori, ad, aciklama, agirlik, maxRow.s]
    );
    res.status(201).json(k);
  } catch (err) { next(err); }
});

// PUT /api/kiyaslamalar/kriterler/:id
router.put('/kriterler/:id', optionalAuth, async (req, res, next) => {
  try {
    const { ad, aciklama, agirlik, kategori } = req.body;
    const { rows: [k] } = await pool.query(
      `UPDATE kiyaslama_kriterleri SET
         ad=COALESCE($2,ad), aciklama=COALESCE($3,aciklama),
         agirlik=COALESCE($4,agirlik), kategori=COALESCE($5,kategori)
       WHERE id=$1 RETURNING *`,
      [req.params.id, ad, aciklama, agirlik, kategori]
    );
    if (!k) return res.status(404).json({ hata: 'Kriter bulunamadı' });
    res.json(k);
  } catch (err) { next(err); }
});

// DELETE /api/kiyaslamalar/kriterler/:id
router.delete('/kriterler/:id', optionalAuth, async (req, res, next) => {
  try {
    await pool.query('UPDATE kiyaslama_kriterleri SET aktif=false WHERE id=$1', [req.params.id]);
    res.json({ mesaj: 'Kriter devre dışı bırakıldı' });
  } catch (err) { next(err); }
});

// PUT /api/kiyaslamalar/kriterler/agirlik — toplu ağırlık güncelle [{id, agirlik}]
router.put('/kriterler/agirlik/toplu', optionalAuth, async (req, res, next) => {
  try {
    const { agirliklar } = req.body; // [{id, agirlik}]
    for (const { id, agirlik } of agirliklar) {
      await pool.query('UPDATE kiyaslama_kriterleri SET agirlik=$1 WHERE id=$2', [agirlik, id]);
    }
    res.json({ mesaj: 'Ağırlıklar güncellendi' });
  } catch (err) { next(err); }
});

/* ─── KIYASLAMALAR ──────────────────────────────────────── */

// POST /api/kiyaslamalar
router.post('/', optionalAuth, async (req, res, next) => {
  try {
    const { baslik, pozisyon_id, pozisyon_acik, sektor_id, aday_a_ad, aday_a_metin, aday_b_ad, aday_b_metin } = req.body;
    if (!aday_a_ad || !aday_b_ad) return res.status(400).json({ hata: 'Her iki aday adı gerekli' });
    const { rows: [k] } = await pool.query(
      `INSERT INTO kiyaslamalar (baslik, pozisyon_id, pozisyon_acik, sektor_id, aday_a_ad, aday_a_metin, aday_b_ad, aday_b_metin, olusturan_id)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9) RETURNING id`,
      [baslik||`${aday_a_ad} vs ${aday_b_ad}`, pozisyon_id||null, pozisyon_acik||null, sektor_id||null, aday_a_ad, aday_a_metin||null, aday_b_ad, aday_b_metin||null, req.user?.id||null]
    );
    res.status(201).json({ id: k.id });
  } catch (err) { next(err); }
});

// GET /api/kiyaslamalar
router.get('/', optionalAuth, async (req, res, next) => {
  try {
    const { rows } = await pool.query('SELECT * FROM v_kiyaslama_ozet ORDER BY olusturma DESC');
    res.json(rows);
  } catch (err) { next(err); }
});

// GET /api/kiyaslamalar/:id
router.get('/:id', async (req, res, next) => {
  try {
    const { rows: [k] } = await pool.query(
      `SELECT kiy.*, s.ad AS sektor_adi, p.ad AS pozisyon_adi
       FROM kiyaslamalar kiy
       LEFT JOIN sektorler s ON s.id=kiy.sektor_id
       LEFT JOIN pozisyonlar p ON p.id=kiy.pozisyon_id
       WHERE kiy.id=$1`, [req.params.id]
    );
    if (!k) return res.status(404).json({ hata: 'Kıyaslama bulunamadı' });

    const { rows: puanlar } = await pool.query(
      `SELECT kp.*, kk.ad AS kriter_adi, kk.kategori, kk.agirlik
       FROM kiyaslama_puanlari kp
       JOIN kiyaslama_kriterleri kk ON kk.id=kp.kriter_id
       WHERE kp.kiyaslama_id=$1 ORDER BY kk.sira_no`, [req.params.id]
    );
    res.json({ ...k, puanlar });
  } catch (err) { next(err); }
});

// DELETE /api/kiyaslamalar/:id
router.delete('/:id', optionalAuth, async (req, res, next) => {
  try {
    await pool.query('DELETE FROM kiyaslamalar WHERE id=$1', [req.params.id]);
    res.json({ mesaj: 'Kıyaslama silindi' });
  } catch (err) { next(err); }
});

// POST /api/kiyaslamalar/:id/puan — manuel puan
router.post('/:id/puan', optionalAuth, async (req, res, next) => {
  try {
    const { kriter_id, aday, puan } = req.body;
    await pool.query(
      `INSERT INTO kiyaslama_puanlari (kiyaslama_id, kriter_id, aday, puan, el_ile_mi)
       VALUES ($1,$2,$3,$4,true)
       ON CONFLICT (kiyaslama_id, kriter_id, aday)
       DO UPDATE SET puan=$4, el_ile_mi=true`,
      [req.params.id, kriter_id, aday, puan]
    );
    await hesaplaVeGuncelle(req.params.id);
    res.json({ mesaj: 'Puan güncellendi' });
  } catch (err) { next(err); }
});

// POST /api/kiyaslamalar/:id/ai-puan — AI SSE puanlama
router.post('/:id/ai-puan', optionalAuth, async (req, res, next) => {
  try {
    const { rows: [kiy] } = await pool.query(
      `SELECT kiy.*, s.ad AS sektor_adi, p.ad AS pozisyon_adi
       FROM kiyaslamalar kiy
       LEFT JOIN sektorler s ON s.id=kiy.sektor_id
       LEFT JOIN pozisyonlar p ON p.id=kiy.pozisyon_id
       WHERE kiy.id=$1`, [req.params.id]
    );
    if (!kiy) return res.status(404).json({ hata: 'Kıyaslama bulunamadı' });
    if (!kiy.aday_a_metin && !kiy.aday_b_metin)
      return res.status(400).json({ hata: 'CV metni bulunamadı' });

    const { rows: kriterler } = await pool.query(
      'SELECT * FROM kiyaslama_kriterleri WHERE aktif=true ORDER BY sira_no'
    );

    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'keep-alive');

    const kriterStr = kriterler.map((k, i) =>
      `${i+1}. [ID:${k.id}] ${k.ad} (${k.kategori}, Ağırlık:%${k.agirlik}): ${k.aciklama || ''}`
    ).join('\n');

    const prompt = `Sen kıdemli bir İK uzmanısın ve iki adayın CV'sini aşağıdaki kriterlere göre objektif olarak değerlendirip puanlayacaksın.

HEDEF POZİSYON: ${kiy.pozisyon_adi || kiy.pozisyon_acik || 'Belirtilmemiş'}
SEKTÖR: ${kiy.sektor_adi || 'Genel'}

KRİTERLER (her biri 1-10 puan):
${kriterStr}

─── ADAY A: ${kiy.aday_a_ad} ───
${(kiy.aday_a_metin || 'CV bilgisi girilmedi').slice(0, 5000)}

─── ADAY B: ${kiy.aday_b_ad} ───
${(kiy.aday_b_metin || 'CV bilgisi girilmedi').slice(0, 5000)}

Her kriter için HER İKİ ADAY'ı da puanla. Sadece JSON döndür, başka açıklama ekleme:
{
  "puanlar": [
    {
      "kriter_id": <sayı>,
      "kriter_adi": "<string>",
      "aday_a_puan": <1-10>,
      "aday_a_aciklama": "<kısa gerekçe, 1 cümle>",
      "aday_b_puan": <1-10>,
      "aday_b_aciklama": "<kısa gerekçe, 1 cümle>"
    }
  ],
  "genel_ozet": "<200-300 kelime genel değerlendirme, kazananı belirt>",
  "kazanan": "<A veya B veya esit>"
}

Nesnel ol, kanıta dayandır, Türkçe yaz.`;

    const stream = getClient().messages.stream({
      model: 'claude-opus-4-7',
      max_tokens: 6000,
      thinking: { type: 'adaptive' },
      messages: [{ role: 'user', content: prompt }],
    });

    let tamMetin = '';
    for await (const event of stream) {
      if (event.type === 'content_block_delta' && event.delta.type === 'text_delta') {
        tamMetin += event.delta.text;
        if (tamMetin.length % 300 < 15) {
          res.write(`data: ${JSON.stringify({ tip: 'ilerleme', karakter: tamMetin.length })}\n\n`);
        }
      }
    }

    // Parse ve kaydet
    try {
      const cleaned = tamMetin.replace(/```json\n?|\n?```/g, '').trim();
      const parsed = JSON.parse(cleaned);

      for (const p of parsed.puanlar || []) {
        await pool.query(
          `INSERT INTO kiyaslama_puanlari (kiyaslama_id, kriter_id, aday, puan, ai_aciklama, el_ile_mi)
           VALUES ($1,$2,'A',$3,$4,false)
           ON CONFLICT (kiyaslama_id, kriter_id, aday) DO UPDATE SET puan=$3, ai_aciklama=$4`,
          [req.params.id, p.kriter_id, p.aday_a_puan, p.aday_a_aciklama]
        );
        await pool.query(
          `INSERT INTO kiyaslama_puanlari (kiyaslama_id, kriter_id, aday, puan, ai_aciklama, el_ile_mi)
           VALUES ($1,$2,'B',$3,$4,false)
           ON CONFLICT (kiyaslama_id, kriter_id, aday) DO UPDATE SET puan=$3, ai_aciklama=$4`,
          [req.params.id, p.kriter_id, p.aday_b_puan, p.aday_b_aciklama]
        );
      }

      await pool.query(
        `UPDATE kiyaslamalar SET ai_ozet=$2, kazanan=$3 WHERE id=$1`,
        [req.params.id, parsed.genel_ozet, parsed.kazanan || null]
      );
      await hesaplaVeGuncelle(req.params.id);

      res.write(`data: ${JSON.stringify({ tip: 'bitti', parsed })}\n\n`);
    } catch (e) {
      res.write(`data: ${JSON.stringify({ tip: 'ham', metin: tamMetin })}\n\n`);
    }

    res.write('data: [DONE]\n\n');
    res.end();
  } catch (err) { next(err); }
});

// POST /api/kiyaslamalar/cv-yukle — dosya yükle + metin çıkar
router.post('/cv-yukle', upload.single('cv'), async (req, res, next) => {
  try {
    if (!req.file) return res.status(400).json({ hata: 'Dosya gönderilmedi' });
    const metin = await metinCikar(req.file.buffer, req.file.mimetype);
    res.json({ metin: metin.slice(0, 10000), karakter: metin.length });
  } catch (err) { next(err); }
});

/* ─── YARDIMCI ──────────────────────────────────────────── */
async function hesaplaVeGuncelle(kiyaslamaId) {
  const { rows } = await pool.query(
    `SELECT kp.aday, kp.puan, kk.agirlik
     FROM kiyaslama_puanlari kp
     JOIN kiyaslama_kriterleri kk ON kk.id=kp.kriter_id
     WHERE kp.kiyaslama_id=$1`, [kiyaslamaId]
  );

  let toplamAgirlik = 0, aToplam = 0, bToplam = 0;
  const agirliklar = {};
  for (const r of rows) {
    if (!agirliklar[r.kriter_id]) agirliklar[r.kriter_id] = r.agirlik;
  }

  for (const r of rows) {
    const agirlik = parseFloat(r.agirlik) / 100;
    if (r.aday === 'A') { aToplam += parseFloat(r.puan) * agirlik; }
    else                { bToplam += parseFloat(r.puan) * agirlik; }
  }

  const kazanan = Math.abs(aToplam - bToplam) < 0.1 ? 'esit' : aToplam > bToplam ? 'A' : 'B';
  await pool.query(
    'UPDATE kiyaslamalar SET aday_a_toplam=$2, aday_b_toplam=$3, kazanan=$4 WHERE id=$1',
    [kiyaslamaId, aToplam.toFixed(2), bToplam.toFixed(2), kazanan]
  );
}

module.exports = router;
