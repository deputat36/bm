import fs from "node:fs";
import path from "node:path";

const ROOT = process.cwd();
const SPEC_PATH = path.join(ROOT, "data/performance/portal-supabase-performance.json");

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
const indexes = Array.isArray(spec.prelaunch_indexes) ? spec.prelaunch_indexes : [];
const byTable = Object.fromEntries([...new Set(indexes.map((item) => item.table))].sort().map((table) => [table, indexes.filter((item) => item.table === table).length]));
const summary = {
  status: spec.status,
  advisor_checked_at: spec.live_advisor_snapshot?.checked_at || null,
  portal_warn_or_error_count: Number(spec.live_advisor_snapshot?.portal_warn_or_error_count || 0),
  portal_unused_index_info_count: Number(spec.live_advisor_snapshot?.portal_info_count || 0),
  registered_prelaunch_indexes: indexes.length,
  tables_with_registered_indexes: Object.keys(byTable).length,
  minimum_real_leads_for_review: spec.usage_review_gate?.minimum_real_leads ?? null,
  minimum_live_days_for_review: spec.usage_review_gate?.minimum_live_days ?? null,
  prelaunch_drop_forbidden: spec.rules?.prelaunch_index_drop_forbidden === true
};

function renderMarkdown() {
  const lines = [
    "# Portal Supabase performance scope",
    "",
    `Статус: ${summary.status}`,
    `Advisor snapshot: ${summary.advisor_checked_at || "—"}`,
    `Portal WARN/ERROR: ${summary.portal_warn_or_error_count}`,
    `Portal unused-index INFO: ${summary.portal_unused_index_info_count}`,
    `Prelaunch indexes: ${summary.registered_prelaunch_indexes}`,
    "",
    "## Индексы",
    "",
    "| Индекс | Таблица | Назначение |",
    "|---|---|---|"
  ];
  indexes.forEach((item) => lines.push(`| ${item.name} | ${item.table} | ${item.purpose} |`));
  lines.push("", "## Review gate", "");
  lines.push(`- минимум реальных обращений: ${summary.minimum_real_leads_for_review}`);
  lines.push(`- минимум live-дней: ${summary.minimum_live_days_for_review}`);
  lines.push("- нужны оба условия и evidence из pg_stat_user_indexes + query paths/plans + повторного Advisor.");
  return lines.join("\n");
}

const format = getArg("format", "markdown");
if (!new Set(["markdown", "json"]).has(format)) {
  console.error("Unsupported format. Use markdown or json.");
  process.exit(1);
}
process.stdout.write(`${format === "json" ? JSON.stringify({ summary, by_table: byTable, indexes }, null, 2) : renderMarkdown()}\n`);
