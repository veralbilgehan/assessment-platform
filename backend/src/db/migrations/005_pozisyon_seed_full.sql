-- ======================================================
-- Migration 005: Tüm Sektörler İçin Pozisyon ve Yetkinlik Seed
-- Mevcut yetkinlik IDs: 1-30 (tümü aktif)
--  Teknik:  1-Kod Kalitesi, 2-Problem Çözme, 3-Mimari Tasarım, 4-Veri Analizi
--            5-Güvenlik Farkındalığı, 6-Test ve Kalite, 7-Teknik Dokümantasyon
--  Liderlik: 8-Ekip Yönetimi, 9-Stratejik Düşünce, 10-Karar Verme,
--             11-Koçluk ve Mentorluk, 12-Değişim Yönetimi, 13-Proje Yönetimi
--  İletişim: 14-Sunum Becerisi, 15-Müzakere, 16-Müşteri İlişkileri,
--             17-Yazılı İletişim, 18-Çapraz Fonksiyonel İşbirliği
--  Analitik: 19-Kritik Analiz, 20-Süreç İyileştirme, 21-Risk Değerlendirme,
--             22-Finansal Okuryazarlık
--  Kişisel:  23-Öğrenme Çevikliği, 24-Stres Yönetimi, 25-Öz Yönetim,
--             26-İnovasyon ve Yaratıcılık
--  Sektörel: 27-Mevzuat ve Uyum Bilgisi, 28-Sektörel Trendler,
--             29-Tedarik Zinciri, 30-Kalite Yönetim Sistemleri
-- ======================================================

DO $$
DECLARE pid INTEGER;
BEGIN

-- ==============================================================
-- SEKTOR 1: Ağaç, Ahşap ve Mobilya Endüstrisi
-- Dept IDs: 1-İlk İşleme ve Kereste, 2-Kompozit Levha Üretimi,
--           3-Yapı Elemanları, 4-Yüzey İşlem ve Boya,
--           5-Toptan ve Dağıtım, 6-Perakende ve Mobilya
-- ==============================================================

-- dept 1: İlk İşleme ve Kereste
INSERT INTO pozisyonlar(departman_id,ad,seviye,aciklama) VALUES(1,'Kereste İşleme Uzmanı','uzman','Ham kereste işleme ve sınıflandırma') RETURNING id INTO pid;
INSERT INTO pozisyon_yetkinlikleri VALUES(pid,30,5,true),(pid,2,5,true),(pid,20,4,true),(pid,27,4,true),(pid,24,3,false);

INSERT INTO pozisyonlar(departman_id,ad,seviye,aciklama) VALUES(1,'Kıdemli Kereste Uzmanı','kıdemli_uzman','İleri kereste işleme ve kalite standartları') RETURNING id INTO pid;
INSERT INTO pozisyon_yetkinlikleri VALUES(pid,30,5,true),(pid,2,5,true),(pid,20,4,true),(pid,7,4,false),(pid,28,3,false),(pid,26,2,false);

INSERT INTO pozisyonlar(departman_id,ad,seviye,aciklama) VALUES(1,'Üretim Müdürü','yönetici','Kereste üretim süreçleri yönetimi') RETURNING id INTO pid;
INSERT INTO pozisyon_yetkinlikleri VALUES(pid,8,5,true),(pid,10,5,true),(pid,30,4,true),(pid,9,4,false),(pid,20,3,false),(pid,13,3,false);

INSERT INTO pozisyonlar(departman_id,ad,seviye,aciklama) VALUES(1,'Tesis Direktörü','direktör','Kereste tesisi genel yönetimi') RETURNING id INTO pid;
INSERT INTO pozisyon_yetkinlikleri VALUES(pid,9,5,true),(pid,10,5,true),(pid,8,4,true),(pid,12,4,false),(pid,22,3,false);

-- dept 2: Kompozit Levha Üretimi
INSERT INTO pozisyonlar(departman_id,ad,seviye,aciklama) VALUES(2,'Kompozit Levha Uzmanı','uzman','Kompozit levha üretimi ve kalite kontrol') RETURNING id INTO pid;
INSERT INTO pozisyon_yetkinlikleri VALUES(pid,30,5,true),(pid,2,5,true),(pid,6,4,true),(pid,20,3,false),(pid,27,3,false);

INSERT INTO pozisyonlar(departman_id,ad,seviye,aciklama) VALUES(2,'Kıdemli Kompozit Uzmanı','kıdemli_uzman','İleri kompozit malzeme üretimi') RETURNING id INTO pid;
INSERT INTO pozisyon_yetkinlikleri VALUES(pid,30,5,true),(pid,2,5,true),(pid,3,4,false),(pid,7,4,false),(pid,26,3,false);

INSERT INTO pozisyonlar(departman_id,ad,seviye,aciklama) VALUES(2,'Üretim Şefi','takım_lideri','Kompozit levha üretim hattı yönetimi') RETURNING id INTO pid;
INSERT INTO pozisyon_yetkinlikleri VALUES(pid,8,5,true),(pid,30,4,true),(pid,20,4,true),(pid,10,3,false),(pid,24,3,false);

INSERT INTO pozisyonlar(departman_id,ad,seviye,aciklama) VALUES(2,'Fabrika Müdürü','yönetici','Kompozit levha fabrikası genel yönetimi') RETURNING id INTO pid;
INSERT INTO pozisyon_yetkinlikleri VALUES(pid,8,5,true),(pid,9,5,true),(pid,10,4,true),(pid,13,4,false),(pid,22,3,false);

-- dept 3: Yapı Elemanları
INSERT INTO pozisyonlar(departman_id,ad,seviye,aciklama) VALUES(3,'Yapı Elemanları Uzmanı','uzman','Ahşap yapı elemanları üretimi') RETURNING id INTO pid;
INSERT INTO pozisyon_yetkinlikleri VALUES(pid,30,5,true),(pid,2,4,true),(pid,27,4,true),(pid,20,3,false),(pid,7,3,false);

INSERT INTO pozisyonlar(departman_id,ad,seviye,aciklama) VALUES(3,'Tasarım Uzmanı','kıdemli_uzman','Yapı elemanları tasarım ve mühendislik') RETURNING id INTO pid;
INSERT INTO pozisyon_yetkinlikleri VALUES(pid,3,5,true),(pid,2,5,true),(pid,30,4,true),(pid,26,4,false),(pid,7,3,false);

INSERT INTO pozisyonlar(departman_id,ad,seviye,aciklama) VALUES(3,'Bölüm Müdürü','yönetici','Yapı elemanları bölüm yönetimi') RETURNING id INTO pid;
INSERT INTO pozisyon_yetkinlikleri VALUES(pid,8,5,true),(pid,9,4,true),(pid,13,4,true),(pid,10,3,false),(pid,18,3,false);

-- dept 4: Yüzey İşlem ve Boya
INSERT INTO pozisyonlar(departman_id,ad,seviye,aciklama) VALUES(4,'Boya ve Kaplama Uzmanı','uzman','Ahşap yüzey boya ve kaplama işlemleri') RETURNING id INTO pid;
INSERT INTO pozisyon_yetkinlikleri VALUES(pid,30,5,true),(pid,6,5,true),(pid,27,4,true),(pid,20,3,false),(pid,24,3,false);

INSERT INTO pozisyonlar(departman_id,ad,seviye,aciklama) VALUES(4,'Kıdemli Yüzey İşlem Uzmanı','kıdemli_uzman','İleri yüzey işlem teknikleri') RETURNING id INTO pid;
INSERT INTO pozisyon_yetkinlikleri VALUES(pid,30,5,true),(pid,6,4,true),(pid,2,4,true),(pid,26,3,false),(pid,28,3,false);

INSERT INTO pozisyonlar(departman_id,ad,seviye,aciklama) VALUES(4,'Üretim Müdürü','yönetici','Yüzey işlem üretim yönetimi') RETURNING id INTO pid;
INSERT INTO pozisyon_yetkinlikleri VALUES(pid,8,5,true),(pid,30,4,true),(pid,10,4,true),(pid,20,3,false),(pid,13,3,false);

-- dept 5: Toptan ve Dağıtım
INSERT INTO pozisyonlar(departman_id,ad,seviye,aciklama) VALUES(5,'Satış Uzmanı','uzman','Ahşap ürünler toptan satış') RETURNING id INTO pid;
INSERT INTO pozisyon_yetkinlikleri VALUES(pid,16,5,true),(pid,15,5,true),(pid,29,4,true),(pid,14,3,false),(pid,22,3,false);

INSERT INTO pozisyonlar(departman_id,ad,seviye,aciklama) VALUES(5,'Lojistik Koordinatör','uzman','Dağıtım ve lojistik koordinasyonu') RETURNING id INTO pid;
INSERT INTO pozisyon_yetkinlikleri VALUES(pid,29,5,true),(pid,20,4,true),(pid,19,4,true),(pid,18,3,false),(pid,25,3,false);

INSERT INTO pozisyonlar(departman_id,ad,seviye,aciklama) VALUES(5,'Satış Müdürü','yönetici','Toptan satış bölümü yönetimi') RETURNING id INTO pid;
INSERT INTO pozisyon_yetkinlikleri VALUES(pid,8,5,true),(pid,15,5,true),(pid,9,4,true),(pid,16,4,false),(pid,22,3,false);

-- dept 6: Perakende ve Mobilya
INSERT INTO pozisyonlar(departman_id,ad,seviye,aciklama) VALUES(6,'Mobilya Danışmanı','junior','Perakende mobilya satış danışmanı') RETURNING id INTO pid;
INSERT INTO pozisyon_yetkinlikleri VALUES(pid,16,5,true),(pid,14,4,true),(pid,25,4,true),(pid,23,3,false),(pid,17,3,false);

INSERT INTO pozisyonlar(departman_id,ad,seviye,aciklama) VALUES(6,'Showroom Uzmanı','uzman','Mobilya showroom yönetimi ve müşteri deneyimi') RETURNING id INTO pid;
INSERT INTO pozisyon_yetkinlikleri VALUES(pid,16,5,true),(pid,15,4,true),(pid,14,4,true),(pid,26,3,false),(pid,22,3,false);

INSERT INTO pozisyonlar(departman_id,ad,seviye,aciklama) VALUES(6,'Mağaza Müdürü','yönetici','Mobilya mağazası yönetimi') RETURNING id INTO pid;
INSERT INTO pozisyon_yetkinlikleri VALUES(pid,8,5,true),(pid,16,5,true),(pid,10,4,true),(pid,22,4,false),(pid,13,3,false);

-- ==============================================================
-- SEKTOR 2: Metal, Metalürji ve Makine Sanayii
-- Dept IDs: 7-Metalürji ve Döküm, 8-Haddeleme ve Profil,
--           9-CNC ve Lazer İşleme, 10-Bağlantı Elemanları,
--           11-Takım Tezgahları, 12-Güç Aktarımı ve Hidrolik,
--           13-Geri Kazanım ve Hurda
-- ==============================================================

-- dept 7: Metalürji ve Döküm
INSERT INTO pozisyonlar(departman_id,ad,seviye,aciklama) VALUES(7,'Metalürji Uzmanı','uzman','Metal analizi ve döküm proses kontrolü') RETURNING id INTO pid;
INSERT INTO pozisyon_yetkinlikleri VALUES(pid,2,5,true),(pid,30,5,true),(pid,6,4,true),(pid,27,4,true),(pid,20,3,false);

INSERT INTO pozisyonlar(departman_id,ad,seviye,aciklama) VALUES(7,'Kıdemli Metalürji Mühendisi','kıdemli_uzman','İleri metalürji ve malzeme mühendisliği') RETURNING id INTO pid;
INSERT INTO pozisyon_yetkinlikleri VALUES(pid,2,5,true),(pid,3,5,true),(pid,30,4,true),(pid,7,4,false),(pid,26,3,false);

INSERT INTO pozisyonlar(departman_id,ad,seviye,aciklama) VALUES(7,'Üretim Müdürü','yönetici','Metalürji üretim süreçleri yönetimi') RETURNING id INTO pid;
INSERT INTO pozisyon_yetkinlikleri VALUES(pid,8,5,true),(pid,10,5,true),(pid,9,4,true),(pid,13,4,false),(pid,30,3,false);

-- dept 8: Haddeleme ve Profil
INSERT INTO pozisyonlar(departman_id,ad,seviye,aciklama) VALUES(8,'Haddeleme Operatörü','junior','Haddeleme hattı operasyonu') RETURNING id INTO pid;
INSERT INTO pozisyon_yetkinlikleri VALUES(pid,30,5,true),(pid,25,4,true),(pid,24,4,true),(pid,23,3,false),(pid,20,3,false);

INSERT INTO pozisyonlar(departman_id,ad,seviye,aciklama) VALUES(8,'Haddeleme Uzmanı','uzman','Haddeleme ve profil üretim uzmanı') RETURNING id INTO pid;
INSERT INTO pozisyon_yetkinlikleri VALUES(pid,30,5,true),(pid,2,5,true),(pid,20,4,true),(pid,6,4,false),(pid,7,3,false);

INSERT INTO pozisyonlar(departman_id,ad,seviye,aciklama) VALUES(8,'Üretim Şefi','takım_lideri','Haddeleme hattı takım lideri') RETURNING id INTO pid;
INSERT INTO pozisyon_yetkinlikleri VALUES(pid,8,5,true),(pid,30,4,true),(pid,20,4,true),(pid,10,4,false),(pid,24,3,false);

INSERT INTO pozisyonlar(departman_id,ad,seviye,aciklama) VALUES(8,'Fabrika Müdürü','yönetici','Haddeleme fabrikası yönetimi') RETURNING id INTO pid;
INSERT INTO pozisyon_yetkinlikleri VALUES(pid,8,5,true),(pid,9,5,true),(pid,10,4,true),(pid,22,4,false),(pid,13,3,false);

-- dept 9: CNC ve Lazer İşleme
INSERT INTO pozisyonlar(departman_id,ad,seviye,aciklama) VALUES(9,'CNC Operatörü','junior','CNC tezgah operasyonu ve programlama') RETURNING id INTO pid;
INSERT INTO pozisyon_yetkinlikleri VALUES(pid,2,5,true),(pid,30,4,true),(pid,23,4,true),(pid,25,4,false),(pid,7,3,false);

INSERT INTO pozisyonlar(departman_id,ad,seviye,aciklama) VALUES(9,'CNC/Lazer Uzmanı','uzman','CNC ve lazer işleme programlama uzmanı') RETURNING id INTO pid;
INSERT INTO pozisyon_yetkinlikleri VALUES(pid,2,5,true),(pid,3,5,true),(pid,30,4,true),(pid,6,4,false),(pid,26,3,false);

INSERT INTO pozisyonlar(departman_id,ad,seviye,aciklama) VALUES(9,'Kıdemli CNC Mühendisi','kıdemli_uzman','İleri CNC programlama ve optimizasyon') RETURNING id INTO pid;
INSERT INTO pozisyon_yetkinlikleri VALUES(pid,3,5,true),(pid,2,5,true),(pid,20,4,true),(pid,7,4,false),(pid,26,3,false);

INSERT INTO pozisyonlar(departman_id,ad,seviye,aciklama) VALUES(9,'Teknik Müdür','yönetici','CNC ve lazer işleme bölüm yönetimi') RETURNING id INTO pid;
INSERT INTO pozisyon_yetkinlikleri VALUES(pid,8,5,true),(pid,9,4,true),(pid,10,4,true),(pid,13,4,false),(pid,30,3,false);

-- dept 10: Bağlantı Elemanları
INSERT INTO pozisyonlar(departman_id,ad,seviye,aciklama) VALUES(10,'Kalite Kontrol Uzmanı','uzman','Bağlantı elemanları kalite ve standartlar') RETURNING id INTO pid;
INSERT INTO pozisyon_yetkinlikleri VALUES(pid,30,5,true),(pid,6,5,true),(pid,27,4,true),(pid,19,4,false),(pid,7,3,false);

INSERT INTO pozisyonlar(departman_id,ad,seviye,aciklama) VALUES(10,'Üretim Uzmanı','kıdemli_uzman','Bağlantı elemanları üretim ve optimizasyon') RETURNING id INTO pid;
INSERT INTO pozisyon_yetkinlikleri VALUES(pid,30,5,true),(pid,2,4,true),(pid,20,4,true),(pid,29,3,false),(pid,28,3,false);

INSERT INTO pozisyonlar(departman_id,ad,seviye,aciklama) VALUES(10,'Satış Müdürü','yönetici','Bağlantı elemanları satış yönetimi') RETURNING id INTO pid;
INSERT INTO pozisyon_yetkinlikleri VALUES(pid,16,5,true),(pid,15,5,true),(pid,8,4,true),(pid,9,3,false),(pid,29,3,false);

-- dept 11: Takım Tezgahları
INSERT INTO pozisyonlar(departman_id,ad,seviye,aciklama) VALUES(11,'Tezgah Operatörü','junior','Takım tezgahları operasyonu') RETURNING id INTO pid;
INSERT INTO pozisyon_yetkinlikleri VALUES(pid,30,5,true),(pid,25,4,true),(pid,24,4,true),(pid,2,3,false),(pid,23,3,false);

INSERT INTO pozisyonlar(departman_id,ad,seviye,aciklama) VALUES(11,'Tezgah Uzmanı','uzman','Takım tezgahları programlama ve bakım') RETURNING id INTO pid;
INSERT INTO pozisyon_yetkinlikleri VALUES(pid,2,5,true),(pid,30,5,true),(pid,6,4,true),(pid,20,3,false),(pid,7,3,false);

INSERT INTO pozisyonlar(departman_id,ad,seviye,aciklama) VALUES(11,'Teknik Şef','takım_lideri','Takım tezgahları teknik liderliği') RETURNING id INTO pid;
INSERT INTO pozisyon_yetkinlikleri VALUES(pid,8,5,true),(pid,2,4,true),(pid,30,4,true),(pid,11,3,false),(pid,20,3,false);

INSERT INTO pozisyonlar(departman_id,ad,seviye,aciklama) VALUES(11,'Üretim Müdürü','yönetici','Takım tezgahları üretim yönetimi') RETURNING id INTO pid;
INSERT INTO pozisyon_yetkinlikleri VALUES(pid,8,5,true),(pid,10,5,true),(pid,9,4,true),(pid,13,3,false),(pid,22,3,false);

-- dept 12: Güç Aktarımı ve Hidrolik
INSERT INTO pozisyonlar(departman_id,ad,seviye,aciklama) VALUES(12,'Hidrolik Sistem Uzmanı','uzman','Hidrolik ve güç aktarım sistemleri') RETURNING id INTO pid;
INSERT INTO pozisyon_yetkinlikleri VALUES(pid,2,5,true),(pid,3,4,true),(pid,30,4,true),(pid,27,4,false),(pid,7,3,false);

INSERT INTO pozisyonlar(departman_id,ad,seviye,aciklama) VALUES(12,'Kıdemli Mühendis','kıdemli_uzman','İleri hidrolik ve pnömatik sistemler') RETURNING id INTO pid;
INSERT INTO pozisyon_yetkinlikleri VALUES(pid,3,5,true),(pid,2,5,true),(pid,20,4,false),(pid,7,4,false),(pid,26,3,false);

INSERT INTO pozisyonlar(departman_id,ad,seviye,aciklama) VALUES(12,'Teknik Müdür','yönetici','Güç aktarım bölüm yönetimi') RETURNING id INTO pid;
INSERT INTO pozisyon_yetkinlikleri VALUES(pid,8,5,true),(pid,9,4,true),(pid,13,4,true),(pid,10,4,false),(pid,18,3,false);

-- dept 13: Geri Kazanım ve Hurda
INSERT INTO pozisyonlar(departman_id,ad,seviye,aciklama) VALUES(13,'Hurda Değerlendirme Uzmanı','uzman','Metal hurda sınıflandırma ve değerlendirme') RETURNING id INTO pid;
INSERT INTO pozisyon_yetkinlikleri VALUES(pid,19,5,true),(pid,27,5,true),(pid,30,4,true),(pid,22,4,false),(pid,20,3,false);

INSERT INTO pozisyonlar(departman_id,ad,seviye,aciklama) VALUES(13,'Çevre ve Uyum Uzmanı','kıdemli_uzman','Geri kazanım mevzuat ve çevre uyumu') RETURNING id INTO pid;
INSERT INTO pozisyon_yetkinlikleri VALUES(pid,27,5,true),(pid,21,5,true),(pid,19,4,true),(pid,20,4,false),(pid,7,3,false);

INSERT INTO pozisyonlar(departman_id,ad,seviye,aciklama) VALUES(13,'Tesis Müdürü','yönetici','Geri kazanım tesis yönetimi') RETURNING id INTO pid;
INSERT INTO pozisyon_yetkinlikleri VALUES(pid,8,5,true),(pid,27,4,true),(pid,10,4,true),(pid,9,4,false),(pid,22,3,false);

-- ==============================================================
-- SEKTOR 3: Tekstil, Hazır Giyim ve Deri Endüstrisi
-- Dept IDs: 14-Elyaf ve İplik Hazırlama, 15-Dokuma ve Örme,
--           16-Apre ve Baskı, 17-Konfeksiyon,
--           18-Deri İşleme ve Tabakhane, 19-Aksesuar ve Ayakkabı
-- ==============================================================

-- dept 14: Elyaf ve İplik Hazırlama
INSERT INTO pozisyonlar(departman_id,ad,seviye,aciklama) VALUES(14,'İplik Uzmanı','uzman','Elyaf ve iplik üretim kontrolü') RETURNING id INTO pid;
INSERT INTO pozisyon_yetkinlikleri VALUES(pid,30,5,true),(pid,6,4,true),(pid,20,4,true),(pid,27,3,false),(pid,24,3,false);

INSERT INTO pozisyonlar(departman_id,ad,seviye,aciklama) VALUES(14,'Kalite Kontrol Şefi','kıdemli_uzman','İplik kalite standartları ve kontrol') RETURNING id INTO pid;
INSERT INTO pozisyon_yetkinlikleri VALUES(pid,30,5,true),(pid,6,5,true),(pid,19,4,true),(pid,7,4,false),(pid,27,3,false);

INSERT INTO pozisyonlar(departman_id,ad,seviye,aciklama) VALUES(14,'Üretim Müdürü','yönetici','Elyaf ve iplik üretim yönetimi') RETURNING id INTO pid;
INSERT INTO pozisyon_yetkinlikleri VALUES(pid,8,5,true),(pid,10,4,true),(pid,30,4,true),(pid,13,3,false),(pid,9,3,false);

-- dept 15: Dokuma ve Örme
INSERT INTO pozisyonlar(departman_id,ad,seviye,aciklama) VALUES(15,'Dokuma Operatörü','junior','Dokuma ve örme makine operasyonu') RETURNING id INTO pid;
INSERT INTO pozisyon_yetkinlikleri VALUES(pid,30,5,true),(pid,25,4,true),(pid,24,4,true),(pid,23,3,false),(pid,20,3,false);

INSERT INTO pozisyonlar(departman_id,ad,seviye,aciklama) VALUES(15,'Dokuma Uzmanı','uzman','Dokuma tasarımı ve üretim') RETURNING id INTO pid;
INSERT INTO pozisyon_yetkinlikleri VALUES(pid,30,5,true),(pid,6,4,true),(pid,20,4,true),(pid,26,4,false),(pid,28,3,false);

INSERT INTO pozisyonlar(departman_id,ad,seviye,aciklama) VALUES(15,'Tekstil Mühendisi','kıdemli_uzman','İleri dokuma teknolojileri') RETURNING id INTO pid;
INSERT INTO pozisyon_yetkinlikleri VALUES(pid,3,5,true),(pid,30,4,true),(pid,26,4,false),(pid,2,4,true),(pid,7,3,false);

INSERT INTO pozisyonlar(departman_id,ad,seviye,aciklama) VALUES(15,'Fabrika Müdürü','yönetici','Dokuma fabrikası yönetimi') RETURNING id INTO pid;
INSERT INTO pozisyon_yetkinlikleri VALUES(pid,8,5,true),(pid,9,4,true),(pid,10,4,true),(pid,22,3,false),(pid,13,3,false);

-- dept 16: Apre ve Baskı
INSERT INTO pozisyonlar(departman_id,ad,seviye,aciklama) VALUES(16,'Baskı Uzmanı','uzman','Tekstil baskı ve apre işlemleri') RETURNING id INTO pid;
INSERT INTO pozisyon_yetkinlikleri VALUES(pid,30,5,true),(pid,6,4,true),(pid,26,4,false),(pid,27,3,true),(pid,20,3,false);

INSERT INTO pozisyonlar(departman_id,ad,seviye,aciklama) VALUES(16,'Kıdemli Apre Uzmanı','kıdemli_uzman','İleri apre teknikleri ve kimyasal işlemler') RETURNING id INTO pid;
INSERT INTO pozisyon_yetkinlikleri VALUES(pid,30,5,true),(pid,27,5,true),(pid,6,4,true),(pid,7,3,false),(pid,20,3,false);

INSERT INTO pozisyonlar(departman_id,ad,seviye,aciklama) VALUES(16,'Üretim Müdürü','yönetici','Apre ve baskı bölüm yönetimi') RETURNING id INTO pid;
INSERT INTO pozisyon_yetkinlikleri VALUES(pid,8,5,true),(pid,27,4,true),(pid,10,4,true),(pid,13,3,false),(pid,30,3,false);

-- dept 17: Konfeksiyon
INSERT INTO pozisyonlar(departman_id,ad,seviye,aciklama) VALUES(17,'Kalıp Uzmanı','uzman','Giyim kalıp hazırlama ve üretim') RETURNING id INTO pid;
INSERT INTO pozisyon_yetkinlikleri VALUES(pid,3,5,true),(pid,30,4,true),(pid,6,4,true),(pid,26,3,false),(pid,20,3,false);

INSERT INTO pozisyonlar(departman_id,ad,seviye,aciklama) VALUES(17,'Üretim Koordinatörü','kıdemli_uzman','Konfeksiyon üretim koordinasyonu') RETURNING id INTO pid;
INSERT INTO pozisyon_yetkinlikleri VALUES(pid,13,5,true),(pid,18,4,true),(pid,30,4,true),(pid,20,3,false),(pid,8,3,false);

INSERT INTO pozisyonlar(departman_id,ad,seviye,aciklama) VALUES(17,'Atölye Şefi','takım_lideri','Konfeksiyon atölye yönetimi') RETURNING id INTO pid;
INSERT INTO pozisyon_yetkinlikleri VALUES(pid,8,5,true),(pid,30,4,true),(pid,10,4,true),(pid,20,3,false),(pid,11,3,false);

INSERT INTO pozisyonlar(departman_id,ad,seviye,aciklama) VALUES(17,'Üretim Müdürü','yönetici','Konfeksiyon üretim genel yönetimi') RETURNING id INTO pid;
INSERT INTO pozisyon_yetkinlikleri VALUES(pid,8,5,true),(pid,9,5,true),(pid,10,4,true),(pid,13,4,false),(pid,22,3,false);

-- dept 18: Deri İşleme ve Tabakhane
INSERT INTO pozisyonlar(departman_id,ad,seviye,aciklama) VALUES(18,'Deri İşleme Uzmanı','uzman','Tabakhane prosesleri ve deri kalite') RETURNING id INTO pid;
INSERT INTO pozisyon_yetkinlikleri VALUES(pid,30,5,true),(pid,27,5,true),(pid,6,4,true),(pid,20,3,false),(pid,24,3,false);

INSERT INTO pozisyonlar(departman_id,ad,seviye,aciklama) VALUES(18,'Kıdemli Deri Teknisyeni','kıdemli_uzman','İleri deri işleme ve kimyasal kontrol') RETURNING id INTO pid;
INSERT INTO pozisyon_yetkinlikleri VALUES(pid,30,5,true),(pid,27,4,true),(pid,2,4,true),(pid,7,3,false),(pid,26,3,false);

INSERT INTO pozisyonlar(departman_id,ad,seviye,aciklama) VALUES(18,'Tabakhane Müdürü','yönetici','Tabakhane tesis yönetimi') RETURNING id INTO pid;
INSERT INTO pozisyon_yetkinlikleri VALUES(pid,8,5,true),(pid,27,4,true),(pid,10,4,true),(pid,9,3,false),(pid,22,3,false);

-- dept 19: Aksesuar ve Ayakkabı
INSERT INTO pozisyonlar(departman_id,ad,seviye,aciklama) VALUES(19,'Model Tasarımcısı','uzman','Aksesuar ve ayakkabı model tasarımı') RETURNING id INTO pid;
INSERT INTO pozisyon_yetkinlikleri VALUES(pid,26,5,true),(pid,3,5,true),(pid,28,4,false),(pid,30,3,false),(pid,23,3,false);

INSERT INTO pozisyonlar(departman_id,ad,seviye,aciklama) VALUES(19,'Üretim Uzmanı','kıdemli_uzman','Aksesuar üretim ve kalite kontrolü') RETURNING id INTO pid;
INSERT INTO pozisyon_yetkinlikleri VALUES(pid,30,5,true),(pid,6,4,true),(pid,20,4,true),(pid,29,3,false),(pid,7,3,false);

INSERT INTO pozisyonlar(departman_id,ad,seviye,aciklama) VALUES(19,'Koleksiyon Müdürü','yönetici','Aksesuar koleksiyon yönetimi') RETURNING id INTO pid;
INSERT INTO pozisyon_yetkinlikleri VALUES(pid,9,5,true),(pid,26,4,true),(pid,8,4,true),(pid,15,3,false),(pid,28,3,false);

-- ==============================================================
-- SEKTOR 4: Kimya, Plastik ve Kauçuk Sanayii
-- Dept IDs: 20-Temel Kimyasallar, 21-Tarım Kimyası ve Gübre,
--           22-Boya ve Vernik, 23-Polimer ve Hammadde,
--           24-Plastik Ürünler, 25-Kauçuk ve Lastik
-- ==============================================================

-- dept 20: Temel Kimyasallar
INSERT INTO pozisyonlar(departman_id,ad,seviye,aciklama) VALUES(20,'Kimya Uzmanı','uzman','Temel kimyasal üretim ve analiz') RETURNING id INTO pid;
INSERT INTO pozisyon_yetkinlikleri VALUES(pid,2,5,true),(pid,30,5,true),(pid,27,5,true),(pid,6,4,false),(pid,21,4,false);

INSERT INTO pozisyonlar(departman_id,ad,seviye,aciklama) VALUES(20,'Kıdemli Kimya Mühendisi','kıdemli_uzman','Süreç mühendisliği ve kimyasal optimizasyon') RETURNING id INTO pid;
INSERT INTO pozisyon_yetkinlikleri VALUES(pid,3,5,true),(pid,2,5,true),(pid,27,4,true),(pid,20,4,false),(pid,7,3,false);

INSERT INTO pozisyonlar(departman_id,ad,seviye,aciklama) VALUES(20,'Ar-Ge Müdürü','yönetici','Kimya Ar-Ge bölüm yönetimi') RETURNING id INTO pid;
INSERT INTO pozisyon_yetkinlikleri VALUES(pid,9,5,true),(pid,26,5,true),(pid,8,4,true),(pid,13,4,false),(pid,27,3,false);

INSERT INTO pozisyonlar(departman_id,ad,seviye,aciklama) VALUES(20,'Fabrika Direktörü','direktör','Kimyasal üretim tesisi direktörü') RETURNING id INTO pid;
INSERT INTO pozisyon_yetkinlikleri VALUES(pid,9,5,true),(pid,10,5,true),(pid,12,4,true),(pid,27,4,false),(pid,22,3,false);

-- dept 21: Tarım Kimyası ve Gübre
INSERT INTO pozisyonlar(departman_id,ad,seviye,aciklama) VALUES(21,'Tarım Kimyası Uzmanı','uzman','Gübre formülasyonu ve tarım kimyasal üretimi') RETURNING id INTO pid;
INSERT INTO pozisyon_yetkinlikleri VALUES(pid,30,5,true),(pid,27,5,true),(pid,2,4,true),(pid,28,3,false),(pid,7,3,false);

INSERT INTO pozisyonlar(departman_id,ad,seviye,aciklama) VALUES(21,'Saha Teknik Uzmanı','kıdemli_uzman','Tarım kimyası saha uygulamaları ve müşteri desteği') RETURNING id INTO pid;
INSERT INTO pozisyon_yetkinlikleri VALUES(pid,16,5,true),(pid,27,4,true),(pid,28,4,true),(pid,14,3,false),(pid,17,3,false);

INSERT INTO pozisyonlar(departman_id,ad,seviye,aciklama) VALUES(21,'Ürün Müdürü','yönetici','Tarım kimyası ürün portföyü yönetimi') RETURNING id INTO pid;
INSERT INTO pozisyon_yetkinlikleri VALUES(pid,9,5,true),(pid,28,4,true),(pid,8,4,true),(pid,16,4,false),(pid,22,3,false);

-- dept 22: Boya ve Vernik
INSERT INTO pozisyonlar(departman_id,ad,seviye,aciklama) VALUES(22,'Formülasyon Uzmanı','uzman','Boya ve vernik formülasyon geliştirme') RETURNING id INTO pid;
INSERT INTO pozisyon_yetkinlikleri VALUES(pid,26,5,true),(pid,2,5,true),(pid,30,4,true),(pid,6,4,false),(pid,27,3,false);

INSERT INTO pozisyonlar(departman_id,ad,seviye,aciklama) VALUES(22,'Kalite Güvence Uzmanı','kıdemli_uzman','Boya kalite güvence ve standartları') RETURNING id INTO pid;
INSERT INTO pozisyon_yetkinlikleri VALUES(pid,30,5,true),(pid,6,5,true),(pid,27,4,true),(pid,19,4,false),(pid,7,3,false);

INSERT INTO pozisyonlar(departman_id,ad,seviye,aciklama) VALUES(22,'Teknik Satış Müdürü','yönetici','Boya teknik satış yönetimi') RETURNING id INTO pid;
INSERT INTO pozisyon_yetkinlikleri VALUES(pid,16,5,true),(pid,15,5,true),(pid,8,4,true),(pid,9,3,false),(pid,14,3,false);

-- dept 23: Polimer ve Hammadde
INSERT INTO pozisyonlar(departman_id,ad,seviye,aciklama) VALUES(23,'Polimer Uzmanı','uzman','Polimer sentezi ve karakterizasyon') RETURNING id INTO pid;
INSERT INTO pozisyon_yetkinlikleri VALUES(pid,2,5,true),(pid,4,5,true),(pid,30,4,true),(pid,27,4,false),(pid,26,3,false);

INSERT INTO pozisyonlar(departman_id,ad,seviye,aciklama) VALUES(23,'Hammadde Tedarik Uzmanı','uzman','Polimer hammadde tedarik ve lojistik') RETURNING id INTO pid;
INSERT INTO pozisyon_yetkinlikleri VALUES(pid,29,5,true),(pid,15,4,true),(pid,19,4,true),(pid,22,4,false),(pid,18,3,false);

INSERT INTO pozisyonlar(departman_id,ad,seviye,aciklama) VALUES(23,'Ar-Ge Müdürü','yönetici','Polimer Ar-Ge yönetimi') RETURNING id INTO pid;
INSERT INTO pozisyon_yetkinlikleri VALUES(pid,9,5,true),(pid,26,5,true),(pid,8,4,true),(pid,13,3,false),(pid,27,3,false);

-- dept 24: Plastik Ürünler
INSERT INTO pozisyonlar(departman_id,ad,seviye,aciklama) VALUES(24,'Plastik Üretim Uzmanı','uzman','Plastik enjeksiyon ve şekillendirme') RETURNING id INTO pid;
INSERT INTO pozisyon_yetkinlikleri VALUES(pid,30,5,true),(pid,2,4,true),(pid,6,4,true),(pid,20,3,false),(pid,27,3,false);

INSERT INTO pozisyonlar(departman_id,ad,seviye,aciklama) VALUES(24,'Kalıp Tasarım Mühendisi','kıdemli_uzman','Plastik kalıp tasarımı ve optimizasyon') RETURNING id INTO pid;
INSERT INTO pozisyon_yetkinlikleri VALUES(pid,3,5,true),(pid,2,5,true),(pid,26,4,false),(pid,7,4,false),(pid,30,3,false);

INSERT INTO pozisyonlar(departman_id,ad,seviye,aciklama) VALUES(24,'Fabrika Müdürü','yönetici','Plastik ürünler fabrikası yönetimi') RETURNING id INTO pid;
INSERT INTO pozisyon_yetkinlikleri VALUES(pid,8,5,true),(pid,10,5,true),(pid,13,4,true),(pid,9,3,false),(pid,22,3,false);

-- dept 25: Kauçuk ve Lastik
INSERT INTO pozisyonlar(departman_id,ad,seviye,aciklama) VALUES(25,'Kauçuk Teknisyeni','uzman','Kauçuk bileşik hazırlama ve test') RETURNING id INTO pid;
INSERT INTO pozisyon_yetkinlikleri VALUES(pid,30,5,true),(pid,6,5,true),(pid,2,4,true),(pid,27,3,true),(pid,20,3,false);

INSERT INTO pozisyonlar(departman_id,ad,seviye,aciklama) VALUES(25,'Lastik Geliştirme Uzmanı','kıdemli_uzman','Lastik formülasyon ve performans geliştirme') RETURNING id INTO pid;
INSERT INTO pozisyon_yetkinlikleri VALUES(pid,2,5,true),(pid,26,4,true),(pid,30,4,true),(pid,6,4,false),(pid,7,3,false);

INSERT INTO pozisyonlar(departman_id,ad,seviye,aciklama) VALUES(25,'Üretim Müdürü','yönetici','Kauçuk ve lastik üretim yönetimi') RETURNING id INTO pid;
INSERT INTO pozisyon_yetkinlikleri VALUES(pid,8,5,true),(pid,10,4,true),(pid,9,4,true),(pid,30,3,false),(pid,22,3,false);

-- ==============================================================
-- SEKTOR 5: Tarım, Hayvancılık ve Gıda Sektörü
-- Dept IDs: 26-Bitkisel Üretim, 27-Hayvancılık, 28-Su Ürünleri,
--           29-Et ve Süt İşleme, 30-Unlu Mamuller ve Tatlı,
--           31-Yağ Sanayii, 32-İçecek Üretimi
-- ==============================================================

-- dept 26: Bitkisel Üretim
INSERT INTO pozisyonlar(departman_id,ad,seviye,aciklama) VALUES(26,'Tarım Uzmanı','uzman','Bitkisel üretim ve tarım yönetimi') RETURNING id INTO pid;
INSERT INTO pozisyon_yetkinlikleri VALUES(pid,28,5,true),(pid,27,5,true),(pid,20,4,true),(pid,21,4,false),(pid,24,3,false);

INSERT INTO pozisyonlar(departman_id,ad,seviye,aciklama) VALUES(26,'Ziraat Mühendisi','kıdemli_uzman','Bitki yetiştirme ve toprak yönetimi') RETURNING id INTO pid;
INSERT INTO pozisyon_yetkinlikleri VALUES(pid,28,5,true),(pid,2,4,true),(pid,20,4,true),(pid,7,3,false),(pid,26,3,false);

INSERT INTO pozisyonlar(departman_id,ad,seviye,aciklama) VALUES(26,'Çiftlik Müdürü','yönetici','Bitkisel üretim çiftlik yönetimi') RETURNING id INTO pid;
INSERT INTO pozisyon_yetkinlikleri VALUES(pid,8,5,true),(pid,10,4,true),(pid,9,4,true),(pid,22,3,false),(pid,29,3,false);

-- dept 27: Hayvancılık
INSERT INTO pozisyonlar(departman_id,ad,seviye,aciklama) VALUES(27,'Veteriner Teknikeri','uzman','Hayvan sağlığı ve yetiştiricilik') RETURNING id INTO pid;
INSERT INTO pozisyon_yetkinlikleri VALUES(pid,27,5,true),(pid,28,4,true),(pid,21,4,true),(pid,24,4,false),(pid,17,3,false);

INSERT INTO pozisyonlar(departman_id,ad,seviye,aciklama) VALUES(27,'Beslenme Uzmanı','kıdemli_uzman','Hayvan beslenme ve yem formülasyonu') RETURNING id INTO pid;
INSERT INTO pozisyon_yetkinlikleri VALUES(pid,28,5,true),(pid,2,4,true),(pid,27,4,true),(pid,20,3,false),(pid,7,3,false);

INSERT INTO pozisyonlar(departman_id,ad,seviye,aciklama) VALUES(27,'İşletme Müdürü','yönetici','Hayvancılık işletme yönetimi') RETURNING id INTO pid;
INSERT INTO pozisyon_yetkinlikleri VALUES(pid,8,5,true),(pid,27,4,true),(pid,10,4,true),(pid,22,3,false),(pid,9,3,false);

-- dept 28: Su Ürünleri
INSERT INTO pozisyonlar(departman_id,ad,seviye,aciklama) VALUES(28,'Su Ürünleri Uzmanı','uzman','Akuakültür ve balıkçılık yönetimi') RETURNING id INTO pid;
INSERT INTO pozisyon_yetkinlikleri VALUES(pid,28,5,true),(pid,27,5,true),(pid,20,4,true),(pid,21,3,false),(pid,24,3,false);

INSERT INTO pozisyonlar(departman_id,ad,seviye,aciklama) VALUES(28,'Su Kalitesi Uzmanı','kıdemli_uzman','Su ürünleri kalite ve çevre yönetimi') RETURNING id INTO pid;
INSERT INTO pozisyon_yetkinlikleri VALUES(pid,27,5,true),(pid,6,4,true),(pid,21,4,true),(pid,7,3,false),(pid,20,3,false);

INSERT INTO pozisyonlar(departman_id,ad,seviye,aciklama) VALUES(28,'Tesis Müdürü','yönetici','Su ürünleri tesis yönetimi') RETURNING id INTO pid;
INSERT INTO pozisyon_yetkinlikleri VALUES(pid,8,5,true),(pid,27,4,true),(pid,10,4,true),(pid,22,3,false),(pid,9,3,false);

-- dept 29: Et ve Süt İşleme
INSERT INTO pozisyonlar(departman_id,ad,seviye,aciklama) VALUES(29,'Gıda Teknolojisti','uzman','Et ve süt ürünleri üretim teknolojisi') RETURNING id INTO pid;
INSERT INTO pozisyon_yetkinlikleri VALUES(pid,30,5,true),(pid,27,5,true),(pid,6,5,true),(pid,20,3,false),(pid,28,3,false);

INSERT INTO pozisyonlar(departman_id,ad,seviye,aciklama) VALUES(29,'Kalite Güvence Uzmanı','kıdemli_uzman','Gıda güvenliği ve kalite sistemleri') RETURNING id INTO pid;
INSERT INTO pozisyon_yetkinlikleri VALUES(pid,30,5,true),(pid,6,5,true),(pid,27,5,true),(pid,19,4,false),(pid,7,3,false);

INSERT INTO pozisyonlar(departman_id,ad,seviye,aciklama) VALUES(29,'Fabrika Müdürü','yönetici','Et ve süt işleme fabrikası yönetimi') RETURNING id INTO pid;
INSERT INTO pozisyon_yetkinlikleri VALUES(pid,8,5,true),(pid,27,4,true),(pid,10,4,true),(pid,9,4,false),(pid,22,3,false);

-- dept 30: Unlu Mamuller ve Tatlı
INSERT INTO pozisyonlar(departman_id,ad,seviye,aciklama) VALUES(30,'Üretim Uzmanı','uzman','Unlu mamul ve tatlı üretimi') RETURNING id INTO pid;
INSERT INTO pozisyon_yetkinlikleri VALUES(pid,30,5,true),(pid,27,5,true),(pid,6,4,true),(pid,20,3,false),(pid,26,3,false);

INSERT INTO pozisyonlar(departman_id,ad,seviye,aciklama) VALUES(30,'Pastane Şefi','kıdemli_uzman','Pasta ve tatlı tasarım ve üretim') RETURNING id INTO pid;
INSERT INTO pozisyon_yetkinlikleri VALUES(pid,26,5,true),(pid,30,4,true),(pid,6,4,true),(pid,28,3,false),(pid,25,3,false);

INSERT INTO pozisyonlar(departman_id,ad,seviye,aciklama) VALUES(30,'Üretim Müdürü','yönetici','Unlu mamul üretim yönetimi') RETURNING id INTO pid;
INSERT INTO pozisyon_yetkinlikleri VALUES(pid,8,5,true),(pid,27,4,true),(pid,10,4,true),(pid,13,3,false),(pid,22,3,false);

-- dept 31: Yağ Sanayii
INSERT INTO pozisyonlar(departman_id,ad,seviye,aciklama) VALUES(31,'Yağ Teknolojisti','uzman','Bitkisel yağ üretim teknolojisi') RETURNING id INTO pid;
INSERT INTO pozisyon_yetkinlikleri VALUES(pid,30,5,true),(pid,27,5,true),(pid,6,4,true),(pid,20,4,false),(pid,2,3,false);

INSERT INTO pozisyonlar(departman_id,ad,seviye,aciklama) VALUES(31,'Kalite Kontrol Uzmanı','kıdemli_uzman','Yağ kalite analizi ve kontrol') RETURNING id INTO pid;
INSERT INTO pozisyon_yetkinlikleri VALUES(pid,30,5,true),(pid,6,5,true),(pid,19,4,true),(pid,27,4,false),(pid,7,3,false);

INSERT INTO pozisyonlar(departman_id,ad,seviye,aciklama) VALUES(31,'Tesis Müdürü','yönetici','Yağ işleme tesis yönetimi') RETURNING id INTO pid;
INSERT INTO pozisyon_yetkinlikleri VALUES(pid,8,5,true),(pid,10,4,true),(pid,9,4,true),(pid,27,3,false),(pid,22,3,false);

-- dept 32: İçecek Üretimi
INSERT INTO pozisyonlar(departman_id,ad,seviye,aciklama) VALUES(32,'İçecek Teknolojisti','uzman','İçecek formülasyonu ve üretim') RETURNING id INTO pid;
INSERT INTO pozisyon_yetkinlikleri VALUES(pid,30,5,true),(pid,26,4,true),(pid,27,4,true),(pid,6,4,false),(pid,28,3,false);

INSERT INTO pozisyonlar(departman_id,ad,seviye,aciklama) VALUES(32,'Kalite Güvence Uzmanı','kıdemli_uzman','İçecek gıda güvenliği ve kalite') RETURNING id INTO pid;
INSERT INTO pozisyon_yetkinlikleri VALUES(pid,30,5,true),(pid,6,5,true),(pid,27,5,true),(pid,7,3,false),(pid,19,3,false);

INSERT INTO pozisyonlar(departman_id,ad,seviye,aciklama) VALUES(32,'Fabrika Müdürü','yönetici','İçecek fabrikası yönetimi') RETURNING id INTO pid;
INSERT INTO pozisyon_yetkinlikleri VALUES(pid,8,5,true),(pid,10,4,true),(pid,27,4,true),(pid,9,3,false),(pid,22,3,false);

-- ==============================================================
-- SEKTOR 6: Teknoloji, Bilişim ve Elektronik
-- (Yazılım Geliştirme/dept 33 → pozisyonlar zaten var)
-- Dept IDs: 34-Veri ve Yapay Zeka, 35-Siber Güvenlik,
--           36-Altyapı ve Cloud, 37-Elektronik ve Donanım,
--           38-Ürün ve Proje Yönetimi
-- ==============================================================

-- dept 34: Veri ve Yapay Zeka
INSERT INTO pozisyonlar(departman_id,ad,seviye,aciklama) VALUES(34,'Veri Analisti','junior','Veri analizi ve raporlama') RETURNING id INTO pid;
INSERT INTO pozisyon_yetkinlikleri VALUES(pid,4,5,true),(pid,19,4,true),(pid,1,4,true),(pid,17,3,false),(pid,23,3,false);

INSERT INTO pozisyonlar(departman_id,ad,seviye,aciklama) VALUES(34,'Veri Bilimcisi','uzman','Makine öğrenmesi ve veri modelleme') RETURNING id INTO pid;
INSERT INTO pozisyon_yetkinlikleri VALUES(pid,4,5,true),(pid,1,5,true),(pid,2,5,true),(pid,3,4,false),(pid,26,3,false);

INSERT INTO pozisyonlar(departman_id,ad,seviye,aciklama) VALUES(34,'Kıdemli Yapay Zeka Mühendisi','kıdemli_uzman','İleri AI/ML sistem tasarımı ve geliştirme') RETURNING id INTO pid;
INSERT INTO pozisyon_yetkinlikleri VALUES(pid,3,5,true),(pid,4,5,true),(pid,1,5,true),(pid,2,4,false),(pid,26,4,false);

INSERT INTO pozisyonlar(departman_id,ad,seviye,aciklama) VALUES(34,'Veri ve AI Müdürü','yönetici','Veri ve yapay zeka ekibi yönetimi') RETURNING id INTO pid;
INSERT INTO pozisyon_yetkinlikleri VALUES(pid,8,5,true),(pid,9,5,true),(pid,4,4,true),(pid,10,4,false),(pid,13,3,false);

-- dept 35: Siber Güvenlik
INSERT INTO pozisyonlar(departman_id,ad,seviye,aciklama) VALUES(35,'Güvenlik Analisti','junior','Ağ güvenliği izleme ve olay müdahalesi') RETURNING id INTO pid;
INSERT INTO pozisyon_yetkinlikleri VALUES(pid,5,5,true),(pid,19,4,true),(pid,21,4,true),(pid,2,4,false),(pid,23,3,false);

INSERT INTO pozisyonlar(departman_id,ad,seviye,aciklama) VALUES(35,'Sızma Testi Uzmanı','uzman','Pentest ve güvenlik açığı değerlendirmesi') RETURNING id INTO pid;
INSERT INTO pozisyon_yetkinlikleri VALUES(pid,5,5,true),(pid,2,5,true),(pid,19,5,true),(pid,27,4,false),(pid,7,3,false);

INSERT INTO pozisyonlar(departman_id,ad,seviye,aciklama) VALUES(35,'Baş Güvenlik Mimarı','kıdemli_uzman','Güvenlik mimarisi ve strateji tasarımı') RETURNING id INTO pid;
INSERT INTO pozisyon_yetkinlikleri VALUES(pid,5,5,true),(pid,3,5,true),(pid,9,4,true),(pid,27,4,false),(pid,21,4,false);

INSERT INTO pozisyonlar(departman_id,ad,seviye,aciklama) VALUES(35,'CISO / Güvenlik Müdürü','yönetici','Kurumsal siber güvenlik yönetimi') RETURNING id INTO pid;
INSERT INTO pozisyon_yetkinlikleri VALUES(pid,9,5,true),(pid,5,5,true),(pid,27,5,true),(pid,8,4,false),(pid,10,4,false);

-- dept 36: Altyapı ve Cloud
INSERT INTO pozisyonlar(departman_id,ad,seviye,aciklama) VALUES(36,'Sistem Yöneticisi','junior','Sunucu ve ağ altyapı yönetimi') RETURNING id INTO pid;
INSERT INTO pozisyon_yetkinlikleri VALUES(pid,2,5,true),(pid,5,4,true),(pid,25,4,true),(pid,23,3,false),(pid,24,3,false);

INSERT INTO pozisyonlar(departman_id,ad,seviye,aciklama) VALUES(36,'Cloud Mühendisi','uzman','Bulut altyapı tasarımı ve yönetimi') RETURNING id INTO pid;
INSERT INTO pozisyon_yetkinlikleri VALUES(pid,3,5,true),(pid,2,5,true),(pid,5,4,true),(pid,20,3,false),(pid,7,3,false);

INSERT INTO pozisyonlar(departman_id,ad,seviye,aciklama) VALUES(36,'Kıdemli DevOps Mühendisi','kıdemli_uzman','CI/CD ve altyapı otomasyonu') RETURNING id INTO pid;
INSERT INTO pozisyon_yetkinlikleri VALUES(pid,1,5,true),(pid,3,5,true),(pid,20,4,true),(pid,7,4,false),(pid,18,3,false);

INSERT INTO pozisyonlar(departman_id,ad,seviye,aciklama) VALUES(36,'Altyapı Müdürü','yönetici','IT altyapı bölüm yönetimi') RETURNING id INTO pid;
INSERT INTO pozisyon_yetkinlikleri VALUES(pid,8,5,true),(pid,9,4,true),(pid,13,4,true),(pid,10,4,false),(pid,22,3,false);

-- dept 37: Elektronik ve Donanım
INSERT INTO pozisyonlar(departman_id,ad,seviye,aciklama) VALUES(37,'Elektronik Mühendisi','uzman','Elektronik devre tasarımı ve test') RETURNING id INTO pid;
INSERT INTO pozisyon_yetkinlikleri VALUES(pid,2,5,true),(pid,3,5,true),(pid,6,4,true),(pid,7,4,false),(pid,30,3,false);

INSERT INTO pozisyonlar(departman_id,ad,seviye,aciklama) VALUES(37,'Gömülü Sistem Uzmanı','kıdemli_uzman','Gömülü yazılım ve donanım entegrasyonu') RETURNING id INTO pid;
INSERT INTO pozisyon_yetkinlikleri VALUES(pid,1,5,true),(pid,3,5,true),(pid,2,4,true),(pid,6,4,false),(pid,26,3,false);

INSERT INTO pozisyonlar(departman_id,ad,seviye,aciklama) VALUES(37,'Donanım Müdürü','yönetici','Elektronik donanım geliştirme yönetimi') RETURNING id INTO pid;
INSERT INTO pozisyon_yetkinlikleri VALUES(pid,8,5,true),(pid,9,4,true),(pid,13,4,true),(pid,10,3,false),(pid,18,3,false);

-- dept 38: Ürün ve Proje Yönetimi
INSERT INTO pozisyonlar(departman_id,ad,seviye,aciklama) VALUES(38,'Ürün Yöneticisi','uzman','Yazılım ürün yönetimi ve roadmap') RETURNING id INTO pid;
INSERT INTO pozisyon_yetkinlikleri VALUES(pid,13,5,true),(pid,9,5,true),(pid,18,4,true),(pid,19,4,false),(pid,26,3,false);

INSERT INTO pozisyonlar(departman_id,ad,seviye,aciklama) VALUES(38,'Kıdemli Proje Yöneticisi','kıdemli_uzman','IT proje yönetimi ve paydaş yönetimi') RETURNING id INTO pid;
INSERT INTO pozisyon_yetkinlikleri VALUES(pid,13,5,true),(pid,8,4,true),(pid,18,4,true),(pid,15,4,false),(pid,21,3,false);

INSERT INTO pozisyonlar(departman_id,ad,seviye,aciklama) VALUES(38,'PMO Direktörü','direktör','Proje yönetim ofisi direktörü') RETURNING id INTO pid;
INSERT INTO pozisyon_yetkinlikleri VALUES(pid,9,5,true),(pid,13,5,true),(pid,8,4,true),(pid,12,4,false),(pid,10,4,false);

-- ==============================================================
-- SEKTOR 7: Hizmet, Sağlık ve Eğitim
-- (İnsan Kaynakları/dept 42 → pozisyonlar zaten var)
-- Dept IDs: 39-Eğitim ve Sınav Merkezleri, 40-Sağlık ve Bakım,
--           41-Yönetim Danışmanlığı, 43-Çağrı Merkezi ve Destek,
--           44-Güvenlik Hizmetleri
-- ==============================================================

-- dept 39: Eğitim ve Sınav Merkezleri
INSERT INTO pozisyonlar(departman_id,ad,seviye,aciklama) VALUES(39,'Eğitim Uzmanı','uzman','Kurs tasarımı ve eğitim delivery') RETURNING id INTO pid;
INSERT INTO pozisyon_yetkinlikleri VALUES(pid,14,5,true),(pid,17,4,true),(pid,11,4,true),(pid,26,4,false),(pid,25,3,false);

INSERT INTO pozisyonlar(departman_id,ad,seviye,aciklama) VALUES(39,'Kıdemli Eğitmen','kıdemli_uzman','İleri eğitim metodolojisi ve program geliştirme') RETURNING id INTO pid;
INSERT INTO pozisyon_yetkinlikleri VALUES(pid,14,5,true),(pid,11,5,true),(pid,26,4,true),(pid,9,4,false),(pid,17,3,false);

INSERT INTO pozisyonlar(departman_id,ad,seviye,aciklama) VALUES(39,'Eğitim Merkezi Müdürü','yönetici','Eğitim merkezi operasyon yönetimi') RETURNING id INTO pid;
INSERT INTO pozisyon_yetkinlikleri VALUES(pid,8,5,true),(pid,9,4,true),(pid,14,4,true),(pid,10,4,false),(pid,22,3,false);

-- dept 40: Sağlık ve Bakım
INSERT INTO pozisyonlar(departman_id,ad,seviye,aciklama) VALUES(40,'Sağlık Hizmetleri Uzmanı','uzman','Sağlık hizmetleri koordinasyonu') RETURNING id INTO pid;
INSERT INTO pozisyon_yetkinlikleri VALUES(pid,27,5,true),(pid,16,5,true),(pid,24,4,true),(pid,17,3,false),(pid,21,3,false);

INSERT INTO pozisyonlar(departman_id,ad,seviye,aciklama) VALUES(40,'Klinik Koordinatör','kıdemli_uzman','Klinik süreç koordinasyonu ve kalite') RETURNING id INTO pid;
INSERT INTO pozisyon_yetkinlikleri VALUES(pid,27,5,true),(pid,18,4,true),(pid,30,4,true),(pid,19,4,false),(pid,7,3,false);

INSERT INTO pozisyonlar(departman_id,ad,seviye,aciklama) VALUES(40,'Sağlık Hizmetleri Müdürü','yönetici','Sağlık hizmetleri bölüm yönetimi') RETURNING id INTO pid;
INSERT INTO pozisyon_yetkinlikleri VALUES(pid,8,5,true),(pid,27,5,true),(pid,10,4,true),(pid,9,4,false),(pid,16,3,false);

-- dept 41: Yönetim Danışmanlığı
INSERT INTO pozisyonlar(departman_id,ad,seviye,aciklama) VALUES(41,'Yönetim Danışmanı','uzman','Kurumsal yönetim danışmanlığı') RETURNING id INTO pid;
INSERT INTO pozisyon_yetkinlikleri VALUES(pid,19,5,true),(pid,9,5,true),(pid,14,4,true),(pid,15,4,false),(pid,17,3,false);

INSERT INTO pozisyonlar(departman_id,ad,seviye,aciklama) VALUES(41,'Kıdemli Danışman','kıdemli_uzman','Stratejik danışmanlık ve değişim yönetimi') RETURNING id INTO pid;
INSERT INTO pozisyon_yetkinlikleri VALUES(pid,9,5,true),(pid,12,5,true),(pid,14,4,true),(pid,19,4,false),(pid,15,4,false);

INSERT INTO pozisyonlar(departman_id,ad,seviye,aciklama) VALUES(41,'Danışmanlık Müdürü','yönetici','Danışmanlık projeler ve müşteri yönetimi') RETURNING id INTO pid;
INSERT INTO pozisyon_yetkinlikleri VALUES(pid,9,5,true),(pid,8,4,true),(pid,15,4,true),(pid,16,4,false),(pid,10,4,false);

-- dept 43: Çağrı Merkezi ve Destek
INSERT INTO pozisyonlar(departman_id,ad,seviye,aciklama) VALUES(43,'Müşteri Temsilcisi','junior','Gelen çağrı ve müşteri destek') RETURNING id INTO pid;
INSERT INTO pozisyon_yetkinlikleri VALUES(pid,16,5,true),(pid,17,4,true),(pid,24,4,true),(pid,25,4,false),(pid,23,3,false);

INSERT INTO pozisyonlar(departman_id,ad,seviye,aciklama) VALUES(43,'Çağrı Merkezi Uzmanı','uzman','Müşteri şikayet ve problem çözme') RETURNING id INTO pid;
INSERT INTO pozisyon_yetkinlikleri VALUES(pid,16,5,true),(pid,2,4,true),(pid,15,4,true),(pid,14,3,false),(pid,24,3,false);

INSERT INTO pozisyonlar(departman_id,ad,seviye,aciklama) VALUES(43,'Takım Lideri','takım_lideri','Çağrı merkezi takım liderliği') RETURNING id INTO pid;
INSERT INTO pozisyon_yetkinlikleri VALUES(pid,8,5,true),(pid,16,4,true),(pid,11,4,true),(pid,10,3,false),(pid,20,3,false);

INSERT INTO pozisyonlar(departman_id,ad,seviye,aciklama) VALUES(43,'Çağrı Merkezi Müdürü','yönetici','Çağrı merkezi operasyon yönetimi') RETURNING id INTO pid;
INSERT INTO pozisyon_yetkinlikleri VALUES(pid,8,5,true),(pid,10,5,true),(pid,9,4,true),(pid,20,4,false),(pid,22,3,false);

-- dept 44: Güvenlik Hizmetleri
INSERT INTO pozisyonlar(departman_id,ad,seviye,aciklama) VALUES(44,'Güvenlik Görevlisi','junior','Tesis güvenlik ve erişim kontrolü') RETURNING id INTO pid;
INSERT INTO pozisyon_yetkinlikleri VALUES(pid,27,5,true),(pid,25,4,true),(pid,24,4,true),(pid,21,3,false),(pid,17,3,false);

INSERT INTO pozisyonlar(departman_id,ad,seviye,aciklama) VALUES(44,'Güvenlik Uzmanı','uzman','Güvenlik sistemleri ve protokol yönetimi') RETURNING id INTO pid;
INSERT INTO pozisyon_yetkinlikleri VALUES(pid,27,5,true),(pid,21,4,true),(pid,19,4,true),(pid,5,4,false),(pid,7,3,false);

INSERT INTO pozisyonlar(departman_id,ad,seviye,aciklama) VALUES(44,'Güvenlik Amiri','takım_lideri','Güvenlik ekibi liderliği') RETURNING id INTO pid;
INSERT INTO pozisyon_yetkinlikleri VALUES(pid,8,5,true),(pid,27,4,true),(pid,10,4,true),(pid,21,3,false),(pid,24,3,false);

INSERT INTO pozisyonlar(departman_id,ad,seviye,aciklama) VALUES(44,'Güvenlik Müdürü','yönetici','Kurumsal güvenlik yönetimi') RETURNING id INTO pid;
INSERT INTO pozisyon_yetkinlikleri VALUES(pid,9,5,true),(pid,27,5,true),(pid,8,4,true),(pid,10,4,false),(pid,21,3,false);

-- ==============================================================
-- SEKTOR 8: Denizcilik, Gemi İnşa ve Su Yolu Taşımacılığı
-- Dept IDs: 45-Gemi İnşa, 46-Gemi Bakım ve Onarım,
--           47-Liman ve Elleçleme, 48-Deniz Yolu Taşımacılığı
-- ==============================================================

-- dept 45: Gemi İnşa
INSERT INTO pozisyonlar(departman_id,ad,seviye,aciklama) VALUES(45,'Gemi İnşa Teknisyeni','junior','Gemi inşa imalat ve montaj') RETURNING id INTO pid;
INSERT INTO pozisyon_yetkinlikleri VALUES(pid,30,5,true),(pid,27,4,true),(pid,25,4,true),(pid,24,4,false),(pid,20,3,false);

INSERT INTO pozisyonlar(departman_id,ad,seviye,aciklama) VALUES(45,'Gemi İnşa Mühendisi','uzman','Gemi yapısal tasarım ve inşa süreçleri') RETURNING id INTO pid;
INSERT INTO pozisyon_yetkinlikleri VALUES(pid,3,5,true),(pid,2,5,true),(pid,30,4,true),(pid,27,4,true),(pid,7,3,false);

INSERT INTO pozisyonlar(departman_id,ad,seviye,aciklama) VALUES(45,'Kıdemli Naval Mimar','kıdemli_uzman','Gemi mimari tasarım ve mühendislik analizi') RETURNING id INTO pid;
INSERT INTO pozisyon_yetkinlikleri VALUES(pid,3,5,true),(pid,2,5,true),(pid,19,4,true),(pid,27,4,false),(pid,26,3,false);

INSERT INTO pozisyonlar(departman_id,ad,seviye,aciklama) VALUES(45,'Tersane Müdürü','yönetici','Gemi inşa tersane operasyon yönetimi') RETURNING id INTO pid;
INSERT INTO pozisyon_yetkinlikleri VALUES(pid,8,5,true),(pid,10,5,true),(pid,27,4,true),(pid,9,4,false),(pid,13,3,false);

-- dept 46: Gemi Bakım ve Onarım
INSERT INTO pozisyonlar(departman_id,ad,seviye,aciklama) VALUES(46,'Gemi Bakım Teknisyeni','junior','Gemi periyodik bakım ve onarım') RETURNING id INTO pid;
INSERT INTO pozisyon_yetkinlikleri VALUES(pid,30,5,true),(pid,27,4,true),(pid,25,4,true),(pid,2,3,false),(pid,24,3,false);

INSERT INTO pozisyonlar(departman_id,ad,seviye,aciklama) VALUES(46,'Makine Uzmanı','uzman','Gemi makine ve güç sistemleri bakımı') RETURNING id INTO pid;
INSERT INTO pozisyon_yetkinlikleri VALUES(pid,2,5,true),(pid,30,5,true),(pid,27,4,true),(pid,6,4,false),(pid,7,3,false);

INSERT INTO pozisyonlar(departman_id,ad,seviye,aciklama) VALUES(46,'Kıdemli Deniz Mühendisi','kıdemli_uzman','Deniz mühendisliği ve sistem optimizasyonu') RETURNING id INTO pid;
INSERT INTO pozisyon_yetkinlikleri VALUES(pid,2,5,true),(pid,3,4,true),(pid,30,4,true),(pid,27,4,false),(pid,20,3,false);

INSERT INTO pozisyonlar(departman_id,ad,seviye,aciklama) VALUES(46,'Bakım Müdürü','yönetici','Gemi bakım ve onarım bölüm yönetimi') RETURNING id INTO pid;
INSERT INTO pozisyon_yetkinlikleri VALUES(pid,8,5,true),(pid,10,4,true),(pid,27,4,true),(pid,13,4,false),(pid,22,3,false);

-- dept 47: Liman ve Elleçleme
INSERT INTO pozisyonlar(departman_id,ad,seviye,aciklama) VALUES(47,'Liman Operatörü','junior','Yük elleçleme ve liman operasyonu') RETURNING id INTO pid;
INSERT INTO pozisyon_yetkinlikleri VALUES(pid,27,5,true),(pid,25,4,true),(pid,24,4,true),(pid,29,3,false),(pid,23,3,false);

INSERT INTO pozisyonlar(departman_id,ad,seviye,aciklama) VALUES(47,'Liman Operasyon Uzmanı','uzman','Liman operasyon koordinasyonu ve planlama') RETURNING id INTO pid;
INSERT INTO pozisyon_yetkinlikleri VALUES(pid,29,5,true),(pid,27,4,true),(pid,20,4,true),(pid,18,3,false),(pid,19,3,false);

INSERT INTO pozisyonlar(departman_id,ad,seviye,aciklama) VALUES(47,'Liman Müdürü','yönetici','Liman operasyonları genel yönetimi') RETURNING id INTO pid;
INSERT INTO pozisyon_yetkinlikleri VALUES(pid,8,5,true),(pid,29,4,true),(pid,27,4,true),(pid,9,4,false),(pid,10,4,false);

-- dept 48: Deniz Yolu Taşımacılığı
INSERT INTO pozisyonlar(departman_id,ad,seviye,aciklama) VALUES(48,'Deniz Taşımacılığı Uzmanı','uzman','Deniz yolu kargo ve rota planlaması') RETURNING id INTO pid;
INSERT INTO pozisyon_yetkinlikleri VALUES(pid,27,5,true),(pid,29,4,true),(pid,21,4,true),(pid,19,3,false),(pid,17,3,false);

INSERT INTO pozisyonlar(departman_id,ad,seviye,aciklama) VALUES(48,'Kaptan / Seyrüsefer Uzmanı','kıdemli_uzman','Gemi komuta ve seyrüsefer') RETURNING id INTO pid;
INSERT INTO pozisyon_yetkinlikleri VALUES(pid,27,5,true),(pid,10,5,true),(pid,21,5,true),(pid,24,4,false),(pid,8,3,false);

INSERT INTO pozisyonlar(departman_id,ad,seviye,aciklama) VALUES(48,'Armador Müdürü','yönetici','Deniz taşımacılığı filo yönetimi') RETURNING id INTO pid;
INSERT INTO pozisyon_yetkinlikleri VALUES(pid,9,5,true),(pid,27,4,true),(pid,8,4,true),(pid,22,4,false),(pid,10,4,false);

-- ==============================================================
-- SEKTOR 9: Otomotiv ve Kara Taşımacılığı
-- Dept IDs: 49-Araç Üretimi, 50-Yan Sanayi, 51-Teknik Servis,
--           52-Yakıt İstasyonları, 53-Lojistik ve Nakliye, 54-Araç Kiralama
-- ==============================================================

-- dept 49: Araç Üretimi
INSERT INTO pozisyonlar(departman_id,ad,seviye,aciklama) VALUES(49,'Üretim Operatörü','junior','Araç montaj hattı operasyonu') RETURNING id INTO pid;
INSERT INTO pozisyon_yetkinlikleri VALUES(pid,30,5,true),(pid,25,4,true),(pid,24,4,true),(pid,20,3,false),(pid,23,3,false);

INSERT INTO pozisyonlar(departman_id,ad,seviye,aciklama) VALUES(49,'Otomotiv Mühendisi','uzman','Araç üretim süreç mühendisliği') RETURNING id INTO pid;
INSERT INTO pozisyon_yetkinlikleri VALUES(pid,3,5,true),(pid,2,5,true),(pid,30,4,true),(pid,20,4,false),(pid,6,3,false);

INSERT INTO pozisyonlar(departman_id,ad,seviye,aciklama) VALUES(49,'Kıdemli Otomotiv Mühendisi','kıdemli_uzman','İleri araç sistem tasarımı ve optimizasyon') RETURNING id INTO pid;
INSERT INTO pozisyon_yetkinlikleri VALUES(pid,3,5,true),(pid,2,5,true),(pid,26,4,false),(pid,7,4,false),(pid,28,3,false);

INSERT INTO pozisyonlar(departman_id,ad,seviye,aciklama) VALUES(49,'Fabrika Müdürü','yönetici','Araç üretim fabrikası yönetimi') RETURNING id INTO pid;
INSERT INTO pozisyon_yetkinlikleri VALUES(pid,8,5,true),(pid,10,5,true),(pid,9,4,true),(pid,13,4,false),(pid,22,3,false);

-- dept 50: Yan Sanayi
INSERT INTO pozisyonlar(departman_id,ad,seviye,aciklama) VALUES(50,'Kalite Kontrol Mühendisi','uzman','Otomotiv parça kalite kontrolü') RETURNING id INTO pid;
INSERT INTO pozisyon_yetkinlikleri VALUES(pid,30,5,true),(pid,6,5,true),(pid,27,4,true),(pid,19,4,false),(pid,7,3,false);

INSERT INTO pozisyonlar(departman_id,ad,seviye,aciklama) VALUES(50,'Tedarik Zinciri Uzmanı','kıdemli_uzman','Otomotiv tedarik zinciri yönetimi') RETURNING id INTO pid;
INSERT INTO pozisyon_yetkinlikleri VALUES(pid,29,5,true),(pid,19,4,true),(pid,15,4,true),(pid,22,4,false),(pid,18,3,false);

INSERT INTO pozisyonlar(departman_id,ad,seviye,aciklama) VALUES(50,'Satış Müdürü','yönetici','Yan sanayi satış ve müşteri yönetimi') RETURNING id INTO pid;
INSERT INTO pozisyon_yetkinlikleri VALUES(pid,16,5,true),(pid,15,5,true),(pid,8,4,true),(pid,9,3,false),(pid,22,3,false);

-- dept 51: Teknik Servis
INSERT INTO pozisyonlar(departman_id,ad,seviye,aciklama) VALUES(51,'Otomotiv Teknisyeni','junior','Araç bakım ve onarım') RETURNING id INTO pid;
INSERT INTO pozisyon_yetkinlikleri VALUES(pid,2,5,true),(pid,30,4,true),(pid,25,4,true),(pid,16,3,false),(pid,23,3,false);

INSERT INTO pozisyonlar(departman_id,ad,seviye,aciklama) VALUES(51,'Servis Uzmanı','uzman','Gelişmiş tanı ve onarım uzmanı') RETURNING id INTO pid;
INSERT INTO pozisyon_yetkinlikleri VALUES(pid,2,5,true),(pid,16,4,true),(pid,30,4,true),(pid,7,3,false),(pid,24,3,false);

INSERT INTO pozisyonlar(departman_id,ad,seviye,aciklama) VALUES(51,'Servis Müdürü','yönetici','Teknik servis bölüm yönetimi') RETURNING id INTO pid;
INSERT INTO pozisyon_yetkinlikleri VALUES(pid,8,5,true),(pid,16,5,true),(pid,10,4,true),(pid,22,3,false),(pid,9,3,false);

-- dept 52: Yakıt İstasyonları
INSERT INTO pozisyonlar(departman_id,ad,seviye,aciklama) VALUES(52,'İstasyon Görevlisi','junior','Yakıt satış ve müşteri hizmetleri') RETURNING id INTO pid;
INSERT INTO pozisyon_yetkinlikleri VALUES(pid,16,5,true),(pid,27,4,true),(pid,25,4,true),(pid,24,3,false),(pid,22,3,false);

INSERT INTO pozisyonlar(departman_id,ad,seviye,aciklama) VALUES(52,'İstasyon Sorumlusu','uzman','Yakıt istasyonu operasyon sorumluluğu') RETURNING id INTO pid;
INSERT INTO pozisyon_yetkinlikleri VALUES(pid,27,5,true),(pid,16,4,true),(pid,20,4,true),(pid,22,3,false),(pid,21,3,false);

INSERT INTO pozisyonlar(departman_id,ad,seviye,aciklama) VALUES(52,'Bölge Müdürü','yönetici','Yakıt istasyonları bölge yönetimi') RETURNING id INTO pid;
INSERT INTO pozisyon_yetkinlikleri VALUES(pid,8,5,true),(pid,9,4,true),(pid,16,4,true),(pid,10,4,false),(pid,22,4,false);

-- dept 53: Lojistik ve Nakliye
INSERT INTO pozisyonlar(departman_id,ad,seviye,aciklama) VALUES(53,'Lojistik Koordinatörü','uzman','Nakliye planlama ve takip') RETURNING id INTO pid;
INSERT INTO pozisyon_yetkinlikleri VALUES(pid,29,5,true),(pid,20,4,true),(pid,19,4,true),(pid,18,3,false),(pid,17,3,false);

INSERT INTO pozisyonlar(departman_id,ad,seviye,aciklama) VALUES(53,'Tedarik Zinciri Uzmanı','kıdemli_uzman','Lojistik optimizasyon ve tedarik') RETURNING id INTO pid;
INSERT INTO pozisyon_yetkinlikleri VALUES(pid,29,5,true),(pid,4,4,true),(pid,19,4,true),(pid,22,4,false),(pid,20,3,false);

INSERT INTO pozisyonlar(departman_id,ad,seviye,aciklama) VALUES(53,'Lojistik Müdürü','yönetici','Lojistik operasyonlar genel yönetimi') RETURNING id INTO pid;
INSERT INTO pozisyon_yetkinlikleri VALUES(pid,8,5,true),(pid,9,5,true),(pid,29,4,true),(pid,10,4,false),(pid,22,3,false);

-- dept 54: Araç Kiralama
INSERT INTO pozisyonlar(departman_id,ad,seviye,aciklama) VALUES(54,'Kiralama Danışmanı','junior','Araç kiralama satış ve müşteri hizmetleri') RETURNING id INTO pid;
INSERT INTO pozisyon_yetkinlikleri VALUES(pid,16,5,true),(pid,15,4,true),(pid,14,3,true),(pid,25,3,false),(pid,23,3,false);

INSERT INTO pozisyonlar(departman_id,ad,seviye,aciklama) VALUES(54,'Filo Yönetim Uzmanı','uzman','Araç filo takip ve bakım koordinasyonu') RETURNING id INTO pid;
INSERT INTO pozisyon_yetkinlikleri VALUES(pid,20,5,true),(pid,29,4,true),(pid,19,4,true),(pid,22,3,false),(pid,17,3,false);

INSERT INTO pozisyonlar(departman_id,ad,seviye,aciklama) VALUES(54,'Kiralama Müdürü','yönetici','Araç kiralama bölüm yönetimi') RETURNING id INTO pid;
INSERT INTO pozisyon_yetkinlikleri VALUES(pid,8,5,true),(pid,16,4,true),(pid,9,4,true),(pid,10,4,false),(pid,22,3,false);

-- ==============================================================
-- SEKTOR 10: İnşaat ve Altyapı Mühendisliği
-- Dept IDs: 55-Yapım ve İnşaat, 56-Zemin ve Temel Mühendisliği,
--           57-Tesisat, 58-İç Mimari ve Dekorasyon, 59-Proje Yönetimi
-- ==============================================================

-- dept 55: Yapım ve İnşaat
INSERT INTO pozisyonlar(departman_id,ad,seviye,aciklama) VALUES(55,'Şantiye Şefi','uzman','İnşaat sahası operasyonel yönetimi') RETURNING id INTO pid;
INSERT INTO pozisyon_yetkinlikleri VALUES(pid,8,5,true),(pid,27,5,true),(pid,30,4,true),(pid,21,4,false),(pid,24,3,false);

INSERT INTO pozisyonlar(departman_id,ad,seviye,aciklama) VALUES(55,'İnşaat Mühendisi','kıdemli_uzman','Yapısal hesap ve tasarım') RETURNING id INTO pid;
INSERT INTO pozisyon_yetkinlikleri VALUES(pid,3,5,true),(pid,2,5,true),(pid,27,4,true),(pid,7,4,false),(pid,19,3,false);

INSERT INTO pozisyonlar(departman_id,ad,seviye,aciklama) VALUES(55,'Proje Müdürü','yönetici','İnşaat projesi yönetimi') RETURNING id INTO pid;
INSERT INTO pozisyon_yetkinlikleri VALUES(pid,13,5,true),(pid,8,5,true),(pid,10,4,true),(pid,27,4,false),(pid,22,3,false);

-- dept 56: Zemin ve Temel Mühendisliği
INSERT INTO pozisyonlar(departman_id,ad,seviye,aciklama) VALUES(56,'Geoteknik Uzmanı','uzman','Zemin araştırması ve analiz') RETURNING id INTO pid;
INSERT INTO pozisyon_yetkinlikleri VALUES(pid,4,5,true),(pid,2,5,true),(pid,19,4,true),(pid,7,4,false),(pid,27,3,false);

INSERT INTO pozisyonlar(departman_id,ad,seviye,aciklama) VALUES(56,'Kıdemli Geoteknik Mühendis','kıdemli_uzman','Zemin iyileştirme ve temel tasarımı') RETURNING id INTO pid;
INSERT INTO pozisyon_yetkinlikleri VALUES(pid,3,5,true),(pid,2,5,true),(pid,19,4,true),(pid,7,3,false),(pid,26,3,false);

INSERT INTO pozisyonlar(departman_id,ad,seviye,aciklama) VALUES(56,'Teknik Müdür','yönetici','Geoteknik bölüm yönetimi') RETURNING id INTO pid;
INSERT INTO pozisyon_yetkinlikleri VALUES(pid,9,5,true),(pid,8,4,true),(pid,13,4,true),(pid,10,4,false),(pid,15,3,false);

-- dept 57: Tesisat
INSERT INTO pozisyonlar(departman_id,ad,seviye,aciklama) VALUES(57,'Tesisat Teknisyeni','junior','Sıhhi tesisat montaj ve onarım') RETURNING id INTO pid;
INSERT INTO pozisyon_yetkinlikleri VALUES(pid,27,5,true),(pid,30,4,true),(pid,25,4,true),(pid,2,3,false),(pid,24,3,false);

INSERT INTO pozisyonlar(departman_id,ad,seviye,aciklama) VALUES(57,'Tesisat Uzmanı','uzman','Gelişmiş tesisat sistemleri') RETURNING id INTO pid;
INSERT INTO pozisyon_yetkinlikleri VALUES(pid,2,5,true),(pid,27,4,true),(pid,30,4,true),(pid,7,3,false),(pid,20,3,false);

INSERT INTO pozisyonlar(departman_id,ad,seviye,aciklama) VALUES(57,'Teknik Müdür','yönetici','Tesisat bölüm yönetimi') RETURNING id INTO pid;
INSERT INTO pozisyon_yetkinlikleri VALUES(pid,8,5,true),(pid,27,4,true),(pid,10,4,true),(pid,13,3,false),(pid,22,3,false);

-- dept 58: İç Mimari ve Dekorasyon
INSERT INTO pozisyonlar(departman_id,ad,seviye,aciklama) VALUES(58,'İç Mimar','uzman','İç mekan tasarım ve uygulama') RETURNING id INTO pid;
INSERT INTO pozisyon_yetkinlikleri VALUES(pid,26,5,true),(pid,3,5,true),(pid,16,4,true),(pid,14,3,false),(pid,15,3,false);

INSERT INTO pozisyonlar(departman_id,ad,seviye,aciklama) VALUES(58,'Kıdemli İç Mimar','kıdemli_uzman','Büyük ölçekli proje tasarımı') RETURNING id INTO pid;
INSERT INTO pozisyon_yetkinlikleri VALUES(pid,26,5,true),(pid,3,5,true),(pid,13,4,true),(pid,15,4,false),(pid,9,3,false);

INSERT INTO pozisyonlar(departman_id,ad,seviye,aciklama) VALUES(58,'Tasarım Direktörü','direktör','İç mimari stüdyo direktörü') RETURNING id INTO pid;
INSERT INTO pozisyon_yetkinlikleri VALUES(pid,9,5,true),(pid,26,5,true),(pid,8,4,true),(pid,15,4,false),(pid,12,3,false);

-- dept 59: Proje Yönetimi (İnşaat)
INSERT INTO pozisyonlar(departman_id,ad,seviye,aciklama) VALUES(59,'Proje Koordinatörü','uzman','İnşaat proje koordinasyonu') RETURNING id INTO pid;
INSERT INTO pozisyon_yetkinlikleri VALUES(pid,13,5,true),(pid,18,4,true),(pid,17,4,true),(pid,19,3,false),(pid,25,3,false);

INSERT INTO pozisyonlar(departman_id,ad,seviye,aciklama) VALUES(59,'Kıdemli Proje Müdürü','kıdemli_uzman','Büyük inşaat projeleri yönetimi') RETURNING id INTO pid;
INSERT INTO pozisyon_yetkinlikleri VALUES(pid,13,5,true),(pid,8,5,true),(pid,9,4,true),(pid,15,4,false),(pid,10,4,false);

INSERT INTO pozisyonlar(departman_id,ad,seviye,aciklama) VALUES(59,'PMO Direktörü','direktör','İnşaat proje portföy yönetimi') RETURNING id INTO pid;
INSERT INTO pozisyon_yetkinlikleri VALUES(pid,9,5,true),(pid,13,5,true),(pid,10,4,true),(pid,12,4,false),(pid,22,3,false);

-- ==============================================================
-- SEKTOR 11: Telekomünikasyon ve Haberleşme
-- Dept IDs: 60-Ağ Altyapısı, 61-Uydu ve Telsiz,
--           62-İnternet Servis, 63-GSM Operatör, 64-Cihaz Yenileme
-- ==============================================================

-- dept 60: Ağ Altyapısı
INSERT INTO pozisyonlar(departman_id,ad,seviye,aciklama) VALUES(60,'Ağ Teknisyeni','junior','Ağ kurulum ve bakım') RETURNING id INTO pid;
INSERT INTO pozisyon_yetkinlikleri VALUES(pid,2,5,true),(pid,5,4,true),(pid,25,4,true),(pid,27,3,false),(pid,23,3,false);

INSERT INTO pozisyonlar(departman_id,ad,seviye,aciklama) VALUES(60,'Ağ Mühendisi','uzman','Telekomünikasyon ağ tasarımı ve optimizasyon') RETURNING id INTO pid;
INSERT INTO pozisyon_yetkinlikleri VALUES(pid,3,5,true),(pid,2,5,true),(pid,5,4,true),(pid,20,3,false),(pid,7,3,false);

INSERT INTO pozisyonlar(departman_id,ad,seviye,aciklama) VALUES(60,'Kıdemli Ağ Mimarı','kıdemli_uzman','İleri ağ mimari ve protokol tasarımı') RETURNING id INTO pid;
INSERT INTO pozisyon_yetkinlikleri VALUES(pid,3,5,true),(pid,9,4,true),(pid,5,4,true),(pid,7,4,false),(pid,26,3,false);

INSERT INTO pozisyonlar(departman_id,ad,seviye,aciklama) VALUES(60,'Ağ Müdürü','yönetici','Ağ altyapısı bölüm yönetimi') RETURNING id INTO pid;
INSERT INTO pozisyon_yetkinlikleri VALUES(pid,8,5,true),(pid,9,4,true),(pid,13,4,true),(pid,10,4,false),(pid,22,3,false);

-- dept 61: Uydu ve Telsiz
INSERT INTO pozisyonlar(departman_id,ad,seviye,aciklama) VALUES(61,'Uydu Sistem Uzmanı','uzman','Uydu haberleşme sistemleri') RETURNING id INTO pid;
INSERT INTO pozisyon_yetkinlikleri VALUES(pid,3,5,true),(pid,2,5,true),(pid,27,4,true),(pid,7,4,false),(pid,5,3,false);

INSERT INTO pozisyonlar(departman_id,ad,seviye,aciklama) VALUES(61,'Telsiz Frekans Uzmanı','kıdemli_uzman','RF tasarım ve frekans yönetimi') RETURNING id INTO pid;
INSERT INTO pozisyon_yetkinlikleri VALUES(pid,3,5,true),(pid,27,5,true),(pid,2,4,true),(pid,7,3,false),(pid,26,3,false);

INSERT INTO pozisyonlar(departman_id,ad,seviye,aciklama) VALUES(61,'Teknik Direktör','direktör','Uydu ve telsiz sistemleri direktörü') RETURNING id INTO pid;
INSERT INTO pozisyon_yetkinlikleri VALUES(pid,9,5,true),(pid,3,4,true),(pid,27,4,true),(pid,8,4,false),(pid,10,3,false);

-- dept 62: İnternet Servis
INSERT INTO pozisyonlar(departman_id,ad,seviye,aciklama) VALUES(62,'İnternet Servis Uzmanı','uzman','ISP teknik destek ve kurulum') RETURNING id INTO pid;
INSERT INTO pozisyon_yetkinlikleri VALUES(pid,2,5,true),(pid,16,4,true),(pid,5,3,true),(pid,27,3,false),(pid,25,3,false);

INSERT INTO pozisyonlar(departman_id,ad,seviye,aciklama) VALUES(62,'Altyapı Planlama Uzmanı','kıdemli_uzman','Genişbant altyapı planlama') RETURNING id INTO pid;
INSERT INTO pozisyon_yetkinlikleri VALUES(pid,3,5,true),(pid,4,4,true),(pid,9,4,true),(pid,27,3,false),(pid,19,3,false);

INSERT INTO pozisyonlar(departman_id,ad,seviye,aciklama) VALUES(62,'Bölge Müdürü','yönetici','İnternet servis bölge yönetimi') RETURNING id INTO pid;
INSERT INTO pozisyon_yetkinlikleri VALUES(pid,8,5,true),(pid,16,4,true),(pid,9,4,true),(pid,10,4,false),(pid,22,3,false);

-- dept 63: GSM Operatör
INSERT INTO pozisyonlar(departman_id,ad,seviye,aciklama) VALUES(63,'GSM Teknik Uzmanı','uzman','Mobil ağ operasyon ve optimizasyon') RETURNING id INTO pid;
INSERT INTO pozisyon_yetkinlikleri VALUES(pid,3,5,true),(pid,2,5,true),(pid,4,4,true),(pid,27,3,false),(pid,20,3,false);

INSERT INTO pozisyonlar(departman_id,ad,seviye,aciklama) VALUES(63,'RAN Mühendisi','kıdemli_uzman','Radyo ağ optimizasyon ve planlama') RETURNING id INTO pid;
INSERT INTO pozisyon_yetkinlikleri VALUES(pid,3,5,true),(pid,4,5,true),(pid,2,4,true),(pid,9,3,false),(pid,7,3,false);

INSERT INTO pozisyonlar(departman_id,ad,seviye,aciklama) VALUES(63,'Ağ Operasyon Müdürü','yönetici','GSM ağ operasyon merkezi yönetimi') RETURNING id INTO pid;
INSERT INTO pozisyon_yetkinlikleri VALUES(pid,8,5,true),(pid,9,4,true),(pid,10,4,true),(pid,13,4,false),(pid,22,3,false);

-- dept 64: Cihaz Yenileme
INSERT INTO pozisyonlar(departman_id,ad,seviye,aciklama) VALUES(64,'Cihaz Test Uzmanı','uzman','Mobil cihaz kalite testi ve yenileme') RETURNING id INTO pid;
INSERT INTO pozisyon_yetkinlikleri VALUES(pid,6,5,true),(pid,30,4,true),(pid,2,4,true),(pid,20,3,false),(pid,27,3,false);

INSERT INTO pozisyonlar(departman_id,ad,seviye,aciklama) VALUES(64,'Operasyon Müdürü','yönetici','Cihaz yenileme operasyon yönetimi') RETURNING id INTO pid;
INSERT INTO pozisyon_yetkinlikleri VALUES(pid,8,5,true),(pid,30,4,true),(pid,10,4,true),(pid,29,3,false),(pid,22,3,false);

-- ==============================================================
-- SEKTOR 12: Enerji, Akaryakıt ve Rafineri
-- Dept IDs: 65-Yenilenebilir Enerji, 66-Termik ve Nükleer,
--           67-Rafineri ve Petrokimya, 68-Şebeke ve Dağıtım, 69-EV Şarj ve Enerji Depolama
-- ==============================================================

-- dept 65: Yenilenebilir Enerji
INSERT INTO pozisyonlar(departman_id,ad,seviye,aciklama) VALUES(65,'Yenilenebilir Enerji Uzmanı','uzman','Güneş/rüzgar enerji sistem kurulum ve bakım') RETURNING id INTO pid;
INSERT INTO pozisyon_yetkinlikleri VALUES(pid,2,5,true),(pid,27,5,true),(pid,28,4,true),(pid,20,3,false),(pid,21,3,false);

INSERT INTO pozisyonlar(departman_id,ad,seviye,aciklama) VALUES(65,'Enerji Mühendisi','kıdemli_uzman','Yenilenebilir enerji sistem tasarımı') RETURNING id INTO pid;
INSERT INTO pozisyon_yetkinlikleri VALUES(pid,3,5,true),(pid,2,5,true),(pid,27,4,true),(pid,26,4,false),(pid,7,3,false);

INSERT INTO pozisyonlar(departman_id,ad,seviye,aciklama) VALUES(65,'Proje Müdürü','yönetici','Enerji projesi geliştirme ve yönetimi') RETURNING id INTO pid;
INSERT INTO pozisyon_yetkinlikleri VALUES(pid,13,5,true),(pid,9,5,true),(pid,8,4,true),(pid,27,4,false),(pid,22,3,false);

INSERT INTO pozisyonlar(departman_id,ad,seviye,aciklama) VALUES(65,'Enerji Direktörü','direktör','Yenilenebilir enerji portföy direktörü') RETURNING id INTO pid;
INSERT INTO pozisyon_yetkinlikleri VALUES(pid,9,5,true),(pid,12,5,true),(pid,10,4,true),(pid,22,4,false),(pid,27,3,false);

-- dept 66: Termik ve Nükleer
INSERT INTO pozisyonlar(departman_id,ad,seviye,aciklama) VALUES(66,'Santral Operatörü','uzman','Termik santral operasyon ve kontrol') RETURNING id INTO pid;
INSERT INTO pozisyon_yetkinlikleri VALUES(pid,27,5,true),(pid,21,5,true),(pid,2,4,true),(pid,24,4,false),(pid,30,3,false);

INSERT INTO pozisyonlar(departman_id,ad,seviye,aciklama) VALUES(66,'Güç Mühendisi','kıdemli_uzman','Elektrik üretim sistem mühendisliği') RETURNING id INTO pid;
INSERT INTO pozisyon_yetkinlikleri VALUES(pid,3,5,true),(pid,2,5,true),(pid,27,5,true),(pid,21,4,false),(pid,7,3,false);

INSERT INTO pozisyonlar(departman_id,ad,seviye,aciklama) VALUES(66,'Santral Müdürü','yönetici','Termik santral genel yönetimi') RETURNING id INTO pid;
INSERT INTO pozisyon_yetkinlikleri VALUES(pid,8,5,true),(pid,27,5,true),(pid,10,4,true),(pid,9,4,false),(pid,21,4,false);

-- dept 67: Rafineri ve Petrokimya
INSERT INTO pozisyonlar(departman_id,ad,seviye,aciklama) VALUES(67,'Proses Mühendisi','uzman','Rafineri proses optimizasyonu') RETURNING id INTO pid;
INSERT INTO pozisyon_yetkinlikleri VALUES(pid,2,5,true),(pid,27,5,true),(pid,20,4,true),(pid,30,4,false),(pid,21,4,false);

INSERT INTO pozisyonlar(departman_id,ad,seviye,aciklama) VALUES(67,'Kıdemli Kimya Mühendisi','kıdemli_uzman','Petrokimya proses tasarımı') RETURNING id INTO pid;
INSERT INTO pozisyon_yetkinlikleri VALUES(pid,3,5,true),(pid,2,5,true),(pid,27,4,true),(pid,4,4,false),(pid,7,3,false);

INSERT INTO pozisyonlar(departman_id,ad,seviye,aciklama) VALUES(67,'Rafineri Müdürü','yönetici','Rafineri tesis yönetimi') RETURNING id INTO pid;
INSERT INTO pozisyon_yetkinlikleri VALUES(pid,8,5,true),(pid,27,5,true),(pid,10,4,true),(pid,9,4,false),(pid,22,3,false);

-- dept 68: Şebeke ve Dağıtım
INSERT INTO pozisyonlar(departman_id,ad,seviye,aciklama) VALUES(68,'Şebeke Teknikeri','junior','Elektrik şebekesi bakım ve onarım') RETURNING id INTO pid;
INSERT INTO pozisyon_yetkinlikleri VALUES(pid,27,5,true),(pid,30,4,true),(pid,25,4,true),(pid,24,3,false),(pid,2,3,false);

INSERT INTO pozisyonlar(departman_id,ad,seviye,aciklama) VALUES(68,'Şebeke Mühendisi','uzman','Elektrik dağıtım ağı mühendisliği') RETURNING id INTO pid;
INSERT INTO pozisyon_yetkinlikleri VALUES(pid,3,5,true),(pid,2,4,true),(pid,27,4,true),(pid,20,3,false),(pid,7,3,false);

INSERT INTO pozisyonlar(departman_id,ad,seviye,aciklama) VALUES(68,'Dağıtım Müdürü','yönetici','Elektrik dağıtım şebeke yönetimi') RETURNING id INTO pid;
INSERT INTO pozisyon_yetkinlikleri VALUES(pid,8,5,true),(pid,27,4,true),(pid,10,4,true),(pid,9,3,false),(pid,22,3,false);

-- dept 69: EV Şarj ve Enerji Depolama
INSERT INTO pozisyonlar(departman_id,ad,seviye,aciklama) VALUES(69,'EV Şarj Uzmanı','uzman','Elektrikli araç şarj altyapısı kurulum') RETURNING id INTO pid;
INSERT INTO pozisyon_yetkinlikleri VALUES(pid,2,5,true),(pid,27,4,true),(pid,28,4,true),(pid,26,3,false),(pid,16,3,false);

INSERT INTO pozisyonlar(departman_id,ad,seviye,aciklama) VALUES(69,'Enerji Depolama Mühendisi','kıdemli_uzman','Batarya ve enerji depolama sistem tasarımı') RETURNING id INTO pid;
INSERT INTO pozisyon_yetkinlikleri VALUES(pid,3,5,true),(pid,2,5,true),(pid,26,4,false),(pid,28,4,false),(pid,7,3,false);

INSERT INTO pozisyonlar(departman_id,ad,seviye,aciklama) VALUES(69,'EV Çözümleri Müdürü','yönetici','EV ve enerji depolama ürün yönetimi') RETURNING id INTO pid;
INSERT INTO pozisyon_yetkinlikleri VALUES(pid,9,5,true),(pid,28,5,true),(pid,8,4,true),(pid,16,3,false),(pid,22,3,false);

-- ==============================================================
-- SEKTOR 13: Finans, Bankacılık ve Sigortacılık
-- (Bireysel Bankacılık/dept 70 → pozisyonlar zaten var)
-- Dept IDs: 71-Kurumsal Bankacılık, 72-Yatırım ve Portföy,
--           73-Sigorta, 74-Hasar ve Ekspertiz, 75-Risk ve Uyum
-- ==============================================================

-- dept 71: Kurumsal Bankacılık
INSERT INTO pozisyonlar(departman_id,ad,seviye,aciklama) VALUES(71,'Kurumsal İlişkiler Uzmanı','uzman','Kurumsal müşteri portföy yönetimi') RETURNING id INTO pid;
INSERT INTO pozisyon_yetkinlikleri VALUES(pid,16,5,true),(pid,22,5,true),(pid,15,4,true),(pid,19,4,false),(pid,17,3,false);

INSERT INTO pozisyonlar(departman_id,ad,seviye,aciklama) VALUES(71,'Kredi Analisti','uzman','Kurumsal kredi analiz ve değerlendirme') RETURNING id INTO pid;
INSERT INTO pozisyon_yetkinlikleri VALUES(pid,22,5,true),(pid,19,5,true),(pid,4,4,true),(pid,21,4,false),(pid,7,3,false);

INSERT INTO pozisyonlar(departman_id,ad,seviye,aciklama) VALUES(71,'Kıdemli Kurumsal Banker','kıdemli_uzman','Büyük kurumsal müşteri ilişkileri') RETURNING id INTO pid;
INSERT INTO pozisyon_yetkinlikleri VALUES(pid,16,5,true),(pid,22,5,true),(pid,15,5,true),(pid,9,4,false),(pid,19,4,false);

INSERT INTO pozisyonlar(departman_id,ad,seviye,aciklama) VALUES(71,'Kurumsal Bankacılık Müdürü','yönetici','Kurumsal bankacılık bölüm yönetimi') RETURNING id INTO pid;
INSERT INTO pozisyon_yetkinlikleri VALUES(pid,8,5,true),(pid,9,5,true),(pid,16,4,true),(pid,10,4,false),(pid,22,4,false);

-- dept 72: Yatırım ve Portföy
INSERT INTO pozisyonlar(departman_id,ad,seviye,aciklama) VALUES(72,'Yatırım Analisti','junior','Piyasa araştırma ve yatırım analizi') RETURNING id INTO pid;
INSERT INTO pozisyon_yetkinlikleri VALUES(pid,4,5,true),(pid,22,5,true),(pid,19,4,true),(pid,17,3,false),(pid,23,3,false);

INSERT INTO pozisyonlar(departman_id,ad,seviye,aciklama) VALUES(72,'Portföy Yöneticisi','uzman','Yatırım portföyü yönetimi ve optimizasyon') RETURNING id INTO pid;
INSERT INTO pozisyon_yetkinlikleri VALUES(pid,22,5,true),(pid,4,5,true),(pid,21,4,true),(pid,19,4,false),(pid,9,3,false);

INSERT INTO pozisyonlar(departman_id,ad,seviye,aciklama) VALUES(72,'Kıdemli Fon Yöneticisi','kıdemli_uzman','Büyük fon portföyü stratejik yönetimi') RETURNING id INTO pid;
INSERT INTO pozisyon_yetkinlikleri VALUES(pid,22,5,true),(pid,9,5,true),(pid,19,5,true),(pid,21,4,false),(pid,4,4,false);

INSERT INTO pozisyonlar(departman_id,ad,seviye,aciklama) VALUES(72,'Yatırım Direktörü','direktör','Yatırım stratejisi direktörü') RETURNING id INTO pid;
INSERT INTO pozisyon_yetkinlikleri VALUES(pid,9,5,true),(pid,22,5,true),(pid,10,5,true),(pid,12,3,false),(pid,19,4,false);

-- dept 73: Sigorta
INSERT INTO pozisyonlar(departman_id,ad,seviye,aciklama) VALUES(73,'Sigorta Acentesi','junior','Sigorta poliçe satışı ve müşteri hizmetleri') RETURNING id INTO pid;
INSERT INTO pozisyon_yetkinlikleri VALUES(pid,16,5,true),(pid,15,4,true),(pid,14,3,true),(pid,25,3,false),(pid,23,3,false);

INSERT INTO pozisyonlar(departman_id,ad,seviye,aciklama) VALUES(73,'Aktüer Uzmanı','uzman','Sigorta risk ve aktüeryal hesaplamalar') RETURNING id INTO pid;
INSERT INTO pozisyon_yetkinlikleri VALUES(pid,22,5,true),(pid,4,5,true),(pid,21,4,true),(pid,19,4,false),(pid,7,3,false);

INSERT INTO pozisyonlar(departman_id,ad,seviye,aciklama) VALUES(73,'Kıdemli Aktüer','kıdemli_uzman','İleri aktüeryal modelleme ve risk analizi') RETURNING id INTO pid;
INSERT INTO pozisyon_yetkinlikleri VALUES(pid,4,5,true),(pid,22,5,true),(pid,21,5,true),(pid,19,4,false),(pid,27,3,false);

INSERT INTO pozisyonlar(departman_id,ad,seviye,aciklama) VALUES(73,'Sigorta Müdürü','yönetici','Sigorta bölüm yönetimi') RETURNING id INTO pid;
INSERT INTO pozisyon_yetkinlikleri VALUES(pid,8,5,true),(pid,9,4,true),(pid,16,4,true),(pid,22,4,false),(pid,10,3,false);

-- dept 74: Hasar ve Ekspertiz
INSERT INTO pozisyonlar(departman_id,ad,seviye,aciklama) VALUES(74,'Hasar Eksperi','uzman','Hasar tespiti ve değerlendirme') RETURNING id INTO pid;
INSERT INTO pozisyon_yetkinlikleri VALUES(pid,19,5,true),(pid,21,4,true),(pid,27,4,true),(pid,17,3,false),(pid,2,3,false);

INSERT INTO pozisyonlar(departman_id,ad,seviye,aciklama) VALUES(74,'Kıdemli Eksper','kıdemli_uzman','Büyük hasar dosyaları ve teknik ekspertiz') RETURNING id INTO pid;
INSERT INTO pozisyon_yetkinlikleri VALUES(pid,19,5,true),(pid,27,4,true),(pid,21,4,true),(pid,15,4,false),(pid,7,3,false);

INSERT INTO pozisyonlar(departman_id,ad,seviye,aciklama) VALUES(74,'Hasar Müdürü','yönetici','Hasar bölümü yönetimi') RETURNING id INTO pid;
INSERT INTO pozisyon_yetkinlikleri VALUES(pid,8,5,true),(pid,10,4,true),(pid,27,4,true),(pid,9,3,false),(pid,16,3,false);

-- dept 75: Risk ve Uyum
INSERT INTO pozisyonlar(departman_id,ad,seviye,aciklama) VALUES(75,'Risk Analisti','uzman','Finansal risk analizi ve izleme') RETURNING id INTO pid;
INSERT INTO pozisyon_yetkinlikleri VALUES(pid,21,5,true),(pid,4,5,true),(pid,27,4,true),(pid,19,4,false),(pid,22,4,false);

INSERT INTO pozisyonlar(departman_id,ad,seviye,aciklama) VALUES(75,'Uyum Uzmanı','uzman','Mevzuat uyum ve denetim') RETURNING id INTO pid;
INSERT INTO pozisyon_yetkinlikleri VALUES(pid,27,5,true),(pid,19,4,true),(pid,21,4,true),(pid,17,4,false),(pid,7,3,false);

INSERT INTO pozisyonlar(departman_id,ad,seviye,aciklama) VALUES(75,'Kıdemli Risk Yöneticisi','kıdemli_uzman','Kurumsal risk çerçevesi yönetimi') RETURNING id INTO pid;
INSERT INTO pozisyon_yetkinlikleri VALUES(pid,21,5,true),(pid,27,5,true),(pid,9,4,true),(pid,4,4,false),(pid,19,4,false);

INSERT INTO pozisyonlar(departman_id,ad,seviye,aciklama) VALUES(75,'CRO / Risk Direktörü','direktör','Kurumsal risk direktörü') RETURNING id INTO pid;
INSERT INTO pozisyon_yetkinlikleri VALUES(pid,9,5,true),(pid,21,5,true),(pid,27,5,true),(pid,10,4,false),(pid,12,3,false);

END $$;
