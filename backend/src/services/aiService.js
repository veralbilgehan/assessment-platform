const Anthropic = require('@anthropic-ai/sdk');

const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

/**
 * Generates an enriched evaluation article using Claude.
 * Returns the full text as a string (streams internally, resolves on completion).
 *
 * @param {Object} params
 * @param {string} params.sektorAdi
 * @param {string} params.departmanAdi
 * @param {string} params.pozisyonAdi
 * @param {string} params.seviye  - e.g. "uzman", "kıdemli", "yönetici"
 * @param {string[]} params.yetkinlikler - list of competency names
 * @param {string|null} params.adaySoyad
 * @param {string} params.sablonTipi - article template type name
 * @param {string} params.temelIcerik - base article text from DB template
 */
async function makaleUret(params) {
  const {
    sektorAdi,
    departmanAdi,
    pozisyonAdi,
    seviye,
    yetkinlikler,
    adaySoyad,
    sablonTipi,
    temelIcerik,
  } = params;

  const adayBilgisi = adaySoyad ? `Aday: ${adaySoyad}` : 'Aday bilgisi belirtilmemiş';
  const yetkinlikListesi = yetkinlikler.join(', ');

  const prompt = `Sen bir İnsan Kaynakları uzmanısın ve aşağıdaki pozisyon için profesyonel bir değerlendirme makalesi yazıyorsun.

Pozisyon Bilgileri:
- Sektör: ${sektorAdi}
- Departman: ${departmanAdi}
- Pozisyon: ${pozisyonAdi}
- Seviye: ${seviye}
- ${adayBilgisi}
- Rapor Tipi: ${sablonTipi}

Değerlendirilecek Yetkinlikler:
${yetkinlikListesi}

Temel Şablon İçeriği:
${temelIcerik}

Yukarıdaki şablonu ve pozisyon bilgilerini kullanarak, aşağıdaki kurallara göre zenginleştirilmiş bir değerlendirme makalesi yaz:

1. Şablondaki ana yapıyı koru (Giriş, Gelişme, Sonuç bölümleri)
2. Her yetkinlik için sektöre özgü, somut beklentiler ekle
3. ${sektorAdi} sektörünün güncel trendlerini ve gereksinimlerini yansıt
4. Profesyonel, nesnel ve yapıcı bir dil kullan
5. Türkçe yaz
6. Makale 400-600 kelime arasında olsun
7. Bölüm başlıklarını **kalın** olarak yaz

Sadece makale metnini yaz, başka açıklama ekleme.`;

  const stream = await client.messages.stream({
    model: 'claude-opus-4-7',
    max_tokens: 2048,
    thinking: { type: 'adaptive' },
    messages: [{ role: 'user', content: prompt }],
  });

  const message = await stream.finalMessage();

  const textBlocks = message.content.filter(b => b.type === 'text');
  return textBlocks.map(b => b.text).join('');
}

/**
 * Streams an enriched evaluation article directly to an Express response (SSE).
 * Caller is responsible for setting headers before calling this.
 */
async function makaleUretStream(params, res) {
  const {
    sektorAdi,
    departmanAdi,
    pozisyonAdi,
    seviye,
    yetkinlikler,
    adaySoyad,
    sablonTipi,
    temelIcerik,
  } = params;

  const adayBilgisi = adaySoyad ? `Aday: ${adaySoyad}` : 'Aday bilgisi belirtilmemiş';
  const yetkinlikListesi = yetkinlikler.join(', ');

  const prompt = `Sen bir İnsan Kaynakları uzmanısın ve aşağıdaki pozisyon için profesyonel bir değerlendirme makalesi yazıyorsun.

Pozisyon Bilgileri:
- Sektör: ${sektorAdi}
- Departman: ${departmanAdi}
- Pozisyon: ${pozisyonAdi}
- Seviye: ${seviye}
- ${adayBilgisi}
- Rapor Tipi: ${sablonTipi}

Değerlendirilecek Yetkinlikler:
${yetkinlikListesi}

Temel Şablon İçeriği:
${temelIcerik}

Yukarıdaki şablonu ve pozisyon bilgilerini kullanarak, aşağıdaki kurallara göre zenginleştirilmiş bir değerlendirme makalesi yaz:

1. Şablondaki ana yapıyı koru (Giriş, Gelişme, Sonuç bölümleri)
2. Her yetkinlik için sektöre özgü, somut beklentiler ekle
3. ${sektorAdi} sektörünün güncel trendlerini ve gereksinimlerini yansıt
4. Profesyonel, nesnel ve yapıcı bir dil kullan
5. Türkçe yaz
6. Makale 400-600 kelime arasında olsun
7. Bölüm başlıklarını **kalın** olarak yaz

Sadece makale metnini yaz, başka açıklama ekleme.`;

  const stream = client.messages.stream({
    model: 'claude-opus-4-7',
    max_tokens: 2048,
    thinking: { type: 'adaptive' },
    messages: [{ role: 'user', content: prompt }],
  });

  for await (const event of stream) {
    if (
      event.type === 'content_block_delta' &&
      event.delta.type === 'text_delta'
    ) {
      res.write(`data: ${JSON.stringify({ text: event.delta.text })}\n\n`);
    }
  }

  res.write('data: [DONE]\n\n');
  res.end();
}

module.exports = { makaleUret, makaleUretStream };
