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
        await page.waitForSelector('[data-guide-loaded="true"]');
        assert.equal(await page.locator('.city-guide__row').count(), 7);
        const search = page.locator('[data-guide-search]');
        await search.fill('уютная');
        assert.equal(await page.locator('.city-guide__row:visible').count(), 1);
        await search.fill('18Б');
        assert.equal(await page.locator('.city-guide__row:visible').count(), 0);
        assert.equal(await page.locator('#aerodromnaya-18b').isVisible(), true);
        await search.fill('неттакогодома');
        assert.equal(await page.locator('.city-guide__row:visible').count(), 0);
        assert.equal(await page.locator('#aerodromnaya-18b').isVisible(), false);
        await search.fill('');
        assert.equal(await page.locator('.city-guide__row:visible').count(), 7);
        assert.equal(await page.locator('.reference-buyers__details').count(), 4);
        await page.locator('.reference-buyers__details').first().locator('summary').click();
        assert((await page.locator('.reference-buyers__details').first().textContent()).includes('Дорожная 50А — 7'));
        await page.locator('.reference-buyers__details').first().locator('summary').click();
        await page.waitForSelector('[data-comparison-ready="true"]');
        const toggles = page.locator('.buyer-compare__toggle');
        assert.equal(await toggles.count(),7);
        await toggles.nth(0).focus();
        await page.keyboard.press('Space');
        await toggles.nth(3).click();
        assert.equal(await page.locator('.buyer-compare__chip').count(),2);
        const localOpen=page.locator('.city-guide__row').nth(3).locator('.buyer-compare__open');
        await localOpen.click();
        await page.getByRole('button',{name:'Закрыть сравнение',exact:true}).click();
        assert.equal(await localOpen.evaluate(node=>node===document.activeElement),true,'Close lost opener focus');
        await search.fill('сенная');
        assert.equal(await page.locator('.buyer-compare__chip').count(),2,'Search discarded chosen homes');
        await page.locator('.buyer-compare__chip').first().click();
        assert.equal(await search.evaluate(node=>node===document.activeElement),true,'Removing a filtered home lost focus');
        await search.fill('');
        await toggles.nth(0).click();
        await toggles.nth(2).click();
        await toggles.nth(1).click();
        assert.equal(await page.locator('.buyer-compare__chip').count(),3,'Comparison exceeded three homes');
        assert.equal(await toggles.nth(1).getAttribute('aria-pressed'),'false');
        await toggles.nth(2).click();
        await page.getByRole('button',{name:/^Сравнить выбранные дома/}).click();
        assert.equal(await page.locator('#buyer-comparison').isVisible(),true);
        assert.equal(await page.locator('#buyer-comparison th[scope="col"]').count(),3);
        assert.equal(await page.locator('#buyer-comparison').getAttribute('id'),await page.evaluate(()=>document.activeElement.id));
        assert((await page.locator('#buyer-comparison').textContent()).includes('ЖК «Уютный»'));
        assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth+1),false,'Comparison caused page overflow');
        await page.locator('#buyer-comparison').screenshot({path:`artifacts/public-site-qa/${profile}-comparison.png`});
        captures++;
        if (profile === 'android_emulation') {
          const originalViewport=page.viewportSize();
          await page.setViewportSize({width:320,height:740});
          assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth+1),false,'320px comparison caused page overflow');
          assert.equal(await page.locator('.buyer-compare__scroll').evaluate(node=>node.scrollWidth>node.clientWidth),true,'Narrow comparison lost its scroll region');
          await page.locator('#buyer-comparison').screenshot({path:`artifacts/public-site-qa/comparison-320px.png`});
          captures++;
          await page.setViewportSize(originalViewport);
        }
        // Transfer to the existing form, clearing single-reference attribution but keeping buyer input.
        await page.locator('[data-reference-catalog] article.card').first().locator('a[href="#lead"]').click();
        const detailed = page.locator('form[data-form-id="catalog_priority_selection"]');
        const comment = detailed.locator('textarea[name="comment"]');
        const referenceValue = await detailed.locator('select[name="residential_complex"]').inputValue();
        await comment.fill('а'.repeat(1450));
        await page.locator('#buyer-comparison a[href="#lead"]').click();
        assert.equal((await comment.inputValue()).length,1450,'Long buyer text was truncated or overwritten');
        assert.equal(await detailed.locator('select[name="residential_complex"]').inputValue(),referenceValue,'Rejected transfer changed object attribution');
        assert((await detailed.locator('[data-comparison-request-note]').textContent()).includes('1500'));
        await comment.fill('Комментарий покупателя');
        await detailed.locator('select[name="interest"]').selectOption('2-комнатная квартира');
        await detailed.locator('input[name="budget"]').fill('До 5 млн');
        await page.locator('#buyer-comparison a[href="#lead"]').click();
        assert.equal(await detailed.locator('select[name="residential_complex"]').inputValue(),'Общий подбор новостройки');
        assert.equal(await detailed.locator('[data-reference-catalog-field]').count(),0,'Stale reference fields remained');
        assert.equal(await detailed.locator('input[name="residential_complex_id"]').inputValue(),'all-newbuilds');
        assert.equal(await detailed.locator('select[name="interest"]').inputValue(),'2-комнатная квартира');
        assert.equal(await detailed.locator('input[name="budget"]').inputValue(),'До 5 млн');
        assert.equal(await detailed.getAttribute('data-placement'),'catalog_compare_request');
        const text = await comment.inputValue();
        assert(text.startsWith('Комментарий покупателя')&&text.includes('Теллерманов')&&text.includes('Уютный'));
        await page.locator('#buyer-comparison a[href="#lead"]').click();
        assert.equal(await comment.inputValue(),text,'Repeated transfer duplicated the request');
        await page.locator('#aerodromnaya-18b').locator('summary').click();
        await page.locator('[data-drawing-request]').click();
        const drawingText = await comment.inputValue();
        assert(drawingText.startsWith('Комментарий покупателя')&&drawingText.includes('Аэродромная 18Б')&&!drawingText.includes('Теллерманов'));
        assert.equal(await detailed.getAttribute('data-placement'),'catalog_18b_drawing');
        assert.equal(await page.locator('form[data-form-id="catalog_quick_selection"] select[name="residential_complex"]').inputValue(),'');
        await page.locator('#aerodromnaya-18b').locator('summary').click();
        await page.getByRole('button',{name:'Сбросить выбор',exact:true}).click();
        assert.equal(await page.locator('.buyer-compare__chip').count(),0);
        assert.equal(await page.locator('#buyer-comparison').isVisible(),false);
        // Do not leave any test input in the visual capture.
        await comment.fill('');await detailed.locator('select[name="interest"]').selectOption('');await detailed.locator('input[name="budget"]').fill('');
        await detailed.locator('select[name="residential_complex"]').selectOption('');
        await detailed.locator('[data-comparison-request-note]').evaluate(node=>node.remove());
        await page.evaluate(()=>scrollTo(0,0));
      }
      if (url.includes('/catalog/') && url !== '/catalog/') {
        await page.waitForSelector('[data-verification-summary-rendered="true"]');
        await page.waitForSelector('[data-passport-loaded="true"]');
        assert.equal(await page.locator('.buyer-section-nav').count(), 1);
        assert((await page.locator('.buyer-passport__facts > div').count()) >= 4);
      }
      if (url.includes('18g') || url.includes('sennaya')) await page.waitForSelector('[data-project-market-snapshot]');
      assert.deepEqual(errors, [], url);
      assert.equal(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth + 1), false, `Horizontal overflow: ${url}`);
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
