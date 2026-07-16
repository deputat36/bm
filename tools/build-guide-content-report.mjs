import fs from "node:fs";
import path from "node:path";

const ROOT = process.cwd();
const REGISTRY_PATH = path.join(ROOT, "data/content/guides.json");

function getArg(name, fallback = "") {
  const prefix = `--${name}=`;
  const value = process.argv.find((arg) => arg.startsWith(prefix));
  return value ? value.slice(prefix.length).trim().toLowerCase() : fallback;
}

function readJson(filePath) {
  try {
    return JSON.parse(fs.readFileSync(filePath, "utf8"));
  } catch (error) {
    console.error(`Cannot read guide registry: ${error.message}`);
    process.exit(1);
  }
}

function csvCell(value) {
  const text = Array.isArray(value) ? value.join(" | ") : String(value ?? "");
  return `"${text.replace(/"/g, '""')}"`;
}

const registry = readJson(REGISTRY_PATH);
const guides = Array.isArray(registry.guides) ? registry.guides : [];
const format = getArg("format", "markdown");
const supportedFormats = new Set(["markdown", "json", "csv"]);
if (!supportedFormats.has(format)) {
  console.error(`Unsupported format: ${format}`);
  process.exit(1);
}

const rows = guides.map((guide) => ({
  id: guide.id,
  intent: guide.intent,
  topic: guide.topic,
  path: guide.path,
  source_status: guide.source_status,
  source_count: Array.isArray(guide.source_urls) ? guide.source_urls.length : 0,
  content_checked_at: guide.content_checked_at || "",
  editorial_review: guide.editorial_review,
  legal_review: guide.legal_review,
  indexing_status: guide.indexing_status,
  tracked_cta_count: guide.expected_tracked_cta_count,
  placements: guide.allowed_placements || []
}));

const count = (field, value) => rows.filter((row) => row[field] === value).length;
const summary = {
  total_guides: rows.length,
  index_ready: count("indexing_status", "ready"),
  index_blocked: count("indexing_status", "blocked"),
  source_verified: count("source_status", "verified_on_date"),
  source_review_required: count("source_status", "requires_source_review"),
  source_not_applicable: count("source_status", "not_applicable"),
  editorial_passed: count("editorial_review", "passed"),
  legal_passed: count("legal_review", "passed")
};

function renderMarkdown() {
  const lines = [
    "# Готовность материалов справочника",
    "",
    `Всего материалов: ${summary.total_guides}`,
    `Готово к индексации: ${summary.index_ready}`,
    `Заблокировано: ${summary.index_blocked}`,
    `Источники проверены: ${summary.source_verified}`,
    `Требуют проверки источников: ${summary.source_review_required}`,
    `Редакционно принято: ${summary.editorial_passed}`,
    `Юридически принято: ${summary.legal_passed}`,
    "",
    "| Интент | Источники | Редактура | Юридическая проверка | Индексация | CTA |",
    "|---|---|---|---|---|---|"
  ];
  rows.forEach((row) => {
    lines.push(`| ${row.intent} | ${row.source_status} | ${row.editorial_review} | ${row.legal_review} | ${row.indexing_status} | ${row.tracked_cta_count} |`);
  });
  return lines.join("\n");
}

function renderCsv() {
  const fields = [
    "id",
    "intent",
    "topic",
    "path",
    "source_status",
    "source_count",
    "content_checked_at",
    "editorial_review",
    "legal_review",
    "indexing_status",
    "tracked_cta_count",
    "placements"
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
      status: registry.status,
      summary,
      guides: rows
    }, null, 2)
  : format === "csv"
    ? renderCsv()
    : renderMarkdown();

process.stdout.write(`${output}\n`);
