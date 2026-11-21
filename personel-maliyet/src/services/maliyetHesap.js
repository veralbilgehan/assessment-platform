/**
 * Personel maliyet hesabı — saf fonksiyonlar (veritabanına dokunmaz).
 *
 * Aylık maliyet  = brüt + fazla mesai + prim payı + işveren SGK + işveren işsizlik
 *                + kıdem karşılığı + yan haklar + iş yeri gider payı
 * Fiili saat     = 52 × haftalık saat − (yıllık izin + resmi tatil + rapor) × günlük saat
 * Saatlik        = yıllık maliyet ÷ fiili saat
 */

const sayi = (v) => {
  const n = Number(v);
  return Number.isFinite(n) ? n : 0;
};
const yuvarla = (n) => Math.round(n * 100) / 100;

// 4857 s. Kanun md. 53: 1–5 yıl 14, 5–15 yıl 20, 15+ yıl 26 gün
function yasalIzinGunu(iseGiris, bugun = new Date()) {
  if (!iseGiris) return 14;
  const yil = (bugun - new Date(iseGiris)) / (365.25 * 24 * 3600 * 1000);
  if (yil >= 15) return 26;
  if (yil >= 5) return 20;
  return 14;
}

function kisiMaliyeti(p, prm, isyeriPayi) {
  const brut      = sayi(p.brut_maas);
  const saatUcret = brut / 225; // aylık 30 gün × 7,5 saat
  const fazlaMesai = saatUcret * sayi(prm.fazla_mesai_carpan) * sayi(p.fazla_mesai_saat);
  const primAylik  = sayi(p.yillik_prim) / 12;

  let sgkMatrah = brut + fazlaMesai + primAylik;
  if (prm.sgk_tavan) sgkMatrah = Math.min(sgkMatrah, sayi(prm.sgk_tavan));

  const sgkOran      = sayi(prm.sgk_isveren_oran) - (p.sgk_tesvik ? sayi(prm.sgk_tesvik_puan) : 0);
  const sgkIsveren   = sgkMatrah * sgkOran / 100;
  const issizlik     = sgkMatrah * sayi(prm.issizlik_isveren_oran) / 100;

  const kidemEsas    = prm.kidem_tavani ? Math.min(brut, sayi(prm.kidem_tavani)) : brut;
  const kidemKarsilik = kidemEsas / 12;

  const yanHaklar = sayi(p.yemek) + sayi(p.yol) + sayi(p.saglik_sigortasi) + sayi(p.bes_katki) + sayi(p.diger_yan_hak);

  const aylik = brut + fazlaMesai + primAylik + sgkIsveren + issizlik + kidemKarsilik + yanHaklar + isyeriPayi;
  const yillik = aylik * 12;

  const izinGun  = p.izin_gun != null && p.izin_gun !== '' ? sayi(p.izin_gun) : yasalIzinGunu(p.ise_giris);
  const gunlukSaat = sayi(prm.gunluk_saat);
  const bosGun   = izinGun + sayi(prm.resmi_tatil_gun) + sayi(p.rapor_gun);
  const fiiliSaat = Math.max(1, 52 * sayi(prm.haftalik_saat) - bosGun * gunlukSaat);

  const saatlik = yillik / fiiliSaat;

  return {
    kalemler: {
      brut_maas:       yuvarla(brut),
      fazla_mesai:     yuvarla(fazlaMesai),
      prim_payi:       yuvarla(primAylik),
      sgk_isveren:     yuvarla(sgkIsveren),
      issizlik_isveren: yuvarla(issizlik),
      kidem_karsilik:  yuvarla(kidemKarsilik),
      yan_haklar:      yuvarla(yanHaklar),
      isyeri_payi:     yuvarla(isyeriPayi),
    },
    izin_gun:   izinGun,
    fiili_saat: yuvarla(fiiliSaat),
    aylik:      yuvarla(aylik),
    yillik:     yuvarla(yillik),
    saatlik:    yuvarla(saatlik),
    gunluk:     yuvarla(saatlik * gunlukSaat),
    brut_carpan: brut > 0 ? yuvarla(aylik / brut) : null,
  };
}

// Kişi sonuçlarını toplar; saatlik = toplam yıllık ÷ toplam fiili saat
function ozetle(kisiler, gunlukSaat) {
  const toplam = kisiler.reduce((t, k) => {
    t.personel_sayisi += 1;
    t.aylik   += k.maliyet.aylik;
    t.yillik  += k.maliyet.yillik;
    t.fiili_saat += k.maliyet.fiili_saat;
    t.brut    += k.maliyet.kalemler.brut_maas;
    for (const [ad, deger] of Object.entries(k.maliyet.kalemler)) t.kalemler[ad] = (t.kalemler[ad] || 0) + deger;
    return t;
  }, { personel_sayisi: 0, aylik: 0, yillik: 0, fiili_saat: 0, brut: 0, kalemler: {} });

  const saatlik = toplam.fiili_saat > 0 ? toplam.yillik / toplam.fiili_saat : 0;
  return {
    personel_sayisi: toplam.personel_sayisi,
    aylik:   yuvarla(toplam.aylik),
    yillik:  yuvarla(toplam.yillik),
    fiili_saat: yuvarla(toplam.fiili_saat),
    saatlik: yuvarla(saatlik),
    gunluk:  yuvarla(saatlik * gunlukSaat),
    kisi_basi_aylik: toplam.personel_sayisi ? yuvarla(toplam.aylik / toplam.personel_sayisi) : 0,
    brut_carpan: toplam.brut > 0 ? yuvarla(toplam.aylik / toplam.brut) : null,
    kalemler: Object.fromEntries(Object.entries(toplam.kalemler).map(([a, d]) => [a, yuvarla(d)])),
  };
}

module.exports = { kisiMaliyeti, ozetle, yasalIzinGunu };
