import fs from "node:fs";
import path from "node:path";

const ROOT = process.cwd();
const PATHS = {
  manualGates: "data/release/manual-gates.json",
  formScenarios: "data/qa/form-scenarios.json",
  formResults: "data/qa/form-results.json",
  sourceCollection: "data/research/source-collection.json",
  projectIndex: "data/projects/index.json",
  campaignRelease: "data/marketing/campaign-release.json",
  campaignPublications: "data/marketing/campaign-publications.json",
  leadOperationsApproval: "data/operations/lead-operations-approval.json",
  guideContentRegistry: "data/content/guides.json"
};

function getArg(name, fallback = "") {
  const prefix = `--${name}=`;
  const value = process.argv.find((arg) => arg.startsWith(prefix));
  return value ? value.slice(prefix.length).trim() : fallback;
}

function readJson(relativePath) {
  const filePath = path.join(ROOT, relativePath);
  if (!fs.existsSync(filePath)) {
    console.error(`Required readiness source not found: ${relativePath}`);
    process.exit(1);
  }
  try {
    return JSON.parse(fs.readFileSync(filePath, "utf8"));
  } catch (error) {
    console.error(`Cannot parse ${relativePath}: ${error.message}`);
    process.exit(1);
  }
}

function csvCell(value) {
  const text = Array.isArray(value) ? value.join(" | ") : String(value ?? "");
  return `"${text.replace(/"/g, '""')}"`;
}

const manualRegistry = readJson(PATHS.manualGates);
const formScenarios = readJson(PATHS.formScenarios);
const formResults = readJson(PATHS.formResults);
const sourceCollection = readJson(PATHS.sourceCollection);
const projectIndex = readJson(PATHS.projectIndex);
const campaignRelease = readJson(PATHS.campaignRelease);
const campaignPublications = readJson(PATHS.campaignPublications);
const leadOperationsApproval = readJson(PATHS.leadOperationsApproval);
const guideContentRegistry = readJson(PATHS.guideContentRegistry);

const scenarios = Array.isArray(formScenarios.scenarios) ? formScenarios.scenarios : [];
const devices = Array.isArray(formResults.rules?.expected_devices) ? formResults.rules.expected_devices : [];
const results = Array.isArray(formResults.results) ? formResults.results : [];
const expectedFormSlots = scenarios.length * devices.length;
const formStatusCounts = {
  passed: results.filter((item) => item.status === "passed").length,
  failed: results.filter((item) => item.status === "failed").length,
  blocked: results.filter((item) => item.status === "blocked").length,
  not_run: Math.max(0, expectedFormSlots - results.length)
};

const sourceTasks = (Array.isArray(sourceCollection.projects) ? sourceCollection.projects : [])
  .flatMap((project) => Array.isArray(project.tasks) ? project.tasks : []);
const acceptedSourceTasks = sourceTasks.filter((task) => ["accepted", "not_applicable"].includes(task.status)).length;
const pendingSourceTasks = sourceTasks.length - acceptedSourceTasks;

const activeProjects = Array.isArray(projectIndex) ? projectIndex.filter((project) => project.is_active !== false) : [];
const publicReadyProjects = activeProjects.filter((project) => project.is_public_ready === true).length;

const campaignIds = Array.isArray(campaignRelease.campaign_ids) ? campaignRelease.campaign_ids : [];
const publications = Array.isArray(campaignPublications.publications) ? campaignPublications.publications : [];
const publishedPlacements = publications.filter((item) => item.status === "published").length;

const operationsDecisions = Array.isArray(leadOperationsApproval.decisions) ? leadOperationsApproval.decisions : [];
const approvedOperationsDecisions = operationsDecisions.filter((item) => item.status === "approved").length;
const pendingOperationsDecisions = operationsDecisions.filter((item) => item.status === "requires_owner_decision").length;
const rejectedOperationsDecisions = operationsDecisions.filter((item) => item.status === "rejected").length;
const supersededOperationsDecisions = operationsDecisions.filter((item) => item.status === "superseded").length;
const operationsActivationEnabled = leadOperationsApproval.rules?.operational_activation_enabled === true;
const operationsReady = operationsDecisions.length === 8
  && approvedOperationsDecisions === operationsDecisions.length
  && pendingOperationsDecisions === 0
  && rejectedOperationsDecisions === 0
  && operationsActivationEnabled;

const guides = Array.isArray(guideContentRegistry.guides) ? guideContentRegistry.guides : [];
const guideStatusCounts = {
  index_ready: guides.filter((item) => item.indexing_status === "ready").length,
  index_blocked: guides.filter((item) => item.indexing_status === "blocked").length,
  source_verified: guides.filter((item) => item.source_status === "verified_on_date").length,
  source_review_required: guides.filter((item) => item.source_status === "requires_source_review").length,
  source_not_applicable: guides.filter((item) => item.source_status === "not_applicable").length,
  editorial_passed: guides.filter((item) => item.editorial_review === "passed").length,
  legal_passed: guides.filter((item) => item.legal_review === "passed").length,
  legal_not_applicable: guides.filter((item) => item.legal_review === "not_applicable").length
};
const guideContentReady = guides.length > 0
  && guideStatusCounts.index_ready === guides.length
  && guideStatusCounts.index_blocked === 0
  && guideStatusCounts.source_review_required === 0
  && guideStatusCounts.editorial_passed === guides.length
  && guideStatusCounts.legal_passed + guideStatusCounts.legal_not_applicable === guides.length;

const manualGates = Array.isArray(manualRegistry.gates) ? manualRegistry.gates : [];
const manualGateRows = manualGates.map((gate) => ({
  id: gate.id,
  title: gate.title,
  category: "manual",
  scope: gate.scope,
  status: gate.status,
  details: gate.notes || "",
  evidence_count: Array.isArray(gate.evidence) ? gate.evidence.length : 0
}));

const derivedGates = [
  {
    id: "form_manual_qa",
    title: "Ручная проверка 14 форм на desktop, Android и iPhone",
    category: "derived",
    scope: "campaign_launch",
    status: expectedFormSlots > 0 && formStatusCounts.passed === expectedFormSlots && formStatusCounts.failed === 0 && formStatusCounts.blocked === 0 && formStatusCounts.not_run === 0 ? "passed" : "blocked",
    details: `passed=${formStatusCounts.passed}; failed=${formStatusCounts.failed}; blocked=${formStatusCounts.blocked}; not_run=${formStatusCounts.not_run}`,
    evidence_count: results.length
  },
  {
    id: "lead_operations_approval",
    title: "Утверждённая операционная обработка обращений",
    category: "derived",
    scope: "campaign_launch",
    status: operationsReady ? "passed" : "blocked",
    details: `approved=${approvedOperationsDecisions}; pending=${pendingOperationsDecisions}; rejected=${rejectedOperationsDecisions}; superseded=${supersededOperationsDecisions}; total=${operationsDecisions.length}; activation_enabled=${operationsActivationEnabled}`,
    evidence_count: approvedOperationsDecisions
  },
  {
    id: "source_collection",
    title: "Сбор и принятие первичных источников",
    category: "derived",
    scope: "seo_object_indexing",
    status: sourceTasks.length > 0 && pendingSourceTasks === 0 ? "passed" : "blocked",
    details: `accepted_or_not_applicable=${acceptedSourceTasks}; pending=${pendingSourceTasks}; total=${sourceTasks.length}`,
    evidence_count: acceptedSourceTasks
  },
  {
    id: "project_publication",
    title: "Готовность карточек объектов к публичной индексации",
    category: "derived",
    scope: "seo_object_indexing",
    status: activeProjects.length > 0 && publicReadyProjects === activeProjects.length ? "passed" : "blocked",
    details: `public_ready=${publicReadyProjects}; active_projects=${activeProjects.length}`,
    evidence_count: publicReadyProjects
  },
  {
    id: "guide_content_publication",
    title: "Готовность материалов справочника к индексации",
    category: "derived",
    scope: "seo_guide_indexing",
    status: guideContentReady ? "passed" : "blocked",
    details: `ready=${guideStatusCounts.index_ready}; blocked=${guideStatusCounts.index_blocked}; source_verified=${guideStatusCounts.source_verified}; source_pending=${guideStatusCounts.source_review_required}; editorial_passed=${guideStatusCounts.editorial_passed}; legal_passed_or_na=${guideStatusCounts.legal_passed + guideStatusCounts.legal_not_applicable}; total=${guides.length}`,
    evidence_count: guideStatusCounts.index_ready
  },
  {
    id: "campaign_links_prepared",
    title: "Проверенный пакет рекламных ссылок",
    category: "derived",
    scope: "campaign_launch",
    status: campaignIds.length === 11 && ["prepared_not_published", "published"].includes(campaignRelease.status) ? "passed" : "blocked",
    details: `release_status=${campaignRelease.status || "missing"}; campaign_links=${campaignIds.length}`,
    evidence_count: campaignIds.length
  },
  {
    id: "campaign_publication_activity",
    title: "Фактические рекламные размещения",
    category: "derived",
    scope: "post_launch_monitoring",
    status: publishedPlacements > 0 ? "passed" : "blocked",
    details: `published_placements=${publishedPlacements}; total_records=${publications.length}`,
    evidence_count: publications.length
  }
];

const gates = [...derivedGates, ...manualGateRows];
const gateMap = new Map(gates.map((gate) => [gate.id, gate]));
const profiles = [
  {
    id: "campaign_launch",
    title: "Запуск рекламы и сбор реальных заявок",
    required_gates: [
      "form_manual_qa",
      "lead_operations_approval",
      "real_lead_delivery",
      "live_analytics_debug",
      "legal_owner_review",
      "campaign_links_prepared",
      "campaign_publication_approval"
    ]
  },
  {
    id: "seo_object_indexing",
    title: "Снятие noindex с карточек объектов",
    required_gates: [
      "source_collection",
      "project_publication",
      "legal_owner_review"
    ]
  },
  {
    id: "seo_guide_indexing",
    title: "Индексация материалов справочника",
    required_gates: [
      "guide_content_publication",
      "legal_owner_review"
    ]
  },
  {
    id: "legacy_redirect_release",
    title: "Выпуск серверных legacy-редиректов",
    required_gates: [
      "hosting_redirect_format",
      "legal_owner_review"
    ]
  }
].map((profile) => {
  const gateStates = profile.required_gates.map((id) => gateMap.get(id)).filter(Boolean);
  const missingGates = profile.required_gates.filter((id) => !gateMap.has(id));
  const blockers = gateStates.filter((gate) => !["passed", "not_applicable"].includes(gate.status));
  return {
    ...profile,
    ready: missingGates.length === 0 && blockers.length === 0,
    passed_gates: gateStates.filter((gate) => ["passed", "not_applicable"].includes(gate.status)).map((gate) => gate.id),
    blocked_gates: blockers.map((gate) => gate.id),
    missing_gates: missingGates
  };
});

const summary = {
  total_gates: gates.length,
  passed: gates.filter((gate) => gate.status === "passed").length,
  blocked: gates.filter((gate) => gate.status === "blocked").length,
  in_review: gates.filter((gate) => gate.status === "in_review").length,
  not_applicable: gates.filter((gate) => gate.status === "not_applicable").length,
  total_profiles: profiles.length,
  ready_profiles: profiles.filter((profile) => profile.ready).length
};

const metrics = {
  form_qa: {
    scenarios: scenarios.length,
    devices: devices.length,
    expected_slots: expectedFormSlots,
    ...formStatusCounts
  },
  lead_operations: {
    total_decisions: operationsDecisions.length,
    approved: approvedOperationsDecisions,
    pending: pendingOperationsDecisions,
    rejected: rejectedOperationsDecisions,
    superseded: supersededOperationsDecisions,
    activation_enabled: operationsActivationEnabled,
    ready: operationsReady
  },
  sources: {
    total_tasks: sourceTasks.length,
    accepted_or_not_applicable: acceptedSourceTasks,
    pending: pendingSourceTasks
  },
  projects: {
    active: activeProjects.length,
    public_ready: publicReadyProjects
  },
  guides: {
    total: guides.length,
    ...guideStatusCounts,
    ready: guideContentReady
  },
  campaigns: {
    prepared_links: campaignIds.length,
    release_status: campaignRelease.status || "",
    publication_records: publications.length,
    published_placements: publishedPlacements
  }
};

function renderMarkdown() {
  const lines = [
    "# Готовность портала к запуску",
    "",
    `Всего ворот: ${summary.total_gates}`,
    `Пройдено: ${summary.passed}`,
    `Заблокировано: ${summary.blocked}`,
    `Профилей готово: ${summary.ready_profiles}/${summary.total_profiles}`,
    "",
    "## Ворота",
    "",
    "| Ворота | Категория | Область | Статус | Детали |",
    "|---|---|---|---|---|"
  ];
  gates.forEach((gate) => {
    lines.push(`| ${gate.title} | ${gate.category} | ${gate.scope} | ${gate.status} | ${gate.details} |`);
  });
  lines.push("", "## Профили запуска", "");
  profiles.forEach((profile) => {
    lines.push(`### ${profile.title}`);
    lines.push("");
    lines.push(`Статус: ${profile.ready ? "READY" : "BLOCKED"}`);
    lines.push("");
    if (profile.blocked_gates.length) lines.push(`Блокеры: ${profile.blocked_gates.join(", ")}`);
    if (profile.missing_gates.length) lines.push(`Отсутствующие ворота: ${profile.missing_gates.join(", ")}`);
    lines.push("");
  });
  return lines.join("\n");
}

function renderCsv() {
  const fields = ["id", "title", "category", "scope", "status", "details", "evidence_count"];
  return [
    fields.map(csvCell).join(","),
    ...gates.map((gate) => fields.map((field) => csvCell(gate[field])).join(","))
  ].join("\n");
}

const format = getArg("format", "markdown").toLowerCase();
const supportedFormats = new Set(["markdown", "json", "csv"]);
if (!supportedFormats.has(format)) {
  console.error(`Unsupported format: ${format}. Use markdown, json or csv.`);
  process.exit(1);
}

const output = format === "json"
  ? JSON.stringify({ summary, metrics, gates, profiles }, null, 2)
  : format === "csv"
    ? renderCsv()
    : renderMarkdown();

process.stdout.write(`${output}\n`);
