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

// GET /api/markalar
router.get('/', requireAuth, async (req, res, next) => {
  try {
    const { rows } = await pool.query(
      'SELECT id, ad, aktif FROM markalar WHERE aktif=TRUE ORDER BY ad'
    );
    res.json(rows);
  } catch (err) { next(err); }
});

// POST /api/markalar
router.post('/',
  ...requireRole('super_admin', 'toptanci'),
  body('ad').notEmpty().withMessage('Marka adı gerekli'),
  validate,
  async (req, res, next) => {
    try {
      const { rows } = await pool.query(
        'INSERT INTO markalar (ad) VALUES ($1) RETURNING *',
        [req.body.ad]
      );
      res.status(201).json(rows[0]);
    } catch (err) { next(err); }
  }
);

// PUT /api/markalar/:id
router.put('/:id',
  ...requireRole('super_admin', 'toptanci'),
  async (req, res, next) => {
    try {
      const { rows } = await pool.query(
        'UPDATE markalar SET ad=$1 WHERE id=$2 RETURNING *',
        [req.body.ad, req.params.id]
      );
      if (!rows.length) return res.status(404).json({ hata: 'Marka bulunamadı' });
      res.json(rows[0]);
    } catch (err) { next(err); }
  }
);

module.exports = router;
