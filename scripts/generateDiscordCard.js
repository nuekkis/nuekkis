// scripts/generateDiscordCard.js

const fs = require('fs');
const path = require('path');
const puppeteer = require('puppeteer');
const fetch = require('node-fetch');

async function getLanyardData(userId) {
  const res = await fetch(`https://api.lanyard.rest/v1/users/${userId}`);
  const json = await res.json();
  if (!json.success) {
    throw new Error('Lanyard API başarısız döndü.');
  }
  return json.data;
}

function formatDurationMs(ms) {
  const totalSeconds = Math.floor(ms / 1000);
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;
  if (hours > 0) {
    return `${hours}:${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
  }
  return `${minutes}:${String(seconds).padStart(2, '0')}`;
}

async function main() {
  // Kendi Discord ID'nizi girin
  const userId = '991409937022468169';
  const data = await getLanyardData(userId);
  const currentTime = Date.now();
  
  const { discord_user, activities, discord_status, listening_to_spotify, spotify } = data;
  const displayName = discord_user.display_name || discord_user.global_name || discord_user.username;
  const avatarUrl = `https://cdn.discordapp.com/avatars/${discord_user.id}/${discord_user.avatar}.webp?size=1024`;

  // Custom Status (konuşma balonu)
  const customActivity = activities.find(
    (act) => act.id === 'custom' && act.state && act.state.trim() !== ''
  );
  const customState = customActivity ? customActivity.state : null;

  // Spotify veya diğer etkinlik kartı HTML içeriği
  let cardExtraHTML = '';
  if (listening_to_spotify && spotify) {
    const { start, end, album, album_art_url, artist, song } = spotify;
    const totalDuration = end - start;
    const elapsed = Math.min(Math.max(currentTime - start, 0), totalDuration);
    const progressPercent = (elapsed / totalDuration) * 100;
    cardExtraHTML = `
      <div style="margin-top: 1rem; background: rgba(55,65,81,0.5); border-radius: 1rem; padding: 1rem;">
        <div style="display: flex; align-items: center;">
          <img src="${album_art_url}" alt="${album}" style="width: 4rem; height: 4rem; border-radius: 0.25rem; object-fit: cover; margin-right: 1rem;" crossOrigin="anonymous"/>
          <div style="flex: 1;">
            <div style="font-size: 0.875rem; font-weight: bold; color: #fff;">${song}</div>
            <div style="font-size: 0.75rem; color: #cbd5e0;">${artist} &middot; ${album}</div>
          </div>
          <div style="margin-left: 0.5rem;">
            <img src="https://icelater.vercel.app/badges/spotify.png" alt="Spotify" style="width: 1.5rem; height: 1.5rem;" crossOrigin="anonymous"/>
          </div>
        </div>
        <div style="margin-top: 0.75rem;">
          <div style="width: 100%; height: 0.5rem; background: #4a5568; border-radius: 0.25rem;">
            <div style="height: 0.5rem; background: #48bb78; border-radius: 0.25rem; transition: width 1s linear; width: ${progressPercent}%;">
            </div>
          </div>
          <div style="display: flex; justify-content: space-between; font-size: 0.75rem; color: #48bb78; font-weight: 500; margin-top: 0.25rem;">
            <span>${formatDurationMs(elapsed)}</span>
            <span>${formatDurationMs(totalDuration)}</span>
          </div>
        </div>
      </div>
    `;
  } else if (activities.length > 0) {
    const currentActivity = activities.find((a) => a.type !== 4);
    if (currentActivity) {
      cardExtraHTML = `
        <div style="margin-top: 1rem; background: #1a202c; padding: 0.75rem; border-radius: 0.5rem; display: flex; align-items: center;">
          ${
            currentActivity.assets && currentActivity.assets.large_image
              ? `<img src="${currentActivity.assets.large_image}" alt="${currentActivity.name}" style="width: 3rem; height: 3rem; border-radius: 0.375rem; margin-right: 0.75rem;" crossOrigin="anonymous"/>`
              : ''
          }
          <div>
            <div style="font-size: 0.875rem; font-weight: bold; color: #63b3ed;">${currentActivity.name}</div>
            ${
              currentActivity.details
                ? `<div style="font-size: 0.75rem; color: #cbd5e0;">${currentActivity.details}</div>`
                : ''
            }
            ${
              currentActivity.state
                ? `<div style="font-size: 0.75rem; color: #a0aec0;">${currentActivity.state}</div>`
                : ''
            }
          </div>
        </div>
      `;
    }
  }
  
  // Rozetler (badgeMapping)
  const badgeMapping = [
    { bit: 1, img: "https://icelater.vercel.app/badges/brilliance.png" },
    { bit: 2, img: "https://icelater.vercel.app/badges/aktif_gelistirici.png" },
    { bit: 4, img: "https://icelater.vercel.app/badges/eski_isim.png" },
    { bit: 8, img: "https://icelater.vercel.app/badges/gorev_tamamlandi.png" }
  ];
  const badgesHTML = badgeMapping
    .map(mapping => `<img src="${mapping.img}" alt="rozet" style="width:1.25rem; height:1.25rem; margin-right:0.5rem;" crossOrigin="anonymous"/>`)
    .join('');

  // Banner varsa
  const bannerHTML = discord_user.bannerURL && discord_user.bannerURL !== ''
    ? `<div style="height:6rem; width:100%; background-image: url(${discord_user.bannerURL}); background-size: cover; background-position: center; border-top-left-radius: 1rem; border-top-right-radius: 1rem; margin-bottom: 1rem;"></div>`
    : '';

  // TAM HTML içeriği
  // Status ikonu: transform: translate(25%,25%) + border ekledik
  const htmlContent = `
    <!DOCTYPE html>
    <html>
      <head>
        <meta charset="UTF-8" />
        <title>Discord Card</title>
        <style>
          body {
            margin: 0;
            padding: 0;
            background: transparent;
            font-family: sans-serif;
          }
        </style>
      </head>
      <body>
        <div id="card" style="color: #fff; max-width: 28rem; margin: 0 auto; background: linear-gradient(to bottom right, #2d3748, #1a202c); border-radius: 1rem; box-shadow: 0 10px 15px rgba(0,0,0,0.3); position: relative; padding: 1.5rem;">
          ${bannerHTML}
          <div style="display: flex; align-items: center;">
            <div style="position: relative; width: 5rem; height: 5rem;">
              <img
                src="${avatarUrl}"
                alt="${discord_user.username}"
                style="width: 100%; height: 100%; border-radius: 50%; object-fit: cover; border: 0.25rem solid #1a202c;"
                crossOrigin="anonymous"
              />
              <div style="
                position: absolute;
                bottom: 0;
                right: 0;
                transform: translate(25%, 25%);
                background: #1a202c;
                border: 2px solid #2d3748;
                border-radius: 50%;
                width: 1.5rem;
                height: 1.5rem;
                display: flex;
                align-items: center;
                justify-content: center;
              ">
                <img
                  src="https://icelater.vercel.app/statusIcon/${discord_status}.png"
                  alt="${discord_status}"
                  style="width:1rem; height:1rem;"
                  crossOrigin="anonymous"
                />
              </div>
            </div>
            <div style="margin-left: 1rem;">
              <div style="font-size: 1.5rem; font-weight: bold;">${displayName}</div>
              <div style="font-size: 0.875rem; color: #a0aec0;">@${discord_user.username}</div>
              <div style="margin-top: 0.5rem; background: #1a202c; display: inline-flex; align-items: center; padding: 0.25rem 0.5rem; border-radius: 0.5rem;">
                ${badgesHTML}
              </div>
            </div>
          </div>
          ${
            customState
              ? `
            <div style="position: absolute; top: 1.5rem; right: 1.5rem;">
              <div style="background: #4a5568; color: #fff; font-size: 0.875rem; padding: 0.5rem; border-radius: 0.5rem; max-width: 11.25rem; word-break: break-word;">
                ${customState}
              </div>
            </div>
          `
              : ''
          }
          ${cardExtraHTML}
        </div>
      </body>
    </html>
  `;
  
  // Puppeteer ile headless tarayıcı başlat
  const browser = await puppeteer.launch({
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });
  const page = await browser.newPage();
  await page.setContent(htmlContent, { waitUntil: 'networkidle0' });
  // Görsellerin yüklenmesi için ufak bekleme
  await page.waitForTimeout(500);
  const cardElement = await page.$('#card');
  // Şeffaf arka plan istiyorsanız "omitBackground: true"
  await cardElement.screenshot({
    path: path.join(__dirname, '..', 'discord-card.png'),
    omitBackground: true
  });
  await browser.close();
  console.log('discord-card.png oluşturuldu.');
}

main().catch(err => {
  console.error(err);
  process.exit(1);
});
