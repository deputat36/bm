import fs from 'node:fs';
import path from 'node:path';
import assert from 'node:assert/strict';

const root = process.cwd();
const out = path.join(root, '_site');
const files = [];
function walk(dir = '') {
  for (const entry of fs.readdirSync(path.join(out, dir), {withFileTypes: true})) {
    const file = path.posix.join(dir, entry.name);
    assert(!entry.isSymbolicLink(), `Symlink: ${file}`);
    if (entry.isDirectory()) walk(file); else files.push(file);
  }
}
walk();
const jsonPaths = ['data/verification/prostornaya-4a.json', 'data/verification/aerodromnaya-18g.json', 'data/verification/sennaya-76.json', 'data/market-snapshots/aerodromnaya-18g.json', 'data/market-snapshots/sennaya-76.json', 'data/research/reference-projects.json', 'data/media/prostornaya-4a.json'];
for (const file of files) {
  assert(!/^(?:docs|tools|evidence|supabase|scripts|links|design-system|qualification|menedzheram|web3forms-test|\.)\//.test(file), `Forbidden root: ${file}`);
  assert(!file.endsWith('.md') && !file.endsWith('.ts') && !/package.*\.json$/.test(file), `Internal file: ${file}`);
  assert(!file.includes('/gallery-b64/'), `Uncleared fallback media: ${file}`);
  if (file.includes('/data/')) assert(file.startsWith('data/'), `Nested raw registry: ${file}`);
  if (file.startsWith('data/')) assert(jsonPaths.includes(file), `Raw registry: ${file}`);
}
for (const file of ['index.html', 'catalog/index.html', 'contacts/index.html', 'ipoteka/index.html', 'sitemap.xml', 'assets/js/main.js', ...jsonPaths]) assert(files.includes(file), `Runtime dependency missing: ${file}`);
for (const file of jsonPaths) {
  const text = fs.readFileSync(path.join(out, file), 'utf8');
  assert(!/github\.com\/deputat36\/bm|"(?:notes|review_notes|source_ids|secure_reference|purpose)"/.test(text), `Internal provenance: ${file}`);
  const data = JSON.parse(text);
  if (file.startsWith('data/verification/')) {
    const raw = JSON.parse(fs.readFileSync(path.join(root, file), 'utf8'));
    const permitted = claims => claims.filter(c => c.publication_allowed === true && ['confirmed', 'verified'].includes(c.verification_status)).map(c => [c.field, c.value]);
    assert.deepEqual(permitted(data.claims), permitted(raw.claims), `Public claims changed: ${file}`);
    assert.equal(data.claims.length, raw.claims.length, `Status counts changed: ${file}`);
  }
  if (file.startsWith('data/verification/')) for (const claim of data.claims) {
    if (claim.publication_allowed !== true || !['confirmed', 'verified'].includes(claim.verification_status)) assert(!Object.hasOwn(claim, 'value'), `Withheld claim leaked: ${claim.field}`);
  }
}
const media = JSON.parse(fs.readFileSync(path.join(out, 'data/media/prostornaya-4a.json')));
const allowedMedia = media.assets.flatMap(item => {
  assert(item.is_public_ready === true && item.rights_status === 'cleared' && item.verification_status === 'confirmed');
  return [item.file, item.fallback_file].filter(Boolean);
});
for (const file of files.filter(file => file.startsWith('assets/img/gallery/'))) assert(allowedMedia.includes(file), `Uncleared media: ${file}`);
for (const file of files.filter(file => file.endsWith('.html'))) {
  const html = fs.readFileSync(path.join(out, file), 'utf8');
  for (const match of html.matchAll(/(?:src|href)=["']([^"']+)["']/g)) {
    const url = match[1].split(/[?#]/)[0];
    if (!url || /^(?:[a-z]+:|\/\/)/i.test(url)) continue;
    const target = path.resolve(url.startsWith('/') ? out : path.dirname(path.join(out, file)), '.' + (url.startsWith('/') ? url : '/' + url));
    assert(target.startsWith(out + '/') || target === out, `Escaped reference: ${file}`);
    assert(fs.existsSync(target), `Broken reference ${file}: ${url}`);
  }
}
assert(fs.readFileSync('.github/workflows/pages.yml', 'utf8').includes('path: _site'), 'Pages must upload staged site');
console.log(`Public artifact validated: ${files.length} files, ${jsonPaths.length} safe JSON views, ${allowedMedia.length} cleared media files.`);
