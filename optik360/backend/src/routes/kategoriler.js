const { Router } = require('express');
const { body, validationResult } = require('express-validator');
const pool = require('../db/pool');
const { requireAuth, requireRole } = require('../middleware/auth');

const router = Router();

function validate(req, res, next) {
  const errors = validationResult(req);
  if (!errors.isEmpty()) return res.status(400).json({ hatalar: errors.array() });
  next();
}

// GET /api/kategoriler — düz liste (frontend ağaç oluşturur)
router.get('/', requireAuth, async (req, res, next) => {
  try {
    const { rows } = await pool.query(
      'SELECT id, ad, ust_kategori_id, aktif FROM kategoriler WHERE aktif=TRUE ORDER BY ad'
    );
    res.json(rows);
  } catch (err) { next(err); }
});

// POST /api/kategoriler
router.post('/',
  ...requireRole('super_admin', 'toptanci'),
  body('ad').notEmpty(),
  validate,
  async (req, res, next) => {
    try {
      const { ad, ust_kategori_id } = req.body;
      const { rows } = await pool.query(
        'INSERT INTO kategoriler (ad, ust_kategori_id) VALUES ($1,$2) RETURNING *',
        [ad, ust_kategori_id || null]
      );
      res.status(201).json(rows[0]);
    } catch (err) { next(err); }
  }
);

module.exports = router;
