import puppeteer from 'puppeteer-core';
import path from 'path';
import fs from 'fs';

const CHROME_PATH = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';
const OUTPUT_DIR = path.join(process.cwd(), 'docs', 'screenshots');

const SCREENS = [
  { name: 'describe', query: 'view=describe' },
  { name: 'clarify', query: 'view=clarify' },
  { name: 'plan', query: 'view=plan' },
  { name: 'plan_overbudget', query: 'view=plan_overbudget' },
  { name: 'plan_infeasible', query: 'view=plan_infeasible' },
  { name: 'review', query: 'view=review' },
  { name: 'done', query: 'view=done' },
  { name: 'mytrips', query: 'view=mytrips' }
];

const VIEWPORTS = [
  { label: '1440', width: 1440, height: 900 },
  { label: '375', width: 375, height: 812, isMobile: true }
];

async function run() {
  if (!fs.existsSync(OUTPUT_DIR)) {
    fs.mkdirSync(OUTPUT_DIR, { recursive: true });
  }

  console.log('Launching Chrome for screenshot capture...');
  const browser = await puppeteer.launch({
    executablePath: CHROME_PATH,
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-dev-shm-usage', '--font-render-hinting=none']
  });

  const page = await browser.newPage();

  for (const screen of SCREENS) {
    for (const vp of VIEWPORTS) {
      await page.setViewport({
        width: vp.width,
        height: vp.height,
        deviceScaleFactor: 2,
        isMobile: !!vp.isMobile
      });

      const url = `http://localhost:3000/?${screen.query}`;
      console.log(`Navigating to ${url} [${vp.label}px]...`);
      await page.goto(url, { waitUntil: 'networkidle0', timeout: 30000 });

      // Give React motion animations and fonts time to settle
      await new Promise((r) => setTimeout(r, 1200));

      const filename = `${screen.name}_${vp.label}.png`;
      const outPath = path.join(OUTPUT_DIR, filename);

      await page.screenshot({
        path: outPath,
        fullPage: true
      });

      console.log(`Saved screenshot: ${filename}`);
    }
  }

  await browser.close();
  console.log('All screenshots captured successfully!');
}

run().catch((err) => {
  console.error('Screenshot capture failed:', err);
  process.exit(1);
});
