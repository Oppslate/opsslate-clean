const { chromium } = require('playwright');
const path = require('path');

const EXTRA_SCREENS = [
  { name: 'change-orders', path: '/change-orders' },
  { name: 'rfis', path: '/rfis' },
  { name: 'submittals', path: '/submittals' },
  { name: 'documents', path: '/documents' },
  { name: 'subcontractors', path: '/subcontractors' },
  { name: 'site-media', path: '/site-media' },
  { name: 'calendar', path: '/calendar' },
  { name: 'settings', path: '/settings' },
];

(async () => {
  const browser = await chromium.launch({ headless: true, args: ['--no-sandbox'] });
  const ctx = await browser.newContext({ viewport: { width: 1920, height: 1080 } });
  const page = await ctx.newPage();
  const outDir = path.join(__dirname, 'screenshots');

  // Login
  await page.goto('https://www.opsslate.app', { waitUntil: 'networkidle', timeout: 15000 });
  await page.waitForTimeout(1500);
  const btn = await page.$('text=Sign In');
  if (btn) await btn.click();
  await page.waitForTimeout(1000);
  await page.fill('input[type="email"]', 'warhawk9534@gmail.com');
  await page.fill('input[type="password"]', 'admin123');
  await page.click('button[type="submit"]');
  await page.waitForTimeout(3000);

  for (const screen of EXTRA_SCREENS) {
    console.log(`Capturing ${screen.name}...`);
    try {
      await page.goto(`https://www.opsslate.app${screen.path}`, { waitUntil: 'networkidle', timeout: 10000 });
      await page.waitForTimeout(2000);
      await page.screenshot({ path: path.join(outDir, `${screen.name}.png`) });
      console.log(`✅ ${screen.name}.png`);
    } catch (e) { console.log(`❌ ${screen.name}: ${e.message}`); }
  }
  await browser.close();
})();
