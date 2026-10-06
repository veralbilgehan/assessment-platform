/**
 * E-posta Şablonları (yalnızca admin)
 * GET    /api/email-sablonlari            — liste
 * GET    /api/email-sablonlari/:anahtar   — tek şablon (HTML dahil)
 * PUT    /api/email-sablonlari/:anahtar   — kaydet { baslik, konu, html }
 * DELETE /api/email-sablonlari/:anahtar   — varsayılana döndür
 * POST   /api/email-sablonlari/onizle     — { konu, html, degiskenler } → doldurulmuş hâl
 */
const { Router } = require('express');
const { requireRole } = require('../middleware/auth');
const {
  VARSAYILANLAR, sablonlariListele, sablonGetir, sablonKaydet, sablonSifirla, isle,
} = require('../services/emailSablonlari');

const router = Router();
router.use(requireRole('admin'));

router.get('/', async (req, res, next) => {
  try { res.json(await sablonlariListele()); }
  catch (err) { next(err); }
});

router.post('/onizle', (req, res) => {
  const { konu = '', html = '', degiskenler = {} } = req.body;
  if (typeof degiskenler !== 'object' || Array.isArray(degiskenler) || degiskenler === null) {
    return res.status(400).json({ hata: 'Değişkenler bir JSON nesnesi olmalı' });
  }
  res.json(isle({ konu, html }, degiskenler));
});

router.get('/:anahtar', async (req, res, next) => {
  try {
    const s = await sablonGetir(req.params.anahtar);
    if (!s) return res.status(404).json({ hata: 'Şablon bulunamadı' });
    res.json(s);
  } catch (err) { next(err); }
});

router.put('/:anahtar', async (req, res, next) => {
  try {
    if (!VARSAYILANLAR[req.params.anahtar]) return res.status(404).json({ hata: 'Şablon bulunamadı' });
    const baslik = String(req.body.baslik || '').trim();
    const konu = String(req.body.konu || '').trim();
    const html = String(req.body.html || '');
    if (!baslik || !konu || !html.trim()) return res.status(400).json({ hata: 'Başlık, konu ve HTML içeriği zorunlu' });
    res.json(await sablonKaydet(req.params.anahtar, { baslik, konu, html }));
  } catch (err) { next(err); }
});

router.delete('/:anahtar', async (req, res, next) => {
  try {
    if (!VARSAYILANLAR[req.params.anahtar]) return res.status(404).json({ hata: 'Şablon bulunamadı' });
    res.json(await sablonSifirla(req.params.anahtar));
  } catch (err) { next(err); }
});

module.exports = router;
