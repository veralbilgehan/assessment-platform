require('dotenv').config();
const express = require('express');
const cors    = require('cors');
const path    = require('path');
const pool    = require('./db/pool');
const { errorHandler } = require('./middleware/errorHandler');

const app = express();
app.use(cors());
app.use(express.json());

// Routes
app.use('/api/auth',         require('./routes/auth'));
app.use('/api/dashboard',    require('./routes/dashboard'));
app.use('/api/markalar',     require('./routes/markalar'));
app.use('/api/kategoriler',  require('./routes/kategoriler'));
app.use('/api/urunler',      require('./routes/urunler'));
app.use('/api/stok',         require('./routes/stok'));
app.use('/api/bayiler',      require('./routes/bayiler'));
app.use('/api/cari-hesaplar',require('./routes/cariHesaplar'));
app.use('/api/siparisler',   require('./routes/siparisler'));
app.use('/api/faturalar',    require('./routes/faturalar'));
app.use('/api/tahsilatlar',  require('./routes/tahsilatlar'));

// Health check
app.get('/health', async (req, res) => {
  try {
    await pool.query('SELECT 1');
    res.json({ durum: 'ok', veritabani: 'bağlı', zaman: new Date().toISOString() });
  } catch {
    res.status(503).json({ durum: 'hata', veritabani: 'bağlantı yok' });
  }
});

// Frontend (production)
const distPath = path.join(__dirname, '../../frontend/dist');
app.use(express.static(distPath));
app.get('*', (req, res) => res.sendFile(path.join(distPath, 'index.html')));

app.use(errorHandler);

const PORT = process.env.PORT || 3002;
app.listen(PORT, () => console.log(`Optik360 backend çalışıyor: http://localhost:${PORT}`));
