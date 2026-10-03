import fs from 'node:fs';
import path from 'node:path';

const root = process.cwd();
const out = path.join(root, '_site');
const excluded = new Set(['.git', '.github', 'node_modules', 'build', 'dist', '_site', 'artifacts', 'docs', 'tools', 'evidence', 'supabase', 'scripts', 'links', 'design-system', 'qualification', 'menedzheram', 'web3forms-test', 'data']);
const read = file => JSON.parse(fs.readFileSync(path.join(root, file), 'utf8'));
const pick = (value, keys) => Object.fromEntries(keys.filter(key => value[key] !== undefined).map(key => [key, value[key]]));
const external = value => /^https:\/\//i.test(String(value || '')) && !/github\.com\/deputat36\/bm|\/docs\/|\/evidence\//i.test(value);
const put = (file, value) => {
  const target = path.join(out, file);
  fs.mkdirSync(path.dirname(target), {recursive: true});
  fs.writeFileSync(target, JSON.stringify(value, null, 2) + '\n');
};
fs.rmSync(out, {recursive: true, force: true});
fs.mkdirSync(out);

// Copy public HTML routes and shared presentation assets, never repository roots.
function copy(dir = '') {
  for (const entry of fs.readdirSync(path.join(root, dir), {withFileTypes: true})) {
    const file = path.posix.join(dir, entry.name);
    if ((!dir && excluded.has(entry.name)) || entry.name === 'data') continue;
    if (entry.isSymbolicLink()) throw new Error(`Symlink cannot be published: ${file}`);
    if (entry.isDirectory()) {
      if (entry.name === 'data' || (!dir && excluded.has(entry.name)) || ['assets/img/gallery', 'assets/img/gallery-b64'].includes(file)) continue;
      copy(file);
    } else if (file.endsWith('.html') || ['CNAME', '.nojekyll', 'robots.txt', 'sitemap.xml'].includes(file) || ((file.startsWith('assets/') || file.includes('/assets/')) && /\.(?:css|js|svg|png|jpg|jpeg|webp|ico|woff2?)$/.test(file) && file !== 'assets/js/form-qa-runner.js')) {
      fs.mkdirSync(path.dirname(path.join(out, file)), {recursive: true});
      fs.copyFileSync(path.join(root, file), path.join(out, file));
    }
  }
}
copy();

for (const id of ['prostornaya-4a', 'aerodromnaya-18g', 'sennaya-76']) {
  const file = `data/verification/${id}.json`;
  const profile = read(file);
  put(file, {
    ...pick(profile, ['project_id', 'updated_at', 'overall_status']),
    // Only status metadata is needed for counts; internal notes/identifiers stay in GitHub.
    sources: profile.sources.map(source => ({status: source.status, ...(external(source.reference) ? {reference: source.reference} : {})})),
    claims: profile.claims.map(claim => ({
      ...pick(claim, ['field', 'importance', 'verification_status', 'publication_allowed']),
      ...(claim.publication_allowed === true && ['confirmed', 'verified'].includes(claim.verification_status) ? {value: claim.value} : {})
    }))
  });
}
for (const id of ['aerodromnaya-18g', 'sennaya-76']) {
  const file = `data/market-snapshots/${id}.json`;
  const data = read(file);
  put(file, {...pick(data, ['project_id', 'checked_at', 'title', 'intro', 'location_note', 'source_note', 'cta_label']), cards: data.cards.map(card => pick(card, ['title', 'text', 'source_label'])), sources: data.sources.filter(source => external(source.url)).map(source => pick(source, ['url', 'label']))});
}
const references = read('data/research/reference-projects.json');
put('data/research/reference-projects.json', {
  projects: references.projects.filter(project => project.commercial_role === 'reference_catalog' && project.verification_status === 'confirmed' && project.is_public_ready === true && project.sources.some(source => external(source.url))).map(project => ({
    ...pick(project, ['id', 'display_name', 'address', 'commercial_role', 'verification_status', 'is_public_ready', 'last_checked_at', 'public_status_label', 'building_status', 'builder_name', 'commissioned_year', 'handover', 'floors', 'wall_material']),
    sources: project.sources.filter(source => external(source.url)).map(source => pick(source, ['url', 'title']))
  }))
});
const media = read('data/media/prostornaya-4a.json');
const assets = media.assets.filter(item => item.is_public_ready === true && item.verification_status === 'confirmed' && item.rights_status === 'cleared' && external(item.source_reference) && item.allowed_usage?.length);
put('data/media/prostornaya-4a.json', {assets: assets.map(item => pick(item, ['id', 'file', 'fallback_file', 'title', 'alt', 'is_public_ready', 'verification_status', 'rights_status', 'source_reference', 'allowed_usage']))});
for (const item of assets) for (const file of [item.file, item.fallback_file].filter(Boolean)) {
  if (!file.startsWith('assets/img/gallery/') || file.includes('..')) throw new Error(`Unexpected media path: ${file}`);
  fs.mkdirSync(path.dirname(path.join(out, file)), {recursive: true});
  fs.copyFileSync(path.join(root, file), path.join(out, file));
}
console.log('Built public site in _site; raw registries and uncleared gallery excluded.');
