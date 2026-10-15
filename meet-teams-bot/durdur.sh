#!/usr/bin/env bash
# Tek komutla: kaydi duzgun sekilde sonlandir ve botu kapat.
set -e
cd "$(dirname "$0")"

if [ ! -f .bot.pid ]; then
  echo "Calisan bir bot bulunamadi."
  exit 1
fi

PID=$(cat .bot.pid)

if ! kill -0 "$PID" 2>/dev/null; then
  echo "Bot sureci bulunamadi (zaten durmus olabilir)."
  rm -f .bot.pid
  exit 1
fi

echo "Bot durduruluyor (PID $PID), kayit sonlandiriliyor..."
kill -TERM "$PID"

for _ in $(seq 1 30); do
  kill -0 "$PID" 2>/dev/null || break
  sleep 1
done

if kill -0 "$PID" 2>/dev/null; then
  echo "Surec zamaninda kapanmadi, zorla sonlandiriliyor."
  kill -KILL "$PID"
fi

rm -f .bot.pid
echo "Bot durduruldu. Kayit dosyasi icin kayitlar/ klasorune bakin (bot.log'da yolu gorebilirsiniz)."
