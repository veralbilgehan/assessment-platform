/**
 * Test Hazırlama & Değerlendirme Modülü
 *
 * POST   /api/testler/proje                   — proje oluştur
 * GET    /api/testler/proje                   — proje listesi
 * GET    /api/testler/proje/:id               — proje detayı (sorularla)
 * DELETE /api/testler/proje/:id               — sil
 * POST   /api/testler/proje/:id/uret          — soru üretimi (SSE)
 * GET    /api/testler/proje/:id/indir          — soruları JSON indir
 *
 * POST   /api/testler/oturum                  — oturum başlat
 * GET    /api/testler/oturum/:id              — oturum + sorular
 * POST   /api/testler/oturum/:id/cevap        — cevap gönder
 * POST   /api/testler/oturum/:id/bitir        — bitir + skor
 * GET    /api/testler/oturum/:id/rapor        — aday raporu
 * GET    /api/testler/proje/:id/raporlar      — tüm katılımcılar
 */
const { Router } = require('express');
const Anthropic   = require('@anthropic-ai/sdk');
const pool        = require('../db/pool');
const { optionalAuth } = require('../middleware/auth');
const { raporGonder, davetGonder, hesaplaGruplar } = require('../services/emailService');

const router = Router();
function getClient() { return new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY }); }

/* ═══════════════════════════════════════════════════════════
   YARDIMCI: Soru üretim motoru
═══════════════════════════════════════════════════════════ */
async function soruUret({ projeId, belgeMetin, pozisyon, sektor, yetkinlikler, soru_sayisi, zorluk, kaynak_modu, dokuman_oran, havuz_oran, ai_oran }, res) {

  const zorlukMap = { kolay: 1, orta: 2, zor: 3, karisik: null };
  const zorlukNum = zorlukMap[zorluk];
  let sorular = [];

  /* ── KATMAN 1: Soru Havuzu ─────────────────────────────── */
  const havuzHedef = kaynak_modu === 'hibrit'
    ? Math.round(soru_sayisi * havuz_oran / 100)
    : kaynak_modu === 'havuz' ? soru_sayisi : 0;

  if (havuzHedef > 0 && yetkinlikler?.length) {
    res?.write(`data: ${JSON.stringify({ tip: 'durum', mesaj: `Soru havuzundan ${havuzHedef} soru alınıyor...` })}\n\n`);
    const { rows: havuzSorular } = await pool.query(
      `SELECT sh.id, sh.soru_metni, sh.secenekler, sh.dogru_cevap, sh.zorluk,
              sh.puan_degeri, 'havuz' AS kaynak
       FROM soru_havuzu sh
       JOIN yetkinlikler y ON y.id = sh.yetkinlik_id
       WHERE sh.yetkinlik_id = ANY($1)
         AND sh.aktif = true
         ${zorlukNum ? 'AND sh.zorluk = $2' : ''}
       ORDER BY RANDOM()
       LIMIT ${havuzHedef}`,
      zorlukNum ? [yetkinlikler, zorlukNum] : [yetkinlikler]
    );

    sorular.push(...havuzSorular.map((s, i) => ({
      sira_no:     sorular.length + i + 1,
      soru_metni:  s.soru_metni,
      soru_tipi:   'cok_secmeli',
      secenekler:  s.secenekler,
      dogru_cevap: s.dogru_cevap,
      aciklama:    null,
      kaynak:      'havuz',
      zorluk:      ['kolay','orta','zor'][s.zorluk - 1] || 'orta',
      puan_degeri: s.puan_degeri || 1,
    })));
  }

  /* ── KATMAN 2 & 3: Döküman RAG + AI ───────────────────── */
  const aiKaynaklar = [];
  const dokHedef = kaynak_modu === 'hibrit'
    ? Math.round(soru_sayisi * dokuman_oran / 100)
    : kaynak_modu === 'dokuman' ? soru_sayisi : 0;
  const aiHedef  = kaynak_modu === 'hibrit'
    ? Math.max(0, soru_sayisi - sorular.length - dokHedef)
    : kaynak_modu === 'ai' ? soru_sayisi : 0;

  const toplamAIHedef = (belgeMetin ? dokHedef : 0) + aiHedef + Math.max(0, soru_sayisi - sorular.length - dokHedef - aiHedef);

  if (toplamAIHedef > 0) {
    res?.write(`data: ${JSON.stringify({ tip: 'durum', mesaj: `AI ${toplamAIHedef} soru üretiyor...` })}\n\n`);

    const yetStr = yetkinlikler?.length
      ? `\nHedef yetkinlikler: ${yetkinlikler.join(', ')}`
      : '';
    const dokStr = belgeMetin
      ? `\n\nReferans döküman (ilk 6000 karakter):\n${belgeMetin.slice(0, 6000)}`
      : '';

    const zorlukTurk = { kolay: 'kolay (temel kavramlar)', orta: 'orta (uygulama)', zor: 'zor (analiz/sentez)', karisik: 'karma zorluk' }[zorluk] || 'orta';

    const prompt = `Sen bir eğitim uzmanı ve soru bankası hazırlayıcısısın. Aşağıdaki kriterlere göre TAM OLARAK ${toplamAIHedef} adet test sorusu üret.

BAĞLAM:
- Sektör: ${sektor || 'Genel'}
- Pozisyon: ${pozisyon || 'Genel'}${yetStr}
- Zorluk Seviyesi: ${zorlukTurk}
- Döküman Kaynaklı: ${belgeMetin ? `${dokHedef} soru (döküman içeriğinden)` : 'Yok'}
- AI Üretimi: ${aiHedef + (belgeMetin ? 0 : dokHedef)} soru (pozisyon/yetkinlik bilgisine göre)${dokStr}

ÇIKTI FORMAT (sadece JSON, başka hiçbir şey yazma):
{
  "sorular": [
    {
      "soru_no": 1,
      "soru_metni": "Soru metni burada",
      "soru_tipi": "cok_secmeli",
      "secenekler": [
        {"harf": "A", "metin": "Seçenek A"},
        {"harf": "B", "metin": "Seçenek B"},
        {"harf": "C", "metin": "Seçenek C"},
        {"harf": "D", "metin": "Seçenek D"}
      ],
      "dogru_cevap": "A",
      "aciklama": "Bu cevap doğru çünkü...",
      "kaynak": "dokuman",
      "zorluk": "orta",
      "puan_degeri": 1
    }
  ]
}

KURALLAR:
- "soru_tipi" değerleri: "cok_secmeli" (4 seçenek), "dogru_yanlis" (Doğru/Yanlış), "acik_uclu" (seçenek yok)
- "kaynak": döküman içeriğinden üretilen için "dokuman", yetkinlik/pozisyon bilgisinden için "ai"
- ${belgeMetin ? `İlk ${dokHedef} soruyu döküman içeriğine dayandır` : 'Tüm soruları yetkinlik/pozisyon profiline göre üret'}
- Soruları gerçekçi, iş dünyasına özgü ve ölçülebilir yetkinliklere dayandır
- Türkçe yaz`;

    try {
      const stream = getClient().messages.stream({
        model: 'claude-opus-4-7',
        max_tokens: 6000,
        output_config: { effort: 'low' }, // Daha hızlı çıktı — soru üretimi derin düşünme gerektirmez
        messages: [{ role: 'user', content: prompt }],
      });

      let tamMetin = '';
      let sonIlerleme = 0;
      for await (const event of stream) {
        if (event.type === 'content_block_delta' && event.delta.type === 'text_delta') {
          tamMetin += event.delta.text;
          // İlerleme bildirimi (her 150 karakterde — daha sık ping)
          if (tamMetin.length - sonIlerleme >= 150) {
            sonIlerleme = tamMetin.length;
            res?.write(`data: ${JSON.stringify({ tip: 'ilerleme', karakter: tamMetin.length })}\n\n`);
          }
        }
      }

      // JSON parse
      const cleaned = tamMetin.replace(/```json\n?|\n?```/g, '').trim();
      const parsed = JSON.parse(cleaned);

      if (parsed.sorular?.length) {
        sorular.push(...parsed.sorular.map((s, i) => ({
          sira_no:     sorular.length + i + 1,
          soru_metni:  s.soru_metni,
          soru_tipi:   s.soru_tipi || 'cok_secmeli',
          secenekler:  s.secenekler,
          dogru_cevap: s.dogru_cevap,
          aciklama:    s.aciklama,
          kaynak:      s.kaynak || 'ai',
          zorluk:      s.zorluk || zorluk,
          puan_degeri: s.puan_degeri || 1,
        })));
      }
    } catch (e) {
      res?.write(`data: ${JSON.stringify({ tip: 'uyari', mesaj: 'AI soru üretiminde hata: ' + e.message })}\n\n`);
    }
  }

  // Soru sayısını kontrol et
  sorular = sorular.slice(0, soru_sayisi);

  // DB'ye kaydet
  for (let i = 0; i < sorular.length; i++) {
    const s = sorular[i];
    await pool.query(
      `INSERT INTO test_sorulari (proje_id, sira_no, soru_metni, soru_tipi, secenekler, dogru_cevap, aciklama, kaynak, zorluk, puan_degeri)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10)`,
      [projeId, i + 1, s.soru_metni, s.soru_tipi, JSON.stringify(s.secenekler), s.dogru_cevap, s.aciklama, s.kaynak, s.zorluk, s.puan_degeri]
    );
  }

  await pool.query(`UPDATE test_projeleri SET durum='hazir', guncelleme=NOW() WHERE id=$1`, [projeId]);
  return sorular;
}

/* ═══════════════════════════════════════════════════════════
   PROJE CRUD
═══════════════════════════════════════════════════════════ */

// POST /api/testler/proje
router.post('/proje', optionalAuth, async (req, res, next) => {
  try {
    const {
      ad, belge_id, belge_metin,
      sektor_id, departman_id, pozisyon_id, yetkinlik_ids,
      soru_sayisi = 20, zorluk = 'orta', sure_dakika = 45,
      kaynak_modu = 'hibrit', dokuman_oran = 40, havuz_oran = 30, ai_oran = 30,
    } = req.body;
    if (!ad) return res.status(400).json({ hata: 'Proje adı gerekli' });

    const { rows } = await pool.query(
      `INSERT INTO test_projeleri
         (ad, belge_id, belge_metin, sektor_id, departman_id, pozisyon_id, yetkinlik_ids,
          soru_sayisi, zorluk, sure_dakika, kaynak_modu, dokuman_oran, havuz_oran, ai_oran, olusturan_id)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15) RETURNING id`,
      [ad, belge_id||null, belge_metin||null, sektor_id||null, departman_id||null,
       pozisyon_id||null, yetkinlik_ids||null, soru_sayisi, zorluk, sure_dakika,
       kaynak_modu, dokuman_oran, havuz_oran, ai_oran, req.user?.id||null]
    );
    res.status(201).json({ id: rows[0].id, mesaj: 'Proje oluşturuldu' });
  } catch (err) { next(err); }
});

// GET /api/testler/proje
router.get('/proje', optionalAuth, async (req, res, next) => {
  try {
    const { rows } = await pool.query(
      `SELECT tp.*, s.ad AS sektor_adi, p.ad AS pozisyon_adi,
              (SELECT COUNT(*) FROM test_sorulari WHERE proje_id=tp.id) AS soru_uretilen,
              (SELECT COUNT(*) FROM test_oturumlari WHERE proje_id=tp.id) AS katilimci_sayisi
       FROM test_projeleri tp
       LEFT JOIN sektorler s ON s.id = tp.sektor_id
       LEFT JOIN pozisyonlar p ON p.id = tp.pozisyon_id
       ORDER BY tp.olusturma DESC`
    );
    res.json(rows);
  } catch (err) { next(err); }
});

// GET /api/testler/proje/:id
router.get('/proje/:id', optionalAuth, async (req, res, next) => {
  try {
    const { rows: [proje] } = await pool.query(
      `SELECT tp.*, s.ad AS sektor_adi, d.ad AS departman_adi, p.ad AS pozisyon_adi
       FROM test_projeleri tp
       LEFT JOIN sektorler s ON s.id = tp.sektor_id
       LEFT JOIN departmanlar d ON d.id = tp.departman_id
       LEFT JOIN pozisyonlar p ON p.id = tp.pozisyon_id
       WHERE tp.id=$1`, [req.params.id]
    );
    if (!proje) return res.status(404).json({ hata: 'Proje bulunamadı' });

    const { rows: sorular } = await pool.query(
      `SELECT * FROM test_sorulari WHERE proje_id=$1 ORDER BY sira_no`, [req.params.id]
    );
    res.json({ ...proje, sorular });
  } catch (err) { next(err); }
});

// DELETE /api/testler/proje/:id
router.delete('/proje/:id', optionalAuth, async (req, res, next) => {
  try {
    await pool.query('DELETE FROM test_projeleri WHERE id=$1', [req.params.id]);
    res.json({ mesaj: 'Proje silindi' });
  } catch (err) { next(err); }
});

// POST /api/testler/proje/:id/uret — SSE soru üretimi
router.post('/proje/:id/uret', optionalAuth, async (req, res, next) => {
  try {
    const { rows: [proje] } = await pool.query(
      `SELECT tp.*, s.ad AS sektor_adi, p.ad AS pozisyon_adi,
              array_agg(y.ad) FILTER (WHERE y.ad IS NOT NULL) AS yetkinlik_adlari
       FROM test_projeleri tp
       LEFT JOIN sektorler s ON s.id = tp.sektor_id
       LEFT JOIN pozisyonlar p ON p.id = tp.pozisyon_id
       LEFT JOIN LATERAL unnest(tp.yetkinlik_ids) AS yid ON true
       LEFT JOIN yetkinlikler y ON y.id = yid
       WHERE tp.id=$1 GROUP BY tp.id, s.ad, p.ad`, [req.params.id]
    );
    if (!proje) return res.status(404).json({ hata: 'Proje bulunamadı' });

    // Mevcut soruları temizle
    await pool.query('DELETE FROM test_sorulari WHERE proje_id=$1', [req.params.id]);
    await pool.query(`UPDATE test_projeleri SET durum='uretiliyor' WHERE id=$1`, [req.params.id]);

    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'keep-alive');
    res.setHeader('X-Accel-Buffering', 'no'); // NGINX proxy buffer'ı devre dışı
    res.write(`data: ${JSON.stringify({ tip: 'basladi', projeId: proje.id })}\n\n`);

    // Keepalive: her 20 saniyede bir SSE comment yaz — Cloud Run/proxy timeout'unu önler
    const keepalive = setInterval(() => {
      try { res.write(': ping\n\n'); } catch (_) {}
    }, 20000);

    let sorular = [];
    try {
      sorular = await soruUret({
        projeId: proje.id,
        belgeMetin:  proje.belge_metin,
        pozisyon:    proje.pozisyon_adi,
        sektor:      proje.sektor_adi,
        yetkinlikler: proje.yetkinlik_adlari || [],
        soru_sayisi: proje.soru_sayisi,
        zorluk:      proje.zorluk,
        kaynak_modu: proje.kaynak_modu,
        dokuman_oran:proje.dokuman_oran,
        havuz_oran:  proje.havuz_oran,
        ai_oran:     proje.ai_oran,
      }, res);
    } finally {
      clearInterval(keepalive);
    }

    // DB'de tamamlandı olarak işaretle (soruUret içinde zaten yapılıyor ama garantilemek için)
    if (sorular.length === 0) {
      await pool.query(`UPDATE test_projeleri SET durum='taslak' WHERE id=$1 AND durum='uretiliyor'`, [proje.id]);
    }

    res.write(`data: ${JSON.stringify({ tip: 'bitti', sayi: sorular.length, sorular })}\n\n`);
    res.write('data: [DONE]\n\n');
    res.end();
  } catch (err) {
    // Proje stuck durumunu kurtarmaya çalış
    try { await pool.query(`UPDATE test_projeleri SET durum='taslak' WHERE id=$1 AND durum='uretiliyor'`, [req.params.id]); } catch (_) {}
    next(err);
  }
});

// GET /api/testler/proje/:id/indir
router.get('/proje/:id/indir', async (req, res, next) => {
  try {
    const { rows: [proje] } = await pool.query('SELECT * FROM test_projeleri WHERE id=$1', [req.params.id]);
    const { rows: sorular } = await pool.query('SELECT * FROM test_sorulari WHERE proje_id=$1 ORDER BY sira_no', [req.params.id]);
    res.setHeader('Content-Disposition', `attachment; filename="test-${req.params.id}.json"`);
    res.json({ proje, sorular });
  } catch (err) { next(err); }
});

/* ═══════════════════════════════════════════════════════════
   TEST OTURUMU (Aday Çözüm Akışı)
═══════════════════════════════════════════════════════════ */

// POST /api/testler/oturum — aday kayıt + oturum başlat
router.post('/oturum', async (req, res, next) => {
  try {
    const { proje_id, aday_ad, aday_soyad, aday_eposta, aday_pozisyon, aday_sirket, imza_onay } = req.body;
    if (!proje_id || !aday_ad || !aday_soyad)
      return res.status(400).json({ hata: 'proje_id, aday_ad ve aday_soyad zorunlu' });
    if (!imza_onay)
      return res.status(400).json({ hata: 'Kimlik onayı ve imza zorunlu' });

    const { rows: [proje] } = await pool.query(
      'SELECT * FROM test_projeleri WHERE id=$1 AND durum=$2', [proje_id, 'hazir']
    );
    if (!proje) return res.status(404).json({ hata: 'Test bulunamadı veya henüz hazır değil' });

    const { rows: [oturum] } = await pool.query(
      `INSERT INTO test_oturumlari (proje_id, aday_ad, aday_soyad, aday_eposta, aday_pozisyon, aday_sirket, imza_onay, baslangic, durum)
       VALUES ($1,$2,$3,$4,$5,$6,$7,NOW(),'devam_ediyor') RETURNING id`,
      [proje_id, aday_ad, aday_soyad, aday_eposta||null, aday_pozisyon||null, aday_sirket||null, true]
    );

    // Soruları döndür (cevaplar olmadan)
    const { rows: sorular } = await pool.query(
      `SELECT id, sira_no, soru_metni, soru_tipi, secenekler, puan_degeri
       FROM test_sorulari WHERE proje_id=$1 ORDER BY sira_no`, [proje_id]
    );

    res.status(201).json({
      oturum_id:  oturum.id,
      sure_dakika: proje.sure_dakika,
      sorular,
    });
  } catch (err) { next(err); }
});

// GET /api/testler/oturum — tüm oturumları listele
router.get('/oturum', optionalAuth, async (req, res, next) => {
  try {
    const { rows } = await pool.query(
      `SELECT o.id, o.aday_ad, o.aday_soyad, o.aday_pozisyon, o.aday_sirket,
              o.basari_yuzdesi, o.durum, o.baslangic, o.bitis,
              o.dogru_sayisi, o.yanlis_sayisi, o.bos_sayisi, o.toplam_puan,
              tp.ad AS proje_adi, tp.soru_sayisi, tp.zorluk,
              s.ad AS sektor_adi, p.ad AS pozisyon_adi
       FROM test_oturumlari o
       JOIN test_projeleri tp ON tp.id = o.proje_id
       LEFT JOIN sektorler s ON s.id = tp.sektor_id
       LEFT JOIN pozisyonlar p ON p.id = tp.pozisyon_id
       ORDER BY o.baslangic DESC`
    );
    res.json(rows);
  } catch (err) { next(err); }
});

// POST /api/testler/oturum/:id/ai-analiz — AI destekli performans analizi (SSE)
router.post('/oturum/:id/ai-analiz', async (req, res, next) => {
  try {
    const { gruplar, basari_yuzdesi, aday_ad, aday_soyad, pozisyon } = req.body;

    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'keep-alive');

    const grupStr = (gruplar || []).map((g, i) =>
      `Araç ${i + 1}: ${g.oran}% başarı (${g.dogru}/${g.toplam} doğru)`
    ).join('\n');

    const prompt = `Sen kıdemli bir İK ve yetkinlik değerlendirme uzmanısın.

Aday: ${aday_ad || 'Aday'} ${aday_soyad || ''}
Pozisyon: ${pozisyon || 'Belirtilmemiş'}
Genel Başarı: %${basari_yuzdesi}

Araç bazlı performans analizi:
${grupStr}

Aşağıdaki yapıya göre kısa, açık ve profesyonel Türkçe bir performans değerlendirmesi yaz:

1. GENEL DEĞERLENDİRME (2-3 cümle): Adayın güçlü ve gelişim gerektiren alanlarını özetle.
2. ARAÇ ANALİZİ: Her araç için 1 cümlelik spesifik yorum yaz (Araç 1'den 5'e).
3. AKSİYON PLANI (3 madde): Adayın performansını artırmak için somut, uygulanabilir öneriler.

Profesyonel, yapıcı ve motive edici bir dil kullan. Toplam 250-350 kelime.`;

    const stream = getClient().messages.stream({
      model: 'claude-opus-4-7',
      max_tokens: 1500,
      thinking: { type: 'adaptive' },
      messages: [{ role: 'user', content: prompt }],
    });

    let tamMetin = '';
    for await (const event of stream) {
      if (event.type === 'content_block_delta' && event.delta.type === 'text_delta') {
        tamMetin += event.delta.text;
        res.write(`data: ${JSON.stringify({ tip: 'delta', metin: event.delta.text })}\n\n`);
      }
    }

    res.write(`data: ${JSON.stringify({ tip: 'bitti', tamMetin })}\n\n`);
    res.write('data: [DONE]\n\n');
    res.end();
  } catch (err) { next(err); }
});

// GET /api/testler/oturum/:id
router.get('/oturum/:id', async (req, res, next) => {
  try {
    const { rows: [oturum] } = await pool.query(
      `SELECT o.*, tp.sure_dakika, tp.soru_sayisi, tp.ad AS proje_adi
       FROM test_oturumlari o JOIN test_projeleri tp ON tp.id=o.proje_id
       WHERE o.id=$1`, [req.params.id]
    );
    if (!oturum) return res.status(404).json({ hata: 'Oturum bulunamadı' });

    const { rows: sorular } = await pool.query(
      `SELECT ts.id, ts.sira_no, ts.soru_metni, ts.soru_tipi, ts.secenekler, ts.puan_degeri,
              tc.verilen_cevap, tc.dogru_mu
       FROM test_sorulari ts
       LEFT JOIN test_cevaplari tc ON tc.soru_id=ts.id AND tc.oturum_id=$1
       WHERE ts.proje_id = (SELECT proje_id FROM test_oturumlari WHERE id=$1)
       ORDER BY ts.sira_no`, [req.params.id]
    );
    res.json({ ...oturum, sorular });
  } catch (err) { next(err); }
});

// POST /api/testler/oturum/:id/cevap — tek cevap kaydet
router.post('/oturum/:id/cevap', async (req, res, next) => {
  try {
    const { soru_id, verilen_cevap, sure_saniye } = req.body;
    const { rows: [oturum] } = await pool.query(
      'SELECT * FROM test_oturumlari WHERE id=$1 AND durum=$2', [req.params.id, 'devam_ediyor']
    );
    if (!oturum) return res.status(404).json({ hata: 'Aktif oturum bulunamadı' });

    const { rows: [soru] } = await pool.query(
      'SELECT dogru_cevap FROM test_sorulari WHERE id=$1', [soru_id]
    );
    const dogruMu = soru?.dogru_cevap
      ? soru.dogru_cevap.trim().toUpperCase() === (verilen_cevap || '').trim().toUpperCase()
      : null;

    await pool.query('DELETE FROM test_cevaplari WHERE oturum_id=$1 AND soru_id=$2', [req.params.id, soru_id]);
    await pool.query(
      `INSERT INTO test_cevaplari (oturum_id, soru_id, verilen_cevap, dogru_mu, sure_saniye)
       VALUES ($1,$2,$3,$4,$5)`,
      [req.params.id, soru_id, verilen_cevap, dogruMu, sure_saniye||null]
    );
    res.json({ dogru_mu: dogruMu });
  } catch (err) { next(err); }
});

// POST /api/testler/oturum/:id/bitir
router.post('/oturum/:id/bitir', async (req, res, next) => {
  try {
    const { cevaplar = [] } = req.body; // [{soru_id, verilen_cevap, sure_saniye}]

    // Toplu cevap kaydet
    for (const c of cevaplar) {
      const { rows: [soru] } = await pool.query('SELECT dogru_cevap, puan_degeri FROM test_sorulari WHERE id=$1', [c.soru_id]);
      const dogruMu = soru?.dogru_cevap
        ? soru.dogru_cevap.trim().toUpperCase() === (c.verilen_cevap || '').trim().toUpperCase()
        : null;
      await pool.query(
        `INSERT INTO test_cevaplari (oturum_id, soru_id, verilen_cevap, dogru_mu, sure_saniye)
         VALUES ($1,$2,$3,$4,$5)
         ON CONFLICT DO NOTHING`,
        [req.params.id, c.soru_id, c.verilen_cevap, dogruMu, c.sure_saniye||null]
      );
    }

    // Skor hesapla
    const { rows: [skor] } = await pool.query(
      `SELECT
         COUNT(*) FILTER (WHERE tc.dogru_mu=true)  AS dogru,
         COUNT(*) FILTER (WHERE tc.dogru_mu=false) AS yanlis,
         COUNT(*) FILTER (WHERE tc.verilen_cevap IS NULL OR tc.verilen_cevap='') AS bos,
         COALESCE(SUM(ts.puan_degeri) FILTER (WHERE tc.dogru_mu=true), 0) AS kazanilan_puan,
         COALESCE(SUM(ts.puan_degeri), 0) AS toplam_puan,
         EXTRACT(EPOCH FROM (NOW() - o.baslangic))::int AS sure_saniye
       FROM test_cevaplari tc
       JOIN test_sorulari ts ON ts.id=tc.soru_id
       JOIN test_oturumlari o ON o.id=tc.oturum_id
       WHERE tc.oturum_id=$1`, [req.params.id]
    );

    const basari = skor.toplam_puan > 0
      ? ((skor.kazanilan_puan / skor.toplam_puan) * 100).toFixed(2)
      : 0;

    await pool.query(
      `UPDATE test_oturumlari SET
         durum='tamamlandi', bitis=NOW(),
         sure_saniye=$2, dogru_sayisi=$3, yanlis_sayisi=$4, bos_sayisi=$5,
         toplam_puan=$6, basari_yuzdesi=$7
       WHERE id=$1`,
      [req.params.id, skor.sure_saniye, skor.dogru, skor.yanlis, skor.bos, skor.kazanilan_puan, basari]
    );

    res.json({
      basari_yuzdesi: parseFloat(basari),
      dogru_sayisi:   parseInt(skor.dogru),
      yanlis_sayisi:  parseInt(skor.yanlis),
      bos_sayisi:     parseInt(skor.bos),
      kazanilan_puan: parseFloat(skor.kazanilan_puan),
      toplam_puan:    parseFloat(skor.toplam_puan),
      sure_saniye:    skor.sure_saniye,
    });
  } catch (err) { next(err); }
});

// GET /api/testler/oturum/:id/rapor
router.get('/oturum/:id/rapor', async (req, res, next) => {
  try {
    const { rows: [oturum] } = await pool.query(
      `SELECT o.*, tp.ad AS proje_adi, tp.sure_dakika, tp.zorluk, tp.soru_sayisi,
              s.ad AS sektor_adi, p.ad AS pozisyon_adi
       FROM test_oturumlari o
       JOIN test_projeleri tp ON tp.id=o.proje_id
       LEFT JOIN sektorler s ON s.id=tp.sektor_id
       LEFT JOIN pozisyonlar p ON p.id=tp.pozisyon_id
       WHERE o.id=$1`, [req.params.id]
    );
    if (!oturum) return res.status(404).json({ hata: 'Oturum bulunamadı' });

    const { rows: detay } = await pool.query(
      `SELECT ts.sira_no, ts.soru_metni, ts.soru_tipi, ts.secenekler,
              ts.dogru_cevap, ts.aciklama, ts.puan_degeri,
              tc.verilen_cevap, tc.dogru_mu, tc.sure_saniye
       FROM test_sorulari ts
       LEFT JOIN test_cevaplari tc ON tc.soru_id=ts.id AND tc.oturum_id=$1
       WHERE ts.proje_id=
         (SELECT proje_id FROM test_oturumlari WHERE id=$1)
       ORDER BY ts.sira_no`, [req.params.id]
    );

    res.json({ oturum, detay });
  } catch (err) { next(err); }
});

// POST /api/testler/oturum/:id/email-gonder
router.post('/oturum/:id/email-gonder', optionalAuth, async (req, res, next) => {
  try {
    const { alici_eposta, alici_ad } = req.body;

    // Oturum + rapor verilerini çek
    const { rows: [oturum] } = await pool.query(
      `SELECT o.*, tp.ad AS proje_adi, tp.sure_dakika, tp.zorluk, tp.soru_sayisi,
              s.ad AS sektor_adi, p.ad AS pozisyon_adi
       FROM test_oturumlari o
       JOIN test_projeleri tp ON tp.id=o.proje_id
       LEFT JOIN sektorler s ON s.id=tp.sektor_id
       LEFT JOIN pozisyonlar p ON p.id=tp.pozisyon_id
       WHERE o.id=$1`, [req.params.id]
    );
    if (!oturum) return res.status(404).json({ hata: 'Oturum bulunamadı' });

    const { rows: detay } = await pool.query(
      `SELECT ts.sira_no, ts.soru_metni, ts.dogru_cevap, ts.puan_degeri,
              tc.verilen_cevap, tc.dogru_mu
       FROM test_sorulari ts
       LEFT JOIN test_cevaplari tc ON tc.soru_id=ts.id AND tc.oturum_id=$1
       WHERE ts.proje_id=(SELECT proje_id FROM test_oturumlari WHERE id=$1)
       ORDER BY ts.sira_no`, [req.params.id]
    );

    // Alıcı belirle: body'den gelirse onu, yoksa oturumdan al
    const eposta = alici_eposta || oturum.aday_eposta;
    const ad     = alici_ad     || `${oturum.aday_ad} ${oturum.aday_soyad}`;

    if (!eposta) return res.status(400).json({ hata: 'E-posta adresi bulunamadı. Lütfen alıcı e-posta girin.' });

    const sonuc = await raporGonder({ alici: eposta, aliciAd: ad, oturum, detay });
    res.json({ mesaj: `Rapor başarıyla gönderildi`, alici: eposta, mesaj_id: sonuc.mesaj_id });
  } catch (err) {
    if (err.message?.includes('SMTP') || err.message?.includes('yapılandırılmamış')) {
      return res.status(503).json({ hata: err.message });
    }
    next(err);
  }
});

// GET /api/testler/proje/:id/raporlar
router.get('/proje/:id/raporlar', optionalAuth, async (req, res, next) => {
  try {
    const { rows } = await pool.query(
      `SELECT * FROM v_test_raporu WHERE proje_id=$1 ORDER BY olusturma DESC`,
      [req.params.id]
    );
    res.json(rows);
  } catch (err) { next(err); }
});

/* ═══════════════════════════════════════════════════════════
   TEST DAVETİ — Aday Kıyasla sayfasından test ata
═══════════════════════════════════════════════════════════ */

// POST /api/testler/davet — adaya test daveti e-postası gönder
router.post('/davet', optionalAuth, async (req, res, next) => {
  try {
    const { proje_id, aday_ad, aday_eposta, pozisyon, test_linki, davet_eden } = req.body;
    if (!aday_ad || !aday_eposta)
      return res.status(400).json({ hata: 'aday_ad ve aday_eposta zorunlu' });

    let proje_adi = null;
    if (proje_id) {
      const { rows } = await pool.query('SELECT ad FROM test_projeleri WHERE id=$1', [proje_id]);
      proje_adi = rows[0]?.ad || null;
    }

    await davetGonder({
      alici:      aday_eposta,
      aliciAd:    aday_ad,
      testLinki:  test_linki || '',
      proje_adi,
      pozisyon,
      davet_eden,
    });

    res.json({ mesaj: 'Davet e-postası gönderildi', alici: aday_eposta });
  } catch (err) {
    if (err.message?.includes('SMTP') || err.message?.includes('yapılandırılmamış')) {
      return res.status(503).json({ hata: err.message });
    }
    next(err);
  }
});

module.exports = router;
