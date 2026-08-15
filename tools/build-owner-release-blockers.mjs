import fs from "node:fs";
import path from "node:path";

const ROOT = process.cwd();
const PATHS = {
  legal: "data/legal/legal-owner-approval.json",
  bmAdvertising: "data/legal/bm-group-advertising-contract.json",
  operations: "data/operations/lead-operations-approval.json",
  analytics: "data/analytics/live-provider.json",
  realLead: "data/release/real-lead-test.json",
  manualGates: "data/release/manual-gates.json",
  mobileQaPolicy: "data/qa/mobile-release-policy.json"
};

function readJson(relativePath) {
  const file = path.join(ROOT, relativePath);
  if (!fs.existsSync(file)) throw new Error(`Missing source: ${relativePath}`);
  return JSON.parse(fs.readFileSync(file, "utf8"));
}

function getArg(name, fallback = "") {
  const prefix = `--${name}=`;
  const item = process.argv.find((arg) => arg.startsWith(prefix));
  return item ? item.slice(prefix.length).trim() : fallback;
}

const legal = readJson(PATHS.legal);
const bmAdvertising = readJson(PATHS.bmAdvertising);
const operations = readJson(PATHS.operations);
const analytics = readJson(PATHS.analytics);
const realLead = readJson(PATHS.realLead);
const manual = readJson(PATHS.manualGates);
const mobileQaPolicy = readJson(PATHS.mobileQaPolicy);

const legalPending = (legal.decisions || []).filter((item) => item.status === "requires_owner_decision");
const operationsPending = (operations.decisions || []).filter((item) => item.status === "requires_owner_decision");
const manualBlocked = (manual.gates || []).filter((item) => !["passed", "not_applicable"].includes(item.status));

const decisions = [
  ...legalPending.map((item) => ({
    group: "legal",
    id: item.id,
    title: item.title,
    question: item.question,
    secure_value_required: false,
    source: PATHS.legal
  })),
  ...operationsPending.map((item) => ({
    group: "operations",
    id: item.id,
    title: item.approval_question || item.id,
    question: item.approval_question,
    secure_value_required: item.decision_type === "secure_role_reference",
    source: PATHS.operations
  }))
];

if (mobileQaPolicy.status === "requires_owner_decision") {
  decisions.push({
    group: "qa",
    id: mobileQaPolicy.decision?.id || "mobile_device_release_policy",
    title: "Политика физического mobile QA перед запуском",
    question: mobileQaPolicy.decision?.question || "Нужно определить, обязательны ли физические Android/iPhone до campaign launch.",
    secure_value_required: false,
    source: PATHS.mobileQaPolicy
  });
}

if (!analytics.provider || analytics.rules?.live_delivery_enabled !== true || analytics.rules?.debug_verified !== true) {
  decisions.push({
    group: "analytics",
    id: "live_analytics_provider",
    title: "Фактически используемый аналитический счётчик",
    question: "Какой счётчик использовать для production: GA4 или Яндекс Метрика, и какой его публичный counter/measurement ID?",
    secure_value_required: false,
    source: PATHS.analytics
  });
}

if (realLead.execution?.approved_by_owner !== true) {
  decisions.push({
    group: "real_lead",
    id: "real_lead_test_consent",
    title: "Разрешение на одну контролируемую реальную заявку",
    question: "Разрешена ли одна реальная тестовая заявка и какой тестовый контакт передан через безопасный канал?",
    secure_value_required: true,
    source: PATHS.realLead
  });
}

const campaignGate = (manual.gates || []).find((item) => item.id === "campaign_publication_approval");
if (campaignGate && campaignGate.status !== "passed") {
  decisions.push({
    group: "campaign",
    id: "campaign_publication_approval",
    title: "Фактический рекламный запуск",
    question: "Какие площадки, дата, формат и бюджет первой ограниченной рекламной волны утверждены?",
    secure_value_required: false,
    source: PATHS.manualGates
  });
}

const conditionalBlockers = [];
const bmApproval = bmAdvertising.approval || {};
if (bmApproval.status !== "passed") {
  conditionalBlockers.push({
    group: "external_approval",
    id: "bm_group_written_approval",
    title: "Письменное согласование BM Group для object-specific рекламы",
    question: "Какие object-specific рекламные scopes по ЖК «Теллерманов сад» / Просторной 4А письменно согласованы BM Group?",
    secure_value_required: false,
    source: PATHS.bmAdvertising,
    scope: "prostornaya-4a_object_specific_advertising",
    blocks_global_release: false,
    blocking_effect: "Только object-specific реклама Просторной 4А; общие кампании независимого городского портала этим blocker не блокируются."
  });
}

const report = {
  schema_version: "1.2",
  portal_id: "newbuilds-borisoglebsk",
  generated_at: new Date().toISOString(),
  status: decisions.length ? "owner_decisions_required" : "owner_decisions_complete",
  summary: {
    total_owner_decisions: decisions.length,
    legal_pending: legalPending.length,
    operations_pending: operationsPending.length,
    qa_policy_decision_required: decisions.some((item) => item.group === "qa"),
    analytics_configuration_required: decisions.some((item) => item.group === "analytics"),
    real_lead_consent_required: decisions.some((item) => item.group === "real_lead"),
    campaign_approval_required: decisions.some((item) => item.group === "campaign"),
    conditional_external_approvals: conditionalBlockers.length,
    bm_object_approval_required: conditionalBlockers.some((item) => item.id === "bm_group_written_approval"),
    manual_blocked_gates: manualBlocked.length
  },
  decisions,
  conditional_blockers: conditionalBlockers,
  rules: {
    report_is_not_approval: true,
    no_personal_contact_values: true,
    no_secret_credentials: true,
    source_contracts_remain_authoritative: true,
    conditional_blockers_do_not_block_general_portal_release: true,
    qa_policy_decision_does_not_rewrite_historical_results: true
  }
};

const format = getArg("format", "json");
if (format === "json") {
  process.stdout.write(`${JSON.stringify(report, null, 2)}\n`);
} else if (format === "markdown") {
  const lines = [
    "# Решения владельца до финального запуска",
    "",
    `Статус: ${report.status}`,
    "",
    `Всего незавершённых owner-решений: ${report.summary.total_owner_decisions}`,
    `Условных внешних согласований: ${report.summary.conditional_external_approvals}`,
    "",
    ...decisions.flatMap((item, index) => [
      `## ${index + 1}. ${item.title}`,
      "",
      item.question,
      "",
      `Группа: ${item.group}. Источник: \`${item.source}\`.${item.secure_value_required ? " Значение должно передаваться через безопасный канал и не храниться как PII в GitHub." : ""}`,
      ""
    ])
  ];

  if (conditionalBlockers.length) {
    lines.push("## Условные внешние блокеры", "", "Они относятся только к указанному scope и не превращаются в глобальный блокер независимого городского портала.", "");
    conditionalBlockers.forEach((item) => {
      lines.push(`### ${item.title}`, "", item.question, "", `Scope: \`${item.scope}\`. ${item.blocking_effect}`, "", `Источник: \`${item.source}\`.`, "");
    });
  }

  process.stdout.write(`${lines.join("\n")}\n`);
} else {
  throw new Error(`Unsupported format: ${format}`);
}
