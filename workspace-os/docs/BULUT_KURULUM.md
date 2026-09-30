# Bulut hesabı bağlantısı — kurulum rehberi

Workspace OS, Google Drive ve OneDrive'a kullanıcının kendi tarayıcısında oturum açarak bağlanır
(OAuth 2.0 + PKCE). Parola uygulamaya hiç girmez. Bunun için Google ve Microsoft, uygulamanın bir kez
**kayıtlı** olmasını ister. Kayıt ücretsizdir ve yaklaşık 10 dakika sürer.

Elde edilen kimlikleri iki yolla verebilirsin:
- **Uygulama içinden:** Bulut Hesapları → "Kurulum: uygulama kimlikleri".
- **Dağıtımla gömerek:** ortam değişkenleri `WORKSPACE_GOOGLE_CLIENT_ID`, `WORKSPACE_GOOGLE_CLIENT_SECRET`,
  `WORKSPACE_MS_CLIENT_ID`. Tanımlıysa arayüzdeki alanlar kilitlenir.

## Google Drive

1. <https://console.cloud.google.com> → yeni proje oluştur (ör. "Workspace OS").
2. **API'ler ve Hizmetler → Kitaplık** → "Google Drive API" → **Etkinleştir**.
3. **OAuth izin ekranı** (Google Auth Platform):
   - Kullanıcı türü: **Harici**, uygulama adı ve destek e-postası gir.
   - Kapsamlar: `.../auth/drive`, `openid`, `email`.
   - Yayınlanma durumu "Test" iken **Test kullanıcıları**na kendi Gmail adresini ekle.
     Uygulamayı herkese dağıtacaksan Google'ın doğrulama sürecinden geçmesi gerekir
     (`drive` kapsamı kısıtlı kapsamdır).
4. **Kimlik bilgileri → Kimlik bilgisi oluştur → OAuth istemci kimliği** → Uygulama türü: **Masaüstü uygulaması**.
5. Çıkan **İstemci kimliği** (`….apps.googleusercontent.com`) ve **İstemci sırrı**nı (`GOCSPX-…`) Workspace'e gir.
   Masaüstü uygulamalarında bu "sır" gerçek bir sır sayılmaz; yine de şifreli depoda saklanır.

Geri dönüş adresi otomatik olarak `http://127.0.0.1:<rastgele port>` olur. Masaüstü istemcileri için ayrıca
yönlendirme adresi eklemen gerekmez.

## OneDrive (kişisel ve iş/okul hesapları)

1. <https://portal.azure.com> → **Microsoft Entra ID → Uygulama kayıtları → Yeni kayıt**.
2. Ad: "Workspace OS". Desteklenen hesap türleri:
   **"Herhangi bir kuruluş dizinindeki hesaplar ve kişisel Microsoft hesapları"**.
3. Yönlendirme URI'si: platform **Ortak istemci/yerel (mobil ve masaüstü)**, adres `http://localhost`.
   (Port her bağlanışta değişir; Microsoft `localhost` adreslerinde portu yok sayar.)
4. **Kimlik doğrulama** sekmesinde **"Ortak istemci akışlarına izin ver"** → Evet.
5. **API izinleri**: Microsoft Graph → Temsilci izinleri → `Files.ReadWrite`, `User.Read`, `offline_access`.
6. **Genel bakış**taki **Uygulama (istemci) kimliği**ni Workspace'e gir. İstemci sırrı gerekmez.

İş/okul hesaplarında kuruluş yöneticisinin uygulamaya onay vermesi gerekebilir.

## Nasıl çalışır?

| | |
|---|---|
| Oturum | Yenileme anahtarı Windows'un şifreli deposunda (DPAPI) saklanır; erişim anahtarı yalnızca bellekte tutulur ve süresi dolunca kendiliğinden yenilenir. |
| Dosya açma | Dosya `%APPDATA%/Workspace OS/bulut/` altına indirilir ve Workspace editöründe açılır. |
| Kaydetme | Her kaydetmeden ~3 sn sonra değişiklik buluta yüklenir. Uygulama kapanırken bekleyen yüklemeler tamamlanır. |
| Çakışma | Yüklemeden önce buluttaki sürüm denetlenir. Dosya başka yerde değişmişse üzerine yazılmaz; senin değişikliklerin "(Workspace kopyası)" adıyla yanına yüklenir. |
| Google biçimi | Google Dokümanlar/E-Tablolar/Slaytlar dosyaları .docx/.xlsx/.pptx olarak açılır ve kaydedilince yeniden Google biçimine dönüştürülür. Bu yapılamazsa içerik kaybolmasın diye .docx/.xlsx/.pptx kopyası yüklenir. |
| Bağlantıyı kesme | Yerel oturum silinir; Google'da izin de geri alınır. Microsoft'ta izin, hesap ayarlarındaki "Uygulamalar ve hizmetler" bölümünden kaldırılabilir. |
