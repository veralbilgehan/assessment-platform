require('dotenv').config({ override: true });
const express = require('express');
const cors    = require('cors');
const path    = require('path');
const pool    = require('./db/pool');
const { errorHandler } = require('./middleware/errorHandler');

const sektorlerRouter        = require('./routes/sektorler');
const pozisyonlarRouter      = require('./routes/pozisyonlar');
const degerlendirmelerRouter = require('./routes/degerlendirmeler');
const belgelerRouter         = require('./routes/belgeler');
const authRouter             = require('./routes/auth');
const hiyerarsiRouter        = require('./routes/hiyerarsi');
const testlerRouter          = require('./routes/testler');
const kiyaslamalarRouter     = require('./routes/kiyaslamalar');
const denemeRouter           = require('./routes/deneme');
const evrakKutusuRouter      = require('./routes/evrakKutusu');
const ayarlarRouter          = require('./routes/ayarlar');

const app  = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(express.json());

// Sağlık kontrolü
app.get('/health', async (req, res) => {
  try {
    await pool.query('SELECT 1');
    res.json({ durum: 'ok', veritabani: 'bağlı', zaman: new Date().toISOString() });
  } catch {
    res.status(503).json({ durum: 'hata', veritabani: 'bağlantı yok' });
  }
});

// Rotalar
app.use('/api/sektorler',        sektorlerRouter);
app.use('/api/pozisyonlar',      pozisyonlarRouter);
app.use('/api/degerlendirmeler', degerlendirmelerRouter);
app.use('/api/belgeler',         belgelerRouter);
app.use('/api/auth',             authRouter);
app.use('/api/hiyerarsi',        hiyerarsiRouter);
app.use('/api/testler',          testlerRouter);
app.use('/api/kiyaslamalar',     kiyaslamalarRouter);
app.use('/api/deneme',           denemeRouter);
app.use('/api/evrak',            evrakKutusuRouter);
app.use('/api/ayarlar',          ayarlarRouter);

// Statik frontend dosyaları (production)
const FRONTEND_DIST = path.join(__dirname, '../../frontend-react/dist');
app.use(express.static(FRONTEND_DIST));

// React Router için catch-all (API dışı her route → index.html)
app.get('*', (req, res) => {
  const index = path.join(FRONTEND_DIST, 'index.html');
  res.sendFile(index, err => {
    if (err) res.status(404).json({ hata: 'Endpoint bulunamadı' });
  });
});

// Hata yakalayıcı
app.use(errorHandler);

app.listen(PORT, () => {
  console.log(`\nSunucu çalışıyor → http://localhost:${PORT}`);
  console.log('Endpoint\'ler:');
  console.log(`  GET  /health`);
  console.log(`  GET  /api/sektorler`);
  console.log(`  GET  /api/sektorler/hiyerarsi/tam`);
  console.log(`  GET  /api/sektorler/:id/departmanlar`);
  console.log(`  GET  /api/pozisyonlar/departman/:id`);
  console.log(`  GET  /api/pozisyonlar/:id`);
  console.log(`  GET  /api/pozisyonlar/:id/sorular`);
  console.log(`  GET  /api/degerlendirmeler`);
  console.log(`  POST /api/degerlendirmeler`);
  console.log(`  GET  /api/degerlendirmeler/:id`);
  console.log(`  PUT  /api/degerlendirmeler/:id/puan`);
  console.log(`  POST /api/degerlendirmeler/:id/ai-makale`);
  console.log(`  GET  /api/degerlendirmeler/:id/ai-makale/stream\n`);
});
