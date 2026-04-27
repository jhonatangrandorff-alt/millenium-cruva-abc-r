const puppeteer = require('puppeteer');

(async () => {
  const browser = await puppeteer.launch();
  const page = await browser.newPage();

  page.on('console', msg => console.log('LOG:', msg.type(), msg.text()));
  page.on('pageerror', error => console.log('CRITICAL ERROR:', error.message));

  await page.goto('https://millenium-cruva-abc.vercel.app/');
  
  await page.waitForSelector('button[type="submit"]', { timeout: 10000 });
  console.log('Login screen loaded');
  
  const users = await page.$$('button');
  for (const u of users) {
      const text = await page.evaluate(el => el.textContent, u);
      if (text.includes('GERAL')) {
          await u.click();
          break;
      }
  }

  await page.type('input[type="password"]', 'admin123');
  await page.click('button[type="submit"]');

  console.log('Clicked login');

  await new Promise(r => setTimeout(r, 5000));
  
  await page.screenshot({ path: 'screenshot.png' });
  console.log('Saved screenshot');

  await browser.close();
})();
