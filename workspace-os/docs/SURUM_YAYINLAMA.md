# Windows kurulum dosyası ve otomatik güncelleme

## Kurulum dosyası

`.github/workflows/workspace-os-windows.yml` iş akışı Windows sunucusunda derler:

- **Her PR'da:** `Workspace-OS-Kurulum-<sürüm>.exe` üretilir ve iş akışı sayfasında
  **Artifacts → Workspace-OS-Windows** olarak indirilebilir. Hiçbir şey yayınlanmaz.
- **`v*` etiketinde:** aynı dosya bir GitHub Release olarak yayınlanır. Kurulu uygulamalar bu sürümü
  otomatik güncellemeyle alır.

Yerelde (Windows'ta) üretmek için: `cd workspace-os && npm ci && npm run dist:win` → `release/`.

Kurulum sihirbazı Türkçedir. Kurulum klasörü seçilebilir, masaüstü ve Başlat menüsü kısayolu oluşturulur.
Kullanıcı başına kurulur, yönetici izni gerekmez. Kaldırılınca kullanıcı verileri
(`%APPDATA%/Workspace OS`) korunur.

## Yeni sürüm yayınlama

1. `workspace-os/package.json` içindeki `version` alanını artır (ör. `0.6.0` → `0.7.0`) ve birleştir.
2. `master` üzerinde etiketle ve gönder:
   ```bash
   git tag v0.7.0
   git push origin v0.7.0
   ```
3. İş akışı Release'i (`Workspace-OS-Kurulum-0.7.0.exe`, `latest.yml`, `.blockmap`) oluşturur.
   Etiket ile `package.json` sürümü farklıysa iş akışı durur.

## Otomatik güncelleme nasıl çalışır?

- Kurulu uygulama açılıştan 15 sn sonra ve 4 saatte bir `latest.yml` dosyasını GitHub Releases'tan denetler
  (Ayarlar → "Güncellemeleri otomatik denetle" ile kapatılabilir).
- Yeni sürüm arka planda indirilir; yalnızca değişen bloklar indirilir (blockmap).
- İndirme bitince her ekranda "Yeniden başlat ve güncelle" şeridi görünür. Kullanıcı ertelerse
  güncelleme uygulama kapanırken kurulur. Buluta gönderilmeyi bekleyen değişiklikler önce yüklenir.

## Bilmen gerekenler

- **Kod imzalama:** Kurulum dosyası imzasız olduğundan Windows SmartScreen ilk açılışta
  "Windows kişisel bilgisayarınızı korudu" uyarısı gösterir ("Ek bilgi → Yine de çalıştır").
  Kaldırmak için bir kod imzalama sertifikası (ör. Azure Trusted Signing) gerekir. Sertifika eklenince
  `package.json → build.win` altına imzalama ayarları yazılır.
- **Depo:** Güncellemeler bu deponun (`veralbilgehan/assessment-platform`) Releases sayfasından okunur ve
  `v*` etiketleri Workspace OS'e ayrılmıştır. Uygulama büyüdükçe kendi deposuna taşınması önerilir.
  O zaman `package.json → build.publish` altındaki `repo` alanını güncellemek yeterlidir.
