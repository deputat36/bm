import fs from "node:fs";
import path from "node:path";

const ROOT = process.cwd();
const CONTRACT_PATH = path.join(ROOT, "data/operations/commercial-outcome-events.json");
const APPROVAL_PATH = path.join(ROOT, "data/operations/lead-operations-approval.json");

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

const contract = readJson(CONTRACT_PATH);
const approval = readJson(APPROVAL_PATH);
const events = Array.isArray(contract.events) ? contract.events : [];
const closureDecision = (approval.decisions || []).find((item) => item.id === "closure_reason_policy");

const summary = {
  status: contract.status,
  commercial_events: events.length,
  terminal_events: events.filter((item) => item.terminal === true).length,
  non_terminal_events: events.filter((item) => item.terminal === false).length,
  closure_reason_candidates: (contract.closure_reason_policy?.candidate_values_from_owner_register || []).length,
  closure_policy_status: closureDecision?.status || "missing",
  persistence_connected: contract.rules?.persistence_connected === true,
  event_write_enabled: contract.rules?.event_write_enabled === true,
  activation_gates: (contract.activation_gates || []).length
};

function renderMarkdown() {
  const lines = [
    "# План коммерческих outcome events",
    "",
    `Статус: ${summary.status}`,
    `Событий: ${summary.commercial_events}`,
    `Terminal: ${summary.terminal_events}`,
    `Persistence connected: ${summary.persistence_connected ? "да" : "нет"}`,
    `Writes enabled: ${summary.event_write_enabled ? "да" : "нет"}`,
    `Closure policy: ${summary.closure_policy_status}`,
    "",
    "## События",
    "",
    "| Событие | Rank | Terminal | Обязательные поля |",
    "|---|---:|---|---|"
  ];
  events.forEach((event) => {
    lines.push(`| ${event.id} | ${event.stage_rank} | ${event.terminal ? "да" : "нет"} | ${(event.required_non_null_fields || []).join(", ") || "—"} |`);
  });

  lines.push("", "## Draft причин closed_lost", "");
  (contract.closure_reason_policy?.candidate_values_from_owner_register || []).forEach((reason) => lines.push(`- ${reason}`));
  lines.push("", "Этот словарь взят из owner decision register и остаётся неутверждённым до решения closure_reason_policy.");

  lines.push("", "## Activation gates", "");
  (contract.activation_gates || []).forEach((gate) => lines.push(`- ${gate}`));
  return lines.join("\n");
}

const format = getArg("format", "markdown");
if (!new Set(["markdown", "json"]).has(format)) {
  console.error("Unsupported format. Use markdown or json.");
  process.exit(1);
}

process.stdout.write(`${format === "json" ? JSON.stringify({ summary, events, closure_reason_policy: contract.closure_reason_policy, activation_gates: contract.activation_gates }, null, 2) : renderMarkdown()}\n`);
