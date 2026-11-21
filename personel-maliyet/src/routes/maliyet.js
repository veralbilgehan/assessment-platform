/**
 * Personel Maliyet API — giriş yapmış kullanıcı erişir
 *
 * GET    /api/rapor?bolum_id=     — kişi, bölüm ve firma maliyet raporu
 * GET    /api/parametreler        — yılın yasal parametreleri
 * PUT    /api/parametreler        — parametreleri güncelle (admin)
 * GET    /api/bolumler            — bölüm listesi
 * POST   /api/bolumler            — bölüm ekle
 * DELETE /api/bolumler/:id        — bölüm sil
 * GET    /api/personel            — personel listesi
 * POST   /api/personel            — personel ekle
 * PUT    /api/personel/:id        — personel güncelle
 * DELETE /api/personel/:id        — personel sil
 * GET    /api/giderler            — iş yeri giderleri
 * POST   /api/giderler            — gider ekle
 * PUT    /api/giderler/:id        — gider güncelle
 * DELETE /api/giderler/:id        — gider sil
 * GET    /api/sablon              — Excel içe aktarma şablonu (.xlsx)
 * POST   /api/ice-aktar           — Excel'den personel aktar (dosya alanı: "dosya")
 */
const { Router } = require('express');
const multer = require('multer');
const XLSX = require('xlsx');
const pool = require('../db');
const { requireRole } = require('../auth');
const { kisiMaliyeti, ozetle } = require('../services/maliyetHesap');

const router = Router();
const yetkili = requireRole(['admin', 'degerlendirici']);
const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 5 * 1024 * 1024 } });

const PARAMETRE_ALANLARI = [
  'sgk_isveren_oran', 'sgk_tesvik_puan', 'issizlik_isveren_oran', 'sgk_tavan', 'kidem_tavani',
  'fazla_mesai_carpan', 'haftalik_saat', 'gunluk_saat', 'resmi_tatil_gun',
];
const PERSONEL_ALANLARI = [
  'sicil_no', 'ad_soyad', 'bolum_id', 'unvan', 'ise_giris', 'brut_maas', 'yillik_prim', 'fazla_mesai_saat',
  'yemek', 'yol', 'saglik_sigortasi', 'bes_katki', 'diger_yan_hak', 'sgk_tesvik', 'izin_gun', 'rapor_gun', 'aktif',
];
const BOS_OLABILIR = new Set(['sicil_no', 'bolum_id', 'unvan', 'ise_giris', 'izin_gun', 'sgk_tavan', 'kidem_tavani']);

// Excel sütun başlığı → alan
const EXCEL_SUTUNLARI = [
  ['Sicil No', 'sicil_no'], ['Ad Soyad', 'ad_soyad'], ['Bölüm', 'bolum'], ['Unvan', 'unvan'],
  ['İşe Giriş (GG.AA.YYYY)', 'ise_giris'], ['Brüt Maaş', 'brut_maas'], ['Yıllık Prim/İkramiye', 'yillik_prim'],
  ['Aylık Fazla Mesai Saati', 'fazla_mesai_saat'], ['Yemek', 'yemek'], ['Yol', 'yol'],
  ['Özel Sağlık Sigortası', 'saglik_sigortasi'], ['BES İşveren Katkısı', 'bes_katki'],
  ['Diğer Yan Haklar', 'diger_yan_hak'], ['SGK Teşviki (Evet/Hayır)', 'sgk_tesvik'],
  ['Yıllık İzin Günü (boş = yasal)', 'izin_gun'], ['Yıllık Rapor Günü', 'rapor_gun'],
];

const buYil = () => new Date().getFullYear();

async function parametreleriGetir(yil = buYil()) {
  await pool.query('INSERT INTO maliyet_parametreler (yil) VALUES ($1) ON CONFLICT (yil) DO NOTHING', [yil]);
  const { rows } = await pool.query('SELECT * FROM maliyet_parametreler WHERE yil = $1', [yil]);
  return rows[0];
}

function evetHayir(v) {
  if (typeof v === 'boolean') return v;
  const s = String(v ?? '').trim().toLocaleLowerCase('tr-TR');
  if (['hayır', 'hayir', 'h', 'yok', '0', 'false'].includes(s)) return false;
  return true;
}

// "1.234,56" / "1234.56" / 1234.56 → 1234.56
function tutar(v) {
  if (v === null || v === undefined || v === '') return null;
  if (typeof v === 'number') return v;
  const ham = String(v).trim();
  if (!ham) return null;
  let s = ham.replace(/[\s₺]|TL/gi, '');
  if (!/^-?[\d.,]+$/.test(s)) return NaN;
  if (s.includes(',')) s = s.replace(/\./g, '').replace(',', '.');
  const n = Number(s);
  return Number.isFinite(n) ? n : NaN;
}

function tarih(v) {
  if (!v) return null;
  if (v instanceof Date) {
    const iki = (n) => String(n).padStart(2, '0');
    return `${v.getFullYear()}-${iki(v.getMonth() + 1)}-${iki(v.getDate())}`;
  }
  const s = String(v).trim();
  const tr = s.match(/^(\d{1,2})[./-](\d{1,2})[./-](\d{4})$/);
  const iso = s.match(/^(\d{4})-(\d{2})-(\d{2})/);
  const [y, a, g] = tr ? [tr[3], tr[2], tr[1]] : iso ? [iso[1], iso[2], iso[3]] : [];
  if (!y) return undefined;
  const d = new Date(Date.UTC(+y, +a - 1, +g));
  if (d.getUTCMonth() !== +a - 1 || d.getUTCDate() !== +g) return undefined;
  return `${y}-${String(a).padStart(2, '0')}-${String(g).padStart(2, '0')}`;
}

const ALAN_ADLARI = {
  brut_maas: 'Brüt maaş', yillik_prim: 'Yıllık prim', fazla_mesai_saat: 'Fazla mesai saati', yemek: 'Yemek',
  yol: 'Yol', saglik_sigortasi: 'Özel sağlık sigortası', bes_katki: 'BES katkısı', diger_yan_hak: 'Diğer yan haklar',
  rapor_gun: 'Rapor günü', izin_gun: 'İzin günü',
};

function personelDogrula(b) {
  const hatalar = [];
  if (!b.ad_soyad || !String(b.ad_soyad).trim()) hatalar.push({ alan: 'ad_soyad', msg: 'Ad soyad zorunludur' });
  for (const alan of ['brut_maas', 'yillik_prim', 'fazla_mesai_saat', 'yemek', 'yol', 'saglik_sigortasi', 'bes_katki', 'diger_yan_hak', 'rapor_gun', 'izin_gun']) {
    const v = b[alan];
    if (v !== undefined && v !== null && v !== '' && !(Number(v) >= 0)) hatalar.push({ alan, msg: `${ALAN_ADLARI[alan]} sıfır veya pozitif bir sayı olmalıdır` });
  }
  return hatalar;
}

function personelDegerleri(b) {
  return PERSONEL_ALANLARI.map(alan => {
    const v = b[alan];
    if (alan === 'sgk_tesvik') return v === undefined ? true : evetHayir(v);
    if (alan === 'aktif') return v === undefined ? true : evetHayir(v);
    if (v === '' || v === undefined || v === null) return BOS_OLABILIR.has(alan) ? null : (alan === 'ad_soyad' ? '' : 0);
    if (alan === 'ad_soyad') return String(v).trim();
    return v;
  });
}

// ─── Rapor ────────────────────────────────────────────────────────────
router.get('/rapor', yetkili, async (req, res, next) => {
  try {
    const prm = await parametreleriGetir(parseInt(req.query.yil, 10) || buYil());
    const [{ rows: personel }, { rows: [gider] }, { rows: bolumler }] = await Promise.all([
      pool.query(`SELECT p.*, b.ad AS bolum_ad FROM maliyet_personel p
                  LEFT JOIN maliyet_bolumler b ON b.id = p.bolum_id
                  WHERE p.aktif ORDER BY b.ad NULLS LAST, p.ad_soyad`),
      pool.query('SELECT COALESCE(SUM(aylik_tutar), 0) AS toplam FROM maliyet_isyeri_giderleri'),
      pool.query('SELECT id, ad FROM maliyet_bolumler ORDER BY ad'),
    ]);

    // İş yeri giderleri tüm aktif personele kişi sayısına göre eşit dağıtılır
    const isyeriPayi = personel.length ? Number(gider.toplam) / personel.length : 0;
    const kisiler = personel.map(p => ({
      id: p.id, sicil_no: p.sicil_no, ad_soyad: p.ad_soyad, unvan: p.unvan,
      bolum_id: p.bolum_id, bolum_ad: p.bolum_ad || 'Bölümsüz',
      maliyet: kisiMaliyeti(p, prm, isyeriPayi),
    }));

    const gunlukSaat = Number(prm.gunluk_saat);
    const gruplar = new Map();
    for (const k of kisiler) {
      const anahtar = k.bolum_id ?? 0;
      if (!gruplar.has(anahtar)) gruplar.set(anahtar, { bolum_id: k.bolum_id, bolum_ad: k.bolum_ad, kisiler: [] });
      gruplar.get(anahtar).kisiler.push(k);
    }
    const bolumOzet = [...gruplar.values()].map(g => ({ bolum_id: g.bolum_id, bolum_ad: g.bolum_ad, ...ozetle(g.kisiler, gunlukSaat) }));

    const bolumFiltre = req.query.bolum_id ? parseInt(req.query.bolum_id, 10) : null;
    res.json({
      parametreler: prm,
      isyeri_gider_toplam: Number(gider.toplam),
      isyeri_payi_kisi: Math.round(isyeriPayi * 100) / 100,
      firma: ozetle(kisiler, gunlukSaat),
      bolumler: bolumOzet,
      bolum_listesi: bolumler,
      kisiler: bolumFiltre ? kisiler.filter(k => k.bolum_id === bolumFiltre) : kisiler,
    });
  } catch (err) { next(err); }
});

// ─── Parametreler ─────────────────────────────────────────────────────
router.get('/parametreler', yetkili, async (req, res, next) => {
  try { res.json(await parametreleriGetir(parseInt(req.query.yil, 10) || buYil())); } catch (err) { next(err); }
});

router.put('/parametreler', requireRole('admin'), async (req, res, next) => {
  try {
    const yil = parseInt(req.body.yil, 10) || buYil();
    await parametreleriGetir(yil);
    const degerler = PARAMETRE_ALANLARI.map(a => {
      const v = req.body[a];
      if (v === '' || v === null || v === undefined) return BOS_OLABILIR.has(a) ? null : undefined;
      return Number(v);
    });
    if (degerler.some(v => Number.isNaN(v) || (typeof v === 'number' && v < 0))) {
      return res.status(400).json({ hata: 'Parametreler sıfır veya pozitif sayı olmalıdır' });
    }
    const setler = [], params = [yil];
    PARAMETRE_ALANLARI.forEach((a, i) => {
      if (degerler[i] === undefined) return;
      params.push(degerler[i]);
      setler.push(`${a} = $${params.length}`);
    });
    if (setler.length) {
      await pool.query(`UPDATE maliyet_parametreler SET ${setler.join(', ')}, guncelleme = NOW() WHERE yil = $1`, params);
    }
    res.json(await parametreleriGetir(yil));
  } catch (err) { next(err); }
});

// ─── Bölümler ─────────────────────────────────────────────────────────
router.get('/bolumler', yetkili, async (req, res, next) => {
  try {
    const { rows } = await pool.query(
      `SELECT b.id, b.ad, COUNT(p.id) FILTER (WHERE p.aktif)::int AS personel_sayisi
       FROM maliyet_bolumler b LEFT JOIN maliyet_personel p ON p.bolum_id = b.id
       GROUP BY b.id ORDER BY b.ad`
    );
    res.json(rows);
  } catch (err) { next(err); }
});

router.post('/bolumler', yetkili, async (req, res, next) => {
  try {
    const ad = String(req.body.ad || '').trim();
    if (!ad) return res.status(400).json({ hata: 'Bölüm adı zorunludur' });
    const { rows } = await pool.query(
      `INSERT INTO maliyet_bolumler (ad) VALUES ($1) ON CONFLICT (ad) DO UPDATE SET ad = EXCLUDED.ad RETURNING *`, [ad]
    );
    res.status(201).json(rows[0]);
  } catch (err) { next(err); }
});

router.delete('/bolumler/:id', yetkili, async (req, res, next) => {
  try {
    const { rowCount } = await pool.query('DELETE FROM maliyet_bolumler WHERE id = $1', [req.params.id]);
    if (!rowCount) return res.status(404).json({ hata: 'Bölüm bulunamadı' });
    res.json({ silindi: true });
  } catch (err) { next(err); }
});

// ─── Personel ─────────────────────────────────────────────────────────
router.get('/personel', yetkili, async (req, res, next) => {
  try {
    const { rows } = await pool.query(
      `SELECT p.*, b.ad AS bolum_ad FROM maliyet_personel p
       LEFT JOIN maliyet_bolumler b ON b.id = p.bolum_id
       ORDER BY p.aktif DESC, b.ad NULLS LAST, p.ad_soyad`
    );
    res.json(rows);
  } catch (err) { next(err); }
});

router.post('/personel', yetkili, async (req, res, next) => {
  try {
    const hatalar = personelDogrula(req.body);
    if (hatalar.length) return res.status(400).json({ hatalar });
    const yerTutucular = PERSONEL_ALANLARI.map((_, i) => `$${i + 1}`).join(', ');
    const { rows } = await pool.query(
      `INSERT INTO maliyet_personel (${PERSONEL_ALANLARI.join(', ')}) VALUES (${yerTutucular}) RETURNING *`,
      personelDegerleri(req.body)
    );
    res.status(201).json(rows[0]);
  } catch (err) {
    if (err.code === '23505') return res.status(409).json({ hata: 'Bu sicil numarası zaten kayıtlı' });
    next(err);
  }
});

router.put('/personel/:id', yetkili, async (req, res, next) => {
  try {
    const hatalar = personelDogrula(req.body);
    if (hatalar.length) return res.status(400).json({ hatalar });
    const setler = PERSONEL_ALANLARI.map((a, i) => `${a} = $${i + 2}`).join(', ');
    const { rows } = await pool.query(
      `UPDATE maliyet_personel SET ${setler}, guncelleme = NOW() WHERE id = $1 RETURNING *`,
      [req.params.id, ...personelDegerleri(req.body)]
    );
    if (!rows.length) return res.status(404).json({ hata: 'Personel bulunamadı' });
    res.json(rows[0]);
  } catch (err) {
    if (err.code === '23505') return res.status(409).json({ hata: 'Bu sicil numarası zaten kayıtlı' });
    next(err);
  }
});

router.delete('/personel/:id', yetkili, async (req, res, next) => {
  try {
    const { rowCount } = await pool.query('DELETE FROM maliyet_personel WHERE id = $1', [req.params.id]);
    if (!rowCount) return res.status(404).json({ hata: 'Personel bulunamadı' });
    res.json({ silindi: true });
  } catch (err) { next(err); }
});

// ─── İş yeri giderleri ────────────────────────────────────────────────
router.get('/giderler', yetkili, async (req, res, next) => {
  try {
    const { rows } = await pool.query('SELECT * FROM maliyet_isyeri_giderleri ORDER BY kategori NULLS LAST, ad');
    res.json(rows);
  } catch (err) { next(err); }
});

function giderDogrula(b) {
  if (!b.ad || !String(b.ad).trim()) return 'Gider adı zorunludur';
  if (!(Number(b.aylik_tutar) >= 0)) return 'Aylık tutar sıfır veya pozitif bir sayı olmalıdır';
  return null;
}

router.post('/giderler', yetkili, async (req, res, next) => {
  try {
    const hata = giderDogrula(req.body);
    if (hata) return res.status(400).json({ hata });
    const { rows } = await pool.query(
      'INSERT INTO maliyet_isyeri_giderleri (ad, kategori, aylik_tutar) VALUES ($1, $2, $3) RETURNING *',
      [String(req.body.ad).trim(), req.body.kategori || null, Number(req.body.aylik_tutar)]
    );
    res.status(201).json(rows[0]);
  } catch (err) { next(err); }
});

router.put('/giderler/:id', yetkili, async (req, res, next) => {
  try {
    const hata = giderDogrula(req.body);
    if (hata) return res.status(400).json({ hata });
    const { rows } = await pool.query(
      'UPDATE maliyet_isyeri_giderleri SET ad = $2, kategori = $3, aylik_tutar = $4 WHERE id = $1 RETURNING *',
      [req.params.id, String(req.body.ad).trim(), req.body.kategori || null, Number(req.body.aylik_tutar)]
    );
    if (!rows.length) return res.status(404).json({ hata: 'Gider bulunamadı' });
    res.json(rows[0]);
  } catch (err) { next(err); }
});

router.delete('/giderler/:id', yetkili, async (req, res, next) => {
  try {
    const { rowCount } = await pool.query('DELETE FROM maliyet_isyeri_giderleri WHERE id = $1', [req.params.id]);
    if (!rowCount) return res.status(404).json({ hata: 'Gider bulunamadı' });
    res.json({ silindi: true });
  } catch (err) { next(err); }
});

// ─── Excel ────────────────────────────────────────────────────────────
router.get('/sablon', yetkili, (req, res) => {
  const ornek = ['P001', 'Ayşe Yılmaz', 'Muhasebe', 'Uzman', '01.03.2021', 50000, 50000, 5, 4000, 2000, 1500, 0, 0, 'Evet', '', 3];
  const sayfa = XLSX.utils.aoa_to_sheet([EXCEL_SUTUNLARI.map(s => s[0]), ornek]);
  sayfa['!cols'] = EXCEL_SUTUNLARI.map(s => ({ wch: Math.max(12, s[0].length + 2) }));
  const kitap = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(kitap, sayfa, 'Personel');
  const tampon = XLSX.write(kitap, { type: 'buffer', bookType: 'xlsx' });
  res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
  res.setHeader('Content-Disposition', 'attachment; filename="personel_maliyet_sablonu.xlsx"');
  res.send(tampon);
});

const baslikNormal = (s) => String(s).toLocaleLowerCase('tr-TR').replace(/\(.*?\)/g, '').replace(/[^a-zçğıöşü0-9]/g, '');
const BASLIK_HARITASI = new Map(EXCEL_SUTUNLARI.map(([b, a]) => [baslikNormal(b), a]));

router.post('/ice-aktar', yetkili, upload.single('dosya'), async (req, res, next) => {
  if (!req.file) return res.status(400).json({ hata: 'Excel dosyası yüklenmedi' });
  let satirlar;
  try {
    const kitap = XLSX.read(req.file.buffer, { type: 'buffer', cellDates: true });
    satirlar = XLSX.utils.sheet_to_json(kitap.Sheets[kitap.SheetNames[0]], { defval: '' });
  } catch {
    return res.status(400).json({ hata: 'Dosya okunamadı; .xlsx veya .xls biçiminde olmalıdır' });
  }
  if (!satirlar.length) return res.status(400).json({ hata: 'Dosyada veri satırı bulunamadı' });

  const client = await pool.connect();
  const sonuc = { eklenen: 0, guncellenen: 0, hatalar: [] };
  try {
    await client.query('BEGIN');
    const bolumIdleri = new Map();

    for (let i = 0; i < satirlar.length; i++) {
      const satirNo = i + 2; // başlık satırı 1
      const kayit = {};
      for (const [baslik, deger] of Object.entries(satirlar[i])) {
        const alan = BASLIK_HARITASI.get(baslikNormal(baslik));
        if (alan) kayit[alan] = typeof deger === 'string' ? deger.trim() : deger;
      }
      if (!kayit.ad_soyad && !kayit.sicil_no) continue; // boş satır

      for (const a of ['brut_maas', 'yillik_prim', 'fazla_mesai_saat', 'yemek', 'yol', 'saglik_sigortasi', 'bes_katki', 'diger_yan_hak', 'izin_gun', 'rapor_gun']) {
        if (kayit[a] !== undefined) kayit[a] = tutar(kayit[a]);
      }
      const hatalar = personelDogrula(kayit);
      if (kayit.ise_giris !== undefined) {
        const t = tarih(kayit.ise_giris);
        if (t === undefined) hatalar.push({ msg: 'İşe giriş tarihi GG.AA.YYYY biçiminde olmalıdır' });
        kayit.ise_giris = t ?? null;
      }
      if (hatalar.length) { sonuc.hatalar.push({ satir: satirNo, mesaj: hatalar.map(h => h.msg).join('; ') }); continue; }

      if (kayit.bolum) {
        const ad = String(kayit.bolum).trim();
        if (!bolumIdleri.has(ad)) {
          const { rows } = await client.query(
            'INSERT INTO maliyet_bolumler (ad) VALUES ($1) ON CONFLICT (ad) DO UPDATE SET ad = EXCLUDED.ad RETURNING id', [ad]
          );
          bolumIdleri.set(ad, rows[0].id);
        }
        kayit.bolum_id = bolumIdleri.get(ad);
      }
      kayit.sicil_no = kayit.sicil_no ? String(kayit.sicil_no) : null;

      const degerler = personelDegerleri(kayit);
      await client.query('SAVEPOINT satir');
      try {
      // Sicil no varsa onunla, yoksa sicilsiz kayıtlarda ad soyad ile eşleştir
      const mevcut = kayit.sicil_no
        ? (await client.query('SELECT id FROM maliyet_personel WHERE sicil_no = $1', [kayit.sicil_no])).rows[0]
        : (await client.query(
            'SELECT id FROM maliyet_personel WHERE sicil_no IS NULL AND LOWER(ad_soyad) = LOWER($1) LIMIT 1', [kayit.ad_soyad]
          )).rows[0];
      if (mevcut) {
        const setler = PERSONEL_ALANLARI.map((a, j) => `${a} = $${j + 2}`).join(', ');
        await client.query(`UPDATE maliyet_personel SET ${setler}, guncelleme = NOW() WHERE id = $1`, [mevcut.id, ...degerler]);
        sonuc.guncellenen++;
      } else {
        const yer = PERSONEL_ALANLARI.map((_, j) => `$${j + 1}`).join(', ');
        await client.query(`INSERT INTO maliyet_personel (${PERSONEL_ALANLARI.join(', ')}) VALUES (${yer})`, degerler);
        sonuc.eklenen++;
      }
      await client.query('RELEASE SAVEPOINT satir');
      } catch (satirHata) {
        await client.query('ROLLBACK TO SAVEPOINT satir');
        sonuc.hatalar.push({ satir: satirNo, mesaj: satirHata.message });
      }
    }
    await client.query('COMMIT');
    res.json(sonuc);
  } catch (err) {
    await client.query('ROLLBACK').catch(() => {});
    next(err);
  } finally {
    client.release();
  }
});

module.exports = router;
