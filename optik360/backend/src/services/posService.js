async function islemYap({ tutar, taksit = 1, odeme_yontemi = 'kredi_karti' }) {
  // Mock POS — gerçek entegrasyon için İyzico / Garanti Pay kullanılacak
  await new Promise(r => setTimeout(r, 1500));

  const onay_kodu = Math.random().toString(36).slice(2, 10).toUpperCase();
  console.log(`[Mock POS] ${odeme_yontemi} — ${tutar} TL / ${taksit} taksit — Onay: ${onay_kodu}`);

  return { basarili: true, onay_kodu, mesaj: 'İşlem onaylandı (simülasyon)' };
}

module.exports = { islemYap };
