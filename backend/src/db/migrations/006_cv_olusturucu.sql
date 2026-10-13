-- ================================================================
-- 006  CV Oluşturucu
-- Kişisel bilgiler sütun, tekrarlı bölümler JSONB olarak tutulur.
-- beceriler: 4M modeli → [{ kategori: 'insan'|'makine'|'metot'|'malzeme', ad, seviye }]
-- ================================================================

CREATE TABLE IF NOT EXISTS cv_profilleri (
  id             SERIAL PRIMARY KEY,
  kullanici_id   INTEGER REFERENCES kullanicilar(id) ON DELETE CASCADE,
  ad_soyad       TEXT NOT NULL,
  unvan          TEXT,
  eposta         TEXT,
  telefon        TEXT,
  adres          TEXT,
  ozet           TEXT,
  egitimler      JSONB NOT NULL DEFAULT '[]',   -- [{ okul, bolum, derece, baslangic, bitis, not_ortalamasi }]
  sertifikalar   JSONB NOT NULL DEFAULT '[]',   -- [{ ad, kurum, tarih, gecerlilik, belge_no }]
  deneyimler     JSONB NOT NULL DEFAULT '[]',   -- [{ sirket, pozisyon, baslangic, bitis, devam_ediyor, aciklama }]
  beceriler      JSONB NOT NULL DEFAULT '[]',   -- 4M: [{ kategori, ad, seviye 1-5 }]
  yetkinlikler   JSONB NOT NULL DEFAULT '[]',   -- [{ ad, seviye 1-5, kanit }]
  olusturma      TIMESTAMP DEFAULT NOW(),
  guncelleme     TIMESTAMP DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_cv_profilleri_kullanici ON cv_profilleri(kullanici_id);
