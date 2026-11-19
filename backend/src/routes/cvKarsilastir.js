/**
 * Çoklu CV Karşılaştırma (2–10 aday)
 *
 * GET  /api/cv-karsilastir/kriterler  — varsayılan kriterler ve ağırlıklar
 * POST /api/cv-karsilastir/stream     — CV'leri yükle → profil çıkar → karşılaştır (SSE)
 *      multipart: cvler[] (pdf/docx/txt), pozisyon, nitelikler, kriterler (JSON: [{kod, agirlik}])
 *
 * SSE olayları: durum · profil · profil_hata · ilerleme · sonuc · hata → [DONE]
 */
const { Router } = require('express');
const multer     = require('multer');
const pdfParse   = require('pdf-parse');
const mammoth    = require('mammoth');
const Anthropic  = require('@anthropic-ai/sdk');
const { requireAuth } = require('../middleware/auth');
const { VARSAYILAN_KRITERLER, profilCikarmaPrompt, karsilastirmaPrompt } = require('../prompts/cvKarsilastirma');

const router = Router();
const MAKS_CV = 10;
const MAKS_KARAKTER = 15000;
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 10 * 1024 * 1024, files: MAKS_CV },
});

function getClient() {
  const apiKey = (process.env.ANTHROPIC_API_KEY || '').replace(/^﻿/, '').trim();
  return new Anthropic({ apiKey });
}

async function metinCikar(file) {
  const ad = file.originalname.toLowerCase();
  if (file.mimetype === 'application/pdf' || ad.endsWith('.pdf'))
    return (await pdfParse(file.buffer)).text;
  if (ad.endsWith('.docx'))
    return (await mammoth.extractRawText({ buffer: file.buffer })).value;
  return file.buffer.toString('utf-8');
}

function jsonAyikla(metin) {
  const temiz = metin.replace(/```json\s*|```/g, '');
  const bas = temiz.indexOf('{');
  const son = temiz.lastIndexOf('}');
  if (bas < 0 || son <= bas) throw new Error('Yanıtta JSON bulunamadı');
  return JSON.parse(temiz.slice(bas, son + 1));
}

// "YYYY-MM" | "YYYY" | "devam" → ay indeksi
function ayIndeksi(t, bitisMi) {
  if (!t) return null;
  if (/devam|halen|present|günümüz/i.test(t)) {
    const d = new Date();
    return d.getFullYear() * 12 + d.getMonth();
  }
  const m = String(t).match(/(\d{4})(?:-(\d{1,2}))?/);
  if (!m) return null;
  const ay = m[2] ? parseInt(m[2], 10) - 1 : (bitisMi ? 11 : 0);
  return parseInt(m[1], 10) * 12 + ay;
}

// Çakışan dönemleri birleştirerek toplam deneyim yılı (staj hariç)
function toplamDeneyimYil(deneyimler = []) {
  const araliklar = deneyimler
    .filter(d => !d.staj_mi)
    .map(d => [ayIndeksi(d.baslangic, false), ayIndeksi(d.bitis, true)])
    .filter(([b, s]) => b != null && s != null && s >= b)
    .sort((x, y) => x[0] - y[0]);
  if (!araliklar.length) return null;
  let toplam = 0, [cb, cs] = araliklar[0];
  for (const [b, s] of araliklar.slice(1)) {
    if (b <= cs + 1) cs = Math.max(cs, s);
    else { toplam += cs - cb + 1; [cb, cs] = [b, s]; }
  }
  toplam += cs - cb + 1;
  return Math.round((toplam / 12) * 10) / 10;
}

// Sınırlı eşzamanlılıkla çalıştır
async function sinirliParalel(ogeler, limit, fn) {
  const sonuc = new Array(ogeler.length);
  let i = 0;
  const isci = async () => { while (i < ogeler.length) { const j = i++; sonuc[j] = await fn(ogeler[j], j); } };
  await Promise.all(Array.from({ length: Math.min(limit, ogeler.length) }, isci));
  return sonuc;
}

// GET /api/cv-karsilastir/kriterler
router.get('/kriterler', (req, res) => res.json(VARSAYILAN_KRITERLER));

// POST /api/cv-karsilastir/stream
router.post('/stream', requireAuth, upload.array('cvler', MAKS_CV), async (req, res) => {
  const dosyalar = req.files || [];
  if (dosyalar.length < 2)
    return res.status(400).json({ hata: 'Karşılaştırma için en az 2 CV yükleyin' });

  // Kullanıcı ağırlıkları varsayılanların üzerine yazılır
  let kriterler = VARSAYILAN_KRITERLER.map(k => ({ ...k }));
  try {
    const gelen = JSON.parse(req.body.kriterler || '[]');
    for (const g of gelen) {
      const k = kriterler.find(x => x.kod === g.kod);
      if (k) k.agirlik = Math.max(0, Math.min(100, Number(g.agirlik) || 0));
    }
  } catch (_) { /* geçersiz JSON → varsayılan ağırlıklar */ }
  kriterler = kriterler.filter(k => k.agirlik > 0);
  if (!kriterler.length) return res.status(400).json({ hata: 'En az bir kriterin ağırlığı 0\'dan büyük olmalı' });

  const pozisyon   = (req.body.pozisyon || '').slice(0, 300);
  const nitelikler = (req.body.nitelikler || '').slice(0, 4000);

  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('Connection', 'keep-alive');
  res.flushHeaders?.();

  let kapandi = false;
  res.on('close', () => { kapandi = true; });
  const gonder = (veri) => { if (!kapandi) res.write(`data: ${JSON.stringify(veri)}\n\n`); };
  const keepalive = setInterval(() => { try { res.write(': ping\n\n'); } catch (_) {} }, 20000);

  try {
    const client = getClient();

    /* 1) Metin çıkarma + profil çıkarma (en fazla 3 paralel) */
    gonder({ tip: 'durum', asama: 'profil', mesaj: `${dosyalar.length} CV okunuyor ve ayrıştırılıyor…` });

    const profiller = await sinirliParalel(dosyalar, 3, async (file, idx) => {
      // multer dosya adını latin1 olarak çözer — Türkçe karakterleri düzelt
      const dosyaAdi = Buffer.from(file.originalname, 'latin1').toString('utf8');
      try {
        const metin = (await metinCikar(file)).trim();
        if (metin.length < 50) throw new Error('CV metni okunamadı (taranmış/görsel PDF olabilir)');
        if (kapandi) return null;

        const yanit = await client.messages.create({
          model: 'claude-opus-4-7',
          max_tokens: 8000,
          messages: [{ role: 'user', content: profilCikarmaPrompt(metin.slice(0, MAKS_KARAKTER), dosyaAdi) }],
        });
        const metinYanit = yanit.content.filter(b => b.type === 'text').map(b => b.text).join('');
        const profil = jsonAyikla(metinYanit);

        const hesaplanan = toplamDeneyimYil(profil.deneyimler);
        if (hesaplanan != null) profil.toplam_deneyim_yil = hesaplanan;
        profil._dosya = dosyaAdi;

        gonder({ tip: 'profil', index: idx, profil });
        return profil;
      } catch (e) {
        gonder({ tip: 'profil_hata', index: idx, dosya: dosyaAdi, hata: e.message });
        return null;
      }
    });

    const gecerli = profiller.filter(Boolean);
    if (kapandi) return;
    if (gecerli.length < 2) {
      gonder({ tip: 'hata', hata: 'Karşılaştırma için en az 2 CV başarıyla okunmalı' });
      return;
    }

    /* 2) Karşılaştırma ve en iyi aday seçimi */
    gonder({ tip: 'durum', asama: 'karsilastirma', mesaj: `${gecerli.length} aday karşılaştırılıyor…` });

    const stream = client.messages.stream({
      model: 'claude-opus-4-7',
      max_tokens: 32000,
      thinking: { type: 'adaptive' },
      messages: [{ role: 'user', content: karsilastirmaPrompt({ profiller: gecerli, pozisyon, nitelikler, kriterler }) }],
    });

    let tamMetin = '', sonBildirim = 0;
    for await (const event of stream) {
      if (kapandi) { stream.abort(); return; }
      if (event.type === 'content_block_delta' && event.delta.type === 'text_delta') {
        tamMetin += event.delta.text;
        if (tamMetin.length - sonBildirim > 400) {
          sonBildirim = tamMetin.length;
          gonder({ tip: 'ilerleme', karakter: tamMetin.length });
        }
      }
    }

    const analiz = jsonAyikla(tamMetin);

    /* 3) Ağırlıklı toplam puan (0-100) sunucuda hesaplanır — AI'ın aritmetiğine güvenilmez */
    const toplamAgirlik = kriterler.reduce((t, k) => t + k.agirlik, 0);
    const siralama = gecerli.map((p, i) => {
      const a = (analiz.adaylar || []).find(x => Number(x.aday_no) === i + 1) || {};
      const puanlar = a.puanlar || {};
      const toplam = kriterler.reduce((t, k) => t + (Number(puanlar[k.kod]?.puan) || 0) * k.agirlik, 0);
      return {
        aday_no: i + 1,
        ad: p.ad_soyad || p._dosya,
        toplam_puan: Math.round((toplam / toplamAgirlik) * 10 * 10) / 10,
      };
    }).sort((x, y) => y.toplam_puan - x.toplam_puan)
      .map((s, i) => ({ ...s, sira: i + 1 }));

    gonder({ tip: 'sonuc', kriterler, profiller: gecerli, analiz, siralama });
  } catch (e) {
    gonder({ tip: 'hata', hata: e.message || 'Karşılaştırma başarısız' });
  } finally {
    clearInterval(keepalive);
    if (!kapandi) { res.write('data: [DONE]\n\n'); res.end(); }
  }
});

module.exports = router;
