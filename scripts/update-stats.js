const puppeteer = require('puppeteer');
const fs = require('fs');
const path = require('path');

async function screenshot(url, outputFile) {
  const browser = await puppeteer.launch({ args: ['--no-sandbox'] });
  try {
    const page = await browser.newPage();
    // İhtiyaç duyulan genişlik/yükseklik değerlerini ayarlayın
    await page.setViewport({ width: 800, height: 400 });
    await page.goto(url, { waitUntil: 'networkidle2' });
    await page.screenshot({ path: outputFile });
    console.log(`Saved ${outputFile}`);
  } catch (error) {
    console.error(`Error screenshotting ${url}:`, error);
  } finally {
    await browser.close();
  }
}

(async () => {
  const statsDir = path.join(__dirname, '..', 'stats');
  if (!fs.existsSync(statsDir)) {
    fs.mkdirSync(statsDir);
  }
  
  // Cachebuster için güncel zaman damgası
  const timestamp = Date.now();
  
  // API URL'leri (cachebuster ekleniyor)
  const githubStatsURL = `https://github-readme-stats.vercel.app/api?username=icelaterdc&show_icons=true&theme=radical&cachebuster=${timestamp}`;
  const githubStreakURL = `https://github-readme-streak-stats.herokuapp.com/?user=icelaterdc&theme=radical&cachebuster=${timestamp}`;
  const discordCardURL = `https://lantern.rest/api/v1/users/991409937022468169?svg=1&theme=dark&cachebuster=${timestamp}`;
  
  // PNG dosya yolları
  const statsFile = path.join(statsDir, 'github-stats.png');
  const streakFile = path.join(statsDir, 'github-streak.png');
  const discordFile = path.join(statsDir, 'discord-card.png');
  
  await screenshot(githubStatsURL, statsFile);
  await screenshot(githubStreakURL, streakFile);
  await screenshot(discordCardURL, discordFile);
})();
