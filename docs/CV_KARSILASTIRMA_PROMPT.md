# Çoklu CV Karşılaştırma — Prompt

Uygulamadaki **Çoklu CV Karşılaştır** sekmesi bu prompt'ları otomatik kullanır
(`backend/src/prompts/cvKarsilastirma.js`). Aşağıdaki sürüm, uygulama dışında
doğrudan Claude'a CV'leri yapıştırarak/ekleyerek kullanmak içindir.

---

## Tek parça prompt (kopyala–yapıştır)

```
Sen 20 yıllık deneyime sahip kıdemli bir İK direktörü ve yetkinlik bazlı işe alım uzmanısın.
Ekteki / aşağıdaki CV'leri karşılaştırıp pozisyon için EN İYİ adayı seçeceksin.

HEDEF POZİSYON: [ör. Kıdemli Proje Yöneticisi]
ARANAN NİTELİKLER: [ör. 5+ yıl proje yönetimi, PMP, inşaat sektörü, ileri İngilizce]

ADIM 1 — BİLGİ ÇIKARMA
Her CV için yalnızca CV'de yazan bilgiyle şu alanları çıkar (yoksa "belirtilmemiş" yaz, uydurma):
1. Eğitim durumu (derece, bölüm, okul, yıl, not ortalaması)
2. Çalışma tecrübesi (pozisyon, şirket, sektör, tarih aralığı, sorumluluk, başarı)
3. Çalışma yıl süresi (çakışan dönemleri bir kez sayarak, staj hariç toplam yıl)
4. Sertifikalar (ad, kurum, yıl)
5. Ürettiği projeler (ad, rol, kapsam, teknoloji)
6. Proje sonuçları (ölçülebilir çıktılar: %, ₺, süre, adet; ölçülebilir mi?)
7. Yayın / bildiri / referatlar
8. Referanslar (ad, unvan, kurum, adayla ilişkisi — iletişim bilgisini kopyalama)

ADIM 2 — PUANLAMA (her kriter 0–10, gerekçe CV'den kanıtla)
| Kriter | Ağırlık |
|---|---|
| Eğitim Durumu | %15 |
| Çalışma Tecrübesi (ilgililik, sorumluluk, ilerleme) | %20 |
| Çalışma Yıl Süresi (aranan kıdemle uyum) | %10 |
| Sertifikalar | %10 |
| Ürettiği Projeler | %15 |
| Proje Sonuçları (ölçülebilir etki) | %15 |
| Yayın / Bildiri (Referat) | %5 |
| Referanslar | %5 |
| Pozisyona Genel Uyum | %5 |
Ölçek: 0 bilgi yok · 3 zayıf · 5 yeterli · 7 güçlü · 9–10 olağanüstü ve kanıtlı.
Ağırlıklı toplam = Σ(puan × ağırlık) / Σ ağırlık × 10  → 0–100.

ADIM 3 — ÇIKTI
A) Yan yana profil tablosu (satırlar: 8 alan, sütunlar: adaylar)
B) Puan matrisi (kriter × aday) + ağırlıklı toplam ve sıralama
C) Adaylar arasındaki en önemli 5–8 fark (hangi boyutta, kim öne çıkıyor, neden)
D) Her aday için güçlü yönler, zayıf yönler, riskler (sık iş değişikliği, açıklanmayan boşluk,
   doğrulanamayan iddia, aşırı/eksik kıdem)
E) ÖNERİLEN ADAY: isim + 4–6 cümle kanıta dayalı gerekçe + güven düzeyi (yüksek/orta/düşük)
F) Alternatif aday ve hangi koşulda tercih edilmeli
G) Her aday için belirsizlikleri netleştirecek 2–3 mülakat sorusu

ETİK KURALLAR
- Yaş, cinsiyet, medeni durum, din, etnik köken, uyruk, fotoğraf, engellilik bilgisini değerlendirmeye katma.
- Okul/şirket ünü tek başına belirleyici olmasın; içerik, rol ve sonuç önemlidir.
- Aynı kanıt düzeyine tüm adaylarda aynı puanı ver.
- Bu bir karar destek analizidir; nihai karar mülakat ve referans kontrolüyle verilir.

Türkçe yaz, tablolar kullan.
```

---

## Uygulamadaki akış

1. **Profil çıkarma** — her CV ayrı ayrı yapılandırılmış JSON'a dönüştürülür
   (`profilCikarmaPrompt`). Toplam deneyim yılı sunucuda tarihlerden yeniden hesaplanır.
2. **Karşılaştırma** — tüm profiller tek çağrıda kriter bazında puanlanır, farklar,
   riskler, en iyi/alternatif aday ve mülakat soruları üretilir (`karsilastirmaPrompt`).
3. **Sıralama** — ağırlıklı toplam puan, kullanıcının arayüzde ayarladığı ağırlıklarla
   sunucuda hesaplanır (AI aritmetiğine güvenilmez).
