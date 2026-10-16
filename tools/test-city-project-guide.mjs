import fs from 'node:fs';
import vm from 'node:vm';
import assert from 'node:assert/strict';

// Execute the production fact selector. No browser, HTTP requests or lead writes.
const source = fs.readFileSync('assets/js/city-project-guide.js', 'utf8');
const marker = "  start().catch(() => { /* The existing factual page and source links remain available. */ });";
assert(source.includes(marker), 'Production guide entrypoint changed; update test harness');
const context = vm.createContext({
  URL, Map, Set,
  window: {fetch() { throw new Error('Network access is forbidden in this test'); }},
  document: {
    currentScript: {src:'https://example.test/assets/js/city-project-guide.js'},
    querySelector: selector => selector === '[data-city-guide]' ? {} : null
  }
});
vm.runInContext(source.replace(marker, '  globalThis.selectGuideProject = project;'), context);
const select = context.selectGuideProject;
let checks = 0;
for (const slug of ['prostornaya-4a','aerodromnaya-18g','sennaya-76']) {
  const profile = JSON.parse(fs.readFileSync(`data/verification/${slug}.json`, 'utf8'));
  const baseline = select(slug, profile);
  assert(baseline?.items.length >= 4, `${slug}: expected sourced passport`); checks++;
  for (const claim of profile.claims.filter(c => c.publication_allowed === true && typeof c.value === 'string' && c.field !== 'address')) {
    const edited = structuredClone(profile);
    edited.claims.find(c => c.field === claim.field).value = 'WITHHELD_FACT_SENTINEL';
    edited.claims.find(c => c.field === claim.field).publication_allowed = false;
    assert(!JSON.stringify(select(slug,edited)).includes('WITHHELD_FACT_SENTINEL'), `${slug}: withheld ${claim.field} leaked`); checks++;
  }
  const allWithdrawn = structuredClone(profile);
  allWithdrawn.claims.forEach(c => { c.publication_allowed = false; });
  assert.equal(select(slug,allWithdrawn), null, `${slug}: wholly withdrawn project still rendered`); checks++;
  const addressWithdrawn = structuredClone(profile);
  addressWithdrawn.claims.find(c => c.field === 'address').publication_allowed = false;
  assert.equal(select(slug,addressWithdrawn),null,`${slug}: identity-less project still rendered`); checks++;
}
const profile = JSON.parse(fs.readFileSync('data/verification/prostornaya-4a.json','utf8'));
profile.claims.find(c=>c.field==='ceiling_height').value = 3.1;
assert(select('prostornaya-4a',profile).items.some(i=>i.text==='3,1 м'),'Updated source value did not reach passport'); checks++;
profile.claims.find(c=>c.field==='ceiling_height').verification_status = 'requires_check';
assert(!select('prostornaya-4a',profile).items.some(i=>i.text==='3,1 м'),'Unconfirmed number leaked'); checks++;
console.log(`Buyer guide source-safety: ${checks} production-selector checks passed; no network or submissions.`);
