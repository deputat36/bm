import fs from "node:fs";
import path from "node:path";

const ROOT = process.cwd();
const REGISTRY_PATH = path.join(ROOT, "data/analytics/events.json");

function getArg(name, fallback = "") {
  const prefix = `--${name}=`;
  const value = process.argv.find((arg) => arg.startsWith(prefix));
  return value ? value.slice(prefix.length).trim() : fallback;
}

function csvCell(value) {
  const text = Array.isArray(value) ? value.join(" | ") : String(value ?? "");
  return `"${text.replace(/"/g, '""')}"`;
}

if (!fs.existsSync(REGISTRY_PATH)) {
  console.error(`Analytics registry not found: ${REGISTRY_PATH}`);
  process.exit(1);
}

let registry;
try {
  registry = JSON.parse(fs.readFileSync(REGISTRY_PATH, "utf8"));
} catch (error) {
  console.error(`Cannot parse analytics registry: ${error.message}`);
  process.exit(1);
}

const format = getArg("format", "markdown").toLowerCase();
const supported = new Set(["markdown", "json", "csv"]);
if (!supported.has(format)) {
  console.error(`Unsupported format: ${format}. Use markdown, json or csv.`);
  process.exit(1);
}

const rows = (registry.events || []).map((event) => ({
  event_id: event.id,
  stage: event.stage,
  metric_role: event.metric_role,
  count_rule: event.count_rule,
  count_filter: event.count_filter,
  required_fields: event.required_fields || [],
  optional_fields: event.optional_fields || [],
  source_file: event.source_file,
  purpose: event.purpose,
  additive: !(event.must_not_add_to || []).length
}));

if (!rows.length) {
  console.error("Analytics registry contains no events.");
  process.exit(1);
}

function renderMarkdown() {
  const lines = [
    "| Событие | Этап | Роль метрики | Правило подсчёта | Фильтр | Обязательные поля |",
    "|---|---|---|---|---|---|"
  ];
  rows.forEach((row) => {
    lines.push(`| ${row.event_id} | ${row.stage} | ${row.metric_role} | ${row.count_rule} | ${row.count_filter} | ${row.required_fields.join(", ")} |`);
  });
  return lines.join("\n");
}

function renderCsv() {
  const fields = [
    "event_id",
    "stage",
    "metric_role",
    "count_rule",
    "count_filter",
    "required_fields",
    "optional_fields",
    "source_file",
    "purpose",
    "additive"
  ];
  return [
    fields.map(csvCell).join(","),
    ...rows.map((row) => fields.map((field) => csvCell(row[field])).join(","))
  ].join("\n");
}

const output = format === "json"
  ? JSON.stringify({
      portal_id: registry.portal_id,
      schema_version: registry.schema_version,
      rules: registry.rules,
      events: rows
    }, null, 2)
  : format === "csv"
    ? renderCsv()
    : renderMarkdown();

process.stdout.write(`${output}\n`);
