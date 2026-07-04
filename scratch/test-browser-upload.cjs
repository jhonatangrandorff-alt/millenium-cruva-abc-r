const puppeteer = require('puppeteer');
const path = require('path');

(async () => {
  console.log('Launching browser...');
  const browser = await puppeteer.launch({
    headless: "new",
    args: [
      '--no-sandbox',
      '--disable-setuid-sandbox',
      '--ignore-certificate-errors',
      '--disable-web-security'
    ]
  });
  const page = await browser.newPage();

  page.on('console', msg => {
      console.log(`BROWSER LOG [${msg.type()}]:`, msg.text());
  });

  page.on('pageerror', err => {
      console.error('BROWSER CRITICAL ERROR:', err.message, err.stack);
  });

  let resolveDialog = null;
  const dialogPromise = new Promise(resolve => { resolveDialog = resolve; });

  page.on('dialog', async dialog => {
      console.log('BROWSER DIALOG:', dialog.type(), dialog.message());
      await dialog.accept();
      if (resolveDialog) resolveDialog(dialog.message());
  });

  console.log('Navigating to http://localhost:5173/');
  try {
      await page.goto('http://localhost:5173/', { timeout: 30000 });
  } catch (err) {
      console.error('Failed to connect to Vercel site:', err.message);
      await browser.close();
      process.exit(1);
  }

  console.log('Waiting for login screen...');
  await page.waitForSelector('input[type="password"]', { timeout: 10000 });

  console.log('Typing password...');
  await page.type('input[type="password"]', 'MILL@2026');
  
  console.log('Clicking submit...');
  const submitBtn = await page.$('button[type="submit"]');
  await submitBtn.click();

  console.log('Logged in. Waiting for dashboard...');
  await page.waitForSelector('input[type="file"]', { timeout: 15000 });
  console.log('Dashboard loaded.');

  // Wait for initial loading spinner to show up and then hide
  console.log('Waiting for initial loading to complete...');
  try {
      await page.waitForSelector('div.animate-spin', { visible: true, timeout: 3000 });
  } catch (e) {
      // Already visible or too fast
  }
  await page.waitForSelector('div.animate-spin', { hidden: true, timeout: 120000 });
  console.log('Initial loading finished.');

  // Find the file input
  const fileInput = await page.$('input[type="file"]');
  const csvPath = 'C:\\Users\\Jhonatan\\Downloads\\modelo_importacao_millenium.csv';
  console.log('Uploading file:', csvPath);
  await fileInput.uploadFile(csvPath);

  console.log('File uploaded. Awaiting success or warning dialog from the application...');
  const resultMessage = await dialogPromise;
  console.log('Import finished with dialog message:', resultMessage);

  console.log('Waiting 5 seconds for UI to settle...');
  await new Promise(r => setTimeout(r, 5000));

  console.log('Screenshot of dashboard after import:');
  await page.screenshot({ path: 'scratch/browser-dashboard-screenshot-after-import.png' });
  console.log('Screenshot after import saved.');

  // Check if "CICLAR E SALVAR AGORA" is present
  const pageButtons = await page.$$('button');
  let syncBtn = null;
  for (const btn of pageButtons) {
      const text = await page.evaluate(el => el.textContent, btn);
      if (text.includes('CICLAR E SALVAR AGORA')) {
          syncBtn = btn;
          break;
      }
  }

  if (syncBtn) {
      console.log('Sync button found. Clicking "CICLAR E SALVAR AGORA"...');
      await syncBtn.click();
      
      console.log('Waiting for sync spinner to hide...');
      try {
          await page.waitForSelector('div.animate-spin', { hidden: true, timeout: 300000 });
          console.log('Sync spinner hidden. Save complete.');
      } catch (e) {
          console.error('Timeout waiting for sync spinner to hide!');
      }
      
      console.log('Waiting 5 seconds...');
      await new Promise(r => setTimeout(r, 5000));
      
      console.log('Screenshot of dashboard after sync:');
      await page.screenshot({ path: 'scratch/browser-dashboard-screenshot-after-sync.png' });
      console.log('Screenshot after sync saved.');
  } else {
      console.log('Sync button NOT found (data may be already synchronized or failed).');
  }

  await browser.close();
  console.log('Browser closed.');
})();
