import fs from "node:fs";
import path from "node:path";

const ROOT = process.cwd();
const SPEC_PATH = path.join(ROOT, "data/analytics/funnel-report.json");

function getArg(name, fallback = "") {
  const prefix = `--${name}=`;
  const value = process.argv.find((arg) => arg.startsWith(prefix));
  return value ? value.slice(prefix.length).trim() : fallback;
}

function csvCell(value) {
  const text = Array.isArray(value) ? value.join(" | ") : String(value ?? "");
  return `"${text.replace(/"/g, '""')}"`;
}

if (!fs.existsSync(SPEC_PATH)) {
  console.error(`Analytics funnel specification not found: ${SPEC_PATH}`);
  process.exit(1);
}

let spec;
try {
  spec = JSON.parse(fs.readFileSync(SPEC_PATH, "utf8"));
} catch (error) {
  console.error(`Cannot parse analytics funnel specification: ${error.message}`);
  process.exit(1);
}

const format = getArg("format", "markdown").toLowerCase();
const viewId = getArg("view");
const metricType = getArg("type").toLowerCase();
const supportedFormats = new Set(["markdown", "json", "csv"]);
const supportedTypes = new Set(["", "count", "ratio"]);

if (!supportedFormats.has(format)) {
  console.error(`Unsupported format: ${format}. Use markdown, json or csv.`);
  process.exit(1);
}
if (!supportedTypes.has(metricType)) {
  console.error(`Unsupported metric type: ${metricType}. Use count or ratio.`);
  process.exit(1);
}

const allMetrics = Array.isArray(spec.metrics) ? spec.metrics : [];
const allViews = Array.isArray(spec.views) ? spec.views : [];
let selectedViews = allViews;
let selectedMetricIds = new Set(allMetrics.map((metric) => metric.id));

if (viewId) {
  const selected = allViews.find((view) => view.id === viewId);
  if (!selected) {
    console.error(`Unknown view: ${viewId}`);
    process.exit(1);
  }
  selectedViews = [selected];
  selectedMetricIds = new Set(selected.metrics || []);
}

const metrics = allMetrics.filter((metric) => {
  if (!selectedMetricIds.has(metric.id)) return false;
  return !metricType || metric.type === metricType;
});

if (!metrics.length) {
  console.error("No analytics funnel metrics matched the filters.");
  process.exit(1);
}

function metricFormula(metric) {
  if (metric.type === "count") {
    return `count(${metric.source_event})${metric.filter === "none" ? "" : ` where ${metric.filter}`}`;
  }
  return `${metric.numerator_metric} / ${metric.denominator_metric}`;
}

function renderMarkdown() {
  const lines = [
    "# Спецификация отчёта по аналитической воронке",
    "",
    `Статус: \`${spec.status}\`. Документ содержит формулы и допустимые разрезы, но не содержит фактических значений рабочего счётчика.`,
    "",
    "## Правила",
    "",
    `- Каноническая заявка: \`${spec.rules?.canonical_submission_metric}\` из события \`${spec.rules?.canonical_submission_event}\`.`,
    `- Классифицирующее событие не складывается с канонической заявкой: \`${spec.rules?.classified_metrics_are_non_additive_to_canonical ? "да" : "нет"}\`.`,
    `- Деление на ноль возвращает: \`${spec.rules?.ratio_zero_denominator_result === null ? "null" : spec.rules?.ratio_zero_denominator_result}\`.`,
    `- Часовой пояс отчёта: \`${spec.rules?.reporting_timezone}\`.`,
    "",
    "## Метрики",
    "",
    "| ID | Название | Тип | Формула | Разрезы | Не складывать с |",
    "|---|---|---|---|---|---|"
  ];

  metrics.forEach((metric) => {
    lines.push(`| ${metric.id} | ${metric.name} | ${metric.type} | ${metricFormula(metric)} | ${(metric.dimensions || []).join(", ")} | ${(metric.non_additive_to || []).join(", ")} |`);
  });

  lines.push("", "## Представления", "");
  selectedViews.forEach((view) => {
    const visibleMetrics = (view.metrics || []).filter((metricId) => metrics.some((metric) => metric.id === metricId));
    if (!visibleMetrics.length) return;
    lines.push(`### ${view.title}`, "", `Метрики: ${visibleMetrics.map((id) => `\`${id}\``).join(", ")}.`, "", `Разрезы: ${(view.dimensions || []).length ? (view.dimensions || []).map((id) => `\`${id}\``).join(", ") : "без обязательного разреза"}.`, "");
  });

  lines.push("## Контроль качества", "", `Покрытие классификацией ожидается на уровне \`${spec.rules?.reconciliation?.expected_value}\`; предупреждение формируется ниже \`${spec.rules?.reconciliation?.warning_below}\`.`);
  return lines.join("\n");
}

function renderCsv() {
  const fields = [
    "metric_id",
    "name",
    "type",
    "unit",
    "formula",
    "source_event",
    "filter",
    "numerator_metric",
    "denominator_metric",
    "dimensions",
    "non_additive_to",
    "purpose"
  ];

  const rows = metrics.map((metric) => ({
    metric_id: metric.id,
    name: metric.name,
    type: metric.type,
    unit: metric.unit,
    formula: metricFormula(metric),
    source_event: metric.source_event || "",
    filter: metric.filter || "",
    numerator_metric: metric.numerator_metric || "",
    denominator_metric: metric.denominator_metric || "",
    dimensions: metric.dimensions || [],
    non_additive_to: metric.non_additive_to || [],
    purpose: metric.purpose
  }));

  return [
    fields.map(csvCell).join(","),
    ...rows.map((row) => fields.map((field) => csvCell(row[field])).join(","))
  ].join("\n");
}

const output = format === "json"
  ? JSON.stringify({
      portal_id: spec.portal_id,
      schema_version: spec.schema_version,
      status: spec.status,
      rules: spec.rules,
      dimensions: spec.dimensions,
      metrics,
      views: selectedViews
    }, null, 2)
  : format === "csv"
    ? renderCsv()
    : renderMarkdown();

process.stdout.write(`${output}\n`);
