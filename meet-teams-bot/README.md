# Meet / Teams Kayıt Botu

Google Meet veya Microsoft Teams toplantı linkini alır, tarayıcı üzerinden
toplantıya katılır (mikrofon/kamera açmadan, sadece dinleyici olarak) ve
toplantı sesini bir `.wav` dosyasına kaydeder. Ana HR değerlendirme
platformuyla ilgisi yoktur, bağımsız bir yardımcı araçtır.

Kullanım tek tuşla çalışacak şekilde tasarlanmıştır:

```bash
./basla.sh "https://meet.google.com/xxx-yyyy-zzz"
# ... toplantı bitince ...
./durdur.sh
```

Kayıt dosyası `kayitlar/kayit-<tarih>.wav` altında oluşur.

## Gereksinimler

Bu araç Linux üzerinde, gerçek (veya sanal) bir ses altyapısıyla çalışır.
Toplantı sesi bir sanal PulseAudio kaydedici (null-sink) üzerinden `ffmpeg`
ile dosyaya yazılır; tarayıcı görüntüsü olmadan (headless) çalışabilmesi
için `xvfb` gerekir.

Kurulum (Debian/Ubuntu örneği):

```bash
sudo apt-get update
sudo apt-get install -y pulseaudio ffmpeg xvfb

cd meet-teams-bot
npm install
npx playwright install --with-deps chromium
```

PulseAudio kullanıcı oturumunda çalışıyor olmalı (`pulseaudio --start`
gerekebilir, konteyner ortamlarında `pulseaudio -D --exit-idle-time=-1`).

## Çalıştırma

Ekransız (sunucu) bir makinede `xvfb-run` ile sarmalayın:

```bash
xvfb-run -a ./basla.sh "https://teams.microsoft.com/l/meetup-join/...."
```

- Bot linke göre Meet mi Teams mi olduğunu otomatik anlar.
- Meet için "Katılmayı iste" / Teams için "Şimdi katıl" adımlarını otomatik
  yürütür, mikrofon/kamerayı kapalı tutar.
- Toplantıya kabul edildiği an (host onayı sonrası) ses kaydı başlar.
- `./durdur.sh` çalıştırıldığında kayıt düzgün şekilde kapatılır (dosya
  bozulmaz), tarayıcı kapanır ve sanal ses cihazı temizlenir.

Bot adı varsayılan olarak "Kayıt Botu"dur; değiştirmek için:

```bash
BOT_ADI="Toplantı Kaydı" ./basla.sh "<link>"
```

Playwright'ın kendi Chromium indirmesini yapamadığınız (ör. kısıtlı ağ) bir
ortamda, sistemde zaten kurulu bir Chromium/Chrome ikilisini göstermek için:

```bash
CHROMIUM_YOLU="/usr/bin/chromium" ./basla.sh "<link>"
```

## Sınırlamalar

- Meet/Teams arayüzleri sık değiştiği için katılma butonlarının metin
  eşleştirmesi (`src/meet.js`, `src/teams.js`) zaman zaman güncellenmesi
  gerekebilir.
- Şirket/organizasyon toplantılarında host onayı (waiting room / lobi)
  gerekebilir; bot bunu bekler, en fazla 10 dakika onay bekler.
- Aynı anda tek bir toplantı kaydı desteklenir (`./basla.sh` zaten çalışan
  bir bot varsa hata verir).
