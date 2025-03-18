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

function safeFormatDurationMs(ms) {
  if (!Number.isFinite(ms) || ms < 0) {
    return '0:00';
  }
  return formatDurationMs(ms);
}

async function generateDiscordCard() {
  try {
    const userId = '991409937022468169'; // Kendi Discord ID'nizi girin
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
      const startNum = typeof spotify.timestamps?.start === 'number' ? spotify.timestamps.start : 0;
      const endNum = typeof spotify.timestamps?.end === 'number' ? spotify.timestamps.end : 0;
      const totalDuration = endNum > startNum ? endNum - startNum : 0;
      const elapsed = Math.min(Math.max(currentTime - startNum, 0), totalDuration);
      const progressPercent = totalDuration > 0 ? (elapsed / totalDuration) * 100 : 0;

      cardExtraHTML = `
        <div style="margin-top: 1rem; background: rgba(55,65,81,0.5); border-radius: 1rem; padding: 1rem;">
          <div style="display: flex; align-items: center;">
            <img src="${spotify.album_art_url}" alt="${spotify.album}" style="width: 4rem; height: 4rem; border-radius: 0.25rem; object-fit: cover; margin-right: 1rem;" crossOrigin="anonymous"/>
            <div style="flex: 1;">
              <div style="font-size: 0.875rem; font-weight: bold; color: #fff;">${spotify.song}</div>
              <div style="font-size: 0.75rem; color: #cbd5e0;">${spotify.artist} &middot; ${spotify.album}</div>
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
      const currentActivity = activities.find((a) => a.type !== 4);
      if (currentActivity) {
        const largeImage = currentActivity.assets?.large_image || '';
        const details = currentActivity.details || '';
        const state = currentActivity.state || '';
        cardExtraHTML = `
          <div style="margin-top: 1rem; background: #1a202c; padding: 0.75rem; border-radius: 0.5rem; display: flex; align-items: center;">
            ${largeImage ? `<img src="${largeImage}" alt="${currentActivity.name}" style="width: 3rem; height: 3rem; border-radius: 0.375rem; margin-right: 0.75rem;" crossOrigin="anonymous"/>` : ''}
            <div>
              <div style="font-size: 0.875rem; font-weight: bold; color: #63b3ed;">${currentActivity.name}</div>
              ${details ? `<div style="font-size: 0.75rem; color: #cbd5e0;">${details}</div>` : ''}
              ${state ? `<div style="font-size: 0.75rem; color: #a0aec0;">${state}</div>` : ''}
            </div>
          </div>
        `;
      }
    }

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
          <div id="card" style="color: #fff; max-width: 28rem; margin: 0 auto; background: #2d3748; border-radius: 1rem; box-shadow: 0 10px 15px rgba(0,0,0,0.3); padding: 1.5rem;">
            <div style="display: flex; align-items: center;">
              <img src="${avatarUrl}" alt="${discord_user.username}" style="width: 5rem; height: 5rem; border-radius: 50%;" />
              <div style="margin-left: 1rem;">
                <div style="font-size: 1.5rem; font-weight: bold;">${displayName}</div>
                <div style="font-size: 0.875rem; color: #a0aec0;">@${discord_user.username}</div>
              </div>
            </div>
            ${customState ? `<div style="margin-top: 1rem; font-size: 0.875rem; background: #4a5568; padding: 0.5rem; border-radius: 0.5rem;">${customState}</div>` : ''}
            ${cardExtraHTML}
          </div>
        </body>
      </html>
    `;

    // Her çağrıda yeni bir Puppeteer instance başlatıp kapatıyoruz
    const browserInstance = await puppeteer.launch({
      headless: true,
      args: ['--no-sandbox', '--disable-setuid-sandbox']
    });
    const page = await browserInstance.newPage();
    await page.setContent(htmlContent, { waitUntil: 'networkidle0' });
    await page.waitForTimeout(500);
    const cardElement = await page.$('#card');
    const imagePath = path.join(__dirname, '..', 'discord-card.png');
    await cardElement.screenshot({ path: imagePath, omitBackground: true });
    await browserInstance.close();
    console.log('discord-card.png güncellendi.');
  } catch (error) {
    console.error('Hata oluştu:', error);
  }
}

// 10 saniyede bir çalıştırmak için
setInterval(generateDiscordCard, 10000);
// İlk çalıştırmayı hemen yap
generateDiscordCard();
