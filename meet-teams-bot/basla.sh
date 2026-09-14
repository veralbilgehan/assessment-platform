#!/usr/bin/env bash
# Tek komutla: Meet/Teams toplantisina katil ve sesi kaydetmeye basla.
set -e
cd "$(dirname "$0")"

if [ -f .bot.pid ] && kill -0 "$(cat .bot.pid)" 2>/dev/null; then
  echo "Bot zaten calisiyor (PID $(cat .bot.pid)). Once ./durdur.sh calistirin."
  exit 1
fi

if [ -z "$1" ]; then
  echo "Kullanim: ./basla.sh <toplanti-linki>"
  exit 1
fi

mkdir -p kayitlar

nohup node src/bot.js "$1" > bot.log 2>&1 &
echo $! > .bot.pid

echo "Bot baslatildi (PID $!). Toplantiya katilim bekleniyor..."
echo "Durum icin: tail -f bot.log"
echo "Durdurmak icin: ./durdur.sh"
