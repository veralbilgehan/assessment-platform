require('dotenv').config();
const fs   = require('fs');
const path = require('path');
const { Pool } = require('pg');

const pool = new Pool({
  host:     process.env.DB_HOST     || 'localhost',
  port:     parseInt(process.env.DB_PORT || '5432'),
  database: process.env.DB_NAME     || 'optik360_db',
  user:     process.env.DB_USER     || 'postgres',
  password: process.env.DB_PASSWORD || 'postgres',
});

async function migrate() {
  const sql = fs.readFileSync(
    path.join(__dirname, 'src/db/migrations/001_initial.sql'),
    'utf8'
  );
  try {
    await pool.query(sql);
    console.log('Migration tamamlandı.');
  } catch (err) {
    console.error('Migration hatası:', err.message);
    process.exit(1);
  } finally {
    await pool.end();
  }
}

migrate();
