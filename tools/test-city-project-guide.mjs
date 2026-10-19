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
vm.runInContext(source.replace(marker, '  globalThis.selectGuideProject = project; globalThis.guideTest = {comparisonRecord, referenceComparison, mergeSelectionComment};'), context);
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
const {comparisonRecord, referenceComparison, mergeSelectionComment} = context.guideTest;
const withdrawnFinish = JSON.parse(fs.readFileSync('data/verification/prostornaya-4a.json','utf8'));
withdrawnFinish.claims.find(c=>c.field==='finish_type').publication_allowed = false;
const comparison = comparisonRecord(select('prostornaya-4a',withdrawnFinish));
assert(!JSON.stringify(comparison.values).includes('предчистовая'), 'Comparison retained a withdrawn finish'); checks++;
assert.equal(comparison.values[4],'Уточняется'); checks++;
const refs = JSON.parse(fs.readFileSync('data/research/reference-projects.json','utf8')).projects;
for(const reference of refs) {
  assert(referenceComparison(reference)?.values[0]===reference.address,'Reference address mismatch'); checks++;
  for(const change of [{is_public_ready:false},{verification_status:'requires_check'},{commercial_role:'candidate'},{sources:[]}]) {
    assert.equal(referenceComparison({...reference,...change}),null,'Unaccepted reference entered comparison'); checks++;
  }
}
const oldBlock = 'Прошу сравнить:\n• Дом 1\n• Дом 2';
const newBlock = 'Прошу сравнить:\n• Дом 2\n• Дом 3';
assert.equal(mergeSelectionComment('Мой комментарий','',oldBlock),'Мой комментарий\n\n'+oldBlock); checks++;
assert.equal(mergeSelectionComment('Мой комментарий\n\n'+oldBlock,oldBlock,newBlock),'Мой комментарий\n\n'+newBlock); checks++;
assert.equal(mergeSelectionComment(newBlock,newBlock,newBlock),newBlock); checks++;
assert(mergeSelectionComment('Мой изменённый список',oldBlock,newBlock).startsWith('Мой изменённый список'),'Manual edits were removed'); checks++;
console.log(`Buyer guide source-safety: ${checks} production-selector checks passed; no network or submissions.`);
