import fs from "node:fs";
import path from "node:path";

const ROOT = process.cwd();
const REGISTRY_PATH = path.join(ROOT, "data/research/source-collection.json");

function getArg(name, fallback = "") {
  const prefix = `--${name}=`;
  const value = process.argv.find((arg) => arg.startsWith(prefix));
  return value ? value.slice(prefix.length).trim() : fallback;
}

function readJson(filePath) {
  if (!fs.existsSync(filePath)) {
    console.error(`Source collection registry not found: ${filePath}`);
    process.exit(1);
  }
  try {
    return JSON.parse(fs.readFileSync(filePath, "utf8"));
  } catch (error) {
    console.error(`Cannot parse source collection registry: ${error.message}`);
    process.exit(1);
  }
}

function csvCell(value) {
  const text = Array.isArray(value) ? value.join(" | ") : String(value ?? "");
  return `"${text.replace(/"/g, '""')}"`;
}

const registry = readJson(REGISTRY_PATH);
const projectFilter = getArg("project", "all").toLowerCase();
const statusFilter = getArg("status", "all").toLowerCase();
const priorityFilter = getArg("priority", "all").toLowerCase();
const projects = Array.isArray(registry.projects) ? registry.projects : [];
const allRows = projects.flatMap((project) => {
  const tasks = Array.isArray(project.tasks) ? project.tasks : [];
  return tasks.map((task) => ({
    project_id: project.project_id,
    portal_slug: project.portal_slug,
    display_name: project.display_name,
    page_url: project.page_url,
    collection_status: project.collection_status,
    task_id: task.id,
    source_type: task.source_type,
    title: task.title,
    priority: task.priority,
    status: task.status,
    authority: task.authority,
    reference: task.reference || "",
    verified_at: task.verified_at || "",
    evidence_note: task.evidence_note || "",
    expected_identifiers: task.expected_identifiers || {},
    acceptance_criteria: task.acceptance_criteria || [],
    blocks_claims: task.blocks_claims || [],
    notes: task.notes || ""
  }));
});

let rows = allRows;
if (projectFilter !== "all") {
  rows = rows.filter((row) => row.project_id.toLowerCase() === projectFilter || row.portal_slug.toLowerCase() === projectFilter);
}
if (statusFilter !== "all") {
  rows = rows.filter((row) => row.status.toLowerCase() === statusFilter);
}
if (priorityFilter !== "all") {
  rows = rows.filter((row) => row.priority.toLowerCase() === priorityFilter);
}
if (!rows.length) {
  console.error(`No source collection tasks found for project=${projectFilter}, status=${statusFilter}, priority=${priorityFilter}`);
  process.exit(1);
}

const statusNames = ["missing", "candidate_found", "review_required", "accepted", "rejected", "not_applicable"];
const summary = {
  total_projects: projects.length,
  total_tasks: allRows.length,
  critical_tasks: allRows.filter((row) => row.priority === "critical").length,
  pending_tasks: allRows.filter((row) => !["accepted", "not_applicable"].includes(row.status)).length,
  by_status: Object.fromEntries(statusNames.map((status) => [status, allRows.filter((row) => row.status === status).length])),
  by_project: Object.fromEntries(projects.map((project) => {
    const projectRows = allRows.filter((row) => row.project_id === project.project_id);
    const nextTask = projectRows.find((row) => row.status === "missing") || projectRows.find((row) => !["accepted", "not_applicable"].includes(row.status));
    return [project.project_id, {
      collection_status: project.collection_status,
      total_tasks: projectRows.length,
      accepted: projectRows.filter((row) => row.status === "accepted").length,
      pending: projectRows.filter((row) => !["accepted", "not_applicable"].includes(row.status)).length,
      next_task_id: nextTask?.task_id || "",
      next_task_title: nextTask?.title || ""
    }];
  }))
};

function renderMarkdown() {
  const lines = [
    "# Очередь сбора первичных источников",
    "",
    `Всего объектов: ${summary.total_projects}`,
    `Всего задач: ${summary.total_tasks}`,
    `Критических задач: ${summary.critical_tasks}`,
    `Незавершённых задач: ${summary.pending_tasks}`,
    `Принято источников: ${summary.by_status.accepted}`,
    "",
    "| Объект | Задача | Тип источника | Приоритет | Статус | Блокирует |",
    "|---|---|---|---|---|---|"
  ];
  rows.forEach((row) => {
    lines.push(`| ${row.display_name} | ${row.title} | ${row.source_type} | ${row.priority} | ${row.status} | ${row.blocks_claims.join(", ")} |`);
  });
  lines.push("", "## Следующее действие по объектам", "");
  for (const project of projects) {
    const item = summary.by_project[project.project_id];
    lines.push(`- ${project.display_name}: ${item.next_task_title || "очередь завершена"} (${item.next_task_id || "ready"}).`);
  }
  return lines.join("\n");
}

function renderCsv() {
  const fields = [
    "project_id",
    "portal_slug",
    "display_name",
    "page_url",
    "collection_status",
    "task_id",
    "source_type",
    "title",
    "priority",
    "status",
    "authority",
    "reference",
    "verified_at",
    "evidence_note",
    "acceptance_criteria",
    "blocks_claims",
    "notes"
  ];
  return [
    fields.map(csvCell).join(","),
    ...rows.map((row) => fields.map((field) => csvCell(row[field])).join(","))
  ].join("\n");
}

const format = getArg("format", "markdown").toLowerCase();
const supportedFormats = new Set(["markdown", "json", "csv"]);
if (!supportedFormats.has(format)) {
  console.error(`Unsupported format: ${format}. Use markdown, json or csv.`);
  process.exit(1);
}

const output = format === "json"
  ? JSON.stringify({ summary, tasks: rows }, null, 2)
  : format === "csv"
    ? renderCsv()
    : renderMarkdown();

process.stdout.write(`${output}\n`);
