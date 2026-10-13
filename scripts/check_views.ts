import puppeteer from 'puppeteer-core';

const CHROME_PATH = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';

async function main() {
  const browser = await puppeteer.launch({
    executablePath: CHROME_PATH,
    headless: true
  });
  const page = await browser.newPage();
  page.on('console', (msg) => {
    if (msg.type() === 'error') console.log('PAGE CONSOLE ERROR:', msg.text());
  });
  page.on('pageerror', (err: any) => {
    console.log('PAGE ERROR:', err.message);
  });

  const views = ['describe', 'clarify', 'plan', 'plan_overbudget', 'plan_infeasible', 'review', 'done', 'mytrips'];

  for (const v of views) {
    await page.goto(`http://localhost:3000/?view=${v}`, { waitUntil: 'networkidle0' });
    await new Promise((r) => setTimeout(r, 800));

    const info = await page.evaluate(() => {
      const h1 = document.querySelector('h1')?.textContent?.trim();
      const h2 = document.querySelector('h2')?.textContent?.trim();
      const bodySnippet = document.body.innerText.replace(/\s+/g, ' ').slice(0, 120);
      return { h1, h2, bodySnippet };
    });

    console.log(`[${v}]:`, info);
  }

  await browser.close();
}

main().catch(console.error);
