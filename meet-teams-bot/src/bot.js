#!/usr/bin/env node
'use strict';

const path = require('path');
const { chromium } = require('playwright');
const { linkTipiTespitEt } = require('./platform');
const { sesKaydiBaslat, sesKaydiDurdur } = require('./ses');
const { meetteKatil } = require('./meet');
const { teamsaKatil } = require('./teams');

const BOT_ADI = process.env.BOT_ADI || 'Kayıt Botu';
const SINK_ADI = 'meet_teams_kayit';

async function main() {
  const link = process.argv[2];
  if (!link) {
    console.error('Kullanım: node src/bot.js <toplanti-linki>');
    process.exit(1);
  }

  const platform = linkTipiTespitEt(link);
  if (!platform) {
    console.error('Link Google Meet veya Microsoft Teams linkine benzemiyor.');
    process.exit(1);
  }

  console.log(`[${platform}] Toplantiya baglaniliyor: ${link}`);

  const browser = await chromium.launch({
    headless: false,
    executablePath: process.env.CHROMIUM_YOLU || undefined,
    args: [
      '--use-fake-ui-for-media-stream',
      '--autoplay-policy=no-user-gesture-required',
      '--disable-blink-features=AutomationControlled',
    ],
    env: { ...process.env, PULSE_SINK: SINK_ADI },
  });

  const context = await browser.newContext({
    permissions: [],
    viewport: { width: 1280, height: 800 },
  });
  const page = await context.newPage();

  let ses = null;
  let temizlendi = false;

  async function temizle(kod) {
    if (temizlendi) return;
    temizlendi = true;
    console.log('Kapatiliyor, kayit sonlandiriliyor...');
    if (ses) {
      try {
        const dosyaYolu = await sesKaydiDurdur(ses);
        console.log(`Kayit kaydedildi: ${dosyaYolu}`);
      } catch (err) {
        console.error('Ses kaydi durdurulurken hata:', err.message);
      }
    }
    try {
      await browser.close();
    } catch (err) {
      // yut
    }
    process.exit(kod || 0);
  }

  process.on('SIGTERM', () => temizle(0));
  process.on('SIGINT', () => temizle(0));

  try {
    await page.goto(link, { waitUntil: 'domcontentloaded', timeout: 60000 });

    if (platform === 'meet') {
      await meetteKatil(page, BOT_ADI);
    } else {
      await teamsaKatil(page, BOT_ADI);
    }

    console.log('Toplantiya kabul edildi, ses kaydi basliyor.');

    const zamanDamgasi = new Date().toISOString().replace(/[:.]/g, '-');
    const dosyaYolu = path.join(__dirname, '..', 'kayitlar', `kayit-${zamanDamgasi}.wav`);
    ses = await sesKaydiBaslat(SINK_ADI, dosyaYolu);

    console.log('Kayit devam ediyor. Durdurmak icin ./durdur.sh calistirin.');

    await new Promise((resolve) => {
      const kontrol = setInterval(() => {
        if (page.isClosed()) {
          clearInterval(kontrol);
          resolve();
        }
      }, 5000);
    });

    await temizle(0);
  } catch (err) {
    console.error('Hata:', err.message);
    await temizle(1);
  }
}

main();
