-- ================================================================
-- 003  Test Hazırlama & Değerlendirme Modülü
-- ================================================================

CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- Test Projeleri
CREATE TABLE IF NOT EXISTS test_projeleri (
  id            SERIAL PRIMARY KEY,
  ad            TEXT NOT NULL,
  belge_id      INTEGER REFERENCES belgeler(id) ON DELETE SET NULL,
  belge_metin   TEXT,                          -- RAG için döküman ham metin
  sektor_id     INTEGER REFERENCES sektorler(id),
  departman_id  INTEGER REFERENCES departmanlar(id),
  pozisyon_id   INTEGER REFERENCES pozisyonlar(id),
  yetkinlik_ids INTEGER[],
  soru_sayisi   SMALLINT  DEFAULT 20,
  zorluk        TEXT      DEFAULT 'orta'  CHECK (zorluk IN ('kolay','orta','zor','karisik')),
  sure_dakika   SMALLINT  DEFAULT 45,
  kaynak_modu   TEXT      DEFAULT 'hibrit' CHECK (kaynak_modu IN ('dokuman','havuz','ai','hibrit')),
  dokuman_oran  SMALLINT  DEFAULT 40,      -- % döküman kaynaklı
  havuz_oran    SMALLINT  DEFAULT 30,      -- % soru havuzu kaynaklı
  ai_oran       SMALLINT  DEFAULT 30,      -- % AI üretimli
  durum         TEXT      DEFAULT 'taslak' CHECK (durum IN ('taslak','uretiliyor','hazir','arsivlendi')),
  olusturan_id  INTEGER   REFERENCES kullanicilar(id),
  olusturma     TIMESTAMP DEFAULT NOW(),
  guncelleme    TIMESTAMP DEFAULT NOW()
);

-- Üretilen Test Soruları
CREATE TABLE IF NOT EXISTS test_sorulari (
  id           SERIAL PRIMARY KEY,
  proje_id     INTEGER NOT NULL REFERENCES test_projeleri(id) ON DELETE CASCADE,
  sira_no      SMALLINT,
  soru_metni   TEXT NOT NULL,
  soru_tipi    TEXT DEFAULT 'cok_secmeli'
                 CHECK (soru_tipi IN ('cok_secmeli','dogru_yanlis','acik_uclu','eslestirme')),
  secenekler   JSONB,   -- [{"harf":"A","metin":"..."}, ...]
  dogru_cevap  TEXT,
  aciklama     TEXT,    -- Doğru cevabın açıklaması
  kaynak       TEXT DEFAULT 'ai' CHECK (kaynak IN ('dokuman','havuz','ai')),
  zorluk       TEXT DEFAULT 'orta',
  puan_degeri  SMALLINT DEFAULT 1,
  olusturma    TIMESTAMP DEFAULT NOW()
);

-- Test Oturumları (aday kimlik + süreç)
CREATE TABLE IF NOT EXISTS test_oturumlari (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  proje_id        INTEGER NOT NULL REFERENCES test_projeleri(id),
  aday_ad         TEXT NOT NULL,
  aday_soyad      TEXT NOT NULL,
  aday_eposta     TEXT,
  aday_pozisyon   TEXT,
  aday_sirket     TEXT,
  imza_onay       BOOLEAN DEFAULT FALSE,
  baslangic       TIMESTAMP,
  bitis           TIMESTAMP,
  sure_saniye     INTEGER,
  toplam_puan     NUMERIC(5,2),
  dogru_sayisi    SMALLINT DEFAULT 0,
  yanlis_sayisi   SMALLINT DEFAULT 0,
  bos_sayisi      SMALLINT DEFAULT 0,
  basari_yuzdesi  NUMERIC(5,2),
  durum           TEXT DEFAULT 'beklemede'
                    CHECK (durum IN ('beklemede','devam_ediyor','tamamlandi')),
  olusturma       TIMESTAMP DEFAULT NOW()
);

-- Test Cevapları
CREATE TABLE IF NOT EXISTS test_cevaplari (
  id              SERIAL PRIMARY KEY,
  oturum_id       UUID NOT NULL REFERENCES test_oturumlari(id) ON DELETE CASCADE,
  soru_id         INTEGER NOT NULL REFERENCES test_sorulari(id),
  verilen_cevap   TEXT,
  dogru_mu        BOOLEAN,
  sure_saniye     SMALLINT,
  olusturma       TIMESTAMP DEFAULT NOW()
);

-- Indeks
CREATE INDEX IF NOT EXISTS idx_test_sorulari_proje ON test_sorulari(proje_id);
CREATE INDEX IF NOT EXISTS idx_test_oturumlari_proje ON test_oturumlari(proje_id);
CREATE INDEX IF NOT EXISTS idx_test_cevaplari_oturum ON test_cevaplari(oturum_id);

-- Özet view
CREATE OR REPLACE VIEW v_test_raporu AS
SELECT
  o.id               AS oturum_id,
  o.aday_ad || ' ' || o.aday_soyad AS aday_tam_adi,
  o.aday_eposta,
  o.aday_pozisyon,
  tp.ad              AS proje_adi,
  tp.zorluk,
  tp.sure_dakika,
  s.ad               AS sektor_adi,
  p.ad               AS pozisyon_adi,
  o.baslangic,
  o.bitis,
  o.sure_saniye,
  o.toplam_puan,
  o.dogru_sayisi,
  o.yanlis_sayisi,
  o.bos_sayisi,
  o.basari_yuzdesi,
  o.durum,
  tp.soru_sayisi     AS hedef_soru_sayisi
FROM test_oturumlari o
JOIN test_projeleri tp ON tp.id = o.proje_id
LEFT JOIN sektorler s ON s.id = tp.sektor_id
LEFT JOIN pozisyonlar p ON p.id = tp.pozisyon_id;
