import fs from "node:fs";
import path from "node:path";

const ROOT = process.cwd();
const MATRIX_PATH = path.join(ROOT, "data/qa/form-scenarios.json");

function getArg(name, fallback = "") {
  const prefix = `--${name}=`;
  const value = process.argv.find((arg) => arg.startsWith(prefix));
  return value ? value.slice(prefix.length).trim() : fallback;
}

function csvCell(value) {
  const text = Array.isArray(value) ? value.join(" | ") : String(value ?? "");
  return `"${text.replace(/"/g, '""')}"`;
}

if (!fs.existsSync(MATRIX_PATH)) {
  console.error(`QA matrix not found: ${MATRIX_PATH}`);
  process.exit(1);
}

let matrix;
try {
  matrix = JSON.parse(fs.readFileSync(MATRIX_PATH, "utf8"));
} catch (error) {
  console.error(`Cannot parse QA matrix: ${error.message}`);
  process.exit(1);
}

const format = getArg("format", "markdown").toLowerCase();
const roleFilter = getArg("role", "all").toLowerCase();
const supportedFormats = new Set(["markdown", "json", "csv"]);
const supportedRoles = new Set(["all", "primary", "detailed"]);

if (!supportedFormats.has(format)) {
  console.error(`Unsupported format: ${format}. Use markdown, json or csv.`);
  process.exit(1);
}
if (!supportedRoles.has(roleFilter)) {
  console.error(`Unsupported role: ${roleFilter}. Use all, primary or detailed.`);
  process.exit(1);
}

function buildUrl(scenario) {
  const url = new URL(scenario.page_path, matrix.base_url);
  Object.entries(matrix.test_parameters || {}).forEach(([key, value]) => {
    url.searchParams.set(key, String(value));
  });
  url.hash = scenario.anchor;
  return url.toString();
}

const scenarios = Array.isArray(matrix.scenarios) ? matrix.scenarios : [];
const filtered = roleFilter === "all"
  ? scenarios
  : scenarios.filter((scenario) => scenario.form_role === roleFilter);

const rows = filtered.map((scenario) => ({
  id: scenario.id,
  label: scenario.label,
  page_path: scenario.page_path,
  form_id: scenario.form_id,
  form_role: scenario.form_role,
  lead_type: scenario.lead_type,
  object_id: scenario.object_id,
  anchor: scenario.anchor,
  url: buildUrl(scenario),
  devices: matrix.rules?.expected_devices || [],
  required_events: matrix.required_events || [],
  optional_events: matrix.optional_events || []
}));

if (!rows.length) {
  console.error(`No QA scenarios found for role=${roleFilter}`);
  process.exit(1);
}

function renderMarkdown() {
  const lines = [
    "| Сценарий | Роль | Форма | Объект | Готовая ссылка |",
    "|---|---|---|---|---|"
  ];
  rows.forEach((row) => {
    lines.push(`| ${row.label} | ${row.form_role} | ${row.form_id} | ${row.object_id} | ${row.url} |`);
  });
  return lines.join("\n");
}

function renderCsv() {
  const fields = [
    "id",
    "label",
    "page_path",
    "form_id",
    "form_role",
    "lead_type",
    "object_id",
    "anchor",
    "url",
    "devices",
    "required_events",
    "optional_events"
  ];
  return [
    fields.map(csvCell).join(","),
    ...rows.map((row) => fields.map((field) => csvCell(row[field])).join(","))
  ].join("\n");
}

const output = format === "json"
  ? JSON.stringify({
      portal_id: matrix.portal_id,
      schema_version: matrix.schema_version,
      role_filter: roleFilter,
      test_parameters: matrix.test_parameters,
      scenarios: rows
    }, null, 2)
  : format === "csv"
    ? renderCsv()
    : renderMarkdown();

process.stdout.write(`${output}\n`);
