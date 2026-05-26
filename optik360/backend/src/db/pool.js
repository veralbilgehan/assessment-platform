require('dotenv').config();
const { Pool } = require('pg');

// Cloud Run'da DB_HOST /cloudsql/... formatında Unix socket gelir
const isSocket = (process.env.DB_HOST || '').startsWith('/');

const pool = new Pool({
  host:     process.env.DB_HOST     || 'localhost',
  port:     isSocket ? undefined : parseInt(process.env.DB_PORT || '5432'),
  database: process.env.DB_NAME     || 'optik360_db',
  user:     process.env.DB_USER     || 'postgres',
  password: process.env.DB_PASSWORD || 'postgres',
});

module.exports = pool;
