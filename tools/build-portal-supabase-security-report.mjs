import fs from "node:fs";
import path from "node:path";

const ROOT = process.cwd();
const SPEC_PATH = path.join(ROOT, "data/security/portal-supabase-security.json");

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
const portalFindings = spec.live_advisor_snapshot?.portal_findings || [];
const sharedFindings = spec.live_advisor_snapshot?.shared_project_findings || [];
const globalFindings = spec.live_advisor_snapshot?.global_project_findings || [];

const summary = {
  status: spec.status,
  advisor_checked_at: spec.live_advisor_snapshot?.checked_at || null,
  portal_advisor_findings: portalFindings.length,
  portal_warn_findings: portalFindings.filter((item) => item.level === "WARN" || item.level === "ERROR").length,
  portal_security_definer_warn_observed: spec.live_advisor_snapshot?.portal_security_definer_warn_observed === true,
  shared_out_of_scope_finding_groups: sharedFindings.length,
  global_shared_finding_groups: globalFindings.length,
  out_of_scope_mutation_forbidden: spec.ownership?.out_of_scope_mutation_forbidden_from_portal_work === true
};

function renderMarkdown() {
  const lines = [
    "# Portal Supabase security scope",
    "",
    `Статус: ${summary.status}`,
    `Live Security Advisor: ${summary.advisor_checked_at || "не проверен"}`,
    `Portal-owned findings: ${summary.portal_advisor_findings}`,
    `Portal WARN/ERROR: ${summary.portal_warn_findings}`,
    `Portal SECURITY DEFINER warn: ${summary.portal_security_definer_warn_observed ? "да" : "нет"}`,
    "",
    "## Portal-owned advisor findings",
    ""
  ];
  portalFindings.forEach((item) => lines.push(`- ${item.level} ${item.lint}: ${item.entity} — ${item.classification}`));
  lines.push("", "## Shared project — out of portal scope", "");
  sharedFindings.forEach((item) => lines.push(`- ${item.level} ${item.lint}: ${item.scope} — ${item.classification}`));
  globalFindings.forEach((item) => lines.push(`- ${item.level} ${item.lint}: ${item.scope} — ${item.classification}`));
  lines.push("", "Portal work must not claim these shared-project findings fixed unless a separate scoped change and live Advisor verification are completed.");
  return lines.join("\n");
}

const format = getArg("format", "markdown");
if (!new Set(["markdown", "json"]).has(format)) {
  console.error("Unsupported format. Use markdown or json.");
  process.exit(1);
}

process.stdout.write(`${format === "json" ? JSON.stringify({ summary, portal_findings: portalFindings, shared_findings: sharedFindings, global_findings: globalFindings }, null, 2) : renderMarkdown()}\n`);
