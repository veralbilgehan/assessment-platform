const { validationResult } = require('express-validator');

function validate(req, res, next) {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ hatalar: errors.array() });
  }
  next();
}

function errorHandler(err, req, res, next) {
  console.error(err);
  // SSE bağlantısı başladıktan sonra header gönderilemez, SSE event olarak yaz
  if (res.headersSent) {
    try {
      res.write(`data: ${JSON.stringify({ tip: 'hata', hata: err.message || 'Sunucu hatası' })}\n\n`);
      res.write('data: [DONE]\n\n');
      res.end();
    } catch (_) {}
    return;
  }
  const status = err.status || 500;
  res.status(status).json({
    hata: err.message || 'Sunucu hatası',
    ...(process.env.NODE_ENV === 'development' && { stack: err.stack }),
  });
}

module.exports = { validate, errorHandler };
