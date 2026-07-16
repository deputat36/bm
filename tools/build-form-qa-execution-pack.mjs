import fs from "node:fs";
import path from "node:path";

const ROOT = process.cwd();
const CONTRACT_PATH = "data/qa/form-execution-contract.json";
const MATRIX_PATH = "data/qa/form-scenarios.json";
const RESULTS_PATH = "data/qa/form-results.json";

function readJson(relativePath) {
  return JSON.parse(fs.readFileSync(path.join(ROOT, relativePath), "utf8"));
}

function getArg(name, fallback = "") {
  const prefix = `--${name}=`;
  const value = process.argv.find((item) => item.startsWith(prefix));
  return value ? value.slice(prefix.length).trim().toLowerCase() : fallback;
}

function buildUrl(matrix, scenario) {
  const url = new URL(scenario.page_path, matrix.base_url);
  Object.entries(matrix.test_parameters || {}).forEach(([key, value]) => {
    url.searchParams.set(key, String(value));
  });
  url.hash = scenario.anchor;
  return url.toString();
}

const contract = readJson(CONTRACT_PATH);
const matrix = readJson(MATRIX_PATH);
const resultsFile = readJson(RESULTS_PATH);
const format = getArg("format", "markdown");
const deviceFilter = getArg("device", "all");
const devices = contract.required_devices || [];
const scenarios = matrix.scenarios || [];
const resultMap = new Map((resultsFile.results || []).map((item) => [`${item.scenario_id}__${item.device}`, item]));

if (!["markdown", "json"].includes(format)) {
  console.error("Unsupported format. Use markdown or json.");
  process.exit(1);
}
if (deviceFilter !== "all" && !devices.includes(deviceFilter)) {
  console.error(`Unsupported device: ${deviceFilter}`);
  process.exit(1);
}

const slots = [];
for (const device of devices) {
  if (deviceFilter !== "all" && device !== deviceFilter) continue;
  for (const scenario of scenarios) {
    const key = `${scenario.id}__${device}`;
    const result = resultMap.get(key) || null;
    slots.push({
      id: key,
      scenario_id: scenario.id,
      label: scenario.label,
      device,
      page_path: scenario.page_path,
      form_id: scenario.form_id,
      form_role: scenario.form_role,
      lead_type: scenario.lead_type,
      object_id: scenario.object_id,
      url: buildUrl(matrix, scenario),
      required_checks: contract.slot_checks.map((item) => item.id),
      status: result?.status || "not_run",
      evidence_reference: result?.evidence_reference || "",
      event_log_attached: result?.event_log_attached === true
    });
  }
}

const deviceCases = devices
  .filter((device) => deviceFilter === "all" || device === deviceFilter)
  .flatMap((device) => contract.device_resilience_checks.map((item) => ({
    id: `${item.id}__${device}`,
    check_id: item.id,
    device,
    acceptance: item.acceptance,
    status: "not_run"
  })));

const statusCounts = slots.reduce((counts, slot) => {
  counts[slot.status] = (counts[slot.status] || 0) + 1;
  return counts;
}, { not_run: 0, passed: 0, failed: 0, blocked: 0 });

const report = {
  schema_version: contract.schema_version,
  generated_at: new Date().toISOString(),
  portal_id: contract.portal_id,
  status: "execution_pack_only_no_implied_results",
  filters: { device: deviceFilter },
  summary: {
    scenarios: scenarios.length,
    devices: devices.length,
    total_slots: scenarios.length * devices.length,
    rendered_slots: slots.length,
    slot_checks: contract.slot_checks.length,
    device_resilience_cases: contract.device_resilience_checks.length * devices.length,
    recorded_results: slots.filter((slot) => slot.status !== "not_run").length,
    by_status: statusCounts
  },
  slot_check_definitions: contract.slot_checks,
  device_resilience_cases: deviceCases,
  evidence_requirements: contract.evidence_requirements,
  slots
};

function renderMarkdown() {
  const lines = [
    "# Execution-pack ручного QA форм",
    "",
    `Слотов: ${report.summary.total_slots}`,
    `Проверок на слот: ${report.summary.slot_checks}`,
    `Storage-сценариев: ${report.summary.device_resilience_cases}`,
    `Зафиксировано результатов: ${report.summary.recorded_results}`,
    "",
    "> Генерация этого файла не означает выполнение тестов. Результат существует только после записи в data/qa/form-results.json.",
    "",
    "## Проверки каждого слота",
    ""
  ];
  contract.slot_checks.forEach((item) => lines.push(`- ${item.id}: ${item.acceptance}`));
  lines.push("", "## Слоты", "", "| Сценарий | Устройство | Форма | Роль | Статус | Ссылка |", "|---|---|---|---|---|---|");
  slots.forEach((slot) => lines.push(`| ${slot.label} | ${slot.device} | ${slot.form_id} | ${slot.form_role} | ${slot.status} | ${slot.url} |`));
  lines.push("", "## Проверки storage", "");
  deviceCases.forEach((item) => lines.push(`- ${item.device} / ${item.check_id}: ${item.acceptance}`));
  return lines.join("\n");
}

process.stdout.write(`${format === "json" ? JSON.stringify(report, null, 2) : renderMarkdown()}\n`);
