import fs from "node:fs";
import path from "node:path";

const ROOT = process.cwd();
const GATES_PATH = "data/release/manual-gates.json";
const REAL_LEAD_PATH = "data/release/real-lead-test.json";
const LEGAL_APPROVAL_PATH = "data/legal/legal-owner-approval.json";
const LIVE_ANALYTICS_PATH = "data/analytics/live-provider.json";
const EXPECTED_GATE_IDS = new Set([
  "real_lead_delivery",
  "live_analytics_debug",
  "legal_owner_review",
  "campaign_publication_approval",
  "hosting_redirect_format"
]);
const NON_WAIVABLE_GATE_IDS = new Set([
  "real_lead_delivery",
  "live_analytics_debug",
  "legal_owner_review",
  "campaign_publication_approval"
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

function realLeadContractReady(data) {
  const requiredChecks = [
    "one_submission_only",
    "server_record_created",
    "record_locator_present",
    "form_context_matches",
    "consent_recorded",
    "no_legacy_fallback_used",
    "health_ok_before",
    "health_ok_after",
    "public_analytics_pii_absent"
  ];
  const evidenceKeys = ["health_before", "health_after", "database_record", "event_log"];
  return data?.status === "passed_real_lead_delivery"
    && data?.rules?.execution_enabled === true
    && data?.execution?.approved_by_owner === true
    && isValidDate(data?.execution?.approved_at)
    && /^secure:[a-z0-9_.:-]{3,120}$/i.test(String(data?.execution?.secure_contact_reference || ""))
    && isValidDate(data?.execution?.submitted_at)
    && /^newbuild_leads:[a-z0-9-]{8,120}$/i.test(String(data?.execution?.record_locator || ""))
    && requiredChecks.every((key) => data?.acceptance_checks?.[key] === true)
    && evidenceKeys.every((key) => {
      const item = data?.evidence?.[key];
      const reference = String(item?.reference || "").trim();
      return String(item?.note || "").trim() !== ""
        && (reference.startsWith("https://") || /^(docs|data|artifacts)\//.test(reference));
    })
    && isValidDate(data?.evidence?.checked_at)
    && String(data?.evidence?.reviewer_reference || "").trim() !== "";
}

function legalContractReady(data) {
  const decisions = Array.isArray(data?.decisions) ? data.decisions : [];
  return data?.status === "approved_for_final_publication"
    && data?.rules?.final_legal_publication_enabled === true
    && decisions.length === 8
    && decisions.every((item) => item.status === "approved"
      && String(item.approved_value ?? "").trim()
      && isValidDate(item.checked_at)
      && String(item.basis || "").trim());
}

function liveAnalyticsContractReady(data) {
  const requiredChecks = [
    "required_events_observed",
    "required_dimensions_observed",
    "lead_submit_not_double_counted",
    "lead_submit_classified_is_dimension_only",
    "pii_absent",
    "arbitrary_query_absent"
  ];
  return data?.status === "live_debug_passed"
    && data?.rules?.live_delivery_enabled === true
    && data?.rules?.debug_verified === true
    && ["ga4", "yandex_metrika"].includes(data?.provider)
    && String(data?.public_counter_id || "").trim() !== ""
    && isValidDate(data?.configuration_checked_at)
    && isValidDate(data?.debug_checked_at)
    && String(data?.reviewer_reference || "").trim() !== ""
    && Array.isArray(data?.debug_evidence)
    && data.debug_evidence.length > 0
    && requiredChecks.every((key) => data?.acceptance_checks?.[key] === true);
}

const registry = readJson(GATES_PATH);
const realLead = readJson(REAL_LEAD_PATH);
const legalApproval = readJson(LEGAL_APPROVAL_PATH);
const liveAnalytics = readJson(LIVE_ANALYTICS_PATH);
const seenIds = new Set();
let passedCount = 0;
let blockedCount = 0;
const gateMap = new Map();

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
    gateMap.set(id, gate);
    if (!EXPECTED_GATE_IDS.has(id)) errors.push(`${label}: незарегистрированный gate id`);
    if (!ALLOWED_SCOPES.has(scope)) errors.push(`${label}: неподдерживаемый scope=${scope}`);
    if (!ALLOWED_STATUSES.has(status)) errors.push(`${label}: неподдерживаемый status=${status}`);
    if (status === "not_applicable" && NON_WAIVABLE_GATE_IDS.has(id)) {
      errors.push(`${label}: критический gate не может быть not_applicable`);
    }
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

const realLeadGate = gateMap.get("real_lead_delivery");
if (realLeadGate?.status === "passed" && !realLeadContractReady(realLead)) {
  errors.push(`${GATES_PATH}:real_lead_delivery: passed запрещён, пока ${REAL_LEAD_PATH} не подтверждает одну согласованную реальную доставку`);
}

const legalGate = gateMap.get("legal_owner_review");
if (legalGate?.status === "passed" && !legalContractReady(legalApproval)) {
  errors.push(`${GATES_PATH}:legal_owner_review: passed запрещён, пока ${LEGAL_APPROVAL_PATH} не approved_for_final_publication`);
}

const analyticsGate = gateMap.get("live_analytics_debug");
if (analyticsGate?.status === "passed" && !liveAnalyticsContractReady(liveAnalytics)) {
  errors.push(`${GATES_PATH}:live_analytics_debug: passed запрещён, пока ${LIVE_ANALYTICS_PATH} не подтверждает live debug`);
}

console.log(`Checked manual launch gates: ${seenIds.size}`);
console.log(`Passed manual gates: ${passedCount}`);
console.log(`Blocked manual gates: ${blockedCount}`);
console.log(`Real lead prerequisite ready: ${realLeadContractReady(realLead)}`);
console.log(`Legal prerequisite ready: ${legalContractReady(legalApproval)}`);
console.log(`Live analytics prerequisite ready: ${liveAnalyticsContractReady(liveAnalytics)}`);

if (errors.length) {
  console.error("\nLaunch gate validation errors:");
  errors.forEach((error) => console.error(`- ${error}`));
  process.exit(1);
}

console.log("\nLaunch gate validation passed.");
