const fetch = require('node-fetch');
const sharp = require('sharp');
const fs = require('fs');
const path = require('path');

async function convertSVGToPNG(url, outputFile) {
  try {
    const response = await fetch(url);
    const svg = await response.text();
    // sharp SVG'den PNG oluşturuyor
    await sharp(Buffer.from(svg))
      .png()
      .toFile(outputFile);
    console.log(`Saved ${outputFile}`);
  } catch (err) {
    console.error(`Error processing ${url}:`, err);
  }
}

(async () => {
  // stats klasörünü oluştur (yoksa)
  const statsDir = path.join(__dirname, '..', 'stats');
  if (!fs.existsSync(statsDir)) {
    fs.mkdirSync(statsDir);
  }

  // Her çalıştırmada cachebuster için güncel zaman damgası
  const timestamp = Date.now();

  // Görsel URL'leri
  const githubStatsURL = `https://github-readme-stats.vercel.app/api?username=icelaterdc&show_icons=true&theme=radical&cachebuster=${timestamp}`;
  const githubStreakURL = `https://github-readme-streak-stats.herokuapp.com/?user=icelaterdc&theme=radical&cachebuster=${timestamp}`;
  const discordCardURL = `https://lantern.rest/api/v1/users/991409937022468169?svg=1&theme=dark&cachebuster=${timestamp}`;

  // PNG dosya yolları
  const statsFile = path.join(statsDir, 'github-stats.png');
  const streakFile = path.join(statsDir, 'github-streak.png');
  const discordFile = path.join(statsDir, 'discord-card.png');

  // Dönüştürme işlemleri
  await convertSVGToPNG(githubStatsURL, statsFile);
  await convertSVGToPNG(githubStreakURL, streakFile);
  await convertSVGToPNG(discordCardURL, discordFile);
})();
