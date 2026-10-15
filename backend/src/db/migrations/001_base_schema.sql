-- ================================================================
-- 001 Temel Şema — Tablolar, Görünümler, Fonksiyonlar ve Seed Verisi
-- ================================================================

-- ----------------------------------------------------------------
-- TABLOLAR
-- ----------------------------------------------------------------

CREATE TABLE IF NOT EXISTS sektorler (
  id         SERIAL PRIMARY KEY,
  nace_kodu  TEXT,
  ad         TEXT NOT NULL,
  aciklama   TEXT,
  aktif      BOOLEAN DEFAULT TRUE
);

CREATE TABLE IF NOT EXISTS departmanlar (
  id         SERIAL PRIMARY KEY,
  sektor_id  INTEGER NOT NULL REFERENCES sektorler(id) ON DELETE CASCADE,
  ad         TEXT NOT NULL,
  aciklama   TEXT,
  aktif      BOOLEAN DEFAULT TRUE
);

CREATE TABLE IF NOT EXISTS pozisyonlar (
  id            SERIAL PRIMARY KEY,
  departman_id  INTEGER NOT NULL REFERENCES departmanlar(id) ON DELETE CASCADE,
  ad            TEXT NOT NULL,
  seviye        TEXT CHECK (seviye IN (
                  'stajyer','junior','uzman','kıdemli_uzman',
                  'takım_lideri','yönetici','direktör','c_seviyesi'
                )),
  aciklama      TEXT,
  aktif         BOOLEAN DEFAULT TRUE
);

CREATE TABLE IF NOT EXISTS yetkinlik_kategorileri (
  id         SERIAL PRIMARY KEY,
  ad         TEXT NOT NULL,
  renk_kodu  TEXT
);

CREATE TABLE IF NOT EXISTS yetkinlikler (
  id              SERIAL PRIMARY KEY,
  kategori_id     INTEGER NOT NULL REFERENCES yetkinlik_kategorileri(id),
  ad              TEXT NOT NULL,
  aciklama        TEXT,
  olcum_yontemi   TEXT,
  aktif           BOOLEAN DEFAULT TRUE
);

CREATE TABLE IF NOT EXISTS pozisyon_yetkinlikleri (
  pozisyon_id   INTEGER NOT NULL REFERENCES pozisyonlar(id) ON DELETE CASCADE,
  yetkinlik_id  INTEGER NOT NULL REFERENCES yetkinlikler(id) ON DELETE CASCADE,
  agirlik       INTEGER DEFAULT 3 CHECK (agirlik BETWEEN 1 AND 5),
  zorunlu       BOOLEAN DEFAULT FALSE,
  PRIMARY KEY (pozisyon_id, yetkinlik_id)
);

CREATE TABLE IF NOT EXISTS soru_tipleri (
  id  SERIAL PRIMARY KEY,
  ad  TEXT NOT NULL UNIQUE CHECK (ad IN ('cok_secmeli','dogru_yanlis','acik_uclu','eslestirme'))
);

CREATE TABLE IF NOT EXISTS soru_havuzu (
  id            SERIAL PRIMARY KEY,
  yetkinlik_id  INTEGER NOT NULL REFERENCES yetkinlikler(id) ON DELETE CASCADE,
  soru_metni    TEXT NOT NULL,
  soru_tipi_id  INTEGER NOT NULL REFERENCES soru_tipleri(id),
  zorluk        SMALLINT DEFAULT 2 CHECK (zorluk BETWEEN 1 AND 3),
  secenekler    JSONB,
  sure_saniye   INTEGER DEFAULT 60,
  aktif         BOOLEAN DEFAULT TRUE
);

CREATE TABLE IF NOT EXISTS makale_sablonlari (
  id  SERIAL PRIMARY KEY,
  ad  TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS degerlendirmeler (
  id              SERIAL PRIMARY KEY,
  pozisyon_id     INTEGER NOT NULL REFERENCES pozisyonlar(id) ON DELETE RESTRICT,
  aday_ad         TEXT,
  aday_eposta     TEXT,
  sablon_id       INTEGER REFERENCES makale_sablonlari(id) ON DELETE SET NULL,
  uretilen_makale TEXT,
  durum           TEXT NOT NULL DEFAULT 'taslak' CHECK (durum IN ('taslak','tamamlandi')),
  olusturma       TIMESTAMP DEFAULT NOW(),
  tamamlanma      TIMESTAMP
);

CREATE TABLE IF NOT EXISTS degerlendirme_sorulari (
  degerlendirme_id  INTEGER NOT NULL REFERENCES degerlendirmeler(id) ON DELETE CASCADE,
  soru_id           INTEGER NOT NULL REFERENCES soru_havuzu(id) ON DELETE CASCADE,
  sira_no           SMALLINT,
  PRIMARY KEY (degerlendirme_id, soru_id)
);

CREATE TABLE IF NOT EXISTS degerlendirme_puanlari (
  degerlendirme_id  INTEGER NOT NULL REFERENCES degerlendirmeler(id) ON DELETE CASCADE,
  yetkinlik_id      INTEGER NOT NULL REFERENCES yetkinlikler(id) ON DELETE CASCADE,
  puan              INTEGER CHECK (puan BETWEEN 1 AND 5),
  degerlendirici_notu TEXT,
  UNIQUE (degerlendirme_id, yetkinlik_id)
);

CREATE TABLE IF NOT EXISTS belgeler (
  id               SERIAL PRIMARY KEY,
  orijinal_ad      TEXT NOT NULL,
  mime_type        TEXT,
  icerik           TEXT,
  ai_konu          TEXT,
  ai_bilgi         JSONB,
  ai_makale        TEXT,
  izin_durumu      TEXT CHECK (izin_durumu IN ('izin_verildi','izin_verilmedi')),
  benim_icin_sakla BOOLEAN DEFAULT FALSE,
  olusturma        TIMESTAMP DEFAULT NOW()
);

-- ----------------------------------------------------------------
-- GÖRÜNÜMLER
-- ----------------------------------------------------------------

CREATE OR REPLACE VIEW v_hiyerarsi AS
SELECT
  s.id        AS sektor_id,
  s.nace_kodu,
  s.ad        AS sektor_adi,
  d.id        AS departman_id,
  d.ad        AS departman_adi,
  p.id        AS pozisyon_id,
  p.ad        AS pozisyon_adi,
  p.seviye
FROM sektorler s
JOIN departmanlar d ON d.sektor_id = s.id
JOIN pozisyonlar  p ON p.departman_id = d.id
WHERE s.aktif = TRUE AND d.aktif = TRUE AND p.aktif = TRUE;

CREATE OR REPLACE VIEW v_degerlendirme_ozet AS
SELECT
  d.id            AS degerlendirme_id,
  d.aday_ad,
  d.aday_eposta,
  d.pozisyon_id,
  p.ad            AS pozisyon_adi,
  p.seviye,
  dep.id          AS departman_id,
  dep.ad          AS departman_adi,
  s.id            AS sektor_id,
  s.ad            AS sektor_adi,
  d.sablon_id,
  ms.ad           AS sablon_adi,
  d.durum,
  d.olusturma,
  d.tamamlanma,
  COUNT(DISTINCT dp.yetkinlik_id)   AS puanlanan_yetkinlik_sayisi,
  ROUND(AVG(dp.puan)::NUMERIC, 2)   AS ortalama_puan
FROM degerlendirmeler d
JOIN pozisyonlar       p   ON p.id   = d.pozisyon_id
JOIN departmanlar      dep ON dep.id = p.departman_id
JOIN sektorler         s   ON s.id   = dep.sektor_id
LEFT JOIN makale_sablonlari ms ON ms.id = d.sablon_id
LEFT JOIN degerlendirme_puanlari dp ON dp.degerlendirme_id = d.id
GROUP BY d.id, d.aday_ad, d.aday_eposta, d.pozisyon_id,
         p.ad, p.seviye, dep.id, dep.ad, s.id, s.ad,
         d.sablon_id, ms.ad, d.durum, d.olusturma, d.tamamlanma;

CREATE OR REPLACE VIEW v_pozisyon_yetkinlik_profili AS
SELECT
  py.pozisyon_id,
  y.id            AS yetkinlik_id,
  y.ad            AS yetkinlik_adi,
  y.aciklama,
  y.olcum_yontemi,
  yk.ad           AS kategori_adi,
  yk.renk_kodu,
  py.agirlik,
  py.zorunlu
FROM pozisyon_yetkinlikleri py
JOIN yetkinlikler          y  ON y.id  = py.yetkinlik_id
JOIN yetkinlik_kategorileri yk ON yk.id = y.kategori_id
WHERE y.aktif = TRUE;

-- ----------------------------------------------------------------
-- FONKSİYONLAR
-- ----------------------------------------------------------------

CREATE OR REPLACE FUNCTION degerlendirme_olustur(
  p_pozisyon_id  INTEGER,
  p_aday_ad      TEXT DEFAULT NULL,
  p_aday_eposta  TEXT DEFAULT NULL
) RETURNS INTEGER AS $$
DECLARE
  v_id    INTEGER;
  v_soru  INTEGER;
  v_sira  SMALLINT := 1;
BEGIN
  INSERT INTO degerlendirmeler (pozisyon_id, aday_ad, aday_eposta)
  VALUES (p_pozisyon_id, p_aday_ad, p_aday_eposta)
  RETURNING id INTO v_id;

  FOR v_soru IN
    SELECT sh.id
    FROM soru_havuzu sh
    JOIN pozisyon_yetkinlikleri py ON py.yetkinlik_id = sh.yetkinlik_id
    WHERE py.pozisyon_id = p_pozisyon_id AND sh.aktif = TRUE
    ORDER BY random()
    LIMIT 10
  LOOP
    INSERT INTO degerlendirme_sorulari (degerlendirme_id, soru_id, sira_no)
    VALUES (v_id, v_soru, v_sira)
    ON CONFLICT DO NOTHING;
    v_sira := v_sira + 1;
  END LOOP;

  RETURN v_id;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION pozisyon_test_sorulari(
  p_pozisyon_id  INTEGER,
  p_kolay        INTEGER DEFAULT 3,
  p_orta         INTEGER DEFAULT 5,
  p_zor          INTEGER DEFAULT 2
) RETURNS TABLE (
  id            INTEGER,
  yetkinlik_id  INTEGER,
  soru_metni    TEXT,
  soru_tipi     TEXT,
  zorluk        SMALLINT,
  secenekler    JSONB,
  sure_saniye   INTEGER,
  yetkinlik_adi TEXT
) AS $$
BEGIN
  RETURN QUERY
  (
    SELECT sh.id, sh.yetkinlik_id, sh.soru_metni, st.ad::TEXT,
           sh.zorluk, sh.secenekler, sh.sure_saniye, y.ad::TEXT
    FROM soru_havuzu sh
    JOIN soru_tipleri st ON st.id = sh.soru_tipi_id
    JOIN yetkinlikler  y  ON y.id  = sh.yetkinlik_id
    JOIN pozisyon_yetkinlikleri py ON py.yetkinlik_id = sh.yetkinlik_id
    WHERE py.pozisyon_id = p_pozisyon_id AND sh.aktif = TRUE AND sh.zorluk = 1
    ORDER BY random() LIMIT p_kolay
  )
  UNION ALL
  (
    SELECT sh.id, sh.yetkinlik_id, sh.soru_metni, st.ad::TEXT,
           sh.zorluk, sh.secenekler, sh.sure_saniye, y.ad::TEXT
    FROM soru_havuzu sh
    JOIN soru_tipleri st ON st.id = sh.soru_tipi_id
    JOIN yetkinlikler  y  ON y.id  = sh.yetkinlik_id
    JOIN pozisyon_yetkinlikleri py ON py.yetkinlik_id = sh.yetkinlik_id
    WHERE py.pozisyon_id = p_pozisyon_id AND sh.aktif = TRUE AND sh.zorluk = 2
    ORDER BY random() LIMIT p_orta
  )
  UNION ALL
  (
    SELECT sh.id, sh.yetkinlik_id, sh.soru_metni, st.ad::TEXT,
           sh.zorluk, sh.secenekler, sh.sure_saniye, y.ad::TEXT
    FROM soru_havuzu sh
    JOIN soru_tipleri st ON st.id = sh.soru_tipi_id
    JOIN yetkinlikler  y  ON y.id  = sh.yetkinlik_id
    JOIN pozisyon_yetkinlikleri py ON py.yetkinlik_id = sh.yetkinlik_id
    WHERE py.pozisyon_id = p_pozisyon_id AND sh.aktif = TRUE AND sh.zorluk = 3
    ORDER BY random() LIMIT p_zor
  );
END;
$$ LANGUAGE plpgsql;

-- ----------------------------------------------------------------
-- SEED VERİSİ
-- ----------------------------------------------------------------

-- Soru Tipleri
INSERT INTO soru_tipleri (ad) VALUES
  ('cok_secmeli'),
  ('dogru_yanlis'),
  ('acik_uclu'),
  ('eslestirme')
ON CONFLICT (ad) DO NOTHING;

-- Yetkinlik Kategorileri
INSERT INTO yetkinlik_kategorileri (id, ad, renk_kodu) VALUES
  (1, 'Teknik',    '#3B82F6'),
  (2, 'Liderlik',  '#8B5CF6'),
  (3, 'İletişim',  '#10B981'),
  (4, 'Analitik',  '#F59E0B'),
  (5, 'Kişisel',   '#EC4899'),
  (6, 'Sektörel',  '#6B7280')
ON CONFLICT (id) DO NOTHING;

-- Yetkinlikler (1-30)
INSERT INTO yetkinlikler (id, kategori_id, ad, aciklama, olcum_yontemi) VALUES
  -- Teknik (1-7)
  (1,  1, 'Kod Kalitesi',            'Temiz, okunabilir ve sürdürülebilir kod yazma becerisi',          'Kod incelemesi ve statik analiz'),
  (2,  1, 'Problem Çözme',           'Karmaşık teknik problemleri analiz etme ve çözme',                'Vaka çalışması ve teknik mülakat'),
  (3,  1, 'Mimari Tasarım',          'Ölçeklenebilir sistem ve yazılım mimarisi tasarlama',             'Sistem tasarımı değerlendirmesi'),
  (4,  1, 'Veri Analizi',            'Veri toplama, işleme ve yorumlama yetkinliği',                    'Analitik test ve proje değerlendirmesi'),
  (5,  1, 'Güvenlik Farkındalığı',   'Siber güvenlik tehditlerini anlama ve önlem alma',                'Güvenlik senaryosu değerlendirmesi'),
  (6,  1, 'Test ve Kalite',          'Yazılım test süreçleri ve kalite güvencesi',                      'Test planı hazırlama ve gözlem'),
  (7,  1, 'Teknik Dokümantasyon',    'Teknik belge ve kılavuz hazırlama becerisi',                      'Belge kalitesi değerlendirmesi'),
  -- Liderlik (8-13)
  (8,  2, 'Ekip Yönetimi',           'Ekip oluşturma, motive etme ve performans yönetimi',              '360 derece geri bildirim'),
  (9,  2, 'Stratejik Düşünce',       'Uzun vadeli hedefler belirleme ve stratejik planlama',            'Strateji geliştirme egzersizi'),
  (10, 2, 'Karar Verme',             'Belirsizlik altında hızlı ve etkili karar alma',                  'Vaka analizi ve simülasyon'),
  (11, 2, 'Koçluk ve Mentorluk',     'Çalışanları geliştirme ve rehberlik etme',                        'Gözlem ve çalışan geri bildirimi'),
  (12, 2, 'Değişim Yönetimi',        'Kurumsal dönüşüm süreçlerini yönetme',                            'Değişim projesi değerlendirmesi'),
  (13, 2, 'Proje Yönetimi',          'Proje planlama, yürütme ve kontrol süreçleri',                    'Proje planı ve sonuç değerlendirmesi'),
  -- İletişim (14-18)
  (14, 3, 'Sunum Becerisi',          'Fikirleri net ve ikna edici biçimde sunma',                       'Sunum ve gözlem'),
  (15, 3, 'Müzakere',                'Çatışma çözümü ve uzlaşma sağlama becerisi',                      'Rol yapma egzersizi'),
  (16, 3, 'Müşteri İlişkileri',      'Müşteri ihtiyaçlarını anlama ve ilişkileri geliştirme',           'Müşteri görüşmesi simülasyonu'),
  (17, 3, 'Yazılı İletişim',         'Etkili yazılı ifade ve raporlama',                                'Yazılı ödev değerlendirmesi'),
  (18, 3, 'Çapraz Fonksiyonel İşbirliği', 'Farklı departmanlarla etkin çalışma',                        'Çok disiplinli proje değerlendirmesi'),
  -- Analitik (19-22)
  (19, 4, 'Kritik Analiz',           'Bilgileri eleştirel gözle değerlendirme ve sonuç çıkarma',        'Vaka analizi'),
  (20, 4, 'Süreç İyileştirme',       'İş süreçlerini optimize etme ve verimliliği artırma',             'Süreç haritalama egzersizi'),
  (21, 4, 'Risk Değerlendirme',      'Riskleri tanımlama, analiz etme ve yönetme',                      'Risk matrisi hazırlama'),
  (22, 4, 'Finansal Okuryazarlık',   'Finansal verileri anlama ve yorumlama',                           'Finansal analiz görevi'),
  -- Kişisel (23-26)
  (23, 5, 'Öğrenme Çevikliği',       'Yeni bilgi ve becerileri hızlı öğrenme kapasitesi',               'Öğrenme geçmişi ve referans'),
  (24, 5, 'Stres Yönetimi',          'Baskı altında sakin kalma ve performansı koruma',                 'Stres senaryosu ve gözlem'),
  (25, 5, 'Öz Yönetim',             'Zamanı ve öncelikleri etkin yönetme',                              'Zaman yönetimi değerlendirmesi'),
  (26, 5, 'İnovasyon ve Yaratıcılık','Yenilikçi fikirler üretme ve uygulama',                           'Yaratıcı problem çözme egzersizi'),
  -- Sektörel (27-30)
  (27, 6, 'Mevzuat ve Uyum Bilgisi', 'Sektöre özgü yasal düzenlemeleri bilme',                         'Mevzuat bilgi testi'),
  (28, 6, 'Sektörel Trendler',       'Sektördeki gelişmeleri takip etme ve yorumlama',                  'Trend analizi sunumu'),
  (29, 6, 'Tedarik Zinciri',         'Tedarik, lojistik ve stok yönetimi bilgisi',                      'Tedarik zinciri vaka çalışması'),
  (30, 6, 'Kalite Yönetim Sistemleri','ISO ve benzeri kalite standartlarını uygulama',                  'Kalite denetim simülasyonu')
ON CONFLICT (id) DO NOTHING;

-- Makale Şablonları
INSERT INTO makale_sablonlari (ad) VALUES
  ('Genel Değerlendirme Raporu'),
  ('Teknik Yetkinlik Raporu'),
  ('Liderlik Değerlendirme Raporu'),
  ('İşe Alım Tavsiye Raporu'),
  ('Gelişim Planı Raporu')
ON CONFLICT DO NOTHING;

-- Sektörler (13 sektör)
INSERT INTO sektorler (id, nace_kodu, ad) VALUES
  (1,  'C16',  'Ağaç, Ahşap ve Mobilya Endüstrisi'),
  (2,  'C24',  'Metal, Metalürji ve Makine Sanayii'),
  (3,  'C13',  'Tekstil, Hazır Giyim ve Deri Endüstrisi'),
  (4,  'C20',  'Kimya, Plastik ve Kauçuk Sanayii'),
  (5,  'A01',  'Tarım, Hayvancılık ve Gıda Sektörü'),
  (6,  'J62',  'Teknoloji, Bilişim ve Elektronik'),
  (7,  'Q86',  'Hizmet, Sağlık ve Eğitim'),
  (8,  'H50',  'Denizcilik, Gemi İnşa ve Su Yolu Taşımacılığı'),
  (9,  'C29',  'Otomotiv ve Kara Taşımacılığı'),
  (10, 'F41',  'İnşaat ve Altyapı Mühendisliği'),
  (11, 'J61',  'Telekomünikasyon ve Haberleşme'),
  (12, 'D35',  'Enerji, Akaryakıt ve Rafineri'),
  (13, 'K64',  'Finans, Bankacılık ve Sigortacılık')
ON CONFLICT (id) DO NOTHING;

-- Departmanlar (75 departman)
INSERT INTO departmanlar (id, sektor_id, ad) VALUES
  -- Sektor 1: Ağaç, Ahşap ve Mobilya Endüstrisi
  (1,  1, 'İlk İşleme ve Kereste'),
  (2,  1, 'Kompozit Levha Üretimi'),
  (3,  1, 'Yapı Elemanları'),
  (4,  1, 'Yüzey İşlem ve Boya'),
  (5,  1, 'Toptan ve Dağıtım'),
  (6,  1, 'Perakende ve Mobilya'),
  -- Sektor 2: Metal, Metalürji ve Makine Sanayii
  (7,  2, 'Metalürji ve Döküm'),
  (8,  2, 'Haddeleme ve Profil'),
  (9,  2, 'CNC ve Lazer İşleme'),
  (10, 2, 'Bağlantı Elemanları'),
  (11, 2, 'Takım Tezgahları'),
  (12, 2, 'Güç Aktarımı ve Hidrolik'),
  (13, 2, 'Geri Kazanım ve Hurda'),
  -- Sektor 3: Tekstil, Hazır Giyim ve Deri Endüstrisi
  (14, 3, 'Elyaf ve İplik Hazırlama'),
  (15, 3, 'Dokuma ve Örme'),
  (16, 3, 'Apre ve Baskı'),
  (17, 3, 'Konfeksiyon'),
  (18, 3, 'Deri İşleme ve Tabakhane'),
  (19, 3, 'Aksesuar ve Ayakkabı'),
  -- Sektor 4: Kimya, Plastik ve Kauçuk Sanayii
  (20, 4, 'Temel Kimyasallar'),
  (21, 4, 'Tarım Kimyası ve Gübre'),
  (22, 4, 'Boya ve Vernik'),
  (23, 4, 'Polimer ve Hammadde'),
  (24, 4, 'Plastik Ürünler'),
  (25, 4, 'Kauçuk ve Lastik'),
  -- Sektor 5: Tarım, Hayvancılık ve Gıda Sektörü
  (26, 5, 'Bitkisel Üretim'),
  (27, 5, 'Hayvancılık'),
  (28, 5, 'Su Ürünleri'),
  (29, 5, 'Et ve Süt İşleme'),
  (30, 5, 'Unlu Mamuller ve Tatlı'),
  (31, 5, 'Yağ Sanayii'),
  (32, 5, 'İçecek Üretimi'),
  -- Sektor 6: Teknoloji, Bilişim ve Elektronik
  (33, 6, 'Yazılım Geliştirme'),
  (34, 6, 'Veri ve Yapay Zeka'),
  (35, 6, 'Siber Güvenlik'),
  (36, 6, 'Altyapı ve Cloud'),
  (37, 6, 'Elektronik ve Donanım'),
  (38, 6, 'Ürün ve Proje Yönetimi'),
  -- Sektor 7: Hizmet, Sağlık ve Eğitim
  (39, 7, 'Eğitim ve Sınav Merkezleri'),
  (40, 7, 'Sağlık ve Bakım'),
  (41, 7, 'Yönetim Danışmanlığı'),
  (42, 7, 'İnsan Kaynakları'),
  (43, 7, 'Çağrı Merkezi ve Destek'),
  (44, 7, 'Güvenlik Hizmetleri'),
  -- Sektor 8: Denizcilik, Gemi İnşa ve Su Yolu Taşımacılığı
  (45, 8, 'Gemi İnşa'),
  (46, 8, 'Gemi Bakım ve Onarım'),
  (47, 8, 'Liman ve Elleçleme'),
  (48, 8, 'Deniz Yolu Taşımacılığı'),
  -- Sektor 9: Otomotiv ve Kara Taşımacılığı
  (49, 9, 'Araç Üretimi'),
  (50, 9, 'Yan Sanayi'),
  (51, 9, 'Teknik Servis'),
  (52, 9, 'Yakıt İstasyonları'),
  (53, 9, 'Lojistik ve Nakliye'),
  (54, 9, 'Araç Kiralama'),
  -- Sektor 10: İnşaat ve Altyapı Mühendisliği
  (55, 10, 'Yapım ve İnşaat'),
  (56, 10, 'Zemin ve Temel Mühendisliği'),
  (57, 10, 'Tesisat'),
  (58, 10, 'İç Mimari ve Dekorasyon'),
  (59, 10, 'Proje Yönetimi'),
  -- Sektor 11: Telekomünikasyon ve Haberleşme
  (60, 11, 'Ağ Altyapısı'),
  (61, 11, 'Uydu ve Telsiz'),
  (62, 11, 'İnternet Servis'),
  (63, 11, 'GSM Operatör'),
  (64, 11, 'Cihaz Yenileme'),
  -- Sektor 12: Enerji, Akaryakıt ve Rafineri
  (65, 12, 'Yenilenebilir Enerji'),
  (66, 12, 'Termik ve Nükleer'),
  (67, 12, 'Rafineri ve Petrokimya'),
  (68, 12, 'Şebeke ve Dağıtım'),
  (69, 12, 'EV Şarj ve Enerji Depolama'),
  -- Sektor 13: Finans, Bankacılık ve Sigortacılık
  (70, 13, 'Bireysel Bankacılık'),
  (71, 13, 'Kurumsal Bankacılık'),
  (72, 13, 'Yatırım ve Portföy'),
  (73, 13, 'Sigorta'),
  (74, 13, 'Hasar ve Ekspertiz'),
  (75, 13, 'Risk ve Uyum')
ON CONFLICT (id) DO NOTHING;

-- Sequence'ları seed sonrası doğru değere getir
SELECT setval(pg_get_serial_sequence('sektorler','id'),    (SELECT MAX(id) FROM sektorler),    TRUE);
SELECT setval(pg_get_serial_sequence('departmanlar','id'), (SELECT MAX(id) FROM departmanlar), TRUE);
SELECT setval(pg_get_serial_sequence('yetkinlik_kategorileri','id'), (SELECT MAX(id) FROM yetkinlik_kategorileri), TRUE);
SELECT setval(pg_get_serial_sequence('yetkinlikler','id'), (SELECT MAX(id) FROM yetkinlikler), TRUE);
