import fs from "node:fs";
import path from "node:path";

const ROOT = process.cwd();
const MATRIX_PATH = path.join(ROOT, "data/qa/form-scenarios.json");
const RESULTS_PATH = path.join(ROOT, "data/qa/form-results.json");

function getArg(name, fallback = "") {
  const prefix = `--${name}=`;
  const value = process.argv.find((arg) => arg.startsWith(prefix));
  return value ? value.slice(prefix.length).trim().toLowerCase() : fallback;
}

function readJson(filePath, label) {
  if (!fs.existsSync(filePath)) {
    console.error(`${label} not found: ${filePath}`);
    process.exit(1);
  }
  try {
    return JSON.parse(fs.readFileSync(filePath, "utf8"));
  } catch (error) {
    console.error(`Cannot parse ${label}: ${error.message}`);
    process.exit(1);
  }
}

function csvCell(value) {
  const text = String(value ?? "");
  return `"${text.replace(/"/g, '""')}"`;
}

const matrix = readJson(MATRIX_PATH, "QA matrix");
const resultsFile = readJson(RESULTS_PATH, "QA results");
const format = getArg("format", "markdown");
const deviceFilter = getArg("device", "all");
const statusFilter = getArg("status", "all");
const roleFilter = getArg("role", "all");
const supportedFormats = new Set(["markdown", "json", "csv"]);
const supportedDevices = new Set(["all", ...(matrix.rules?.expected_devices || [])]);
const supportedStatuses = new Set(["all", "not_run", ...(resultsFile.rules?.allowed_statuses || [])]);
const supportedRoles = new Set(["all", "primary", "detailed"]);

if (!supportedFormats.has(format)) {
  console.error(`Unsupported format: ${format}. Use markdown, json or csv.`);
  process.exit(1);
}
if (!supportedDevices.has(deviceFilter)) {
  console.error(`Unsupported device: ${deviceFilter}`);
  process.exit(1);
}
if (!supportedStatuses.has(statusFilter)) {
  console.error(`Unsupported status: ${statusFilter}`);
  process.exit(1);
}
if (!supportedRoles.has(roleFilter)) {
  console.error(`Unsupported role: ${roleFilter}`);
  process.exit(1);
}

const resultMap = new Map(
  (resultsFile.results || []).map((result) => [`${result.scenario_id}__${result.device}`, result])
);

const slots = [];
for (const scenario of matrix.scenarios || []) {
  for (const device of matrix.rules?.expected_devices || []) {
    const key = `${scenario.id}__${device}`;
    const recorded = resultMap.get(key) || null;
    slots.push({
      id: key,
      scenario_id: scenario.id,
      label: scenario.label,
      device,
      form_id: scenario.form_id,
      form_role: scenario.form_role,
      lead_type: scenario.lead_type,
      object_id: scenario.object_id,
      page_path: scenario.page_path,
      status: recorded?.status || resultsFile.rules?.missing_result_status || "not_run",
      tested_at: recorded?.tested_at || "",
      browser: recorded?.browser || "",
      browser_version: recorded?.browser_version || "",
      os: recorded?.os || "",
      os_version: recorded?.os_version || "",
      evidence_reference: recorded?.evidence_reference || "",
      event_log_attached: recorded?.event_log_attached === true,
      notes: recorded?.notes || "",
      recorded: Boolean(recorded)
    });
  }
}

const filtered = slots.filter((slot) => {
  if (deviceFilter !== "all" && slot.device !== deviceFilter) return false;
  if (statusFilter !== "all" && slot.status !== statusFilter) return false;
  if (roleFilter !== "all" && slot.form_role !== roleFilter) return false;
  return true;
});

function countBy(items, field, values) {
  return Object.fromEntries(values.map((value) => [value, items.filter((item) => item[field] === value).length]));
}

const summary = {
  total_slots: slots.length,
  recorded_results: slots.filter((slot) => slot.recorded).length,
  by_status: countBy(slots, "status", ["not_run", "passed", "failed", "blocked"]),
  by_device: countBy(slots, "device", matrix.rules?.expected_devices || []),
  by_role: countBy(slots, "form_role", ["primary", "detailed"]),
  filtered_slots: filtered.length
};

function renderMarkdown() {
  const lines = [
    "# Отчёт ручного QA форм",
    "",
    `Всего слотов: ${summary.total_slots}`,
    `Зафиксировано результатов: ${summary.recorded_results}`,
    `Не проверено: ${summary.by_status.not_run}`,
    `Пройдено: ${summary.by_status.passed}`,
    `Ошибки: ${summary.by_status.failed}`,
    `Заблокировано: ${summary.by_status.blocked}`,
    "",
    "| Сценарий | Устройство | Роль | Форма | Статус | Браузер / ОС | Подтверждение |",
    "|---|---|---|---|---|---|---|"
  ];
  filtered.forEach((slot) => {
    const environment = [slot.browser, slot.browser_version, slot.os, slot.os_version].filter(Boolean).join(" ") || "—";
    lines.push(`| ${slot.label} | ${slot.device} | ${slot.form_role} | ${slot.form_id} | ${slot.status} | ${environment} | ${slot.evidence_reference || "—"} |`);
  });
  return lines.join("\n");
}

function renderCsv() {
  const fields = [
    "id",
    "scenario_id",
    "label",
    "device",
    "form_id",
    "form_role",
    "lead_type",
    "object_id",
    "page_path",
    "status",
    "tested_at",
    "browser",
    "browser_version",
    "os",
    "os_version",
    "evidence_reference",
    "event_log_attached",
    "notes",
    "recorded"
  ];
  return [
    fields.map(csvCell).join(","),
    ...filtered.map((row) => fields.map((field) => csvCell(row[field])).join(","))
  ].join("\n");
}

const output = format === "json"
  ? JSON.stringify({
      portal_id: matrix.portal_id,
      schema_version: resultsFile.schema_version,
      filters: { device: deviceFilter, status: statusFilter, role: roleFilter },
      summary,
      slots: filtered
    }, null, 2)
  : format === "csv"
    ? renderCsv()
    : renderMarkdown();

process.stdout.write(`${output}\n`);
