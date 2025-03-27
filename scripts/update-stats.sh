#!/bin/bash
set -e

# Dosya yolları
STATS_FILE="stats/github-stats.png"
STREAK_FILE="stats/github-streak.png"
DISCORD_FILE="stats/discord-card.svg"

# stats klasörü yoksa oluştur
mkdir -p stats

# Cachebuster için güncel zaman damgası
TIMESTAMP=$(date +%s)

# API'den görselleri indir ve ilgili dosyalara kaydet
curl -sL "https://github-readme-stats.vercel.app/api?username=icelaterdc&show_icons=true&theme=radical&cachebuster=${TIMESTAMP}" -o "${STATS_FILE}"
curl -sL "https://github-readme-streak-stats.herokuapp.com/?user=icelaterdc&theme=radical&cachebuster=${TIMESTAMP}" -o "${STREAK_FILE}"
curl -sL "https://lantern.rest/api/v1/users/991409937022468169?svg=1&theme=dark&cachebuster=${TIMESTAMP}" -o "${DISCORD_FILE}"
