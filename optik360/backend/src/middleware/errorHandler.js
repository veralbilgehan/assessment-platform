function errorHandler(err, req, res, next) {
  console.error(err);
  const status = err.status || 500;
  const mesaj  = err.message || 'Sunucu hatası';

  if (res.headersSent) {
    try { res.write(`data: ${JSON.stringify({ hata: mesaj })}\n\n`); res.end(); } catch {}
    return;
  }

  res.status(status).json({
    hata: mesaj,
    ...(process.env.NODE_ENV === 'development' && { stack: err.stack }),
  });
}

module.exports = { errorHandler };
