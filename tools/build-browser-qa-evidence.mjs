import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import process from "node:process";

const ROOT = process.cwd();
const artifactDir = path.resolve(process.argv[2] || "/tmp/browser-qa");
const outputDir = path.resolve(process.argv[3] || "evidence/qa/2026-08-06-browser");
const summaryPath = path.join(artifactDir, "summary.json");
const eventsDir = path.join(artifactDir, "events");
const screenshotsDir = path.join(artifactDir, "screenshots");
const errors = [];
const EXPECTED_HEAD = "d839d7e49df5fe8e04b0b4ac4f524df06244f816";
const MERGE_COMMIT = "bf8f405e386aecba4a964d3a8d6dbad656702436";
const WORKFLOW_RUN_ID = 31085851541;
const ARTIFACT_ID = 8961381674;
const ARTIFACT_DIGEST = "sha256:6d0831a326789aa6938af84745434bb6ec8cfc76f9d9054caeb895c1a466a7c9";
const ARTIFACT_EXPIRES_AT = "2026-08-20T08:41:39Z";
const REQUIRED_EVENTS = [
  "lead_form_view",
  "lead_form_start",
  "lead_submit",
  "lead_submit_classified",
  "lead_thankyou_view"
];
const STORAGE_EVENTS = [
  "lead_form_view",
  "lead_form_start",
  "lead_submit",
  "lead_submit_classified"
];
const PROHIBITED_KEYS = new Set([
  "name",
  "phone",
  "phone_normalized",
  "email",
  "budget",
  "comment",
  "question",
  "consent_text",
  "user_agent",
  "client_fixation_id",
  "fields_json",
  "message"
]);
const ISO_TIMESTAMP = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d{1,3})?Z$/;
const COMMIT_HASH = /^[a-f0-9]{40,64}$/i;
const PHONE_LIKE = /(?:^|\D)\+?\d[\d\s().-]{8,}\d(?:\D|$)/;
const EMAIL_LIKE = /[^\s@]+@[^\s@]+\.[^\s@]+/i;
const NORMALIZED_PLACEMENT = /^[a-zа-яё0-9_-]{1,120}$/i;

function fail(message) {
  errors.push(message);
}

function readJson(file) {
  try {
    return JSON.parse(fs.readFileSync(file, "utf8"));
  } catch (error) {
    fail(`${path.relative(ROOT, file)}: invalid JSON: ${error.message}`);
    return null;
  }
}

function sha256(file) {
  return crypto.createHash("sha256").update(fs.readFileSync(file)).digest("hex");
}

function listFilesRecursive(dir) {
  const files = [];
  function visit(current) {
    for (const entry of fs.readdirSync(current, { withFileTypes: true })) {
      const fullPath = path.join(current, entry.name);
      if (entry.isDirectory()) visit(fullPath);
      else files.push(fullPath);
    }
  }
  if (fs.existsSync(dir)) visit(dir);
  return files.sort();
}

function scanPrivacy(value, source, currentPath = "") {
  if (Array.isArray(value)) {
    value.forEach((item, index) => scanPrivacy(item, source, `${currentPath}[${index}]`));
    return;
  }
  if (value && typeof value === "object") {
    for (const [key, nested] of Object.entries(value)) {
      const nextPath = currentPath ? `${currentPath}.${key}` : key;
      if (PROHIBITED_KEYS.has(key)) fail(`${source}: prohibited key ${nextPath}`);
      scanPrivacy(nested, source, nextPath);
    }
    return;
  }
  if (typeof value !== "string" || ISO_TIMESTAMP.test(value) || COMMIT_HASH.test(value)) return;
  if (PHONE_LIKE.test(value)) fail(`${source}: phone-like value at ${currentPath}`);
  if (EMAIL_LIKE.test(value)) fail(`${source}: email-like value at ${currentPath}`);
}

function assertEqual(actual, expected, label) {
  if (actual !== expected) fail(`${label}: expected ${JSON.stringify(expected)}, got ${JSON.stringify(actual)}`);
}

function assertTrue(value, label) {
  if (!value) fail(label);
}

if (!fs.existsSync(summaryPath)) fail("summary.json missing");
if (!fs.existsSync(eventsDir)) fail("events directory missing");
if (!fs.existsSync(screenshotsDir)) fail("screenshots directory missing");
if (errors.length) {
  errors.forEach((error) => console.error(`- ${error}`));
  process.exit(1);
}

const summary = readJson(summaryPath);
if (!summary) process.exit(1);
scanPrivacy(summary, "summary.json");

assertEqual(summary.source_commit, EXPECTED_HEAD, "source_commit");
assertEqual(summary.target?.mode, "local_static", "target.mode");
assertEqual(summary.target?.device_profile, "desktop_chromium_emulation", "target.device_profile");
assertEqual(summary.target?.physical_device, false, "target.physical_device");
assertEqual(summary.safety?.dry_run_only, true, "safety.dry_run_only");
assertEqual(summary.safety?.analytics_debug_only, true, "safety.analytics_debug_only");
assertEqual(summary.safety?.real_submission_forbidden, true, "safety.real_submission_forbidden");
assertEqual(summary.safety?.repository_results_modified, false, "safety.repository_results_modified");
assertEqual(summary.summary?.unique_scenarios, 14, "unique_scenarios");
assertEqual(summary.summary?.scenario_runs, 15, "scenario_runs");
assertEqual(summary.summary?.scenario_passed, 15, "scenario_passed");
assertEqual(summary.summary?.scenario_failed, 0, "scenario_failed");
assertEqual(summary.summary?.aerodromnaya_detailed_runs, 2, "aerodromnaya_detailed_runs");
assertEqual(summary.summary?.storage_checks, 2, "storage_checks");
assertEqual(summary.summary?.storage_passed, 2, "storage_passed");
assertEqual(summary.summary?.storage_failed, 0, "storage_failed");

for (const result of summary.scenario_results || []) {
  const label = `${result.scenario_id}:${result.iteration}`;
  assertEqual(result.status, "passed", `${label}.status`);
  assertEqual(result.network?.lead_endpoint_requests, 0, `${label}.lead_endpoint_requests`);
  assertEqual(result.network?.external_data_requests, 0, `${label}.external_data_requests`);
  assertEqual((result.runtime_errors?.console || []).length, 0, `${label}.console_errors`);
  assertEqual((result.runtime_errors?.page || []).length, 0, `${label}.page_errors`);
  assertTrue(result.checks && Object.values(result.checks).every(Boolean), `${label}: checks incomplete`);
}
for (const result of summary.storage_results || []) {
  assertEqual(result.status, "passed", `storage.${result.mode}.status`);
  assertTrue(result.checks && Object.values(result.checks).every(Boolean), `storage.${result.mode}: checks incomplete`);
}

const eventFiles = fs.readdirSync(eventsDir).filter((file) => file.endsWith(".json")).sort();
const screenshotFiles = fs.readdirSync(screenshotsDir).filter((file) => file.endsWith(".png")).sort();
assertEqual(eventFiles.length, 17, "event file count");
assertEqual(screenshotFiles.length, 17, "screenshot file count");
assertTrue(!eventFiles.some((file) => file.includes("failed")), "failed event file present");
assertTrue(!screenshotFiles.some((file) => file.includes("failed")), "failed screenshot present");

const eventContexts = {};
for (const file of eventFiles) {
  const fullPath = path.join(eventsDir, file);
  const events = readJson(fullPath);
  if (!events) continue;
  scanPrivacy(events, `events/${file}`);
  assertTrue(Array.isArray(events), `events/${file}: expected array`);
  if (!Array.isArray(events)) continue;

  const storageFile = file.startsWith("storage-");
  const required = storageFile ? STORAGE_EVENTS : REQUIRED_EVENTS;
  for (const eventName of required) {
    assertEqual(events.filter((event) => event?.event === eventName).length, 1, `events/${file}:${eventName}`);
  }
  if (storageFile) {
    assertEqual(events.filter((event) => event?.event === "lead_thankyou_view").length, 0, `events/${file}:lead_thankyou_view`);
  }

  eventContexts[file] = events.map((event) => ({
    event: event.event || "",
    form_id: event.form_id || "",
    form_role: event.form_role || "",
    lead_type: event.lead_type || "",
    object_id: event.object_id || "",
    placement: event.placement || "",
    simulated: event.simulated === true,
    blocked: event.blocked === true,
    offline: event.offline === true
  }));

  for (const event of eventContexts[file].filter((item) => required.includes(item.event))) {
    assertTrue(Boolean(event.form_id), `events/${file}:${event.event}: form_id missing`);
    assertTrue(["primary", "detailed"].includes(event.form_role), `events/${file}:${event.event}: form_role invalid`);
    assertTrue(Boolean(event.lead_type), `events/${file}:${event.event}: lead_type missing`);
    assertTrue(Boolean(event.object_id), `events/${file}:${event.event}: object_id missing`);
    assertTrue(NORMALIZED_PLACEMENT.test(event.placement), `events/${file}:${event.event}: placement invalid`);
  }
}

const artifactFiles = listFilesRecursive(artifactDir);
assertEqual(artifactFiles.length, 35, "artifact file count");

if (errors.length) {
  console.error("Browser evidence generation validation errors:");
  errors.forEach((error) => console.error(`- ${error}`));
  process.exit(1);
}

fs.rmSync(outputDir, { recursive: true, force: true });
fs.mkdirSync(path.join(outputDir, "events"), { recursive: true });
fs.copyFileSync(summaryPath, path.join(outputDir, "summary.json"));
for (const file of eventFiles) {
  fs.copyFileSync(path.join(eventsDir, file), path.join(outputDir, "events", file));
}
fs.writeFileSync(path.join(outputDir, "event-contexts.json"), `${JSON.stringify(eventContexts, null, 2)}\n`, "utf8");

const manifest = {
  schema_version: "1.0",
  portal_id: "newbuilds-borisoglebsk",
  evidence_date: "2026-08-06",
  purpose: "Автоматизированная повторная desktop Chromium-приёмка форм после PR #153.",
  source: {
    repository: "deputat36/bm",
    pr: 154,
    source_head: EXPECTED_HEAD,
    merge_commit: MERGE_COMMIT,
    workflow_run_id: WORKFLOW_RUN_ID,
    artifact_id: ARTIFACT_ID,
    artifact_name: `desktop-form-browser-qa-${WORKFLOW_RUN_ID}`,
    artifact_digest: ARTIFACT_DIGEST,
    artifact_expires_at: ARTIFACT_EXPIRES_AT
  },
  classification: {
    environment: "local_static_checkout",
    device_profile: "desktop_chromium_emulation",
    physical_device: false,
    production_domain_run: false,
    real_submission: false
  },
  verified_results: {
    unique_scenarios: 14,
    scenario_runs: 15,
    scenario_passed: 15,
    scenario_failed: 0,
    aerodromnaya_detailed_runs: 2,
    storage_checks: 2,
    storage_passed: 2,
    storage_failed: 0,
    lead_endpoint_requests: 0,
    external_data_requests: 0,
    console_errors: 0,
    page_errors: 0,
    privacy_violations: 0,
    json_files: 18,
    artifact_files: 35
  },
  verification: {
    github_actions_total: 7,
    github_actions_passed: 7,
    artifact_validator_passed: true,
    downloaded_digest_reverified: true,
    all_json_parsed: true,
    prohibited_keys_found: 0,
    prohibited_values_found: 0
  },
  limitations: [
    "Результат не является физическим устройством.",
    "Production-domain browser-run не выполнялся.",
    "Android и iPhone не проверены.",
    "Реальная заявка не отправлялась.",
    "Рабочий внешний аналитический счётчик не проверялся.",
    "Manual legal, operations и launch gates не повышались."
  ],
  artifact_files: artifactFiles.map((file) => ({
    path: path.relative(artifactDir, file).split(path.sep).join("/"),
    size_bytes: fs.statSync(file).size,
    sha256: sha256(file)
  }))
};
fs.writeFileSync(path.join(outputDir, "manifest.json"), `${JSON.stringify(manifest, null, 2)}\n`, "utf8");

const report = `# Повторная desktop browser-приёмка — 6 августа 2026 года

## Результат

Автоматизированная приёмка выполнена на head \`${EXPECTED_HEAD}\`, вошедшем в \`main\` через PR #154 и squash-коммит \`${MERGE_COMMIT}\`.

Подтверждено:

- 14 уникальных сценариев;
- 15/15 browser-прогонов passed;
- подробная форма Аэродромной 18Г выполнена дважды — 2/2;
- \`storage_fail=local\` и \`storage_fail=session\` — 2/2;
- endpoint requests — 0;
- external data requests — 0;
- console errors — 0;
- page errors — 0;
- PII/privacy violations — 0;
- 18 JSON-файлов валидны;
- 35 файлов artifact зафиксированы в manifest.

## Среда

- локальная статическая версия checkout;
- Playwright 1.62.0;
- Chromium 151;
- профиль \`desktop_chromium_emulation\`;
- физическое устройство: нет;
- dry-run и analytics debug: да;
- реальная серверная отправка: нет.

## Artifact

- workflow run: \`${WORKFLOW_RUN_ID}\`;
- artifact ID: \`${ARTIFACT_ID}\`;
- artifact digest: \`${ARTIFACT_DIGEST}\`;
- срок хранения artifact в GitHub: до 20 августа 2026 года;
- digest повторно подтверждён после скачивания.

\`manifest.json\` содержит SHA-256 и размер каждого из 35 файлов, включая 17 скриншотов. В репозитории сохраняются summary, 17 обезличенных event logs и сокращённый event context. Бинарные скриншоты остаются в GitHub artifact.

## Дополнительный дефект и исправление

Первый строгий artifact-review выявил несовместимый с HTML pattern \`v\`-флагом класс символов телефона. В \`assets/js/form-accessibility.js\` экранированы \`.\`, \`(\`, \`)\` и \`-\`. После исправления Chromium-run и строгий artifact-validator прошли без runtime errors.

## Ограничения

Этот evidence не подтверждает production-domain browser-run, физические Android/iPhone устройства, реальную доставку в Supabase, рабочую внешнюю аналитику, legal, operations или campaign launch gates.

Исторические материалы \`evidence/qa/2026-08-03/\` не изменялись.
`;
fs.writeFileSync(path.join(outputDir, "README.md"), report, "utf8");

console.log(`Evidence written to ${path.relative(ROOT, outputDir)}`);
console.log(`Copied event logs: ${eventFiles.length}; manifest artifact files: ${artifactFiles.length}`);
