require('dotenv').config();
const fs = require('fs');
const path = require('path');
const express = require('express');
const pool = require('./db');
const { girisYap } = require('./auth');
const maliyetRouter = require('./routes/maliyet');

const app = express();
const PORT = process.env.PORT || 8080;

app.use(express.json({ limit: '1mb' }));

app.get('/health', (req, res) => res.json({ durum: 'ok' }));
app.post('/api/giris', girisYap);
app.use('/api', maliyetRouter);
app.use(express.static(path.join(__dirname, '../public')));

// eslint-disable-next-line no-unused-vars
app.use((err, req, res, next) => {
  console.error(err);
  res.status(500).json({ hata: 'Sunucu hatası: ' + err.message });
});

// Şema idempotent; her açılışta güvenle uygulanır
pool.query(fs.readFileSync(path.join(__dirname, 'db/schema.sql'), 'utf8'))
  .then(() => console.log('✓ Veritabanı şeması hazır'))
  .catch(err => console.error('Şema uygulanamadı:', err.message));

app.listen(PORT, () => console.log(`Personel Maliyet → http://localhost:${PORT}`));
