import fs from "node:fs";
import path from "node:path";

const ROOT = process.cwd();
const SPEC_PATH = path.join(ROOT, "data/analytics/phone-cta-report.json");
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

function getAttribute(tag, name) {
  const match = tag.match(new RegExp(`${name}=["']([^"']*)["']`, "i"));
  return match?.[1]?.trim() || "";
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

const spec = readJson(SPEC_PATH, "phone CTA specification");
const matrix = readJson(MATRIX_PATH, "form QA matrix");
const format = getArg("format", "markdown").toLowerCase();
const pageFilter = getArg("page");
const objectFilter = getArg("object");
const supported = new Set(["markdown", "json", "csv"]);
if (!supported.has(format)) {
  console.error(`Unsupported format: ${format}. Use markdown, json or csv.`);
  process.exit(1);
}

const pages = new Map();
for (const scenario of matrix.scenarios || []) {
  if (!pages.has(scenario.page_file)) {
    pages.set(scenario.page_file, {
      page_file: scenario.page_file,
      page_path: scenario.page_path,
      object_ids: new Set()
    });
  }
  if (scenario.object_id) pages.get(scenario.page_file).object_ids.add(scenario.object_id);
}

const links = [];
for (const page of pages.values()) {
  const fullPath = path.join(ROOT, page.page_file);
  if (!fs.existsSync(fullPath)) continue;
  const html = fs.readFileSync(fullPath, "utf8");
  const anchors = html.match(/<a\b[^>]*href=["'][^"']+["'][^>]*>/gi) || [];
  for (const tag of anchors) {
    const href = getAttribute(tag, "href");
    if (!href.toLowerCase().startsWith("tel:")) continue;
    links.push({
      page_file: page.page_file,
      page_path: page.page_path,
      placement: getAttribute(tag, "data-track-placement"),
      object_id: getAttribute(tag, "data-track-object") || "all-newbuilds",
      action: getAttribute(tag, "data-track-action"),
      phone_target: "primary_sales_phone",
      href_normalized: /^tel:\+7\d{10}$/.test(href)
    });
  }
}

const filteredLinks = links.filter((item) => {
  if (pageFilter && item.page_path !== pageFilter && item.page_file !== pageFilter) return false;
  if (objectFilter && item.object_id !== objectFilter) return false;
  return true;
});

if (!filteredLinks.length) {
  console.error("No phone CTA links matched the filters.");
  process.exit(1);
}

const placements = [...new Set(filteredLinks.map((item) => item.placement))].sort();
const objects = [...new Set(filteredLinks.map((item) => item.object_id))].sort();
const pagePaths = [...new Set(filteredLinks.map((item) => item.page_path))].sort();

function renderMarkdown() {
  const lines = [
    "# Спецификация и инвентарь телефонных CTA",
    "",
    `Статус: \`${spec.status}\`. Клик по номеру не подтверждает звонок, соединение или разговор.`,
    "",
    "## Метрики",
    "",
    "| ID | Название | Формула | Разрезы |",
    "|---|---|---|---|"
  ];
  for (const metric of spec.metrics || []) {
    const formula = metric.type === "count"
      ? `count(${metric.source_event}) where ${metric.filter}`
      : `${metric.numerator_metric} / ${metric.denominator_metric}`;
    lines.push(`| ${metric.id} | ${metric.name} | ${formula} | ${(metric.dimensions || []).join(", ")} |`);
  }
  lines.push(
    "",
    "## Инвентарь активных ссылок",
    "",
    "| Страница | Размещение | Объект | Action | Номер нормализован |",
    "|---|---|---|---|---|"
  );
  filteredLinks.forEach((item) => {
    lines.push(`| ${item.page_path} | ${item.placement} | ${item.object_id} | ${item.action} | ${item.href_normalized ? "да" : "нет"} |`);
  });
  lines.push(
    "",
    `Всего ссылок: ${filteredLinks.length}. Страниц: ${pagePaths.length}. Размещений: ${placements.length}. Объектов: ${objects.length}.`,
    "",
    "Фактический номер телефона намеренно не экспортируется в отчёт."
  );
  return lines.join("\n");
}

function renderCsv() {
  const fields = ["page_file", "page_path", "placement", "object_id", "action", "phone_target", "href_normalized"];
  return [
    fields.map(csvCell).join(","),
    ...filteredLinks.map((row) => fields.map((field) => csvCell(row[field])).join(","))
  ].join("\n");
}

const output = format === "json"
  ? JSON.stringify({
      portal_id: spec.portal_id,
      schema_version: spec.schema_version,
      status: spec.status,
      rules: spec.rules,
      metrics: spec.metrics,
      views: spec.views,
      summary: {
        phone_links: filteredLinks.length,
        pages: pagePaths.length,
        placements: placements.length,
        objects: objects.length
      },
      placements,
      objects,
      pages: pagePaths,
      links: filteredLinks
    }, null, 2)
  : format === "csv"
    ? renderCsv()
    : renderMarkdown();

process.stdout.write(`${output}\n`);
