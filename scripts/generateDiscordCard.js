const fs = require('fs');
const path = require('path');
const puppeteer = require('puppeteer');
const fetch = require('node-fetch');

// Lanyard verisini çeken basit fonksiyon
async function getLanyardData(userId) {
  const res = await fetch(`https://api.lanyard.rest/v1/users/${userId}`);
  const json = await res.json();
  if (!json.success) {
    throw new Error('Lanyard API başarısız döndü.');
  }
  return json.data;
}

async function main() {
  // 1) Kendi Discord ID'nizi girin
  const userId = '991409937022468169';
  // 2) Lanyard API'den veriyi çek
  const data = await getLanyardData(userId);

  // 3) Puppeteer ile headless tarayıcı başlat (sandbox devre dışı!)
  const browser = await puppeteer.launch({
    headless: 'new', // veya headless: true
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });
  const page = await browser.newPage();

  // 4) Basit HTML oluştur (içine Lanyard verilerini yerleştiriyoruz)
  const htmlContent = `
  <!DOCTYPE html>
  <html>
    <head>
      <meta charset="UTF-8" />
      <style>
        body {
          margin: 0;
          padding: 0;
          background: #222;
          font-family: sans-serif;
          color: #fff;
        }
        .card {
          width: 300px;
          border: 2px solid #333;
          border-radius: 8px;
          padding: 16px;
          background: #222;
        }
        .avatar {
          display: flex;
          align-items: center;
          gap: 10px;
        }
        .avatar img {
          border-radius: 50%;
          width: 64px;
          height: 64px;
          object-fit: cover;
          border: 2px solid #111;
        }
      </style>
    </head>
    <body>
      <div class="card">
        <div class="avatar">
          <img src="https://cdn.discordapp.com/avatars/${data.discord_user.id}/${data.discord_user.avatar}.png?size=128" />
          <div>
            <div style="font-weight:bold">${data.discord_user.username}</div>
            <div style="font-size:0.8rem; color:#aaa">
              Status: ${data.discord_status}
            </div>
          </div>
        </div>
        <p style="margin-top:8px">
          Custom State: ${data.activities.find(a => a.id === 'custom')?.state || 'Yok'}
        </p>
      </div>
    </body>
  </html>
  `;

  // 5) HTML içeriğini Puppeteer sayfasına yükle
  await page.setContent(htmlContent, { waitUntil: 'networkidle0' });

  // 6) .card elementini bulup ekran görüntüsü al
  const cardElement = await page.$('.card');
  await cardElement.screenshot({
    path: path.join(__dirname, '..', 'discord-card.png'),
    omitBackground: false // true yaparsanız arka plan şeffaf olabilir
  });

  // 7) Tarayıcıyı kapat
  await browser.close();
  console.log('discord-card.png oluşturuldu.');
}

// Hata yakalama
main().catch((err) => {
  console.error(err);
  process.exit(1);
});
