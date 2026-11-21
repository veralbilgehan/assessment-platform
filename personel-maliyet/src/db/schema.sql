-- ----------------------------------------------------------------
-- Personel maliyet şeması: bölümler, personel ücret/yan hak
--        bilgileri, iş yeri giderleri ve yıl bazlı yasal parametreler
--        Idempotent: sunucu her açılışta güvenle çalıştırır.
-- ----------------------------------------------------------------

CREATE TABLE IF NOT EXISTS maliyet_bolumler (
  id         SERIAL PRIMARY KEY,
  ad         TEXT UNIQUE NOT NULL,
  olusturma  TIMESTAMP DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS maliyet_personel (
  id                      SERIAL PRIMARY KEY,
  sicil_no                TEXT UNIQUE,
  ad_soyad                TEXT NOT NULL,
  bolum_id                INTEGER REFERENCES maliyet_bolumler(id) ON DELETE SET NULL,
  unvan                   TEXT,
  ise_giris               DATE,
  brut_maas               NUMERIC(14,2) NOT NULL DEFAULT 0,   -- aylık brüt
  yillik_prim             NUMERIC(14,2) NOT NULL DEFAULT 0,   -- yıllık ikramiye + prim toplamı
  fazla_mesai_saat        NUMERIC(8,2)  NOT NULL DEFAULT 0,   -- aylık ortalama fazla mesai saati
  yemek                   NUMERIC(12,2) NOT NULL DEFAULT 0,   -- aylık
  yol                     NUMERIC(12,2) NOT NULL DEFAULT 0,   -- aylık
  saglik_sigortasi        NUMERIC(12,2) NOT NULL DEFAULT 0,   -- aylık
  bes_katki               NUMERIC(12,2) NOT NULL DEFAULT 0,   -- aylık işveren katkısı
  diger_yan_hak           NUMERIC(12,2) NOT NULL DEFAULT 0,   -- aylık (telefon, araç, kıyafet…)
  sgk_tesvik              BOOLEAN NOT NULL DEFAULT TRUE,      -- 5 puanlık işveren teşviki uygulanıyor mu
  izin_gun                NUMERIC(5,1),                       -- boşsa kıdeme göre yasal süre
  rapor_gun               NUMERIC(5,1) NOT NULL DEFAULT 0,    -- yıllık ortalama raporlu gün
  aktif                   BOOLEAN NOT NULL DEFAULT TRUE,
  olusturma               TIMESTAMP DEFAULT NOW(),
  guncelleme              TIMESTAMP DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_maliyet_personel_bolum ON maliyet_personel(bolum_id);

-- Kira, elektrik, İSG, lisans vb. aylık giderler; aktif personel sayısına bölünerek dağıtılır
CREATE TABLE IF NOT EXISTS maliyet_isyeri_giderleri (
  id           SERIAL PRIMARY KEY,
  ad           TEXT NOT NULL,
  kategori     TEXT,
  aylik_tutar  NUMERIC(14,2) NOT NULL DEFAULT 0,
  olusturma    TIMESTAMP DEFAULT NOW()
);

-- Oranlar yüzde olarak tutulur (20.75 = %20,75). Her yıl admin tarafından teyit edilip güncellenmelidir.
CREATE TABLE IF NOT EXISTS maliyet_parametreler (
  yil                    INTEGER PRIMARY KEY,
  sgk_isveren_oran       NUMERIC(6,3)  NOT NULL DEFAULT 20.75,
  sgk_tesvik_puan        NUMERIC(6,3)  NOT NULL DEFAULT 5,
  issizlik_isveren_oran  NUMERIC(6,3)  NOT NULL DEFAULT 2,
  sgk_tavan              NUMERIC(14,2),                      -- aylık prime esas kazanç üst sınırı; boşsa uygulanmaz
  kidem_tavani           NUMERIC(14,2),                      -- boşsa uygulanmaz
  fazla_mesai_carpan     NUMERIC(5,2)  NOT NULL DEFAULT 1.5,
  haftalik_saat          NUMERIC(5,2)  NOT NULL DEFAULT 45,
  gunluk_saat            NUMERIC(5,2)  NOT NULL DEFAULT 7.5,
  resmi_tatil_gun        NUMERIC(5,1)  NOT NULL DEFAULT 14.5,
  guncelleme             TIMESTAMP DEFAULT NOW()
);
