import fs from 'node:fs';
import path from 'node:path';
import http from 'node:http';
import assert from 'node:assert/strict';
import {chromium, devices} from 'playwright';

const root = path.resolve('_site');
const server = http.createServer((req, res) => {
  const pathname = decodeURIComponent(new URL(req.url, 'http://localhost').pathname);
  let file = path.resolve(root, '.' + pathname);
  if (!(file === root || file.startsWith(root + '/'))) return res.writeHead(403).end();
  if (fs.existsSync(file) && fs.statSync(file).isDirectory()) file = path.join(file, 'index.html');
  if (!fs.existsSync(file)) return res.writeHead(404).end();
  const mime = {'.html':'text/html', '.js':'text/javascript', '.css':'text/css', '.json':'application/json', '.svg':'image/svg+xml'};
  res.setHeader('Content-Type', mime[path.extname(file)] || 'application/octet-stream');
  fs.createReadStream(file).pipe(res);
});
await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
const origin = `http://127.0.0.1:${server.address().port}`;
let browser;
let captures = 0;
try {
  browser = await chromium.launch();
  fs.mkdirSync('artifacts/public-site-qa', {recursive: true});
  for (const [profile, options] of [['desktop', {viewport:{width:1440,height:900}}], ['android_emulation', devices['Pixel 7']]]) {
    const context = await browser.newContext(options);
    let externalRequests = 0;
    await context.route('**/*', route => {
      if (!route.request().url().startsWith(origin + '/')) {externalRequests++; return route.abort();}
      return route.continue();
    });
    for (const url of ['/', '/catalog/', '/catalog/prostornaya-4a/', '/catalog/aerodromnaya-18g/', '/catalog/sennaya-76/', '/contacts/', '/ipoteka/']) {
      const page = await context.newPage();
      const errors = [];
      page.on('pageerror', error => errors.push(error.message));
      await page.goto(origin + url + '?lead_test=dry-run&analytics_test=debug&test_ack=1');
      await page.waitForFunction(() => window.__NEWBUILD_BUYER_PROJECT_CONTENT__ === true);
      assert.equal(await page.locator('[data-lead-form]').count(), 2, url);
      assert.equal(await page.locator('[data-lead-fieldset]:disabled').count(), 0, url);
      if (url === '/catalog/') {
        await page.waitForFunction(() => [...document.querySelectorAll('[data-catalog-verification-card]')].every(card => card.dataset.verificationLoaded === 'true'));
        await page.waitForFunction(() => document.querySelector('[data-reference-catalog]')?.children.length === 4);
      }
      if (url.includes('/catalog/') && url !== '/catalog/') await page.waitForSelector('[data-verification-summary-rendered="true"]');
      if (url.includes('18g') || url.includes('sennaya')) await page.waitForSelector('[data-project-market-snapshot]');
      assert.deepEqual(errors, [], url);
      await page.screenshot({path:`artifacts/public-site-qa/${profile}-${url.replaceAll('/', '_')}.png`, fullPage:true});
      captures++;
      await page.close();
    }
    assert.equal(externalRequests, 0, 'Unexpected external request; production submission forbidden');
    await context.close();
  }
  fs.writeFileSync('artifacts/public-site-qa/summary.json', JSON.stringify({captures, pages:7, profiles:2, physical_device:false, live_submissions:0, runtime_views_loaded:true}, null, 2));
  console.log(`Public site browser QA passed: ${captures} captures; no live submissions.`);
} finally {
  await browser?.close();
  await new Promise(resolve => server.close(resolve));
}
