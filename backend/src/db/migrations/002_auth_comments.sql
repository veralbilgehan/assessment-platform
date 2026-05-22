-- ================================================================
-- 002 Auth, Comments, Comparison
-- ================================================================

-- Yetkinlik Yorumları (Olumlu / Olumsuz)
CREATE TABLE IF NOT EXISTS yetkinlik_yorumlari (
  id          SERIAL PRIMARY KEY,
  yetkinlik_id INTEGER NOT NULL REFERENCES yetkinlikler(id) ON DELETE CASCADE,
  pozisyon_id  INTEGER REFERENCES pozisyonlar(id) ON DELETE SET NULL,
  yorum        TEXT NOT NULL,
  tip          TEXT NOT NULL CHECK (tip IN ('olumlu', 'olumsuz')),
  olusturma    TIMESTAMP DEFAULT NOW()
);

-- Kullanıcılar & RBAC
CREATE TABLE IF NOT EXISTS kullanicilar (
  id          SERIAL PRIMARY KEY,
  eposta      TEXT UNIQUE NOT NULL,
  sifre_hash  TEXT NOT NULL,
  ad          TEXT NOT NULL,
  rol         TEXT NOT NULL DEFAULT 'izleyici'
                CHECK (rol IN ('admin', 'degerlendirici', 'izleyici')),
  aktif       BOOLEAN DEFAULT TRUE,
  olusturma   TIMESTAMP DEFAULT NOW()
);

-- Belge Karşılaştırma Sonuçları
CREATE TABLE IF NOT EXISTS karsilastirmalar (
  id              SERIAL PRIMARY KEY,
  belge_id        INTEGER REFERENCES belgeler(id) ON DELETE SET NULL,
  pozisyon_id     INTEGER REFERENCES pozisyonlar(id),
  eslesme_skoru   NUMERIC(5,2),
  eslesme_detay   JSONB,
  ai_rapor        TEXT,
  kullanici_id    INTEGER REFERENCES kullanicilar(id),
  olusturma       TIMESTAMP DEFAULT NOW()
);

-- ----------------------------------------------------------------
-- Seed: Her yetkinlik için örnek olumlu & olumsuz yorumlar
-- ----------------------------------------------------------------
INSERT INTO yetkinlik_yorumlari (yetkinlik_id, yorum, tip)
SELECT y.id, v.yorum, v.tip FROM yetkinlikler y
JOIN (VALUES
  ('%analitik%',    'Veriyi hızlı ve doğru analiz ediyor.',             'olumlu'),
  ('%analitik%',    'Karmaşık verilerde zaman zaman odak kaybı yaşıyor.','olumsuz'),
  ('%iletişim%',    'Hem yazılı hem sözlü iletişimi son derece akıcı.', 'olumlu'),
  ('%iletişim%',    'Teknik olmayan paydaşlarla iletişimde kısalıyor.',  'olumsuz'),
  ('%liderlik%',    'Ekibi motive ederek hedefe yönlendiriyor.',         'olumlu'),
  ('%liderlik%',    'Zor kararları bazen erteleyebiliyor.',              'olumsuz'),
  ('%problem%',     'Kök neden analizinde oldukça sistematik.',          'olumlu'),
  ('%problem%',     'Acil durumlarda panik refleksi gözlemlenebiliyor.', 'olumsuz'),
  ('%takım%',       'İş birliği ve bilgi paylaşımı konusunda model.',   'olumlu'),
  ('%takım%',       'Bireysel çalışmayı zaman zaman tercih ediyor.',    'olumsuz'),
  ('%proje%',       'Termin takibi ve kaynak planlaması güçlü.',         'olumlu'),
  ('%proje%',       'Kapsam değişikliklerini yönetmekte zorlanıyor.',   'olumsuz'),
  ('%satış%',       'İkna becerisi ve müşteri ilişkileri üstün düzeyde.','olumlu'),
  ('%satış%',       'Hedef baskısı altında agresifleşebiliyor.',        'olumsuz'),
  ('%müşteri%',     'Empati ve sabır konusunda örnek davranış.',         'olumlu'),
  ('%müşteri%',     'Şikayet yönetiminde zaman zaman duygusal tepki.', 'olumsuz'),
  ('%strateji%',    'Uzun vadeli perspektif güçlü, büyük resmi görüyor.','olumlu'),
  ('%strateji%',    'Operasyonel detaylara inerek vakit kaybedebiliyor.','olumsuz'),
  ('%teknik%',      'Teknik derinlik son derece güçlü.',                 'olumlu'),
  ('%teknik%',      'Belgeleme ve bilgi transferi alışkanlığı gelişmeli.','olumsuz'),
  ('%yazılım%',     'Temiz, okunabilir kod üretiyor.',                   'olumlu'),
  ('%yazılım%',     'Test kapsamını bazen göz ardı edebiliyor.',         'olumsuz'),
  ('%finans%',      'Mali tabloları hızlı yorumluyor.',                  'olumlu'),
  ('%finans%',      'Risk toleransı düşük, muhafazakâr kararlar alıyor.','olumsuz'),
  ('%insan%',       'Yeteneği tanımada ve geliştirmede başarılı.',      'olumlu'),
  ('%insan%',       'Zor performans görüşmelerini erteleyebiliyor.',     'olumsuz')
) AS v(pat, yorum, tip)
ON y.ad ILIKE v.pat
WHERE NOT EXISTS (
  SELECT 1 FROM yetkinlik_yorumlari WHERE yetkinlik_id = y.id AND tip = v.tip AND yorum = v.yorum
);

-- Genel yorumlar (eşleşmeyen yetkinlikler için)
INSERT INTO yetkinlik_yorumlari (yetkinlik_id, yorum, tip)
SELECT y.id, 'Bu alanda güçlü bir genel performans sergileniyor.', 'olumlu'
FROM yetkinlikler y
WHERE NOT EXISTS (SELECT 1 FROM yetkinlik_yorumlari WHERE yetkinlik_id = y.id AND tip = 'olumlu');

INSERT INTO yetkinlik_yorumlari (yetkinlik_id, yorum, tip)
SELECT y.id, 'Gelişim fırsatları belirlenerek yol haritası çıkarılmalı.', 'olumsuz'
FROM yetkinlikler y
WHERE NOT EXISTS (SELECT 1 FROM yetkinlik_yorumlari WHERE yetkinlik_id = y.id AND tip = 'olumsuz');

-- Admin kullanıcı (şifre: Admin2024!)
-- Hash bcrypt ile uygulama katmanında üretilecek; burada placeholder
-- Gerçek hash app.js'deki migrate() ile eklenir
