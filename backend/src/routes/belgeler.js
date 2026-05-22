const { Router } = require('express');
const multer = require('multer');
const pdfParse = require('pdf-parse');
const mammoth = require('mammoth');
const Anthropic = require('@anthropic-ai/sdk');
const pool = require('../db/pool');

const router = Router();
function getClient() {
  const apiKey = (process.env.ANTHROPIC_API_KEY || '').replace(/^﻿/, '').trim();
  return new Anthropic({ apiKey });
}

// Belgeleri bellekte tut, diske yazma
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 10 * 1024 * 1024 }, // 10 MB
  fileFilter: (req, file, cb) => {
    const allowed = ['application/pdf', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document', 'text/plain'];
    if (allowed.includes(file.mimetype)) return cb(null, true);
    cb(new Error('Sadece PDF, DOCX ve TXT dosyaları kabul edilir'));
  },
});

// Dosyadan ham metin çıkar
async function metinCikar(buffer, mimetype) {
  if (mimetype === 'application/pdf') {
    const result = await pdfParse(buffer);
    return result.text;
  }
  if (mimetype === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document') {
    const result = await mammoth.extractRawText({ buffer });
    return result.value;
  }
  // TXT
  return buffer.toString('utf-8');
}

// POST /api/belgeler/analiz/stream
// Belgeyi yükle, metni çıkar, Claude ile analiz et → SSE stream
router.post('/analiz/stream', upload.single('dosya'), async (req, res, next) => {
  if (!req.file) return res.status(400).json({ hata: 'Dosya gönderilmedi' });

  try {
    const metin = await metinCikar(req.file.buffer, req.file.mimetype);
    if (!metin.trim()) return res.status(400).json({ hata: 'Dosyadan metin çıkarılamadı' });

    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'keep-alive');
    res.setHeader('X-Accel-Buffering', 'no');

    // Ham metni döndür (kaydederken kullanılacak)
    res.write(`data: ${JSON.stringify({ tip: 'metin', veri: metin.slice(0, 5000) })}\n\n`);

    const prompt = `Aşağıdaki belgeyi analiz et ve JSON formatında yanıt ver. Yanıtın sadece JSON olsun, başka açıklama ekleme.

Belge içeriği:
${metin.slice(0, 8000)}

Şu yapıda yanıt ver:
{
  "konu": "Belgenin ana konusu/başlığı (1-2 cümle)",
  "bilgi": ["Hap bilgi 1", "Hap bilgi 2", "Hap bilgi 3", "Hap bilgi 4", "Hap bilgi 5"],
  "makale": "Belgeden türetilen derinlemesine analiz yazısı (400-600 kelime, Türkçe, profesyonel ton)"
}`;

    const stream = getClient().messages.stream({
      model: 'claude-opus-4-7',
      max_tokens: 3000,
      messages: [{ role: 'user', content: prompt }],
    });

    let tamMetin = '';
    for await (const event of stream) {
      if (event.type === 'content_block_delta' && event.delta.type === 'text_delta') {
        tamMetin += event.delta.text;
        res.write(`data: ${JSON.stringify({ tip: 'delta', veri: event.delta.text })}\n\n`);
      }
    }

    // JSON parse et ve ayrıştırılmış alanları gönder
    try {
      const parsed = JSON.parse(tamMetin.replace(/```json\n?|\n?```/g, '').trim());
      res.write(`data: ${JSON.stringify({ tip: 'sonuc', veri: parsed })}\n\n`);
    } catch {
      res.write(`data: ${JSON.stringify({ tip: 'ham', veri: tamMetin })}\n\n`);
    }

    res.write('data: [DONE]\n\n');
    res.end();
  } catch (err) {
    next(err);
  }
});

// POST /api/belgeler
// Analiz sonucunu kaydet
router.post('/', async (req, res, next) => {
  try {
    const { orijinal_ad, mime_type, icerik, ai_makale, ai_konu, ai_bilgi } = req.body;
    const { rows } = await pool.query(
      `INSERT INTO belgeler (orijinal_ad, mime_type, icerik, ai_makale, ai_konu, ai_bilgi)
       VALUES ($1,$2,$3,$4,$5,$6) RETURNING id`,
      [orijinal_ad, mime_type, icerik, ai_makale, ai_konu, JSON.stringify(ai_bilgi)]
    );
    res.status(201).json({ id: rows[0].id, mesaj: 'Belge kaydedildi' });
  } catch (err) { next(err); }
});

// GET /api/belgeler
router.get('/', async (req, res, next) => {
  try {
    const { rows } = await pool.query(
      `SELECT id, orijinal_ad, ai_konu, izin_durumu, benim_icin_sakla, olusturma
       FROM belgeler ORDER BY olusturma DESC`
    );
    res.json(rows);
  } catch (err) { next(err); }
});

// DELETE /api/belgeler/:id
router.delete('/:id', async (req, res, next) => {
  try {
    await pool.query('DELETE FROM belgeler WHERE id=$1', [req.params.id]);
    res.json({ mesaj: 'Belge silindi' });
  } catch (err) { next(err); }
});

// PATCH /api/belgeler/:id/izin
router.patch('/:id/izin', async (req, res, next) => {
  try {
    const { izin } = req.body; // 'izin_verildi' | 'izin_verilmedi'
    await pool.query('UPDATE belgeler SET izin_durumu=$1 WHERE id=$2', [izin, req.params.id]);
    res.json({ mesaj: 'İzin durumu güncellendi' });
  } catch (err) { next(err); }
});

// PATCH /api/belgeler/:id/sakla
router.patch('/:id/sakla', async (req, res, next) => {
  try {
    const { sakla } = req.body; // true | false
    await pool.query('UPDATE belgeler SET benim_icin_sakla=$1 WHERE id=$2', [sakla, req.params.id]);
    res.json({ mesaj: sakla ? 'Hafızaya alındı' : 'Hafızadan çıkarıldı' });
  } catch (err) { next(err); }
});

// POST /api/belgeler/profil/olustur  — Problem & Profil Kartı üret
router.post('/profil/olustur', async (req, res, next) => {
  try {
    const { konu, sektor, sektor_aciklama, pozisyon, departman, yetenekler } = req.body;

    // "Benim İçin Sakla" işaretli belgelerden bağlam al
    const { rows: hafiza } = await pool.query(
      `SELECT ai_konu, ai_bilgi FROM belgeler WHERE benim_icin_sakla=true AND izin_durumu='izin_verildi' LIMIT 5`
    );
    const hafizaBaglam = hafiza.length
      ? `\n\nEk bağlam (hafızadaki belgeler):\n${hafiza.map(b => `- ${b.ai_konu}: ${b.ai_bilgi}`).join('\n')}`
      : '';

    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'keep-alive');
    res.setHeader('X-Accel-Buffering', 'no');

    const keepalive = setInterval(() => {
      try { res.write(': ping\n\n'); } catch (_) {}
    }, 20000);

    const prompt = `Sen bir İK ve değerlendirme uzmanısın. Aşağıdaki profili kullanarak, adayı düşündüren ve konuşturan gerçekçi bir Problem Case (Vaka Sorusu) oluştur.

Profil Parametreleri:
- Konu/Tema: ${konu}
- Sektör: ${sektor}
- Sektör Açıklaması: ${sektor_aciklama || '-'}
- Pozisyon: ${pozisyon}
- Birim/Departman: ${departman}
- Yetenekler: ${Array.isArray(yetenekler) ? yetenekler.join(', ') : yetenekler}
${hafizaBaglam}

Şu yapıda bir Problem & Profil Kartı yaz:

**ADAY PROFİLİ**
Kısa profil tanımı (2-3 cümle, pozisyon ve sektörü entegre et)

**PROBLEM VAKASI**
Gerçekçi, detaylı bir senaryo (3-4 paragraf). Adayın ${yetenekler[0] || 'temel yetkinlikleri'} kullanmasını gerektiren, ${konu} temasına uygun, ${sektor} sektörüne özgü bir kriz/problem durumu anlat.

**BEKLENEN YAKLAŞIM**
Adaydan beklenen düşünce yapısı ve adımlar (madde madde, 4-5 madde)

**DEĞERLENDİRME KRİTERLERİ**
Bu vakayı değerlendirirken bakılacak 3 temel kriter

Türkçe yaz, profesyonel ama akıcı bir dil kullan.`;

    try {
      const stream = getClient().messages.stream({
        model: 'claude-opus-4-7',
        max_tokens: 5000,
        thinking: { type: 'adaptive' },
        messages: [{ role: 'user', content: prompt }],
      });

      for await (const event of stream) {
        if (event.type === 'content_block_delta' && event.delta.type === 'text_delta') {
          res.write(`data: ${JSON.stringify({ text: event.delta.text })}\n\n`);
        }
      }
    } finally {
      clearInterval(keepalive);
    }

    res.write('data: [DONE]\n\n');
    res.end();
  } catch (err) { next(err); }
});

// POST /api/belgeler/karsilastir — Belge ↔ Pozisyon eşleştirme (SSE)
router.post('/karsilastir', async (req, res, next) => {
  try {
    const { belge_id, pozisyon_id, belge_metin } = req.body;
    if (!pozisyon_id) return res.status(400).json({ hata: 'pozisyon_id gerekli' });

    // Pozisyon + yetkinlik bilgisi al
    const { rows: pozRows } = await pool.query(
      `SELECT p.ad AS pozisyon_adi, p.seviye, d.ad AS departman_adi, s.ad AS sektor_adi
       FROM pozisyonlar p
       JOIN departmanlar d ON d.id = p.departman_id
       JOIN sektorler s ON s.id = d.sektor_id
       WHERE p.id = $1`, [pozisyon_id]
    );
    if (!pozRows[0]) return res.status(404).json({ hata: 'Pozisyon bulunamadı' });

    const { rows: yetkRows } = await pool.query(
      `SELECT y.ad, y.aciklama, py.agirlik, py.zorunlu
       FROM pozisyon_yetkinlikleri py
       JOIN yetkinlikler y ON y.id = py.yetkinlik_id
       WHERE py.pozisyon_id = $1 ORDER BY py.agirlik DESC`, [pozisyon_id]
    );

    // Belge metnini al (belge_id varsa DB'den, yoksa request body'den)
    let metin = belge_metin || '';
    if (belge_id && !metin) {
      const { rows: bRows } = await pool.query('SELECT icerik FROM belgeler WHERE id=$1', [belge_id]);
      metin = bRows[0]?.icerik || '';
    }
    if (!metin) return res.status(400).json({ hata: 'Karşılaştırılacak belge metni bulunamadı' });

    const poz = pozRows[0];
    const yetkStr = yetkRows.map((y, i) =>
      `${i+1}. ${y.ad} (Ağırlık: ${y.agirlik}/10${y.zorunlu ? ', ZORUNLU' : ''}): ${y.aciklama}`
    ).join('\n');

    const prompt = `Sen bir İK uzmanısın. Aşağıdaki pozisyon ve yetkinlik profilini verilen belge (CV, iş tanımı veya profil metni) ile karşılaştır.

POZİSYON: ${poz.pozisyon_adi} | Seviye: ${poz.seviye} | Departman: ${poz.departman_adi} | Sektör: ${poz.sektor_adi}

GEREKLİ YETKİNLİKLER:
${yetkStr}

BELGE İÇERİĞİ (ilk 6000 karakter):
${metin.slice(0, 6000)}

Şu yapıda bir karşılaştırma raporu yaz:

**GENEL UYUM SKORU: XX/100**
Kısa gerekçe (1 cümle)

**GÜÇLÜ EŞLEŞMELER**
Belgede açıkça desteklenen yetkinlikler (madde madde, kanıtlarla)

**EKSİK / ZEK NOKTALAR**
Belgede yeterince vurgulanmayan veya eksik yetkinlikler

**KRİTİK BULGULAR**
En önemli 2-3 tespit (işe alım kararını etkileyecek faktörler)

**ÖNERİLER**
Aday için gelişim önerileri veya mülakata hazırlık ipuçları

Türkçe yaz, nesnel ve kanıta dayalı ol. Her güçlü eşleşme için belgeden doğrudan kanıt göster.`;

    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'keep-alive');
    res.setHeader('X-Accel-Buffering', 'no');

    const keepalive = setInterval(() => {
      try { res.write(': ping\n\n'); } catch (_) {}
    }, 20000);

    let tamRapor = '';
    try {
      const stream = getClient().messages.stream({
        model: 'claude-opus-4-7',
        max_tokens: 5000,
        thinking: { type: 'adaptive' },
        messages: [{ role: 'user', content: prompt }],
      });

      for await (const event of stream) {
        if (event.type === 'content_block_delta' && event.delta.type === 'text_delta') {
          tamRapor += event.delta.text;
          res.write(`data: ${JSON.stringify({ text: event.delta.text })}\n\n`);
        }
      }
    } finally {
      clearInterval(keepalive);
    }

    // Skoru parse et ve kaydet
    const skorMatch = tamRapor.match(/UYUM SKORU:\s*(\d+)/i);
    const skor = skorMatch ? parseInt(skorMatch[1]) : null;

    if (belge_id && skor !== null) {
      await pool.query(
        `INSERT INTO karsilastirmalar (belge_id, pozisyon_id, eslesme_skoru, ai_rapor)
         VALUES ($1,$2,$3,$4)`,
        [belge_id, pozisyon_id, skor, tamRapor]
      );
    }

    res.write(`data: ${JSON.stringify({ tip: 'skor', skor })}\n\n`);
    res.write('data: [DONE]\n\n');
    res.end();
  } catch (err) { next(err); }
});

module.exports = router;
