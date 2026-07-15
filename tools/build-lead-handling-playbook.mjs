import fs from "node:fs";
import path from "node:path";

const ROOT = process.cwd();
const SPEC_PATH = path.join(ROOT, "data/operations/lead-handling.json");

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
  console.error(`Lead handling specification not found: ${SPEC_PATH}`);
  process.exit(1);
}

let spec;
try {
  spec = JSON.parse(fs.readFileSync(SPEC_PATH, "utf8"));
} catch (error) {
  console.error(`Cannot parse lead handling specification: ${error.message}`);
  process.exit(1);
}

const format = getArg("format", "markdown").toLowerCase();
const priorityFilter = getArg("priority");
const roleFilter = getArg("form-role");
const typeFilter = getArg("lead-type");
const objectFilter = getArg("object");
if (!["markdown", "json", "csv"].includes(format)) {
  console.error(`Unsupported format: ${format}`);
  process.exit(1);
}

const priorities = spec.priority_bands || [];
const roles = spec.form_roles || [];
const leadTypes = spec.lead_types || [];

let routes = [];
for (const priority of priorities) {
  for (const role of roles) {
    for (const leadType of leadTypes) {
      routes.push({
        route_id: `${priority.id}_${role.id}_${leadType.id}`,
        priority: priority.id,
        urgency_rank: priority.urgency_rank,
        response_guidance: priority.response_guidance,
        form_role: role.id,
        lead_type: leadType.id,
        first_action: priority.first_action,
        conversation_goal: role.conversation_goal,
        collect_if_missing: role.collect_if_missing || [],
        first_questions: leadType.first_questions || [],
        required_outcome: `${priority.required_outcome} ${role.required_outcome} ${leadType.required_outcome}`.replace(/\s+/g, " ").trim(),
        source_check_required_by_default: Boolean(leadType.source_check_required_by_default),
        allowed_next_actions: leadType.allowed_next_actions || []
      });
    }
  }
}

if (priorityFilter) routes = routes.filter((row) => row.priority === priorityFilter);
if (roleFilter) routes = routes.filter((row) => row.form_role === roleFilter);
if (typeFilter) routes = routes.filter((row) => row.lead_type === typeFilter);

let objectContexts = spec.object_contexts || [];
if (objectFilter) objectContexts = objectContexts.filter((row) => row.id === objectFilter);

const output = {
  portal_id: spec.portal_id,
  schema_version: spec.schema_version,
  status: spec.status,
  generated_at: new Date().toISOString(),
  rules: spec.rules,
  summary: {
    routes: routes.length,
    priority_bands: priorities.length,
    form_roles: roles.length,
    lead_types: leadTypes.length,
    object_contexts: objectContexts.length,
    contact_outcomes: (spec.contact_outcomes || []).length
  },
  routes,
  object_contexts: objectContexts,
  contact_outcomes: spec.contact_outcomes || [],
  next_actions: spec.next_actions || []
};

function renderMarkdown() {
  const lines = [
    `# Операционная карта обработки заявок`,
    "",
    `Статус: \`${spec.status}\`. Это рекомендательный проект, а не утверждённый SLA.`,
    "",
    "## Маршруты первого контакта",
    "",
    "| Маршрут | Приоритет | Роль формы | Тип заявки | Рекомендация | Проверка источника |",
    "|---|---|---|---|---|---|"
  ];
  routes.forEach((row) => {
    lines.push(`| ${row.route_id} | ${row.priority} | ${row.form_role} | ${row.lead_type} | ${row.response_guidance} | ${row.source_check_required_by_default ? "да" : "по контексту"} |`);
  });
  lines.push("", "## Контексты объектов", "", "| Объект | Статус проверки | Нужна проверка источника | Фокус первого контакта |", "|---|---|---|---|");
  objectContexts.forEach((row) => {
    lines.push(`| ${row.id} | ${row.verification_status} | ${row.source_check_required ? "да" : "нет"} | ${row.first_contact_focus} |`);
  });
  lines.push("", "## Допустимые результаты первого контакта", "", "| Результат | Требуется следующее действие |", "|---|---|");
  (spec.contact_outcomes || []).forEach((row) => {
    lines.push(`| ${row.id} | ${row.requires_next_action ? "да" : "нет"} |`);
  });
  return lines.join("\n");
}

function renderCsv() {
  const fields = [
    "route_id",
    "priority",
    "urgency_rank",
    "response_guidance",
    "form_role",
    "lead_type",
    "source_check_required_by_default",
    "collect_if_missing",
    "first_questions",
    "allowed_next_actions",
    "required_outcome"
  ];
  return [
    fields.map(csvCell).join(","),
    ...routes.map((row) => fields.map((field) => csvCell(row[field])).join(","))
  ].join("\n");
}

const rendered = format === "json"
  ? JSON.stringify(output, null, 2)
  : format === "csv"
    ? renderCsv()
    : renderMarkdown();

process.stdout.write(`${rendered}\n`);
