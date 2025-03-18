const fs = require('fs');
const path = require('path');
const puppeteer = require('puppeteer');

// Örnek: Lanyard verisini çekmek için basit fetch
const fetch = require('node-fetch');

async function getLanyardData(userId) {
  const res = await fetch(`https://api.lanyard.rest/v1/users/${userId}`);
  const json = await res.json();
  if (!json.success) throw new Error('Lanyard API başarısız döndü.');
  return json.data;
}

async function main() {
  // 1) Lanyard verisini çek
  const userId = '991409937022468169'; // kendi ID'nizi girin
  const data = await getLanyardData(userId);

  // 2) Puppeteer ile headless browser aç
  const browser = await puppeteer.launch();
  const page = await browser.newPage();

  // 3) Basit bir HTML hazırlayın. Bunu localde string olarak oluşturabilir 
  // veya public klasörünüzde .html dosyası tutabilirsiniz. Burada inline yapıyoruz.
  const htmlContent = `
  <!DOCTYPE html>
  <html>
    <head>
      <meta charset="UTF-8" />
      <style>
        body {
          margin: 0;
          padding: 0;
          background: transparent;
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
        /* Daha fazla stil ekleyebilirsiniz */
      </style>
    </head>
    <body>
      <div class="card">
        <div class="avatar">
          <img src="https://cdn.discordapp.com/avatars/${data.discord_user.id}/${data.discord_user.avatar}.png?size=128" />
          <div>
            <div style="font-weight:bold">${data.discord_user.username}</div>
            <div style="font-size:0.8rem; color:#aaa">Status: ${data.discord_status}</div>
          </div>
        </div>
        <p style="margin-top:8px">
          <!-- Basit bir örnek -->
          Custom State: ${data.activities.find(a => a.id==='custom')?.state || 'Yok'}
        </p>
      </div>
    </body>
  </html>
  `;

  // 4) HTML içeriğini sayfaya yükle
  await page.setContent(htmlContent, { waitUntil: 'networkidle0' });

  // 5) Ekran görüntüsü al
  const cardElement = await page.$('.card');
  await cardElement.screenshot({
    path: path.join(__dirname, '..', 'discord-card.png'),
    omitBackground: true, // şeffaf background isterseniz
  });

  // 6) İşimiz bitti
  await browser.close();
  console.log('discord-card.png oluşturuldu.');
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
            
