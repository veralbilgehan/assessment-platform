# Workspace OS

Dosyaları, sürücüleri, bulut hesaplarını ve ofis/AI araçlarını tek ekosistemde birleştiren Windows masaüstü uygulaması.

**Teknoloji:** Electron + React 19 + TypeScript + Vite (electron-vite), paketleme electron-builder (NSIS).

```bash
npm install
npm run dev        # geliştirme (hot reload)
npm run typecheck
npm run dist:win   # Windows kurulum dosyası → release/ (Windows'ta)
```

Windows kurulum dosyası her PR'da GitHub Actions'ta derlenir; `v*` etiketiyle yayınlanır ve kurulu
uygulamalar otomatik güncellenir. Ayrıntılar: [docs/SURUM_YAYINLAMA.md](docs/SURUM_YAYINLAMA.md).

## Mimari

```
src/
  shared/tipler.ts        Main ↔ Renderer sözleşmeleri (tipler + IPC kanal adları)
  shared/kategoriler.ts   Uzantı → kategori sınıflandırma tablosu (17 kategori, ~250 uzantı)
  shared/ofis.ts          Belge modelleri (Word/Excel/Sunum/Metin), sunum temaları, boş şablonlar
  shared/formul.ts        Tablo formül motoru (Türkçe + İngilizce fonksiyonlar)
  shared/ai.ts            AI istek/sonuç tipleri, model listesi, varsayılan istem şablonları
  main/                   Electron ana süreç — dosya sistemi, kalıcı durum, IPC
    suruculer.ts          Disk/USB/harici disk/bulut tespiti, önemli klasörler, takılma izleme
    dosyaIslemleri.ts     Listeleme, klasör oluşturma, yeniden adlandırma, taşıma
    tarayici.ts           Kaynak klasörleri tarayıp dosyaları sınıflandırır
    dizinDeposu.ts        Taranan dosya dizini (özet + sayfalı sorgu)
    statuDeposu.ts        Proje statüleri (Yeni / Tamamlandı), koruma, son açılma
    ofis/                 docx (mammoth + docx), xlsx/csv (exceljs), pptx (JSZip + pptxgenjs) okuma/yazma
    ai/                   Claude API: şifreli anahtar deposu, şablon deposu, akışlı üretim ve öneriler
    bulut/                OAuth 2.0 + PKCE, Google Drive v3 ve Microsoft Graph istemcileri, önbellek + senkron
    sifreliDepo.ts        Gizli değerler için DPAPI (safeStorage) deposu
    guncelleme.ts         Otomatik güncelleme (electron-updater, GitHub Releases)
    ipc/                  Modül başına IPC kayıtları
  preload/                contextBridge ile dar `window.workspace` API'si
  renderer/src/
    core/modulKayit.ts    Plugin kayıt defteri — her modül kendini buraya kaydeder
    core/kabukBaglami.ts  Modüller arası gezinme + belgeAc (dahili editör / sistem uygulaması)
    core/editorKoprusu.ts Açık editörün içeriğini okuma / içerik yapıştırma (Modül 5 AI bunu kullanır)
    moduller/index.ts     Etkin modüllerin listesi (bir import = bir plugin)
    moduller/kurulum/     Modül 1 — Kurulum sihirbazı
    moduller/masaustu/    Kabuk (kenar çubuğu) + Ana Sayfa
    moduller/dosyalar/    Modül 2 — Sürücüler, klasör gezgini, Kütüphane
    moduller/projeler/    Modül 3 — Projeler, ortak ProjeListesi bileşeni
    moduller/ofis/        Modül 4 — MS 365 / Google uygulama grupları, Word/Excel/PowerPoint/Not Defteri editörleri
    moduller/ayarlar/     Görünüm, güncellemeler, hakkında
    moduller/bulut/       Modül 6 — Bulut Hesapları: bağlantı, kurulum, bulut gezgini
    moduller/ai/          Modül 5 — Office Agent, API anahtarı, model ayarları, istem şablonu düzenleyici
    core/htmlTemizle.ts   AI'dan gelen HTML'i beyaz listeyle temizler (istem enjeksiyonuna karşı)
```

### Yeni modül eklemek
1. `moduller/<ad>/index.tsx` içinde `modulKaydet({ id, ad, ikon, sira, bilesen })` çağır.
2. `moduller/index.ts`'e `import './<ad>'` ekle. Kabuk menüsü otomatik güncellenir.

### Yeni kurulum adımı eklemek
`moduller/kurulum/adimlar/index.ts` içindeki `KURULUM_ADIMLARI` dizisine bir `KurulumAdimi` ekle
(`dogrula` ile zorunlu alan kontrolü, `goster` ile koşullu gösterim).

### Yeni dosya türü eklemek
`src/shared/kategoriler.ts` içindeki ilgili kategorinin `uzantilar` listesine ekle (veya yeni kategori tanımla).

### Proje statüsü nasıl belirlenir?
Elle işaretlenmemiş dosyalar, son değiştirilme tarihine göre otomatik sınıflanır: son N gün (varsayılan 30,
Projeler ekranından değiştirilebilir) içinde değişenler **Yeni Projeler**, diğerleri **Tamamlananlar**.
Elle işaretleme yeniden taramada ve taşıma/yeniden adlandırmada korunur. Takip edilen kategoriler
`kategoriler.ts` içinde `projeTakibi: true` ile belirlenir.

### Ofis editörleri
| Uygulama | Biçim | Not |
|---|---|---|
| Word / Google Dokümanlar | .docx | Başlıklar, listeler, tablolar, resimler. Karmaşık biçim sadeleşebilir. |
| Excel / Google E-Tablolar | .xlsx, .csv | Formüller canlı hesaplanır, dosyaya İngilizce adla yazılır. Hücre biçimleri korunur. |
| PowerPoint / Google Slaytlar | .pptx | Başlık + madde slaytları, 4 tema, notlar, tam ekran sunum. |
| Not Defteri | .txt, .md, .log | |

Başka programla oluşturulmuş bir dosyanın üzerine ilk kez yazılmadan önce orijinali
`%APPDATA%/Workspace OS/yedekler/` klasörüne kopyalanır. Yeni uygulama eklemek için
`moduller/ofis/uygulamalar.ts`, yeni dosya biçimi için `main/ofis/index.ts`.

### Yapay zeka
- **Anahtar:** Yapay Zeka ekranında girilen Claude API anahtarı doğrulanır ve Windows'un şifreli deposunda
  (DPAPI / Electron `safeStorage`) saklanır. Geliştirmede `ANTHROPIC_API_KEY` ortam değişkeni de kullanılabilir.
- **Model:** varsayılan `claude-opus-5-5` (Sonnet 5.5 seçilebilir). Güvenlik sınıflandırıcısı bir isteği
  reddederse API'nin sunucu tarafı yedek modeli (`fallbacks: "default"`) devreye girer.
- **Editör başına çıktı:** Word → HTML (temizlenerek eklenir), Excel → tablo JSON, PowerPoint → slayt JSON
  (yapılandırılmış çıktı), Not Defteri → düz metin. Her ekleme panelden geri alınabilir.
- **Şablonlar:** `{girdi}` ve `{secim}` yer tutucularıyla Yapay Zeka ekranından düzenlenir
  (`%APPDATA%/Workspace OS/istemler.json`). Varsayılanlar `shared/ai.ts` içinde.
- Belge içeriği isteğe `<belge>` etiketleri içinde veri olarak ve önbellek işaretli ayrı blokta gönderilir.

### Bulut hesapları
Google Drive ve OneDrive'a hesapla bağlanmak için bir kez uygulama kaydı gerekir; adım adım rehber
[docs/BULUT_KURULUM.md](docs/BULUT_KURULUM.md). Bulut dosyaları Workspace'te açılıp düzenlenir, kaydedilen
değişiklikler çakışma denetimiyle otomatik geri yüklenir.

Durum `%APPDATA%/Workspace OS/durum.json`, dosya dizini `dizin.json`, proje statüleri `statuler.json` dosyasında saklanır.
