/**
 * Migration runner — çalıştır: node src/db/migrate1.js
 */
require('dotenv').config({ override: true });
const fs   = require('fs');
const path = require('path');
const { Pool } = require('pg');

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
    const sql = fs.readFileSync(
      path.join(__dirname, 'migrations', '001_base_schema.sql'), 'utf8'
    );
    await client.query(sql);
    console.log('✓ Migration 001 uygulandı (temel şema, görünümler, fonksiyonlar, seed verisi)');
  } finally {
    client.release();
    await pool.end();
  }
}

run().catch(err => { console.error('Migration hatası:', err.message); process.exit(1); });
