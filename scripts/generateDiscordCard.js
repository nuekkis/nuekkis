// scripts/generateDiscordCard.js

const fs = require('fs');
const path = require('path');
const puppeteer = require('puppeteer');
const fetch = require('node-fetch');

async function getLanyardData(userId) {
  try {
    const res = await fetch(`https://api.lanyard.rest/v1/users/${userId}`);
    const json = await res.json();
    if (!json.success) {
      throw new Error('Lanyard API başarısız döndü.');
    }
    return json.data;
  } catch (error) {
    console.error('Lanyard API hatası:', error.message);
    throw error;
  }
}

// Normal süre formatı
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

// Güvenli süre formatı (NaN'ı engellemek için)
function safeFormatDurationMs(ms) {
  if (!Number.isFinite(ms) || ms < 0) {
    return '0:00';
  }
  return formatDurationMs(ms);
}

async function generateCard() {
  console.log(`[${new Date().toISOString()}] Kart oluşturuluyor...`);
  
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
    // Spotify zaman verilerini düzgün parse ediyoruz
    const startNum = typeof spotify.timestamps?.start === 'number' ? spotify.timestamps.start : 0;
    const endNum = typeof spotify.timestamps?.end === 'number' ? spotify.timestamps.end : 0;
    const totalDuration = endNum > startNum ? endNum - startNum : 0;
    const elapsed = Math.min(Math.max(currentTime - startNum, 0), totalDuration);
    const progressPercent = totalDuration > 0 ? (elapsed / totalDuration) * 100 : 0;

    const album = spotify.album || '';
    const albumArt = spotify.album_art_url || '';
    const artist = spotify.artist || '';
    const song = spotify.song || '';

    cardExtraHTML = `
      <div style="margin-top: 1rem; background: rgba(55,65,81,0.5); border-radius: 1rem; padding: 1rem;">
        <div style="display: flex; align-items: center;">
          <img src="${albumArt}" alt="${album}" style="width: 4rem; height: 4rem; border-radius: 0.25rem; object-fit: cover; margin-right: 1rem;" crossOrigin="anonymous"/>
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
            <span>${safeFormatDurationMs(elapsed)}</span>
            <span>${safeFormatDurationMs(totalDuration)}</span>
          </div>
        </div>
      </div>
    `;
  } else {
    // Spotify dışındaki etkinlik (örnek: bir oyun vs.)
    const currentActivity = activities.find((a) => a.type !== 4);
    if (currentActivity) {
      const largeImage = currentActivity.assets?.large_image || '';
      const details = currentActivity.details || '';
      const state = currentActivity.state || '';
      cardExtraHTML = `
        <div style="margin-top: 1rem; background: #1a202c; padding: 0.75rem; border-radius: 0.5rem; display: flex; align-items: center;">
          ${
            largeImage
              ? `<img src="${largeImage}" alt="${currentActivity.name}" style="width: 3rem; height: 3rem; border-radius: 0.375rem; margin-right: 0.75rem;" crossOrigin="anonymous"/>`
              : ''
          }
          <div>
            <div style="font-size: 0.875rem; font-weight: bold; color: #63b3ed;">${currentActivity.name}</div>
            ${
              details
                ? `<div style="font-size: 0.75rem; color: #cbd5e0;">${details}</div>`
                : ''
            }
            ${
              state
                ? `<div style="font-size: 0.75rem; color: #a0aec0;">${state}</div>`
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

  // Status ikonu konumu (biraz dışarı taşıyoruz)
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
  
  // Puppeteer ile tarayıcı başlat
  let browser;
  try {
    browser = await puppeteer.launch({
      headless: true,
      args: ['--no-sandbox', '--disable-setuid-sandbox']
    });
    const page = await browser.newPage();
    await page.setContent(htmlContent, { waitUntil: 'networkidle0' });
    // Görsellerin yüklenmesi için ufak bekleme
    await page.waitForTimeout(500);
    const cardElement = await page.$('#card');
    // PNG çıktısı (şeffaf arka plan için omitBackground:true)
    await cardElement.screenshot({
      path: path.join(__dirname, '..', 'discord-card.png'),
      omitBackground: true
    });
    console.log(`[${new Date().toISOString()}] discord-card.png oluşturuldu.`);
    return true;
  } catch (error) {
    console.error('Kart oluşturma hatası:', error);
    return false;
  } finally {
    if (browser) {
      await browser.close();
    }
  }
}

async function main() {
  console.log('Discord kart yenileme servisi başlatılıyor...');
  console.log('Kart her 10 saniyede bir güncellenecek.');
  
  // İlk kartı hemen oluştur
  await generateCard();
  
  // 10 saniyede bir yenileme döngüsü
  const intervalId = setInterval(async () => {
    try {
      await generateCard();
    } catch (error) {
      console.error('Kart yenileme hatası:', error);
      // Hata durumunda bile devam et, interval'i durdurma
    }
  }, 10000); // 10 saniye

  // GitHub Actions gibi ortamlarda script'in sonsuza kadar çalışmasını engellemek için
  // İsteğe bağlı olarak maksimum çalışma süresi (örn: 1 saat)
  const MAX_RUNTIME = 60 * 60 * 1000; // 1 saat (milisaniye)
  setTimeout(() => {
    clearInterval(intervalId);
    console.log('Maksimum çalışma süresi aşıldı, servis durduruluyor.');
    process.exit(0);
  }, MAX_RUNTIME);
  
  // CTRL+C ile durdurma için sinyal yakalama
  process.on('SIGINT', () => {
    clearInterval(intervalId);
    console.log('Servis durduruldu.');
    process.exit(0);
  });
}

// Script'i başlat
main().catch(err => {
  console.error('Kritik hata:', err);
  process.exit(1);
});
  
