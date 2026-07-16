import fs from "node:fs";
import path from "node:path";

const ROOT = process.cwd();
const PATHS = {
  contract: "data/content/guide-review-contract.json",
  registry: "data/content/guides.json",
  results: "data/content/guide-review-results.json"
};

function getArg(name, fallback = "") {
  const prefix = `--${name}=`;
  const value = process.argv.find((arg) => arg.startsWith(prefix));
  return value ? value.slice(prefix.length).trim().toLowerCase() : fallback;
}

function readJson(relativePath) {
  try {
    return JSON.parse(fs.readFileSync(path.join(ROOT, relativePath), "utf8"));
  } catch (error) {
    console.error(`Cannot read ${relativePath}: ${error.message}`);
    process.exit(1);
  }
}

function csvCell(value) {
  const text = Array.isArray(value) ? value.join(" | ") : String(value ?? "");
  return `"${text.replace(/"/g, '""')}"`;
}

const contract = readJson(PATHS.contract);
const registry = readJson(PATHS.registry);
const resultsRegistry = readJson(PATHS.results);
const guides = Array.isArray(registry.guides) ? registry.guides : [];
const results = Array.isArray(resultsRegistry.results) ? resultsRegistry.results : [];
const legalNotApplicable = new Set(contract.legal_review_not_applicable_guide_ids || []);

const tasks = guides.flatMap((guide) => {
  const common = {
    guide_id: guide.id,
    intent: guide.intent,
    path: guide.path,
    source_status: guide.source_status,
    indexing_status: guide.indexing_status
  };
  const editorial = {
    ...common,
    task_id: `${guide.id}:editorial`,
    review_type: "editorial",
    current_registry_status: guide.editorial_review,
    applicable: true,
    checks: contract.editorial_checks.map((item) => item.id)
  };
  const legalApplicable = !legalNotApplicable.has(guide.id);
  const legal = {
    ...common,
    task_id: `${guide.id}:legal`,
    review_type: "legal",
    current_registry_status: guide.legal_review,
    applicable: legalApplicable,
    checks: legalApplicable ? contract.legal_checks.map((item) => item.id) : []
  };
  return legalApplicable ? [editorial, legal] : [editorial];
});

const resultMap = new Map(results.map((item) => [`${item.guide_id}:${item.review_type}`, item]));
const rows = tasks.map((task) => {
  const result = resultMap.get(task.task_id) || null;
  return {
    ...task,
    recorded_status: result?.status || "not_run",
    reviewer_reference: result?.reviewer_reference || "",
    checked_at: result?.checked_at || "",
    evidence_count: Array.isArray(result?.evidence) ? result.evidence.length : 0,
    notes: result?.notes || ""
  };
});

const summary = {
  total_guides: guides.length,
  editorial_tasks: rows.filter((item) => item.review_type === "editorial").length,
  legal_tasks: rows.filter((item) => item.review_type === "legal").length,
  total_tasks: rows.length,
  recorded_results: results.length,
  passed: rows.filter((item) => item.recorded_status === "passed").length,
  failed: rows.filter((item) => item.recorded_status === "failed").length,
  blocked: rows.filter((item) => item.recorded_status === "blocked").length,
  not_run: rows.filter((item) => item.recorded_status === "not_run").length
};

function renderMarkdown() {
  const lines = [
    "# Review-пакет материалов справочника",
    "",
    "Этот документ является чек-листом исполнения, а не доказательством выполненной проверки.",
    "",
    `Материалов: ${summary.total_guides}`,
    `Редакционных задач: ${summary.editorial_tasks}`,
    `Юридических задач: ${summary.legal_tasks}`,
    `Всего задач: ${summary.total_tasks}`,
    `Записано результатов: ${summary.recorded_results}`,
    `Не выполнено: ${summary.not_run}`,
    ""
  ];

  rows.forEach((row) => {
    lines.push(`## ${row.intent} — ${row.review_type}`);
    lines.push("");
    lines.push(`Статус: ${row.recorded_status}`);
    lines.push(`Файл: ${row.path}`);
    lines.push(`Источники: ${row.source_status}`);
    lines.push(`Индексация: ${row.indexing_status}`);
    lines.push("");
    lines.push("Проверки:");
    row.checks.forEach((checkId) => {
      const source = row.review_type === "editorial" ? contract.editorial_checks : contract.legal_checks;
      const check = source.find((item) => item.id === checkId);
      lines.push(`- [ ] ${check?.title || checkId}`);
    });
    lines.push("");
  });
  return lines.join("\n");
}

function renderCsv() {
  const fields = [
    "task_id",
    "guide_id",
    "intent",
    "path",
    "review_type",
    "current_registry_status",
    "source_status",
    "indexing_status",
    "recorded_status",
    "reviewer_reference",
    "checked_at",
    "evidence_count",
    "notes"
  ];
  return [
    fields.map(csvCell).join(","),
    ...rows.map((row) => fields.map((field) => csvCell(row[field])).join(","))
  ].join("\n");
}

const format = getArg("format", "markdown");
const supportedFormats = new Set(["markdown", "json", "csv"]);
if (!supportedFormats.has(format)) {
  console.error(`Unsupported format: ${format}`);
  process.exit(1);
}

const output = format === "json"
  ? JSON.stringify({
      portal_id: contract.portal_id,
      schema_version: contract.schema_version,
      status: contract.status,
      summary,
      tasks: rows
    }, null, 2)
  : format === "csv"
    ? renderCsv()
    : renderMarkdown();

process.stdout.write(`${output}\n`);
