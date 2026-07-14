import fs from "node:fs";
import path from "node:path";

const ROOT = process.cwd();
const GATES_PATH = "data/release/manual-gates.json";
const EXPECTED_GATE_IDS = new Set([
  "real_lead_delivery",
  "live_analytics_debug",
  "legal_owner_review",
  "campaign_publication_approval",
  "hosting_redirect_format"
]);
const ALLOWED_STATUSES = new Set(["blocked", "in_review", "passed", "not_applicable"]);
const ALLOWED_SCOPES = new Set(["campaign_launch", "campaign_and_seo", "legacy_redirect_release"]);
const ALLOWED_EVIDENCE_TYPES = new Set([
  "screenshot",
  "report",
  "issue",
  "pull_request",
  "repository_file",
  "external_url"
]);
const FORBIDDEN_KEYS = new Set([
  "phone",
  "phone_normalized",
  "email",
  "client_fixation_id",
  "form_payload",
  "user_agent",
  "access_key",
  "name"
]);
const errors = [];

function readJson(relativePath) {
  const filePath = path.join(ROOT, relativePath);
  if (!fs.existsSync(filePath)) {
    errors.push(`${relativePath}: файл не найден`);
    return null;
  }
  try {
    return JSON.parse(fs.readFileSync(filePath, "utf8"));
  } catch (error) {
    errors.push(`${relativePath}: некорректный JSON: ${error.message}`);
    return null;
  }
}

function requireText(item, field, label) {
  const value = String(item?.[field] ?? "").trim();
  if (!value) errors.push(`${label}: отсутствует ${field}`);
  return value;
}

function isValidDate(value) {
  return typeof value === "string" && value.trim() !== "" && !Number.isNaN(Date.parse(value));
}

function isEvidenceReference(value) {
  const reference = String(value || "").trim();
  if (reference.startsWith("https://")) return true;
  return /^(docs|data|issues|pulls|artifacts)\//.test(reference);
}

function scanForbiddenKeys(value, label) {
  if (Array.isArray(value)) {
    value.forEach((item, index) => scanForbiddenKeys(item, `${label}[${index}]`));
    return;
  }
  if (!value || typeof value !== "object") return;
  for (const [key, nested] of Object.entries(value)) {
    if (FORBIDDEN_KEYS.has(key)) errors.push(`${label}: запрещённое поле ${key}`);
    scanForbiddenKeys(nested, `${label}.${key}`);
  }
}

const registry = readJson(GATES_PATH);
const seenIds = new Set();
let passedCount = 0;
let blockedCount = 0;

if (!registry || !Array.isArray(registry.gates)) {
  errors.push(`${GATES_PATH}: gates должен быть массивом`);
} else {
  if (registry.portal_id !== "newbuilds-borisoglebsk") {
    errors.push(`${GATES_PATH}: portal_id должен быть newbuilds-borisoglebsk`);
  }
  const requiredRules = [
    "passed_requires_evidence",
    "passed_requires_checked_at",
    "passed_requires_reviewer",
    "not_applicable_requires_reason",
    "personal_data_forbidden",
    "evidence_must_be_https_or_repository_path"
  ];
  for (const rule of requiredRules) {
    if (registry.rules?.[rule] !== true) errors.push(`${GATES_PATH}: rules.${rule} должен быть true`);
  }

  if (registry.gates.length !== EXPECTED_GATE_IDS.size) {
    errors.push(`${GATES_PATH}: ожидалось ${EXPECTED_GATE_IDS.size} ручных ворот, найдено ${registry.gates.length}`);
  }

  for (const gate of registry.gates) {
    const id = requireText(gate, "id", GATES_PATH);
    const label = `${GATES_PATH}:${id || "unknown-gate"}`;
    requireText(gate, "title", label);
    const scope = requireText(gate, "scope", label);
    const status = requireText(gate, "status", label);
    const notes = String(gate.notes || "").trim();
    const reviewer = String(gate.reviewer || "").trim();
    const evidence = Array.isArray(gate.evidence) ? gate.evidence : [];

    if (seenIds.has(id)) errors.push(`${label}: дублирующий id`);
    seenIds.add(id);
    if (!EXPECTED_GATE_IDS.has(id)) errors.push(`${label}: незарегистрированный gate id`);
    if (!ALLOWED_SCOPES.has(scope)) errors.push(`${label}: неподдерживаемый scope=${scope}`);
    if (!ALLOWED_STATUSES.has(status)) errors.push(`${label}: неподдерживаемый status=${status}`);
    if (!Array.isArray(gate.required_evidence) || gate.required_evidence.length < 2) {
      errors.push(`${label}: required_evidence должен содержать минимум два пункта`);
    }
    if (!Array.isArray(gate.evidence)) errors.push(`${label}: evidence должен быть массивом`);

    for (const [index, item] of evidence.entries()) {
      const evidenceLabel = `${label}:evidence#${index + 1}`;
      const type = requireText(item, "type", evidenceLabel);
      const reference = requireText(item, "reference", evidenceLabel);
      requireText(item, "note", evidenceLabel);
      if (!ALLOWED_EVIDENCE_TYPES.has(type)) errors.push(`${evidenceLabel}: неподдерживаемый type=${type}`);
      if (!isEvidenceReference(reference)) {
        errors.push(`${evidenceLabel}: reference должен быть HTTPS-ссылкой или путём внутри репозитория`);
      }
    }

    if (status === "passed") {
      passedCount += 1;
      if (!evidence.length) errors.push(`${label}: passed требует evidence`);
      if (!isValidDate(gate.checked_at)) errors.push(`${label}: passed требует корректный checked_at`);
      if (!reviewer) errors.push(`${label}: passed требует reviewer`);
    } else if (status === "not_applicable") {
      if (!notes) errors.push(`${label}: not_applicable требует объяснение в notes`);
      if (!isValidDate(gate.checked_at)) errors.push(`${label}: not_applicable требует checked_at`);
      if (!reviewer) errors.push(`${label}: not_applicable требует reviewer`);
    } else {
      blockedCount += status === "blocked" ? 1 : 0;
      if (!notes) errors.push(`${label}: ${status} требует notes с текущей причиной`);
      if (gate.checked_at !== null) errors.push(`${label}: ${status} должен содержать checked_at=null до фактической проверки`);
      if (reviewer) errors.push(`${label}: ${status} не должен содержать reviewer до фактической проверки`);
      if (evidence.length) errors.push(`${label}: ${status} не должен хранить evidence как завершённое подтверждение`);
    }
  }

  for (const expectedId of EXPECTED_GATE_IDS) {
    if (!seenIds.has(expectedId)) errors.push(`${GATES_PATH}: отсутствует gate ${expectedId}`);
  }

  scanForbiddenKeys(registry, GATES_PATH);
}

console.log(`Checked manual launch gates: ${seenIds.size}`);
console.log(`Passed manual gates: ${passedCount}`);
console.log(`Blocked manual gates: ${blockedCount}`);

if (errors.length) {
  console.error("\nLaunch gate validation errors:");
  errors.forEach((error) => console.error(`- ${error}`));
  process.exit(1);
}

console.log("\nLaunch gate validation passed.");
