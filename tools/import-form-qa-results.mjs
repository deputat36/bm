import fs from "node:fs";
import os from "node:os";
import path from "node:path";

const ROOT = process.cwd();
const MATRIX_PATH = "data/qa/form-scenarios.json";
const CONTRACT_PATH = "data/qa/form-execution-contract.json";
const DEFAULT_REGISTRY_PATH = "data/qa/form-results.json";
const PORTAL_ID = "newbuilds-borisoglebsk";
const ALLOWED_STATUSES = new Set(["passed", "failed", "blocked"]);
const RESULT_FIELDS = new Set([
  "scenario_id",
  "device",
  "status",
  "tested_at",
  "browser",
  "os",
  "evidence_reference",
  "event_log_attached",
  "notes"
]);
const EVIDENCE_FIELDS = new Set([
  "scenario_id",
  "label",
  "device",
  "form_id",
  "form_role",
  "status",
  "tested_at",
  "browser",
  "os",
  "evidence_reference",
  "event_log_attached",
  "notes",
  "checks"
]);
const FORBIDDEN_KEYS = new Set([
  "name",
  "phone",
  "phone_normalized",
  "email",
  "test_name",
  "test_phone",
  "client_fixation_id",
  "fields_json",
  "message",
  "user_agent",
  "page_url",
  "referrer",
  "tracking",
  "utm_source",
  "utm_medium",
  "utm_campaign",
  "gclid",
  "yclid",
  "vkclid"
]);

function fail(message) {
  throw new Error(message);
}

function readJson(filePath) {
  try {
    return JSON.parse(fs.readFileSync(filePath, "utf8"));
  } catch (error) {
    fail(`${filePath}: не удалось прочитать JSON: ${error.message}`);
  }
}

function getArg(name, fallback = "") {
  const prefix = `--${name}=`;
  const raw = process.argv.find((item) => item.startsWith(prefix));
  return raw ? raw.slice(prefix.length).trim() : fallback;
}

function hasFlag(name) {
  return process.argv.includes(`--${name}`);
}

function resolvePath(value, fallback = "") {
  const selected = value || fallback;
  if (!selected) return "";
  return path.isAbsolute(selected) ? selected : path.join(ROOT, selected);
}

function exactIsoDate(value) {
  const text = String(value || "").trim();
  if (!text) return false;
  const timestamp = Date.parse(text);
  return Number.isFinite(timestamp) && new Date(timestamp).toISOString() === text;
}

function scanForbiddenKeys(value, label, trail = []) {
  if (!value || typeof value !== "object") return;
  for (const [key, child] of Object.entries(value)) {
    const nextTrail = [...trail, key];
    if (FORBIDDEN_KEYS.has(key)) {
      fail(`${label}: запрещённое поле ${nextTrail.join(".")}`);
    }
    scanForbiddenKeys(child, label, nextTrail);
  }
}

function requireKnownFields(value, allowedFields, label) {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    fail(`${label}: ожидается объект`);
  }
  Object.keys(value).forEach((key) => {
    if (!allowedFields.has(key)) fail(`${label}: неизвестное поле ${key}`);
  });
}

function requiredText(value, field, label, maxLength) {
  const text = String(value?.[field] || "").trim();
  if (!text) fail(`${label}: отсутствует ${field}`);
  if (text.length > maxLength) fail(`${label}: ${field} длиннее ${maxLength} символов`);
  return text;
}

function optionalText(value, field, label, maxLength) {
  const text = String(value?.[field] || "").trim();
  if (text.length > maxLength) fail(`${label}: ${field} длиннее ${maxLength} символов`);
  return text;
}

function normalizeResult(raw, index, context) {
  const label = `${context}#${index + 1}`;
  scanForbiddenKeys(raw, label);
  requireKnownFields(raw, RESULT_FIELDS, label);

  const scenarioId = requiredText(raw, "scenario_id", label, 100);
  const device = requiredText(raw, "device", label, 30);
  const status = requiredText(raw, "status", label, 20);
  const testedAt = requiredText(raw, "tested_at", label, 40);
  const browser = requiredText(raw, "browser", label, 80);
  const operatingSystem = requiredText(raw, "os", label, 80);
  const evidenceReference = optionalText(raw, "evidence_reference", label, 300);
  const notes = optionalText(raw, "notes", label, 1000);
  const eventLogAttached = raw.event_log_attached === true;

  if (!context.scenarioIds.has(scenarioId)) fail(`${label}: неизвестный scenario_id=${scenarioId}`);
  if (!context.deviceIds.has(device)) fail(`${label}: неподдерживаемое устройство ${device}`);
  if (!ALLOWED_STATUSES.has(status)) fail(`${label}: неподдерживаемый статус ${status}`);
  if (!exactIsoDate(testedAt)) fail(`${label}: tested_at должен быть точным ISO datetime`);
  if (status === "passed" && !evidenceReference) fail(`${label}: passed требует evidence_reference`);
  if (status === "passed" && !eventLogAttached) fail(`${label}: passed требует event_log_attached=true`);
  if ((status === "failed" || status === "blocked") && !notes) {
    fail(`${label}: ${status} требует notes`);
  }

  return {
    scenario_id: scenarioId,
    device,
    status,
    tested_at: testedAt,
    browser,
    os: operatingSystem,
    evidence_reference: evidenceReference,
    event_log_attached: eventLogAttached,
    notes
  };
}

function normalizeResultList(source, context, label) {
  if (!source || typeof source !== "object" || Array.isArray(source)) fail(`${label}: ожидается объект реестра`);
  scanForbiddenKeys(source, label);
  if (source.portal_id !== PORTAL_ID) fail(`${label}: неверный portal_id`);
  if (!Array.isArray(source.results)) fail(`${label}: results должен быть массивом`);

  const seen = new Set();
  return source.results.map((item, index) => {
    const normalized = normalizeResult(item, index, { ...context, label });
    const key = resultKey(normalized);
    if (seen.has(key)) fail(`${label}: повторяется слот ${key}`);
    seen.add(key);
    return normalized;
  });
}

function normalizeEvidence(source, context, label) {
  if (!source) return new Map();
  if (typeof source !== "object" || Array.isArray(source)) fail(`${label}: ожидается объект evidence-пакета`);
  scanForbiddenKeys(source, label);
  if (source.portal_id !== PORTAL_ID) fail(`${label}: неверный portal_id`);
  if (source.personal_data_forbidden !== true) fail(`${label}: personal_data_forbidden должен быть true`);
  if (!Array.isArray(source.slot_evidence)) fail(`${label}: slot_evidence должен быть массивом`);

  const evidenceMap = new Map();
  source.slot_evidence.forEach((raw, index) => {
    const itemLabel = `${label}#${index + 1}`;
    scanForbiddenKeys(raw, itemLabel);
    requireKnownFields(raw, EVIDENCE_FIELDS, itemLabel);

    const scenarioId = requiredText(raw, "scenario_id", itemLabel, 100);
    const device = requiredText(raw, "device", itemLabel, 30);
    const status = requiredText(raw, "status", itemLabel, 20);
    const testedAt = requiredText(raw, "tested_at", itemLabel, 40);
    const browser = requiredText(raw, "browser", itemLabel, 80);
    const operatingSystem = requiredText(raw, "os", itemLabel, 80);
    const evidenceReference = optionalText(raw, "evidence_reference", itemLabel, 300);
    const notes = optionalText(raw, "notes", itemLabel, 1000);
    const eventLogAttached = raw.event_log_attached === true;

    if (!context.scenarioIds.has(scenarioId)) fail(`${itemLabel}: неизвестный scenario_id=${scenarioId}`);
    if (!context.deviceIds.has(device)) fail(`${itemLabel}: неподдерживаемое устройство ${device}`);
    if (!ALLOWED_STATUSES.has(status)) fail(`${itemLabel}: неподдерживаемый статус ${status}`);
    if (!exactIsoDate(testedAt)) fail(`${itemLabel}: tested_at должен быть точным ISO datetime`);
    if (!raw.checks || typeof raw.checks !== "object" || Array.isArray(raw.checks)) {
      fail(`${itemLabel}: отсутствует объект checks`);
    }

    const unknownChecks = Object.keys(raw.checks).filter((checkId) => !context.checkIds.has(checkId));
    if (unknownChecks.length) fail(`${itemLabel}: неизвестные checks: ${unknownChecks.join(", ")}`);

    const key = `${scenarioId}__${device}`;
    if (evidenceMap.has(key)) fail(`${label}: повторяется evidence для ${key}`);
    evidenceMap.set(key, {
      scenario_id: scenarioId,
      device,
      status,
      tested_at: testedAt,
      browser,
      os: operatingSystem,
      evidence_reference: evidenceReference,
      event_log_attached: eventLogAttached,
      notes,
      checks: raw.checks
    });
  });

  return evidenceMap;
}

function resultKey(item) {
  return `${item.scenario_id}__${item.device}`;
}

function comparableResult(item) {
  return JSON.stringify(item);
}

function verifyEvidenceForResult(result, evidence, context) {
  if (result.status !== "passed") return;
  const key = resultKey(result);
  const proof = evidence.get(key);
  if (!proof) fail(`${key}: passed требует запись в evidence-пакете`);

  ["status", "tested_at", "browser", "os", "evidence_reference", "event_log_attached"].forEach((field) => {
    if (proof[field] !== result[field]) fail(`${key}: поле ${field} не совпадает между реестром и evidence`);
  });

  context.checkIds.forEach((checkId) => {
    if (proof.checks[checkId] !== true) fail(`${key}: обязательная проверка ${checkId} не подтверждена`);
  });
}

function buildContext(matrix, contract) {
  if (matrix?.portal_id !== PORTAL_ID) fail(`${MATRIX_PATH}: неверный portal_id`);
  if (contract?.portal_id !== PORTAL_ID) fail(`${CONTRACT_PATH}: неверный portal_id`);
  const scenarios = Array.isArray(matrix?.scenarios) ? matrix.scenarios : [];
  const devices = Array.isArray(contract?.required_devices) ? contract.required_devices : [];
  const checks = Array.isArray(contract?.slot_checks) ? contract.slot_checks : [];
  if (scenarios.length !== 14) fail(`${MATRIX_PATH}: ожидается 14 сценариев`);
  if (devices.length !== 3) fail(`${CONTRACT_PATH}: ожидается 3 устройства`);
  if (checks.length !== 10) fail(`${CONTRACT_PATH}: ожидается 10 проверок на слот`);

  return {
    scenarios,
    devices,
    checks,
    scenarioIds: new Set(scenarios.map((item) => item.id)),
    deviceIds: new Set(devices),
    checkIds: new Set(checks.map((item) => item.id)),
    scenarioOrder: new Map(scenarios.map((item, index) => [item.id, index])),
    deviceOrder: new Map(devices.map((item, index) => [item, index]))
  };
}

function sortResults(results, context) {
  return [...results].sort((a, b) => {
    const byDevice = context.deviceOrder.get(a.device) - context.deviceOrder.get(b.device);
    if (byDevice !== 0) return byDevice;
    return context.scenarioOrder.get(a.scenario_id) - context.scenarioOrder.get(b.scenario_id);
  });
}

function planImport({ matrix, contract, registry, incoming, evidence = null, replaceExisting = false }) {
  const context = buildContext(matrix, contract);
  const currentResults = normalizeResultList(registry, context, "текущий реестр");
  const incomingResults = normalizeResultList(incoming, context, "импортируемый реестр");
  const evidenceMap = normalizeEvidence(evidence, context, "evidence-пакет");

  const currentMap = new Map(currentResults.map((item) => [resultKey(item), item]));
  const summary = { added: 0, unchanged: 0, replaced: 0 };

  incomingResults.forEach((item) => {
    verifyEvidenceForResult(item, evidenceMap, context);
    const key = resultKey(item);
    const existing = currentMap.get(key);
    if (!existing) {
      currentMap.set(key, item);
      summary.added += 1;
      return;
    }
    if (comparableResult(existing) === comparableResult(item)) {
      summary.unchanged += 1;
      return;
    }
    if (!replaceExisting) {
      fail(`${key}: результат уже существует и отличается; используйте --replace-existing после проверки`);
    }
    if (Date.parse(item.tested_at) <= Date.parse(existing.tested_at)) {
      fail(`${key}: замена требует более нового tested_at`);
    }
    currentMap.set(key, item);
    summary.replaced += 1;
  });

  const results = sortResults(Array.from(currentMap.values()), context);
  if (results.length > context.scenarios.length * context.devices.length) {
    fail(`после импорта результатов больше 42`);
  }

  return {
    output: {
      ...registry,
      updated_at: new Date().toISOString().slice(0, 10),
      results
    },
    summary: {
      ...summary,
      current: currentResults.length,
      incoming: incomingResults.length,
      total: results.length
    }
  };
}

function writeJson(filePath, value) {
  fs.mkdirSync(path.dirname(filePath), { recursive: true });
  fs.writeFileSync(filePath, `${JSON.stringify(value, null, 2)}\n`, "utf8");
}

function assert(condition, message) {
  if (!condition) fail(`self-test: ${message}`);
}

function runSelfTest(matrix, contract, registryTemplate) {
  const context = buildContext(matrix, contract);
  const scenario = context.scenarios[0];
  const checks = Object.fromEntries(context.checks.map((item) => [item.id, true]));
  const testedAt = "2026-07-17T10:00:00.000Z";
  const passed = {
    scenario_id: scenario.id,
    device: context.devices[0],
    status: "passed",
    tested_at: testedAt,
    browser: "Test Browser 1",
    os: "Test OS 1",
    evidence_reference: "evidence/test-slot-1",
    event_log_attached: true,
    notes: ""
  };
  const evidence = {
    schema_version: "1.0",
    generated_at: testedAt,
    portal_id: PORTAL_ID,
    status: "local_evidence_export_no_implied_approval",
    personal_data_forbidden: true,
    slot_evidence: [{
      ...passed,
      label: scenario.label,
      form_id: scenario.form_id,
      form_role: scenario.form_role,
      checks
    }],
    device_resilience_results: []
  };
  const incoming = { ...registryTemplate, results: [passed] };
  const first = planImport({ matrix, contract, registry: registryTemplate, incoming, evidence });
  assert(first.summary.added === 1 && first.summary.total === 1, "valid passed record was not added");

  const repeated = planImport({ matrix, contract, registry: first.output, incoming, evidence });
  assert(repeated.summary.unchanged === 1 && repeated.summary.total === 1, "identical record was not unchanged");

  let missingEvidenceBlocked = false;
  try {
    planImport({ matrix, contract, registry: registryTemplate, incoming });
  } catch (error) {
    missingEvidenceBlocked = /evidence/.test(error.message);
  }
  assert(missingEvidenceBlocked, "passed record without evidence was accepted");

  let personalDataBlocked = false;
  try {
    planImport({
      matrix,
      contract,
      registry: registryTemplate,
      incoming: { ...registryTemplate, results: [{ ...passed, phone: "+70000000000" }] },
      evidence
    });
  } catch (error) {
    personalDataBlocked = /запрещённое поле/.test(error.message);
  }
  assert(personalDataBlocked, "personal data field was accepted");

  const newer = { ...passed, tested_at: "2026-07-17T11:00:00.000Z", browser: "Test Browser 2" };
  const newerEvidence = {
    ...evidence,
    slot_evidence: [{ ...evidence.slot_evidence[0], ...newer, checks }]
  };
  let conflictBlocked = false;
  try {
    planImport({
      matrix,
      contract,
      registry: first.output,
      incoming: { ...registryTemplate, results: [newer] },
      evidence: newerEvidence
    });
  } catch (error) {
    conflictBlocked = /replace-existing/.test(error.message);
  }
  assert(conflictBlocked, "conflicting result was silently replaced");

  const replaced = planImport({
    matrix,
    contract,
    registry: first.output,
    incoming: { ...registryTemplate, results: [newer] },
    evidence: newerEvidence,
    replaceExisting: true
  });
  assert(replaced.summary.replaced === 1, "explicit newer replacement failed");

  const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), "form-qa-importer-"));
  writeJson(path.join(tempDir, "preview.json"), replaced.output);
  assert(fs.existsSync(path.join(tempDir, "preview.json")), "preview JSON was not written");
  fs.rmSync(tempDir, { recursive: true, force: true });
  console.log("Form QA results importer self-test passed.");
}

function main() {
  const matrix = readJson(path.join(ROOT, MATRIX_PATH));
  const contract = readJson(path.join(ROOT, CONTRACT_PATH));
  const registryPath = resolvePath(getArg("registry"), DEFAULT_REGISTRY_PATH);
  const registry = readJson(registryPath);

  if (hasFlag("self-test")) {
    runSelfTest(matrix, contract, registry);
    return;
  }

  const inputPath = resolvePath(getArg("input"));
  if (!inputPath) fail("укажите --input=/путь/form-results.json");
  const evidencePath = resolvePath(getArg("evidence"));
  const outputPath = resolvePath(getArg("output"));
  const write = hasFlag("write");
  const replaceExisting = hasFlag("replace-existing");
  const incoming = readJson(inputPath);
  const evidence = evidencePath ? readJson(evidencePath) : null;

  const plan = planImport({ matrix, contract, registry, incoming, evidence, replaceExisting });
  console.log(`Текущий реестр: ${plan.summary.current}`);
  console.log(`Во входном файле: ${plan.summary.incoming}`);
  console.log(`Новых: ${plan.summary.added}`);
  console.log(`Без изменений: ${plan.summary.unchanged}`);
  console.log(`Замен: ${plan.summary.replaced}`);
  console.log(`Итого после импорта: ${plan.summary.total}/42`);

  if (outputPath) {
    writeJson(outputPath, plan.output);
    console.log(`Предпросмотр записан: ${outputPath}`);
  }

  if (!write) {
    console.log("Режим предпросмотра: реестр не изменён. Для записи добавьте --write.");
    return;
  }

  if (plan.summary.added === 0 && plan.summary.replaced === 0) {
    console.log("Изменений для записи нет.");
    return;
  }

  writeJson(registryPath, plan.output);
  console.log(`Реестр обновлён: ${registryPath}`);
}

try {
  main();
} catch (error) {
  console.error(`Ошибка импорта QA: ${error.message}`);
  process.exit(1);
}
