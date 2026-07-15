import fs from "node:fs";
import path from "node:path";

const ROOT = process.cwd();
const SPEC_PATH = path.join(ROOT, "data/operations/lead-lifecycle.json");

function getArg(name, fallback = "") {
  const prefix = `--${name}=`;
  const arg = process.argv.find((item) => item.startsWith(prefix));
  return arg ? arg.slice(prefix.length).trim() : fallback;
}

function csvCell(value) {
  const text = Array.isArray(value) ? value.join(" | ") : String(value ?? "");
  return `"${text.replace(/"/g, '""')}"`;
}

if (!fs.existsSync(SPEC_PATH)) {
  console.error(`Lead lifecycle specification not found: ${SPEC_PATH}`);
  process.exit(1);
}

let spec;
try {
  spec = JSON.parse(fs.readFileSync(SPEC_PATH, "utf8"));
} catch (error) {
  console.error(`Cannot parse lead lifecycle specification: ${error.message}`);
  process.exit(1);
}

const format = getArg("format", "markdown").toLowerCase();
const stateFilter = getArg("state");
const terminalFilter = getArg("terminal");
if (!["markdown", "json", "csv"].includes(format)) {
  console.error(`Unsupported format: ${format}`);
  process.exit(1);
}

let states = Array.isArray(spec.states) ? spec.states : [];
if (stateFilter) states = states.filter((state) => state.id === stateFilter);
if (terminalFilter) {
  const expected = terminalFilter === "true";
  states = states.filter((state) => state.terminal === expected);
}
const visibleStateIds = new Set(states.map((state) => state.id));
let transitions = Array.isArray(spec.transitions) ? spec.transitions : [];
if (stateFilter || terminalFilter) {
  transitions = transitions.filter((transition) => visibleStateIds.has(transition.from) || visibleStateIds.has(transition.to));
}

const outgoingCounts = new Map();
const incomingCounts = new Map();
for (const state of spec.states || []) {
  outgoingCounts.set(state.id, 0);
  incomingCounts.set(state.id, 0);
}
for (const transition of spec.transitions || []) {
  outgoingCounts.set(transition.from, (outgoingCounts.get(transition.from) || 0) + 1);
  incomingCounts.set(transition.to, (incomingCounts.get(transition.to) || 0) + 1);
}

const stateRows = states.map((state) => ({
  state_id: state.id,
  stage_order: state.stage_order,
  terminal: state.terminal,
  purpose: state.purpose,
  required_fields: state.required_fields || [],
  incoming_transitions: incomingCounts.get(state.id) || 0,
  outgoing_transitions: outgoingCounts.get(state.id) || 0
}));

const transitionRows = transitions.map((transition) => ({
  transition_id: transition.id,
  from: transition.from,
  to: transition.to,
  event: transition.event,
  required_outcome: transition.required_outcome || ""
}));

const output = {
  portal_id: spec.portal_id,
  schema_version: spec.schema_version,
  status: spec.status,
  generated_at: new Date().toISOString(),
  rules: spec.rules,
  summary: {
    states: stateRows.length,
    transitions: transitionRows.length,
    terminal_states: stateRows.filter((state) => state.terminal).length,
    nonterminal_states: stateRows.filter((state) => !state.terminal).length
  },
  states: stateRows,
  transitions: transitionRows
};

function renderMarkdown() {
  const lines = [
    "# Жизненный цикл первичного обращения",
    "",
    `Статус: \`${spec.status}\`. Контракт не подключён к CRM.`,
    "",
    "## Состояния",
    "",
    "| Состояние | Порядок | Терминальное | Входов | Выходов | Назначение |",
    "|---|---:|---|---:|---:|---|"
  ];
  stateRows.forEach((row) => {
    lines.push(`| ${row.state_id} | ${row.stage_order} | ${row.terminal ? "да" : "нет"} | ${row.incoming_transitions} | ${row.outgoing_transitions} | ${row.purpose} |`);
  });
  lines.push("", "## Переходы", "", "| Переход | Из | В | Событие | Обязательный результат |", "|---|---|---|---|---|");
  transitionRows.forEach((row) => {
    lines.push(`| ${row.transition_id} | ${row.from} | ${row.to} | ${row.event} | ${row.required_outcome || "—"} |`);
  });
  return lines.join("\n");
}

function renderCsv() {
  const fields = ["transition_id", "from", "to", "event", "required_outcome"];
  return [
    fields.map(csvCell).join(","),
    ...transitionRows.map((row) => fields.map((field) => csvCell(row[field])).join(","))
  ].join("\n");
}

const rendered = format === "json"
  ? JSON.stringify(output, null, 2)
  : format === "csv"
    ? renderCsv()
    : renderMarkdown();

process.stdout.write(`${rendered}\n`);
