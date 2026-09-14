'use strict';

async function adSoyadGir(page, adSoyad) {
  try {
    const isimAlani = page.getByPlaceholder(/adınız|your name/i).first();
    if (await isimAlani.isVisible({ timeout: 3000 })) {
      await isimAlani.fill(adSoyad);
    }
  } catch (err) {
    // isim alani gorunmuyorsa (ör. oturum acilmis) sorun degil
  }
}

async function mikrofonKamerayiKapat(page) {
  const desenler = [/mikrofonu kapat/i, /turn off microphone/i, /kamerayı kapat/i, /turn off camera/i];
  for (const desen of desenler) {
    try {
      const dugme = page.getByRole('button', { name: desen }).first();
      if (await dugme.isVisible({ timeout: 2000 })) {
        await dugme.click({ timeout: 2000 }).catch(() => {});
      }
    } catch (err) {
      // buton yoksa zaten kapalidir
    }
  }
}

async function katilButonunaBas(page) {
  const desenler = [/katılmayı iste/i, /şimdi katıl/i, /ask to join/i, /join now/i];
  for (const desen of desenler) {
    const dugme = page.getByRole('button', { name: desen }).first();
    try {
      if (await dugme.isVisible({ timeout: 3000 })) {
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
  const ayrilDesenleri = [/aramadan ayrıl/i, /leave call/i, /çağrıdan ayrıl/i, /hang up/i];
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
  throw new Error('Google Meet toplantisina kabul edilme zaman asimina ugradi.');
}

async function meetteKatil(page, adSoyad) {
  await page.waitForTimeout(3000);
  await adSoyadGir(page, adSoyad);
  await mikrofonKamerayiKapat(page);
  const basildi = await katilButonunaBas(page);
  if (!basildi) {
    throw new Error('Google Meet katilma butonu bulunamadi.');
  }
  await toplantiyaKabulEdilmesiniBekle(page, 10 * 60 * 1000);
}

module.exports = { meetteKatil };
