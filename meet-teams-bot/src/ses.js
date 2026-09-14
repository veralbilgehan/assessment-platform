'use strict';

const { spawn, execFile } = require('child_process');
const fs = require('fs');
const path = require('path');

function calistir(komut, args) {
  return new Promise((resolve, reject) => {
    execFile(komut, args, (err, stdout, stderr) => {
      if (err) reject(new Error(`${komut} ${args.join(' ')} basarisiz: ${stderr || err.message}`));
      else resolve({ stdout, stderr });
    });
  });
}

// Chromium'un sesini yakalamak icin sanal bir PulseAudio kaydedici (null-sink) olusturur
// ve o sink'in "monitor" cikisini ffmpeg ile dosyaya yazar.
async function sesKaydiBaslat(sinkAdi, dosyaYolu) {
  fs.mkdirSync(path.dirname(dosyaYolu), { recursive: true });

  const { stdout } = await calistir('pactl', [
    'load-module',
    'module-null-sink',
    `sink_name=${sinkAdi}`,
    `sink_properties=device.description=${sinkAdi}`,
  ]);
  const modulId = stdout.trim();

  const ffmpeg = spawn('ffmpeg', [
    '-y',
    '-f', 'pulse',
    '-i', `${sinkAdi}.monitor`,
    '-ac', '2',
    dosyaYolu,
  ]);

  ffmpeg.stderr.on('data', () => {});
  ffmpeg.on('error', (err) => {
    console.error('ffmpeg baslatilamadi:', err.message);
  });

  return { modulId, ffmpeg, dosyaYolu, sinkAdi };
}

// ffmpeg'e "q" tusu gonderip kaydi duzgun sekilde sonlandirir, ardindan sanal sink'i kaldirir.
async function sesKaydiDurdur(ses) {
  if (!ses.ffmpeg.killed) {
    await new Promise((resolve) => {
      let tamamlandi = false;
      const bitir = () => {
        if (!tamamlandi) {
          tamamlandi = true;
          resolve();
        }
      };
      ses.ffmpeg.once('close', bitir);
      ses.ffmpeg.once('exit', bitir);
      try {
        ses.ffmpeg.stdin.write('q');
      } catch (err) {
        // stdin kapali olabilir, SIGINT ile devam edilecek
      }
      setTimeout(() => {
        try { ses.ffmpeg.kill('SIGINT'); } catch (err) { /* yut */ }
      }, 1500);
      setTimeout(bitir, 8000);
    });
  }

  try {
    await calistir('pactl', ['unload-module', ses.modulId]);
  } catch (err) {
    // sink zaten kaldirilmis olabilir, sorun degil
  }

  return ses.dosyaYolu;
}

module.exports = { sesKaydiBaslat, sesKaydiDurdur };
