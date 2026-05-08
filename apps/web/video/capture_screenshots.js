const { chromium } = require('playwright');
const path = require('path');

const SCREENS = [
  { name: 'landing', url: 'https://www.opsslate.app', wait: 3000 },
];

// We need to login first, then capture authenticated pages
const AUTH_SCREENS = [
  { name: 'dashboard', path: '/' },
  { name: 'autopilot', path: '/autopilot' },
  { name: 'daily-logs', path: '/daily-logs' },
  { name: 'time-tracking', path: '/time-tracking' },
  { name: 'reports', path: '/reports' },
  { name: 'punch-list', path: '/punch-list' },
  { name: 'safety', path: '/safety' },
  { name: 'weather', path: '/weather' },
  { name: 'budget', path: '/budget' },
  { name: 'crew', path: '/crew' },
];

(async () => {
  const browser = await chromium.launch({ headless: true, args: ['--no-sandbox'] });
  const ctx = await browser.newContext({ viewport: { width: 1920, height: 1080 } });
  const page = await ctx.newPage();
  
  const outDir = path.join(__dirname, 'screenshots');
  const fs = require('fs');
  fs.mkdirSync(outDir, { recursive: true });

  // Capture landing page (no auth needed)
  console.log('Capturing landing page...');
  await page.goto('https://www.opsslate.app', { waitUntil: 'networkidle', timeout: 15000 });
  await page.waitForTimeout(2000);
  await page.screenshot({ path: path.join(outDir, 'landing.png'), fullPage: false });
  console.log('✅ landing.png');

  // Login
  console.log('Logging in...');
  // Click "Start Free" or "Sign In" to get to auth form
  const startBtn = await page.$('text=Sign In');
  if (startBtn) await startBtn.click();
  await page.waitForTimeout(1000);
  
  // Fill login form
  await page.fill('input[type="email"]', 'warhawk9534@gmail.com');
  await page.fill('input[type="password"]', 'admin123');
  await page.click('button[type="submit"]');
  await page.waitForTimeout(3000);
  
  // Capture each authenticated page
  for (const screen of AUTH_SCREENS) {
    console.log(`Capturing ${screen.name}...`);
    try {
      await page.goto(`https://www.opsslate.app${screen.path}`, { waitUntil: 'networkidle', timeout: 10000 });
      await page.waitForTimeout(2000);
      await page.screenshot({ path: path.join(outDir, `${screen.name}.png`), fullPage: false });
      console.log(`✅ ${screen.name}.png`);
    } catch (e) {
      console.log(`❌ ${screen.name} failed: ${e.message}`);
    }
  }

  await browser.close();
  console.log('\nDone! Screenshots in:', outDir);
})();
