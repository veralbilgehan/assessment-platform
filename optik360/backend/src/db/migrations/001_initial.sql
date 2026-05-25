-- ================================================================
-- 001  Optik360 ERP — Başlangıç Şeması
-- ================================================================

-- Kullanıcılar & RBAC
CREATE TABLE IF NOT EXISTS kullanicilar (
  id          SERIAL PRIMARY KEY,
  eposta      TEXT UNIQUE NOT NULL,
  sifre_hash  TEXT NOT NULL,
  ad          TEXT NOT NULL,
  soyad       TEXT,
  telefon     TEXT,
  rol         TEXT NOT NULL DEFAULT 'bayi'
                CHECK (rol IN ('super_admin', 'toptanci', 'satis_temsilcisi', 'bayi')),
  aktif       BOOLEAN DEFAULT TRUE,
  olusturuldu TIMESTAMPTZ DEFAULT NOW()
);

-- Markalar
CREATE TABLE IF NOT EXISTS markalar (
  id     SERIAL PRIMARY KEY,
  ad     TEXT NOT NULL,
  aktif  BOOLEAN DEFAULT TRUE
);

-- Kategoriler (hiyerarşik, self-referencing)
CREATE TABLE IF NOT EXISTS kategoriler (
  id              SERIAL PRIMARY KEY,
  ad              TEXT NOT NULL,
  ust_kategori_id INTEGER REFERENCES kategoriler(id) ON DELETE SET NULL,
  aktif           BOOLEAN DEFAULT TRUE
);

-- Ürünler
CREATE TABLE IF NOT EXISTS urunler (
  id                 SERIAL PRIMARY KEY,
  barkod             TEXT UNIQUE,
  sku                TEXT UNIQUE NOT NULL,
  marka_id           INTEGER REFERENCES markalar(id) ON DELETE SET NULL,
  kategori_id        INTEGER REFERENCES kategoriler(id) ON DELETE SET NULL,
  ad                 TEXT NOT NULL,
  model              TEXT,
  renk               TEXT,
  cam_tipi           TEXT,
  cerceve_tipi       TEXT,
  satin_alma_fiyati  NUMERIC(12,2),
  bayi_fiyati        NUMERIC(12,2),
  tavsiye_fiyati     NUMERIC(12,2),
  kampanya_fiyati    NUMERIC(12,2),
  minimum_stok       INTEGER NOT NULL DEFAULT 0,
  raf_yeri           TEXT,
  aktif              BOOLEAN DEFAULT TRUE,
  olusturuldu        TIMESTAMPTZ DEFAULT NOW()
);

-- Depolar
CREATE TABLE IF NOT EXISTS depolar (
  id    SERIAL PRIMARY KEY,
  ad    TEXT NOT NULL,
  tip   TEXT NOT NULL DEFAULT 'merkez'
          CHECK (tip IN ('merkez', 'bolge', 'bayi')),
  aktif BOOLEAN DEFAULT TRUE
);

-- Stok (anlık seviye — depo × ürün)
CREATE TABLE IF NOT EXISTS stok (
  id       SERIAL PRIMARY KEY,
  urun_id  INTEGER NOT NULL REFERENCES urunler(id) ON DELETE CASCADE,
  depo_id  INTEGER NOT NULL REFERENCES depolar(id) ON DELETE CASCADE,
  miktar   INTEGER NOT NULL DEFAULT 0,
  UNIQUE (urun_id, depo_id)
);

-- Stok Hareketleri
CREATE TABLE IF NOT EXISTS stok_hareketleri (
  id            SERIAL PRIMARY KEY,
  urun_id       INTEGER NOT NULL REFERENCES urunler(id),
  depo_id       INTEGER NOT NULL REFERENCES depolar(id),
  tip           TEXT NOT NULL CHECK (tip IN ('giris', 'cikis', 'transfer', 'sayim')),
  miktar        INTEGER NOT NULL,
  referans_id   INTEGER,
  referans_tip  TEXT,
  notlar        TEXT,
  kullanici_id  INTEGER REFERENCES kullanicilar(id),
  olusturuldu   TIMESTAMPTZ DEFAULT NOW()
);

-- Bayiler
CREATE TABLE IF NOT EXISTS bayiler (
  id                   SERIAL PRIMARY KEY,
  kod                  TEXT UNIQUE NOT NULL,
  unvan                TEXT NOT NULL,
  eposta               TEXT,
  telefon              TEXT,
  adres                TEXT,
  il                   TEXT,
  ilce                 TEXT,
  vergi_no             TEXT,
  vergi_dairesi        TEXT,
  seviye               TEXT NOT NULL DEFAULT 'standart'
                         CHECK (seviye IN ('platinum', 'gold', 'silver', 'standart')),
  satis_temsilcisi_id  INTEGER REFERENCES kullanicilar(id) ON DELETE SET NULL,
  aktif                BOOLEAN DEFAULT TRUE,
  olusturuldu          TIMESTAMPTZ DEFAULT NOW()
);

-- Bayi ↔ Kullanıcı eşleşmesi
CREATE TABLE IF NOT EXISTS bayi_kullanicilari (
  id           SERIAL PRIMARY KEY,
  bayi_id      INTEGER NOT NULL REFERENCES bayiler(id) ON DELETE CASCADE,
  kullanici_id INTEGER NOT NULL REFERENCES kullanicilar(id) ON DELETE CASCADE,
  UNIQUE (bayi_id, kullanici_id)
);

-- Cari Hesaplar (her bayi için bir kart)
CREATE TABLE IF NOT EXISTS cari_hesaplar (
  id              SERIAL PRIMARY KEY,
  bayi_id         INTEGER NOT NULL REFERENCES bayiler(id) ON DELETE CASCADE,
  risk_limiti     NUMERIC(14,2) NOT NULL DEFAULT 0,
  guncel_bakiye   NUMERIC(14,2) NOT NULL DEFAULT 0,
  varsayilan_vade INTEGER NOT NULL DEFAULT 30,
  aktif           BOOLEAN DEFAULT TRUE,
  guncellendi     TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE (bayi_id)
);

-- Cari Hareketler
CREATE TABLE IF NOT EXISTS cari_hareketler (
  id            SERIAL PRIMARY KEY,
  bayi_id       INTEGER NOT NULL REFERENCES bayiler(id),
  tip           TEXT NOT NULL CHECK (tip IN ('borclanma', 'odeme', 'iade', 'iskonto')),
  tutar         NUMERIC(14,2) NOT NULL,
  vade_tarihi   DATE,
  referans_id   INTEGER,
  referans_tip  TEXT,
  aciklama      TEXT,
  kullanici_id  INTEGER REFERENCES kullanicilar(id),
  olusturuldu   TIMESTAMPTZ DEFAULT NOW()
);

-- Siparişler
CREATE TABLE IF NOT EXISTS siparisler (
  id            SERIAL PRIMARY KEY,
  siparis_no    TEXT UNIQUE NOT NULL,
  bayi_id       INTEGER NOT NULL REFERENCES bayiler(id),
  kullanici_id  INTEGER REFERENCES kullanicilar(id),
  durum         TEXT NOT NULL DEFAULT 'taslak'
                  CHECK (durum IN ('taslak','onay_bekliyor','hazirlaniyor',
                                   'kargoda','teslim_edildi','tamamlandi','iptal')),
  toplam_tutar  NUMERIC(14,2) NOT NULL DEFAULT 0,
  kdv_tutari    NUMERIC(14,2) NOT NULL DEFAULT 0,
  genel_toplam  NUMERIC(14,2) NOT NULL DEFAULT 0,
  vade_gun      INTEGER NOT NULL DEFAULT 30,
  notlar        TEXT,
  olusturuldu   TIMESTAMPTZ DEFAULT NOW(),
  guncellendi   TIMESTAMPTZ DEFAULT NOW()
);

-- Sipariş Kalemleri
CREATE TABLE IF NOT EXISTS siparis_kalemleri (
  id               SERIAL PRIMARY KEY,
  siparis_id       INTEGER NOT NULL REFERENCES siparisler(id) ON DELETE CASCADE,
  urun_id          INTEGER NOT NULL REFERENCES urunler(id),
  miktar           INTEGER NOT NULL,
  birim_fiyat      NUMERIC(12,2) NOT NULL,
  iskonto_yuzdesi  NUMERIC(5,2) NOT NULL DEFAULT 0,
  kdv_yuzdesi      NUMERIC(5,2) NOT NULL DEFAULT 20,
  toplam           NUMERIC(14,2) NOT NULL
);

-- Faturalar
CREATE TABLE IF NOT EXISTS faturalar (
  id             SERIAL PRIMARY KEY,
  fatura_no      TEXT UNIQUE NOT NULL,
  siparis_id     INTEGER REFERENCES siparisler(id) ON DELETE SET NULL,
  bayi_id        INTEGER NOT NULL REFERENCES bayiler(id),
  durum          TEXT NOT NULL DEFAULT 'acik'
                   CHECK (durum IN ('acik', 'kismi_odendi', 'odendi', 'gecikti')),
  toplam_tutar   NUMERIC(14,2) NOT NULL,
  odenen_tutar   NUMERIC(14,2) NOT NULL DEFAULT 0,
  kalan_tutar    NUMERIC(14,2) NOT NULL,
  vade_tarihi    DATE NOT NULL,
  olusturuldu    TIMESTAMPTZ DEFAULT NOW()
);

-- Tahsilatlar
CREATE TABLE IF NOT EXISTS tahsilatlar (
  id                SERIAL PRIMARY KEY,
  tahsilat_no       TEXT UNIQUE NOT NULL,
  bayi_id           INTEGER NOT NULL REFERENCES bayiler(id),
  fatura_id         INTEGER REFERENCES faturalar(id) ON DELETE SET NULL,
  tutar             NUMERIC(14,2) NOT NULL,
  odeme_yontemi     TEXT NOT NULL
                      CHECK (odeme_yontemi IN ('kredi_karti','havale','nakit','cek','senet')),
  taksit_sayisi     INTEGER NOT NULL DEFAULT 1,
  komisyon_yuzdesi  NUMERIC(5,2) NOT NULL DEFAULT 0,
  komisyon_tutari   NUMERIC(12,2) NOT NULL DEFAULT 0,
  durum             TEXT NOT NULL DEFAULT 'bekliyor'
                      CHECK (durum IN ('bekliyor','tamamlandi','iptal','iade')),
  onay_kodu         TEXT,
  odeme_tarihi      DATE,
  aciklama          TEXT,
  kullanici_id      INTEGER REFERENCES kullanicilar(id),
  olusturuldu       TIMESTAMPTZ DEFAULT NOW()
);

-- ================================================================
-- Trigger: Tahsilat tamamlandığında cari hesabı güncelle
-- ================================================================
CREATE OR REPLACE FUNCTION fn_tahsilat_sonrasi()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.durum = 'tamamlandi' AND (OLD.durum IS NULL OR OLD.durum <> 'tamamlandi') THEN
    -- Cari harekete odeme ekle
    INSERT INTO cari_hareketler (bayi_id, tip, tutar, referans_id, referans_tip, aciklama, kullanici_id)
    VALUES (NEW.bayi_id, 'odeme', NEW.tutar, NEW.id, 'tahsilat', NEW.tahsilat_no, NEW.kullanici_id);

    -- Bakiyeyi güncelle (bakiye = toplam borç)
    UPDATE cari_hesaplar
    SET guncel_bakiye = guncel_bakiye - NEW.tutar,
        guncellendi   = NOW()
    WHERE bayi_id = NEW.bayi_id;

    -- Fatura durumunu güncelle
    IF NEW.fatura_id IS NOT NULL THEN
      UPDATE faturalar
      SET odenen_tutar = odenen_tutar + NEW.tutar,
          kalan_tutar  = kalan_tutar  - NEW.tutar,
          durum = CASE
            WHEN kalan_tutar - NEW.tutar <= 0 THEN 'odendi'
            ELSE 'kismi_odendi'
          END
      WHERE id = NEW.fatura_id;
    END IF;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_tahsilat_sonrasi
  AFTER INSERT OR UPDATE ON tahsilatlar
  FOR EACH ROW EXECUTE FUNCTION fn_tahsilat_sonrasi();

-- ================================================================
-- Trigger: Fatura oluşturulduğunda cari borçlandır
-- ================================================================
CREATE OR REPLACE FUNCTION fn_fatura_sonrasi()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    INSERT INTO cari_hareketler (bayi_id, tip, tutar, vade_tarihi, referans_id, referans_tip, aciklama)
    VALUES (NEW.bayi_id, 'borclanma', NEW.toplam_tutar, NEW.vade_tarihi, NEW.id, 'fatura', NEW.fatura_no);

    UPDATE cari_hesaplar
    SET guncel_bakiye = guncel_bakiye + NEW.toplam_tutar,
        guncellendi   = NOW()
    WHERE bayi_id = NEW.bayi_id;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_fatura_sonrasi
  AFTER INSERT ON faturalar
  FOR EACH ROW EXECUTE FUNCTION fn_fatura_sonrasi();

-- ================================================================
-- Seed: Varsayılan depo
-- ================================================================
INSERT INTO depolar (ad, tip) VALUES ('Merkez Depo', 'merkez') ON CONFLICT DO NOTHING;

-- ================================================================
-- Seed: Varsayılan admin kullanıcı (şifre: Admin123!)
-- ================================================================
INSERT INTO kullanicilar (eposta, sifre_hash, ad, soyad, rol)
VALUES (
  'admin@optik360.com',
  '$2b$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi',
  'Sistem',
  'Yöneticisi',
  'super_admin'
) ON CONFLICT (eposta) DO NOTHING;
