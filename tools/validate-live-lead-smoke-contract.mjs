import fs from "node:fs";

const SMOKE_PATH = "tools/smoke-live-lead-endpoint.mjs";
const REPORT_PATH = "tools/report-live-lead-smoke.mjs";
const REPORT_TEST_PATH = "tools/test-report-live-lead-smoke.mjs";
const WORKFLOW_PATH = ".github/workflows/live-lead-endpoint-smoke.yml";
const EDGE_PATH = "supabase/functions/newbuild-lead/index.ts";
const MAIN_PATH = "assets/js/main.js";
const ENDPOINT = "https://ofewxuqfjhamgerwzull.supabase.co/functions/v1/newbuild-lead";
const errors = [];

function read(path) {
  if (!fs.existsSync(path)) {
    errors.push(`${path}: file does not exist`);
    return "";
  }
  return fs.readFileSync(path, "utf8");
}

function requireFragment(source, fragment, label) {
  if (!source.includes(fragment)) errors.push(`${label}: missing ${fragment}`);
}

function forbidPattern(source, pattern, label) {
  if (pattern.test(source)) errors.push(`${label}: forbidden pattern ${pattern}`);
}

const smoke = read(SMOKE_PATH);
const report = read(REPORT_PATH);
const reportTest = read(REPORT_TEST_PATH);
const workflow = read(WORKFLOW_PATH);
const edge = read(EDGE_PATH);
const main = read(MAIN_PATH);

[
  `const ENDPOINT = process.env.LEAD_ENDPOINT || "${ENDPOINT}";`,
  'const ALLOWED_ORIGIN = process.env.TEST_ORIGIN || "https://novostroyki-borisoglebsk.ru";',
  'const SYNTHETIC_PHONE = "+70000000000";',
  '`${ENDPOINT}?health=1`',
  'method: "OPTIONS"',
  '"Access-Control-Request-Method": "POST"',
  'postCase("invalid-json", "{", 400, "invalid_json")',
  'postCase("missing-phone", "{}", 422, "phone_required")',
  'postCase("missing-consent", JSON.stringify({ phone: SYNTHETIC_PHONE }), 422, "personal_data_consent_required")',
  'payload.error === "origin_not_allowed"',
  'Safety mode: only health, preflight and requests rejected before persistence'
].forEach((fragment) => requireFragment(smoke, fragment, SMOKE_PATH));

[
  'const TITLE = "[Автомониторинг] Сбой обработчика заявок";',
  'const apiUrl = (process.env.GITHUB_API_URL || "https://api.github.com").replace(/\\/+$/, "");',
  'const status = process.env.MONITOR_STATUS || "failure";',
  'const apiBase = `${apiUrl}/repos/${repository}`;',
  '"/issues?state=all&per_page=100&sort=updated&direction=desc"',
  'issue.title === TITLE',
  'JSON.stringify({ title: TITLE, body })',
  'JSON.stringify({ state: "open", body })',
  'JSON.stringify({ state: "closed", state_reason: "completed" })',
  'Задача будет автоматически закрыта после успешного восстановления проверки',
  'Проверка использует только health, CORS и заведомо отклоняемые запросы'
].forEach((fragment) => requireFragment(report, fragment, REPORT_PATH));

[
  'http.createServer',
  'GITHUB_API_URL: apiUrl',
  'GITHUB_TOKEN: "test-token"',
  'MONITOR_STATUS: status',
  'await runReporter(apiUrl, "failure", 100)',
  'await runReporter(apiUrl, "failure", 101)',
  'assert.equal(state.createCount, 1, "Repeated failure must not create a duplicate issue")',
  'await runReporter(apiUrl, "success", 102)',
  'assert.equal(state.issue?.state, "closed")',
  'assert.equal(state.issue?.state_reason, "completed")',
  'Monitoring issue lifecycle passed: create, update without duplicate, close after recovery.'
].forEach((fragment) => requireFragment(reportTest, fragment, REPORT_TEST_PATH));

[
  "permissions:\n  contents: read\n  issues: write",
  "workflow_dispatch:",
  "schedule:",
  "pull_request:",
  "push:",
  "node tools/validate-live-lead-smoke-contract.mjs",
  "node tools/smoke-live-lead-endpoint.mjs",
  "node --check tools/report-live-lead-smoke.mjs",
  "node --check tools/test-report-live-lead-smoke.mjs",
  "node tools/test-report-live-lead-smoke.mjs",
  "if: ${{ always() && github.event_name != 'pull_request' }}",
  "needs: [contract, live-smoke]",
  "GITHUB_TOKEN: ${{ github.token }}",
  "MONITOR_STATUS: ${{ needs.contract.result == 'success' && needs.live-smoke.result == 'success' && 'success' || 'failure' }}",
  "run: node tools/report-live-lead-smoke.mjs"
].forEach((fragment) => requireFragment(workflow, fragment, WORKFLOW_PATH));

requireFragment(main, `LEAD_ENDPOINT: "${ENDPOINT}"`, MAIN_PATH);

forbidPattern(smoke, /personal_data_consent\s*:\s*(?:true|"yes"|'yes')/i, SMOKE_PATH);
forbidPattern(smoke, /marketing_consent\s*:\s*(?:true|"yes"|'yes')/i, SMOKE_PATH);
forbidPattern(smoke, /\bname\s*:\s*["'`]/, SMOKE_PATH);
forbidPattern(smoke, /\bemail\s*:\s*["'`]/, SMOKE_PATH);
forbidPattern(smoke, /newbuild_leads\?select|rest\/v1|service_role|apikey/i, SMOKE_PATH);
forbidPattern(report, /\b(phone|email|name|comment|question)\s*:/i, REPORT_PATH);
forbidPattern(report, /newbuild_leads|service_role|supabase/i, REPORT_PATH);
forbidPattern(reportTest, /https:\/\/api\.github\.com/, REPORT_TEST_PATH);
if ((reportTest.match(/GITHUB_TOKEN:/g) || []).length !== 1) {
  errors.push(`${REPORT_TEST_PATH}: test token must be declared exactly once`);
}
forbidPattern(workflow, /contents:\s*write/, WORKFLOW_PATH);
forbidPattern(workflow, /pull_request_target\s*:/, WORKFLOW_PATH);

const order = [
  'if (!isAllowedOrigin(origin))',
  'payload = await request.json();',
  'const phone = cleanPhone(payload.phone);',
  'const consentAccepted = payload.personal_data_consent === "yes" || payload.personal_data_consent === true;',
  'const leadType = cleanText(payload.lead_type, 80) || "general";',
  'const rateLimit = await checkRateLimit(request, phone.normalized);',
  'const row = buildLeadRow(payload, request, phone, rateLimit, leadType);',
  '"newbuild_leads?select=id,client_fixation_id,lead_type,lead_class,crm_status,qualification,operational_status,source_check_required,next_action,record_locator"'
];

let previous = -1;
for (const fragment of order) {
  const index = edge.indexOf(fragment);
  if (index < 0) {
    errors.push(`${EDGE_PATH}: missing ordered fragment ${fragment}`);
    continue;
  }
  if (index <= previous) errors.push(`${EDGE_PATH}: unsafe validation order at ${fragment}`);
  previous = index;
}

const consentIndex = edge.indexOf('const consentAccepted = payload.personal_data_consent === "yes" || payload.personal_data_consent === true;');
const rateLimitIndex = edge.indexOf("const rateLimit = await checkRateLimit(request, phone.normalized);");
const insertIndex = edge.indexOf('"newbuild_leads?select=id,client_fixation_id,lead_type,lead_class,crm_status,qualification,operational_status,source_check_required,next_action,record_locator"');
if (consentIndex < 0 || rateLimitIndex < 0 || insertIndex < 0 || !(consentIndex < rateLimitIndex && rateLimitIndex < insertIndex)) {
  errors.push(`${EDGE_PATH}: consent must be rejected before rate limit and persistence`);
}

console.log("Checked live smoke endpoint and production origin.");
console.log("Checked smoke payloads: none can pass consent validation.");
console.log("Checked Edge Function order: validation precedes rate limit and persistence.");
console.log("Checked monitoring issue lifecycle: open/update on failure, close on recovery, skipped for pull requests.");
console.log("Checked local lifecycle test: isolated fake GitHub API, no repository issue writes.");

if (errors.length) {
  console.error("\nLive lead smoke contract validation errors:");
  errors.forEach((error) => console.error(`- ${error}`));
  process.exit(1);
}

console.log("Live lead smoke contract validation passed.");
