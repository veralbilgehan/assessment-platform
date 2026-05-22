-- ================================================================
-- 005  Ücretsiz Deneme Testi & Evrak Yönetimi
-- ================================================================

-- Ücretsiz deneme yüklemeleri (IP bazlı limit takibi)
CREATE TABLE IF NOT EXISTS deneme_yuklemeler (
  id            SERIAL PRIMARY KEY,
  ip_adresi     TEXT,
  kullanici_id  INTEGER REFERENCES kullanicilar(id),
  dosya_adi     TEXT,
  dosya_tipi    TEXT,                        -- 'excel' | 'csv' | 'pdf'
  ham_metin     TEXT,                        -- extracted raw text
  rapor_json    JSONB,                       -- AI-parsed report data
  aday_ad       TEXT,
  basari_yuzdesi NUMERIC(5,2),
  olusturma     TIMESTAMP DEFAULT NOW()
);

-- Evrak Kutusu meta verileri (her kaynak için etiket/notlar)
CREATE TABLE IF NOT EXISTS evrak_etiketler (
  id         SERIAL PRIMARY KEY,
  kaynak_tip TEXT NOT NULL CHECK (kaynak_tip IN ('belge','test','rapor','deneme')),
  kaynak_id  INTEGER NOT NULL,
  etiket     TEXT,
  notlar     TEXT,
  yildizli   BOOLEAN DEFAULT FALSE,
  olusturma  TIMESTAMP DEFAULT NOW(),
  UNIQUE (kaynak_tip, kaynak_id)
);

-- Birleşik evrak görünümü — id her tip için TEXT'e dönüştürülür
CREATE OR REPLACE VIEW v_evrak_kutusu AS
  SELECT b.id::TEXT AS id, 'belge'::TEXT AS tip,
         b.orijinal_ad AS dosya_adi, LENGTH(b.icerik) AS boyut_byte,
         b.olusturma AS tarih, NULL::TEXT AS durum,
         NULL::NUMERIC AS basari_yuzdesi, NULL::TEXT AS aday_ad
  FROM belgeler b

  UNION ALL

  SELECT tp.id::TEXT, 'test'::TEXT,
         tp.ad, NULL::INTEGER, tp.olusturma, tp.durum,
         NULL::NUMERIC, NULL::TEXT
  FROM test_projeleri tp

  UNION ALL

  SELECT o.id::TEXT, 'rapor'::TEXT,
         CONCAT(o.aday_ad,' ',o.aday_soyad,' — ',tp.ad), NULL::INTEGER,
         COALESCE(o.bitis, o.baslangic), o.durum,
         o.basari_yuzdesi, CONCAT(o.aday_ad,' ',o.aday_soyad)
  FROM test_oturumlari o
  JOIN test_projeleri tp ON tp.id=o.proje_id
  WHERE o.durum='tamamlandi'

  UNION ALL

  SELECT dy.id::TEXT, 'deneme'::TEXT,
         COALESCE(dy.dosya_adi,'Deneme Raporu'), NULL::INTEGER,
         dy.olusturma, 'tamamlandi'::TEXT,
         dy.basari_yuzdesi, dy.aday_ad
  FROM deneme_yuklemeler dy;
