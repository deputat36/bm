import fs from "node:fs";
import path from "node:path";

const ROOT = process.cwd();
const SPEC_PATH = path.join(ROOT, "data/analytics/internal-outcomes.json");

function getArg(name, fallback = "") {
  const prefix = `--${name}=`;
  const arg = process.argv.find((item) => item.startsWith(prefix));
  return arg ? arg.slice(prefix.length).trim().toLowerCase() : fallback;
}

function readJson(filePath) {
  try {
    return JSON.parse(fs.readFileSync(filePath, "utf8"));
  } catch (error) {
    console.error(`Cannot read ${path.relative(ROOT, filePath)}: ${error.message}`);
    process.exit(1);
  }
}

const spec = readJson(SPEC_PATH);
const canonical = Array.isArray(spec.canonical_outcome_events) ? spec.canonical_outcome_events : [];
const derived = Array.isArray(spec.derived_internal_metrics) ? spec.derived_internal_metrics : [];
const dimensions = Array.isArray(spec.dimensions) ? spec.dimensions : [];
const gaps = Array.isArray(spec.known_gaps) ? spec.known_gaps : [];

const summary = {
  canonical_events: canonical.length,
  canonical_available: canonical.filter((item) => item.coverage === "available").length,
  canonical_schema_gaps: canonical.filter((item) => item.coverage === "schema_gap").length,
  derived_metrics: derived.length,
  reporting_dimensions: dimensions.length,
  server_dimensions: dimensions.filter((item) => item.availability === "server_record").length,
  dimension_schema_gaps: dimensions.filter((item) => item.availability === "schema_gap").length,
  known_gaps: gaps.length,
  live_export_enabled: spec.rules?.live_export_enabled === true,
  cost_data_connected: spec.rules?.cost_data_connected === true
};

function renderMarkdown() {
  const lines = [
    "# Спецификация внутренней outcome-аналитики",
    "",
    "Этот отчёт описывает доступность защищённых метрик. Он не содержит реальных обращений и не является live dashboard.",
    "",
    `Канонических outcome-событий: ${summary.canonical_events}`,
    `Доступно из текущей server schema: ${summary.canonical_available}`,
    `Требуют расширения schema/events: ${summary.canonical_schema_gaps}`,
    `Измерений: ${summary.reporting_dimensions} (${summary.server_dimensions} доступны, ${summary.dimension_schema_gaps} gap)`,
    `Live export: ${summary.live_export_enabled ? "включён" : "выключен"}`,
    "",
    "## Канонические события",
    "",
    "| Событие | Покрытие | Источник |",
    "|---|---|---|"
  ];

  canonical.forEach((item) => {
    lines.push(`| ${item.id} | ${item.coverage} | ${item.source || "—"} |`);
  });

  lines.push("", "## Измерения", "", "| Измерение | Доступность | Источник |", "|---|---|---|");
  dimensions.forEach((item) => {
    lines.push(`| ${item.id} | ${item.availability} | ${item.source || "—"} |`);
  });

  lines.push("", "## Известные блокеры", "");
  gaps.forEach((gap) => lines.push(`- ${gap}`));

  return lines.join("\n");
}

const format = getArg("format", "markdown");
if (!new Set(["markdown", "json"]).has(format)) {
  console.error("Unsupported format. Use markdown or json.");
  process.exit(1);
}

const output = format === "json"
  ? JSON.stringify({
      schema_version: spec.schema_version,
      status: spec.status,
      summary,
      canonical_events: canonical,
      derived_metrics: derived,
      dimensions,
      known_gaps: gaps
    }, null, 2)
  : renderMarkdown();

process.stdout.write(`${output}\n`);
