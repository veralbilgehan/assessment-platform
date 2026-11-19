/**
 * Çoklu CV Karşılaştırma — AI prompt'ları
 *
 * İki aşamalı akış:
 *   1) profilCikarmaPrompt  — tek bir CV metninden yapılandırılmış profil (JSON) çıkarır
 *   2) karsilastirmaPrompt  — tüm profilleri kriter bazında puanlar, farkları gösterir, en iyi adayı seçer
 */

// Varsayılan kriterler — ağırlıkların toplamı 100
const VARSAYILAN_KRITERLER = [
  { kod: 'egitim',          ad: 'Eğitim Durumu',          agirlik: 15, aciklama: 'Derece seviyesi, bölümün pozisyonla ilgisi, okul, akademik başarı' },
  { kod: 'deneyim',         ad: 'Çalışma Tecrübesi',      agirlik: 20, aciklama: 'Rollerin pozisyonla ilgisi, sorumluluk düzeyi, sektör uyumu, kariyer ilerlemesi' },
  { kod: 'deneyim_suresi',  ad: 'Çalışma Yıl Süresi',     agirlik: 10, aciklama: 'Toplam ve ilgili alandaki yıl; aranan kıdemle uyum (fazlası her zaman daha iyi değildir)' },
  { kod: 'sertifikalar',    ad: 'Sertifikalar',           agirlik: 10, aciklama: 'Pozisyonla ilgili, tanınmış ve güncel sertifikalar' },
  { kod: 'projeler',        ad: 'Ürettiği Projeler',      agirlik: 15, aciklama: 'Projelerin kapsamı, karmaşıklığı, adayın projedeki rolü' },
  { kod: 'proje_sonuclari', ad: 'Proje Sonuçları',        agirlik: 15, aciklama: 'Ölçülebilir çıktılar (%, ₺, süre, kullanıcı sayısı vb.), somut etki' },
  { kod: 'yayinlar',        ad: 'Yayın / Bildiri (Referat)', agirlik: 5, aciklama: 'Makale, bildiri, referat, patent, konferans sunumu' },
  { kod: 'referanslar',     ad: 'Referanslar',            agirlik: 5,  aciklama: 'Referans sayısı, kıdemi, adayla ilişkisinin doğrudanlığı' },
  { kod: 'pozisyon_uyumu',  ad: 'Pozisyona Genel Uyum',   agirlik: 5,  aciklama: 'Aranan niteliklerin bütüncül karşılanma düzeyi' },
];

const ETIK_KURALLAR = `ETİK VE ADİL DEĞERLENDİRME KURALLARI:
- Yaş, cinsiyet, medeni durum, din, etnik köken, uyruk, fotoğraf, engellilik, askerlik dışı kişisel bilgileri DEĞERLENDİRMEYE KATMA.
- Sadece CV'de yazılı olan bilgiyi kullan; bilgi yoksa uydurma, "belirtilmemiş" kabul et.
- Okul/şirket "ünü" tek başına belirleyici olmasın; içerik, rol ve sonuç önemlidir.
- Her puan, CV'den alınmış somut bir kanıta dayansın.`;

function profilCikarmaPrompt(cvMetni, dosyaAdi) {
  const bugun = new Date().toISOString().slice(0, 7);
  return `Sen deneyimli bir İK analisti ve CV ayrıştırma uzmanısın. Aşağıdaki CV metnini okuyup bilgileri yapılandırılmış JSON'a dönüştür.

KURALLAR:
- Yalnızca CV'de açıkça geçen bilgiyi yaz. Tahmin etme, uydurma. Bilinmeyen alanlar için "" veya [] ya da null kullan.
- Tarihleri "YYYY-MM" (ay bilinmiyorsa "YYYY") biçiminde yaz. Devam eden işler için bitis = "devam". Bugünün tarihi: ${bugun}.
- toplam_deneyim_yil: çakışan dönemleri bir kez sayarak toplam profesyonel deneyim (staj hariç), 1 ondalık.
- Proje sonuçlarında sayısal/ölçülebilir bir çıktı varsa (%, ₺, $, süre, adet, kullanıcı) olculebilir_sonuc_var_mi = true.
- "Referat", bildiri, makale, kitap, patent, konferans sunumu → yayinlar listesine.
- Referansların telefon/e-posta bilgisini KOPYALAMA, sadece iletisim_var_mi alanını işaretle.
- eksik_bilgiler: bir işe alım kararı için CV'de eksik olan önemli bilgileri listele.

DOSYA ADI: ${dosyaAdi}

─── CV METNİ ───
${cvMetni}
─── CV SONU ───

Sadece aşağıdaki şemaya uyan geçerli JSON döndür, başka metin ekleme:
{
  "ad_soyad": "",
  "unvan": "",
  "konum": "",
  "ozet": "<adayı 2 cümlede özetle>",
  "en_yuksek_derece": "Doktora|Yüksek Lisans|Lisans|Ön Lisans|Lise|Belirtilmemiş",
  "egitim": [{ "derece": "", "bolum": "", "okul": "", "baslangic": "", "bitis": "", "not_ortalamasi": "" }],
  "deneyimler": [{ "pozisyon": "", "sirket": "", "sektor": "", "baslangic": "", "bitis": "", "staj_mi": false, "sorumluluklar": [""], "basarilar": [""] }],
  "toplam_deneyim_yil": 0,
  "sertifikalar": [{ "ad": "", "kurum": "", "yil": "" }],
  "projeler": [{ "ad": "", "rol": "", "aciklama": "", "teknolojiler": [""], "sonuclar": [""], "olculebilir_sonuc_var_mi": false }],
  "yayinlar": [{ "baslik": "", "tur": "makale|bildiri|referat|kitap|patent|sunum", "yer": "", "yil": "" }],
  "referanslar": [{ "ad": "", "unvan": "", "kurum": "", "iliski": "", "iletisim_var_mi": false }],
  "beceriler": { "teknik": [""], "yabanci_dil": [{ "dil": "", "seviye": "" }], "diger": [""] },
  "eksik_bilgiler": [""]
}`;
}

function karsilastirmaPrompt({ profiller, pozisyon, nitelikler, kriterler }) {
  const kriterStr = kriterler
    .map(k => `- ${k.kod} | ${k.ad} | Ağırlık: %${k.agirlik} | ${k.aciklama}`)
    .join('\n');

  const adayStr = profiller
    .map((p, i) => `### ADAY ${i + 1} — ${p.ad_soyad || p._dosya}\n${JSON.stringify(p, null, 1)}`)
    .join('\n\n');

  return `Sen 20 yıllık deneyime sahip kıdemli bir İK direktörü ve yetkinlik bazlı işe alım uzmanısın.
Görevin: ${profiller.length} adayın yapılandırılmış CV profilini karşılaştırmak, aralarındaki farkları net biçimde göstermek ve pozisyon için EN İYİ adayı gerekçeli olarak seçmek.

HEDEF POZİSYON: ${pozisyon || 'Belirtilmemiş (genel değerlendirme yap)'}
ARANAN NİTELİKLER:
${nitelikler || 'Belirtilmemiş — pozisyon adından makul nitelikleri çıkar ve bunu genel_degerlendirme içinde belirt.'}

DEĞERLENDİRME KRİTERLERİ (kod | ad | ağırlık | ne değerlendirilir):
${kriterStr}

PUANLAMA ÖLÇEĞİ (her kriter 0-10):
0 = bilgi yok / hiç karşılamıyor · 3 = zayıf · 5 = yeterli · 7 = güçlü · 9-10 = olağanüstü, açık kanıtlı
- Puanları adaylar ARASINDA tutarlı ver: aynı kanıt düzeyine aynı puan.
- Deneyim süresinde aranan kıdemi esas al; aşırı kıdem pozisyona uymuyorsa bunu risk olarak belirt.
- Proje sonuçlarında ölçülebilir etkiyi, ölçülemeyen iddialardan daha yüksek değerlendir.
- Eksik bilgi = düşük puan değil, "doğrulanmalı" notu ile orta-alt puan; gerekçede belirt.

${ETIK_KURALLAR}

─── ADAY PROFİLLERİ ───
${adayStr}
─── PROFİLLER SONU ───

Sadece aşağıdaki şemaya uyan geçerli JSON döndür, başka metin ekleme. aday_no 1'den başlar ve yukarıdaki sırayla eşleşir.
{
  "adaylar": [
    {
      "aday_no": 1,
      "puanlar": { "<kriter_kodu>": { "puan": 0, "gerekce": "<CV'den kanıt, 1 cümle>" } },
      "guclu_yonler": ["", ""],
      "zayif_yonler": ["", ""],
      "riskler": ["<ör. sık iş değişikliği, açıklanmayan boşluk, doğrulanamayan iddia>"],
      "ozet": "<2-3 cümle>"
    }
  ],
  "farklar": [
    { "boyut": "<ör. Eğitim, Proje Sonuçları>", "aciklama": "<adaylar arasındaki somut fark>", "one_cikan_aday_no": 1 }
  ],
  "en_iyi_aday": { "aday_no": 1, "gerekce": "<4-6 cümle, kriterlere ve kanıta dayalı>", "guven": "yüksek|orta|düşük" },
  "alternatif_aday": { "aday_no": 2, "gerekce": "<hangi durumda bu aday tercih edilmeli>" },
  "mulakat_sorulari": [ { "aday_no": 1, "soru": "", "amac": "<hangi belirsizliği/riski netleştirir>" } ],
  "genel_degerlendirme": "<150-250 kelime; aday havuzunun genel durumu, karar önerisi, sonraki adımlar>"
}

"puanlar" nesnesinde TÜM kriter kodları (${kriterler.map(k => k.kod).join(', ')}) her aday için bulunmalı. Her aday için en az 2 mülakat sorusu yaz. Türkçe yaz.`;
}

module.exports = { VARSAYILAN_KRITERLER, profilCikarmaPrompt, karsilastirmaPrompt };
