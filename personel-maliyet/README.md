# Personel Maliyet

humanius.net ana uygulamasından **bağımsız** çalışan personel maliyet hesaplama aracı. Kendi sunucusu, veritabanı tabloları, girişi ve Dockerfile'ı vardır; ana uygulamanın koduna ve yayınına dokunmaz.

Bir kişinin, bir bölümün veya tüm firmanın **saatlik, günlük, aylık ve yıllık** maliyetini hesaplar.

## Hesaplanan kalemler

| Grup | Kalemler |
|---|---|
| Ücret ve yasal yükler | Brüt maaş, fazla mesai (brüt ÷ 225 × çarpan × saat), prim/ikramiyenin aylık payı, işveren SGK payı (teşvik düşülerek), işveren işsizlik payı |
| Karşılıklar ve yan haklar | Kıdem tazminatı karşılığı (brüt ÷ 12, tavanlı), yemek, yol, özel sağlık sigortası, BES işveren katkısı, diğer yan haklar |
| İş yeri giderleri | Kira, enerji, İSG, yazılım vb. aylık giderler — aktif personel sayısına eşit bölünür |

```
Aylık maliyet   = tüm kalemlerin toplamı
Yıllık maliyet  = aylık × 12
Fiili saat      = 52 × haftalık saat − (yıllık izin + resmi tatil + rapor) × günlük saat
Saatlik maliyet = yıllık maliyet ÷ fiili saat
Günlük maliyet  = saatlik × günlük saat
```

Yıllık izin boş bırakılırsa kıdeme göre yasal süre kullanılır (1–5 yıl 14, 5–15 yıl 20, 15+ yıl 26 gün). Bölüm ve firma saatlik maliyeti, toplam yıllık maliyetin toplam fiili saate bölünmesiyle bulunur.

> **Oranlar:** SGK, teşvik, tavan ve çalışma süresi değerleri yıl bazlı **Parametreler** sekmesinde tutulur. Varsayılanlar bilgi amaçlıdır; her yıl güncel değerleri kontrol edip girin.

## Veri girişi

- **Elle:** Personel sekmesinden kişi ekleme/düzenleme.
- **Excel:** "Excel şablonu indir" ile şablonu alın, doldurun, "Excel'den aktar" ile yükleyin. Sicil no ile (sicil yoksa ad soyad ile) eşleşen kişi güncellenir, diğerleri eklenir; olmayan bölümler otomatik açılır. Hatalı satırlar satır numarasıyla listelenir, diğer satırlar yine aktarılır.

## Çalıştırma

```bash
cd personel-maliyet
cp .env.example .env     # DATABASE_URL, JWT_SECRET, MALIYET_SIFRE değerlerini doldurun
npm install
npm start                # http://localhost:8080
```

Veritabanı tabloları (`maliyet_*`) sunucu açılışında otomatik oluşturulur. Ayrı bir PostgreSQL veritabanı önerilir.

### Docker

```bash
docker build -t personel-maliyet personel-maliyet
docker run -p 8080:8080 --env-file personel-maliyet/.env personel-maliyet
```

## Ortam değişkenleri

| Değişken | Açıklama |
|---|---|
| `DATABASE_URL` veya `DB_HOST`, `DB_PORT`, `DB_NAME`, `DB_USER`, `DB_PASSWORD` | PostgreSQL bağlantısı |
| `JWT_SECRET` | Oturum imzalama anahtarı |
| `MALIYET_SIFRE` | Giriş şifresi |
| `PORT` | Varsayılan 8080 |
