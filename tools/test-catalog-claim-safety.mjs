import fs from 'node:fs';
import vm from 'node:vm';
import assert from 'node:assert/strict';

const runtime = fs.readFileSync('assets/js/catalog-verification-comparison.js', 'utf8');
async function render(profile, ok = true) {
  const nodes = new Map();
  const card = {
    dataset: {verificationProfile: '/profile.json'},
    querySelector(selector) {
      if (!nodes.has(selector)) nodes.set(selector, {textContent: ''});
      return nodes.get(selector);
    }
  };
  const fetch = async () => ({ok, json: async () => profile});
  vm.runInNewContext(runtime, {document: {querySelectorAll: () => [card]}, window: {fetch}, fetch, Intl});
  await new Promise(resolve => setImmediate(resolve));
  return {text: [...nodes.values()].map(node => node.textContent).join('\n'), card};
}

for (const id of ['prostornaya-4a', 'aerodromnaya-18g', 'sennaya-76']) {
  const profile = JSON.parse(fs.readFileSync(`data/verification/${id}.json`, 'utf8'));
  const revoked = structuredClone(profile);
  revoked.claims.forEach(claim => { claim.publication_allowed = false; claim.value = 'WITHHELD_SENTINEL'; });
  const empty = await render(revoked);
  assert(!empty.text.includes('WITHHELD_SENTINEL'), id);
  assert(!/194|2,7|25 м²|92 м²|Закрытый двор|Черновая отделка|Керамическая/.test(empty.text), id);
  const loaded = await render(profile);
  assert.equal(loaded.card.dataset.verificationLoaded, 'true');
  const failed = await render(profile, false);
  assert.equal(failed.card.dataset.verificationLoaded, 'error');
  assert(!failed.text.includes('194'));
}

const profile = JSON.parse(fs.readFileSync('data/verification/aerodromnaya-18g.json', 'utf8'));
profile.claims.find(claim => claim.field === 'ceiling_height_statement').publication_allowed = false;
const partial = await render(profile);
assert(partial.text.includes('кирпичный'));
assert(!partial.text.includes('2,7'));

const tellermanov = JSON.parse(fs.readFileSync('data/verification/prostornaya-4a.json', 'utf8'));
tellermanov.claims.find(claim => claim.field === 'complex_apartments_total').value = 123;
assert((await render(tellermanov)).text.includes('123 квартиры'));
const html = fs.readFileSync('catalog/index.html', 'utf8');
assert(html.indexOf('id="priority"') < html.indexOf('id="questions"'));
assert(html.indexOf('id="reference"') < html.indexOf('id="quiz"'));
console.log('Catalog claim safety passed: revoked, partial, changed and failed profiles; catalog order.');
