import assert from 'node:assert/strict';
import {auditPublicationBoundary, FORBIDDEN_PATHS} from './check-live-publication-boundary.mjs';

const profile = {sources: [], claims: [{field:'address', publication_allowed:true, verification_status:'confirmed', value:'Public address'}]};
function mock(overrides = {}) {
  return async (url, options) => {
    assert.equal(options.method, 'GET');
    assert.equal(options.redirect, 'error');
    assert(!url.includes('/functions/') || url.includes('/supabase/functions/'), 'Must not call lead endpoint');
    const pathname = new URL(url).pathname;
    if (overrides[pathname] === 'offline') throw new Error('Offline');
    if (overrides[pathname]) return overrides[pathname]();
    if (FORBIDDEN_PATHS.includes(pathname)) return new Response('', {status:404});
    return pathname.endsWith('.json') ? Response.json(profile) : new Response('<html></html>');
  };
}
assert.equal((await auditPublicationBoundary(mock())).status, 'passed');
const exposed = await auditPublicationBoundary(mock({
  '/package.json': () => Response.json({name:'internal'}),
  '/data/verification/aerodromnaya-18g.json': () => Response.json({sources:[], claims:[{field:'price', value:123, publication_allowed:false}]})
}));
assert(exposed.findings.some(f => f.code === 'forbidden_path_not_404'));
assert(exposed.findings.some(f => f.code === 'withheld_values_exposed' && f.count === 1));
assert(!JSON.stringify(exposed).includes('123'), 'Do not retain withheld value');
const offline = await auditPublicationBoundary(mock({'/catalog/':'offline'}));
assert.equal(offline.status, 'failed');
assert(offline.findings.some(f => f.code === 'request_failed'));
const invalid = await auditPublicationBoundary(mock({'/data/verification/sennaya-76.json':()=>new Response('<html>404 shell</html>')}));
assert(invalid.findings.some(f => f.code === 'invalid_runtime_profile'));
console.log('Live boundary tests passed: safe artifact, exposed files/values, outages and invalid profiles.');
