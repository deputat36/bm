import fs from 'node:fs';
import path from 'node:path';
import {pathToFileURL} from 'node:url';

const ORIGIN = 'https://novostroyki-borisoglebsk.ru';
export const FORBIDDEN_PATHS = [
  '/docs/portal/STATUS.md', '/tools/form-qa-runner.html',
  '/supabase/functions/newbuild-lead/index.ts', '/package.json',
  '/data/operations/lead-operations-approval.json', '/data/qa/form-results.json',
  '/assets/img/gallery/Borisoglebsk_001.jpg',
  '/assets/img/gallery-b64/zhk-prostornaya-4a-dvor.b64'
];
const PROFILE_IDS = ['prostornaya-4a', 'aerodromnaya-18g', 'sennaya-76'];

// Read-only public requests. Never request a lead endpoint or retain response bodies.
export async function auditPublicationBoundary(request = fetch) {
  const findings = [];
  const checks = [];
  async function read(urlPath, kind) {
    try {
      const response = await request(`${ORIGIN}${urlPath}?publication_boundary=${Date.now()}`, {
        method: 'GET', redirect: 'error', cache: 'no-store', signal: AbortSignal.timeout(15000)
      });
      checks.push({path: urlPath, kind, status: response.status});
      return response;
    } catch {
      findings.push({path: urlPath, code: 'request_failed'});
      return null;
    }
  }
  await Promise.all(FORBIDDEN_PATHS.map(async urlPath => {
    const response = await read(urlPath, 'forbidden');
    // A 403, redirect or outage does not prove the deployed artifact excludes the file.
    if (response && response.status !== 404) findings.push({path: urlPath, code: 'forbidden_path_not_404'});
    await response?.body?.cancel();
  }));
  await Promise.all(PROFILE_IDS.map(async id => {
    const urlPath = `/data/verification/${id}.json`;
    const response = await read(urlPath, 'safe_profile');
    if (!response) return;
    if (response.status !== 200) {
      findings.push({path: urlPath, code: 'runtime_profile_unavailable'});
      await response.body?.cancel();
      return;
    }
    try {
      const text = await response.text();
      const data = JSON.parse(text);
      if (!Array.isArray(data.claims) || !Array.isArray(data.sources)) throw new Error('Invalid shape');
      const withheld = data.claims.filter(claim =>
        Object.hasOwn(claim, 'value') && (claim.publication_allowed !== true || !['confirmed', 'verified'].includes(claim.verification_status))
      ).length;
      if (withheld) findings.push({path: urlPath, code: 'withheld_values_exposed', count: withheld});
      if (/github\.com\/deputat36\/bm|"(?:notes|review_notes|source_ids|secure_reference|purpose)"/.test(text)) {
        findings.push({path: urlPath, code: 'internal_provenance_exposed'});
      }
    } catch {
      findings.push({path: urlPath, code: 'invalid_runtime_profile'});
    }
  }));
  for (const urlPath of ['/', '/catalog/', '/contacts/']) {
    const response = await read(urlPath, 'public_page');
    if (response && response.status !== 200) findings.push({path: urlPath, code: 'public_page_unavailable'});
    await response?.body?.cancel();
  }
  return {checked_at: new Date().toISOString(), origin: ORIGIN, status: findings.length ? 'failed' : 'passed',
    read_only: true, real_lead_submissions: 0, checks, findings};
}

if (process.argv[1] && import.meta.url === pathToFileURL(path.resolve(process.argv[1])).href) {
  const report = await auditPublicationBoundary();
  const output = 'artifacts/live-publication-boundary/report.json';
  fs.mkdirSync(path.dirname(output), {recursive: true});
  fs.writeFileSync(output, JSON.stringify(report, null, 2) + '\n');
  console.log(JSON.stringify(report, null, 2));
  process.exitCode = report.status === 'passed' ? 0 : 1;
}
