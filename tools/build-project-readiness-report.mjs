import fs from "node:fs";
import path from "node:path";

const ROOT = process.cwd();
const PROJECT_INDEX_PATH = path.join(ROOT, "data/projects/index.json");

function getArg(name, fallback = "") {
  const prefix = `--${name}=`;
  const value = process.argv.find((arg) => arg.startsWith(prefix));
  return value ? value.slice(prefix.length).trim() : fallback;
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

function repoPath(value) {
  return String(value || "").replace(/^\/+/, "");
}

function resolvePageFile(url) {
  const clean = String(url || "").replace(/^\/+/, "").replace(/\/+$/, "");
  return clean ? path.join(ROOT, clean, "index.html") : path.join(ROOT, "index.html");
}

function readPageNoindex(url) {
  const filePath = resolvePageFile(url);
  if (!fs.existsSync(filePath)) return false;
  const html = fs.readFileSync(filePath, "utf8");
  return html.includes('content="noindex,follow"') || html.includes("content='noindex,follow'");
}

function csvCell(value) {
  const text = Array.isArray(value) ? value.join(" | ") : String(value ?? "");
  return `"${text.replace(/"/g, '""')}"`;
}

function buildProjectRow(indexEntry) {
  const dataPath = path.join(ROOT, repoPath(indexEntry.data_file));
  const project = readJson(dataPath, `project ${indexEntry.id}`);
  const verificationRelative = repoPath(indexEntry.verification_file || project.verification_file);
  const verificationPath = verificationRelative ? path.join(ROOT, verificationRelative) : "";
  const verification = verificationPath && fs.existsSync(verificationPath)
    ? readJson(verificationPath, `verification ${indexEntry.id}`)
    : null;
  const pageUrl = indexEntry.portal_detail_url || indexEntry.detail_url || project.detail_url || "";
  const sources = Array.isArray(verification?.sources) ? verification.sources : [];
  const claims = Array.isArray(verification?.claims) ? verification.claims : [];
  const criticalClaims = claims.filter((claim) => claim.importance === "critical");
  const confirmedCritical = criticalClaims.filter((claim) => claim.verification_status === "confirmed");
  const verifiedSources = sources.filter((source) => source.status === "verified" && String(source.reference || "").trim());
  const missingReferenceSources = sources.filter((source) => !String(source.reference || "").trim());
  const neededSources = Array.isArray(project.needed_sources) ? project.needed_sources : [];
  const pageNoindex = readPageNoindex(pageUrl);
  const blockers = [];

  if (!verification) blockers.push("verification_file_missing");
  if (verification && missingReferenceSources.length) blockers.push("source_references_missing");
  if (verification && confirmedCritical.length < criticalClaims.length) blockers.push("critical_claims_unconfirmed");
  if (!project.builder_id && !project.developer_id) blockers.push("developer_unconfirmed");
  if (!project.is_public_ready) blockers.push("project_not_public_ready");
  if (!pageNoindex && !project.is_public_ready) blockers.push("noindex_guard_missing");
  if (neededSources.length) blockers.push("needed_sources_not_collected");

  const readinessStatus = project.is_public_ready
    ? "public_ready"
    : verification
      ? "requires_recheck"
      : "requires_sources";

  return {
    project_id: indexEntry.id,
    portal_slug: indexEntry.portal_slug || indexEntry.slug,
    display_name: indexEntry.display_name || indexEntry.name,
    page_url: pageUrl,
    verification_status: indexEntry.verification_status || project.verification_status || "",
    readiness_status: readinessStatus,
    is_public_ready: Boolean(project.is_public_ready),
    page_noindex: pageNoindex,
    last_checked_at: project.last_checked_at || indexEntry.last_checked_at || "",
    verification_file: verificationRelative || "",
    sources_total: sources.length,
    sources_verified: verifiedSources.length,
    sources_missing_reference: missingReferenceSources.length,
    claims_total: claims.length,
    critical_claims_total: criticalClaims.length,
    critical_claims_confirmed: confirmedCritical.length,
    needed_sources_total: neededSources.length,
    needed_sources: neededSources,
    blockers,
    lead_collection_allowed: Boolean(project.publication_rules?.can_collect_preliminary_leads ?? true),
    confirmed_fact_publication_allowed: Boolean(project.is_public_ready)
  };
}

const index = readJson(PROJECT_INDEX_PATH, "project index");
if (!Array.isArray(index)) {
  console.error("Project index must be an array.");
  process.exit(1);
}

const activeProjects = index.filter((item) => item.is_active !== false);
let rows = activeProjects.map(buildProjectRow);
const statusFilter = getArg("status", "all").toLowerCase();
if (statusFilter !== "all") {
  rows = rows.filter((row) => row.readiness_status.toLowerCase() === statusFilter);
}
if (!rows.length) {
  console.error(`No project readiness rows found for status=${statusFilter}`);
  process.exit(1);
}

const summary = {
  total_projects: activeProjects.length,
  public_ready: activeProjects.map(buildProjectRow).filter((row) => row.readiness_status === "public_ready").length,
  requires_recheck: activeProjects.map(buildProjectRow).filter((row) => row.readiness_status === "requires_recheck").length,
  requires_sources: activeProjects.map(buildProjectRow).filter((row) => row.readiness_status === "requires_sources").length,
  projects_with_verified_sources: activeProjects.map(buildProjectRow).filter((row) => row.sources_verified > 0).length,
  projects_with_noindex: activeProjects.map(buildProjectRow).filter((row) => row.page_noindex).length
};

function renderMarkdown() {
  const lines = [
    "# Готовность объектов к публикации",
    "",
    `Всего объектов: ${summary.total_projects}`,
    `Готово к публичной публикации: ${summary.public_ready}`,
    `Требует повторной проверки: ${summary.requires_recheck}`,
    `Требует первичных источников: ${summary.requires_sources}`,
    "",
    "| Объект | Статус | Источники | Critical claims | Noindex | Блокеры |",
    "|---|---|---:|---:|---|---|"
  ];
  rows.forEach((row) => {
    lines.push(`| ${row.display_name} | ${row.readiness_status} | ${row.sources_verified}/${row.sources_total} verified | ${row.critical_claims_confirmed}/${row.critical_claims_total} confirmed | ${row.page_noindex ? "да" : "нет"} | ${row.blockers.join(", ") || "нет"} |`);
  });
  return lines.join("\n");
}

function renderCsv() {
  const fields = [
    "project_id",
    "portal_slug",
    "display_name",
    "page_url",
    "verification_status",
    "readiness_status",
    "is_public_ready",
    "page_noindex",
    "last_checked_at",
    "verification_file",
    "sources_total",
    "sources_verified",
    "sources_missing_reference",
    "claims_total",
    "critical_claims_total",
    "critical_claims_confirmed",
    "needed_sources_total",
    "needed_sources",
    "blockers",
    "lead_collection_allowed",
    "confirmed_fact_publication_allowed"
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
  ? JSON.stringify({ summary, projects: rows }, null, 2)
  : format === "csv"
    ? renderCsv()
    : renderMarkdown();

process.stdout.write(`${output}\n`);
