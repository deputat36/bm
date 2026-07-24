import fs from "node:fs";
import path from "node:path";

const ROOT = process.cwd();

function readJson(relativePath) {
  return JSON.parse(fs.readFileSync(path.join(ROOT, relativePath), "utf8"));
}

function parseArgs(argv) {
  const options = { format: "markdown", event: "", from: "", to: "" };
  for (const arg of argv) {
    if (arg.startsWith("--format=")) options.format = arg.split("=")[1];
    if (arg.startsWith("--event=")) options.event = arg.split("=")[1];
    if (arg.startsWith("--from=")) options.from = arg.split("=")[1];
    if (arg.startsWith("--to=")) options.to = arg.split("=")[1];
  }
  return options;
}

function csvEscape(value) {
  const text = String(value ?? "");
  return /[",\n]/.test(text) ? `"${text.replaceAll('"', '""')}"` : text;
}

const spec = readJson("data/operations/lead-event-log.json");
const lifecycle = readJson(spec.sources.lifecycle_contract);
const options = parseArgs(process.argv.slice(2));
const stateMap = new Map(lifecycle.states.map((state) => [state.id, state]));

const templates = lifecycle.transitions.map((transition) => ({
  template_id: transition.id,
  event_type: transition.event,
  runtime: transition.runtime || "controlled_transition",
  from_state: transition.from,
  to_state: transition.to,
  from_terminal: Boolean(stateMap.get(transition.from)?.terminal),
  to_terminal: Boolean(stateMap.get(transition.to)?.terminal),
  required_outcome: transition.required_outcome || "",
  required_fields: spec.required_event_fields,
  optional_fields: spec.optional_event_fields,
  default_actor_role: transition.runtime === "automatic" ? "portal_system" : spec.rendering.default_actor_role,
  default_source_system: spec.rendering.default_source_system,
  payload_version: spec.rendering.payload_version
}));

const filtered = templates.filter((item) => {
  if (options.event && item.event_type !== options.event) return false;
  if (options.from && item.from_state !== options.from) return false;
  if (options.to && item.to_state !== options.to) return false;
  return true;
});

const result = {
  status: spec.status,
  schema_version: spec.schema_version,
  generated_at: new Date().toISOString(),
  rules: spec.rules,
  event_table: spec.sources.event_table,
  transition_function: spec.sources.transition_function,
  summary: {
    total_templates: templates.length,
    selected_templates: filtered.length,
    append_only: spec.rules.append_only,
    database_append_only_trigger_enabled: spec.rules.database_append_only_trigger_enabled,
    automatic_transition_enabled: spec.rules.automatic_transition_enabled,
    automatic_triage_only: spec.rules.automatic_triage_only,
    automatic_owner_assignment_enabled: spec.rules.automatic_owner_assignment_enabled,
    real_event_records_in_repository_forbidden: spec.rules.real_event_records_in_repository_forbidden,
    crm_connected: spec.rules.crm_connected
  },
  templates: filtered
};

if (options.format === "json") {
  process.stdout.write(`${JSON.stringify(result, null, 2)}\n`);
  process.exit(0);
}

if (options.format === "csv") {
  const columns = [
    "template_id",
    "event_type",
    "runtime",
    "from_state",
    "to_state",
    "to_terminal",
    "required_outcome",
    "default_actor_role",
    "default_source_system",
    "payload_version"
  ];
  console.log(columns.join(","));
  for (const item of filtered) console.log(columns.map((column) => csvEscape(item[column])).join(","));
  process.exit(0);
}

console.log("# Контракт журнала событий обращения\n");
console.log(`Статус: \`${spec.status}\``);
console.log(`Шаблонов событий: **${filtered.length} из ${templates.length}**`);
console.log(`Append-only на уровне базы: **${spec.rules.database_append_only_trigger_enabled ? "да" : "нет"}**`);
console.log(`Автоматический технический переход: **${spec.rules.automatic_triage_only ? "только триаж" : "нет"}**`);
console.log(`Автоматическое назначение владельца: **${spec.rules.automatic_owner_assignment_enabled ? "да" : "нет"}**`);
console.log(`Реальные события разрешено хранить в репозитории: **${spec.rules.real_event_records_in_repository_forbidden ? "нет" : "да"}**\n`);
console.log("| Событие | Режим | Из состояния | В состояние | Терминальное | Обязательный результат |");
console.log("|---|---|---|---|---|---|");
for (const item of filtered) {
  console.log(`| ${item.event_type} | ${item.runtime} | ${item.from_state} | ${item.to_state} | ${item.to_terminal ? "да" : "нет"} | ${item.required_outcome || "—"} |`);
}