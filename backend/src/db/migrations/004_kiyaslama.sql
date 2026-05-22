-- ================================================================
-- 004  Aday CV Kıyaslama & Puanlama Matrisi
-- ================================================================

-- Kıyaslama Kriterleri (dinamik, çoğaltılabilir)
CREATE TABLE IF NOT EXISTS kiyaslama_kriterleri (
  id          SERIAL PRIMARY KEY,
  kategori    TEXT NOT NULL
                CHECK (kategori IN ('performans','deneyim','egitim','sertifika','ozel')),
  ad          TEXT NOT NULL,
  aciklama    TEXT,
  agirlik     NUMERIC(5,2) NOT NULL DEFAULT 10,
  aktif       BOOLEAN DEFAULT TRUE,
  sira_no     SMALLINT DEFAULT 0,
  olusturma   TIMESTAMP DEFAULT NOW()
);

-- Kıyaslama Oturumları
CREATE TABLE IF NOT EXISTS kiyaslamalar (
  id             SERIAL PRIMARY KEY,
  baslik         TEXT,
  pozisyon_id    INTEGER REFERENCES pozisyonlar(id),
  pozisyon_acik  TEXT,
  sektor_id      INTEGER REFERENCES sektorler(id),
  aday_a_ad      TEXT NOT NULL,
  aday_a_metin   TEXT,
  aday_b_ad      TEXT NOT NULL,
  aday_b_metin   TEXT,
  ai_ozet        TEXT,
  kazanan        TEXT CHECK (kazanan IN ('A','B','esit')),
  aday_a_toplam  NUMERIC(5,2),
  aday_b_toplam  NUMERIC(5,2),
  olusturan_id   INTEGER REFERENCES kullanicilar(id),
  olusturma      TIMESTAMP DEFAULT NOW()
);

-- Puanlar (kriter × aday)
CREATE TABLE IF NOT EXISTS kiyaslama_puanlari (
  id             SERIAL PRIMARY KEY,
  kiyaslama_id   INTEGER NOT NULL REFERENCES kiyaslamalar(id) ON DELETE CASCADE,
  kriter_id      INTEGER NOT NULL REFERENCES kiyaslama_kriterleri(id),
  aday           CHAR(1) NOT NULL CHECK (aday IN ('A','B')),
  puan           NUMERIC(3,1) NOT NULL CHECK (puan BETWEEN 0 AND 10),
  ai_aciklama    TEXT,
  el_ile_mi      BOOLEAN DEFAULT FALSE,
  olusturma      TIMESTAMP DEFAULT NOW()
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_kiy_puan_uniq ON kiyaslama_puanlari(kiyaslama_id, kriter_id, aday);

-- ── Varsayılan kriterler ──────────────────────────────────────
INSERT INTO kiyaslama_kriterleri (kategori, ad, aciklama, agirlik, sira_no) VALUES
  ('performans', 'İş Bitirme Skoru',        'Başarıyla tamamlanan proje sayısı ve büyüklüğü',                   20, 1),
  ('performans', 'Sürece Katılım Oranı',    'Projelerde liderlik ve operasyonel katkı düzeyi',                  15, 2),
  ('performans', 'İş Alakası (Domain Fit)', 'Geçmişte bitirilen işlerin pozisyonla doğrudan ilgisi',            0,  3),
  ('deneyim',    'Deneyim Süresi (Yıl)',    'Tam olarak hedeflenen rolde harcanan süre',                        15, 4),
  ('deneyim',    'Alan Hakimiyeti',         'Sektördeki araçlara, trendlere ve iş ağlarına hakimiyet',          15, 5),
  ('deneyim',    'İstikrar Katsayısı',      'Şirketlerde kalma süresi (sık değiştirme = düşük puan)',           0,  6),
  ('egitim',     'Mezuniyet Durumu',        'Üniversite mezuniyeti ve bölüm uyumu',                             10, 7),
  ('egitim',     'Yüksek Lisans',           'Yüksek lisans sahibi olma ve pozisyona katkısı',                   10, 8),
  ('sertifika',  'Profesyonel Sertifikalar','Akredite sertifika sayısı ve niteliği',                            15, 9)
ON CONFLICT DO NOTHING;

-- Ağırlık toplamını 100'e tamamla (İş Alakası ve İstikrar'ı doldur)
UPDATE kiyaslama_kriterleri SET agirlik = 10 WHERE ad = 'İş Alakası (Domain Fit)' AND agirlik = 0;
UPDATE kiyaslama_kriterleri SET agirlik = 10 WHERE ad = 'İstikrar Katsayısı'      AND agirlik = 0;

-- ── Özet view ────────────────────────────────────────────────
CREATE OR REPLACE VIEW v_kiyaslama_ozet AS
SELECT
  k.id, k.baslik, k.pozisyon_acik,
  k.aday_a_ad, k.aday_a_toplam,
  k.aday_b_ad, k.aday_b_toplam,
  k.kazanan, k.olusturma,
  s.ad AS sektor_adi, p.ad AS pozisyon_adi
FROM kiyaslamalar k
LEFT JOIN sektorler s ON s.id = k.sektor_id
LEFT JOIN pozisyonlar p ON p.id = k.pozisyon_id;
