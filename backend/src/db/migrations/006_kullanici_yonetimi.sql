-- ----------------------------------------------------------------
-- 006 — Kullanıcı yönetimi: şifre sıfırlama, kayıt talebi, davet,
--        düzenlenebilir e-posta şablonları
-- ----------------------------------------------------------------

ALTER TABLE kullanicilar ADD COLUMN IF NOT EXISTS soyad         TEXT;
ALTER TABLE kullanicilar ADD COLUMN IF NOT EXISTS sirket        TEXT;
ALTER TABLE kullanicilar ADD COLUMN IF NOT EXISTS onay_bekliyor BOOLEAN DEFAULT FALSE;
ALTER TABLE kullanicilar ADD COLUMN IF NOT EXISTS son_giris     TIMESTAMP;

-- Şifre sıfırlama / şifre belirleme bağlantıları (token'ın yalnızca SHA-256 özeti saklanır)
CREATE TABLE IF NOT EXISTS kullanici_tokenlari (
  id            SERIAL PRIMARY KEY,
  kullanici_id  INTEGER NOT NULL REFERENCES kullanicilar(id) ON DELETE CASCADE,
  token_hash    TEXT UNIQUE NOT NULL,
  son_kullanma  TIMESTAMP NOT NULL,
  kullanildi    TIMESTAMP,
  olusturma     TIMESTAMP DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_kullanici_tokenlari_kullanici ON kullanici_tokenlari(kullanici_id);

-- Kullanıcı davetleri
CREATE TABLE IF NOT EXISTS davetler (
  id             SERIAL PRIMARY KEY,
  eposta         TEXT NOT NULL,
  ad             TEXT,
  soyad          TEXT,
  sirket         TEXT,
  rol            TEXT NOT NULL DEFAULT 'izleyici'
                   CHECK (rol IN ('admin', 'degerlendirici', 'izleyici')),
  token_hash     TEXT UNIQUE NOT NULL,
  durum          TEXT NOT NULL DEFAULT 'bekliyor'
                   CHECK (durum IN ('bekliyor', 'kabul_edildi', 'iptal')),
  davet_eden_id  INTEGER REFERENCES kullanicilar(id) ON DELETE SET NULL,
  son_kullanma   TIMESTAMP NOT NULL,
  kabul_tarihi   TIMESTAMP,
  olusturma      TIMESTAMP DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_davetler_eposta ON davetler(LOWER(eposta));

-- Admin'in düzenlediği e-posta şablonları (kayıt yoksa koddaki varsayılan kullanılır)
CREATE TABLE IF NOT EXISTS email_sablonlari (
  anahtar     TEXT PRIMARY KEY,
  baslik      TEXT NOT NULL,
  konu        TEXT NOT NULL,
  html        TEXT NOT NULL,
  guncelleme  TIMESTAMP DEFAULT NOW()
);
