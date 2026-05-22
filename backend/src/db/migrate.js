/**
 * Migration runner — çalıştır: node src/db/migrate.js
 */
require('dotenv').config({ override: true });
const fs   = require('fs');
const path = require('path');
const { Pool } = require('pg');
const bcrypt = require('bcrypt');

const pool = new Pool({
  host:     process.env.DB_HOST,
  port:     process.env.DB_PORT,
  database: process.env.DB_NAME,
  user:     process.env.DB_USER,
  password: process.env.DB_PASSWORD,
});

async function run() {
  const client = await pool.connect();
  try {
    // SQL migration
    const sql = fs.readFileSync(
      path.join(__dirname, 'migrations', '002_auth_comments.sql'), 'utf8'
    );
    await client.query(sql);
    console.log('✓ Migration 002 uygulandı');

    // Admin kullanıcı oluştur (idempotent)
    const adminEmail = process.env.ADMIN_EMAIL || 'admin@sirket.com';
    const adminPass  = process.env.ADMIN_PASS  || 'Admin2024!';
    const hash = await bcrypt.hash(adminPass, 12);

    await client.query(
      `INSERT INTO kullanicilar (eposta, sifre_hash, ad, rol)
       VALUES ($1, $2, 'Sistem Yöneticisi', 'admin')
       ON CONFLICT (eposta) DO NOTHING`,
      [adminEmail, hash]
    );
    console.log(`✓ Admin oluşturuldu: ${adminEmail} / ${adminPass}`);
  } finally {
    client.release();
    await pool.end();
  }
}

run().catch(err => { console.error('Migration hatası:', err.message); process.exit(1); });
