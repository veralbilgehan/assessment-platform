'use strict';

async function tarayicidaDevamEt(page) {
  const desenler = [
    /bu tarayıcıda devam et/i,
    /continue on this browser/i,
    /web uygulamasını kullan/i,
    /use the web app instead/i,
  ];
  for (const desen of desenler) {
    for (const rol of ['link', 'button']) {
      try {
        const eleman = page.getByRole(rol, { name: desen }).first();
        if (await eleman.isVisible({ timeout: 2500 })) {
          await eleman.click();
          return;
        }
      } catch (err) {
        // sonraki secenegi dene
      }
    }
  }
}

async function adSoyadGir(page, adSoyad) {
  try {
    const isimAlani = page.getByPlaceholder(/adınızı yazın|type your name/i).first();
    if (await isimAlani.isVisible({ timeout: 5000 })) {
      await isimAlani.fill(adSoyad);
    }
  } catch (err) {
    // isim alani gerekmeyebilir
  }
}

async function mikrofonKamerayiKapat(page) {
  const desenler = [/mikrofon/i, /microphone/i, /kamera/i, /camera/i];
  for (const desen of desenler) {
    try {
      const anahtar = page.getByRole('switch', { name: desen }).first();
      if (await anahtar.isVisible({ timeout: 2000 })) {
        const durum = await anahtar.getAttribute('aria-checked');
        if (durum === 'true') {
          await anahtar.click().catch(() => {});
        }
      }
    } catch (err) {
      // anahtar yoksa zaten kapalidir
    }
  }
}

async function katilButonunaBas(page) {
  const desenler = [/şimdi katıl/i, /join now/i];
  for (const desen of desenler) {
    const dugme = page.getByRole('button', { name: desen }).first();
    try {
      if (await dugme.isVisible({ timeout: 5000 })) {
        await dugme.click();
        return true;
      }
    } catch (err) {
      // sonraki deseni dene
    }
  }
  return false;
}

async function toplantiyaKabulEdilmesiniBekle(page, zamanAsimiMs) {
  const ayrilDesenleri = [/ayrıl/i, /leave/i, /hang up/i, /çağrıyı sonlandır/i];
  const baslangic = Date.now();
  while (Date.now() - baslangic < zamanAsimiMs) {
    for (const desen of ayrilDesenleri) {
      const dugme = page.getByRole('button', { name: desen }).first();
      if (await dugme.isVisible({ timeout: 1000 }).catch(() => false)) {
        return true;
      }
    }
    await page.waitForTimeout(2000);
  }
  throw new Error('Microsoft Teams toplantisina kabul edilme zaman asimina ugradi.');
}

async function teamsaKatil(page, adSoyad) {
  await page.waitForTimeout(3000);
  await tarayicidaDevamEt(page);
  await page.waitForTimeout(3000);
  await adSoyadGir(page, adSoyad);
  await mikrofonKamerayiKapat(page);
  const basildi = await katilButonunaBas(page);
  if (!basildi) {
    throw new Error('Microsoft Teams katilma butonu bulunamadi.');
  }
  await toplantiyaKabulEdilmesiniBekle(page, 10 * 60 * 1000);
}

module.exports = { teamsaKatil };
