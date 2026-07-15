import fs from "node:fs";
import path from "node:path";

const ROOT = process.cwd();

function readJson(relativePath) {
  return JSON.parse(fs.readFileSync(path.join(ROOT, relativePath), "utf8"));
}

function parseArgs(argv) {
  const options = { format: "markdown", priority: "", role: "", leadType: "", object: "" };
  for (const arg of argv) {
    if (arg.startsWith("--format=")) options.format = arg.split("=")[1];
    if (arg.startsWith("--priority=")) options.priority = arg.split("=")[1];
    if (arg.startsWith("--role=")) options.role = arg.split("=")[1];
    if (arg.startsWith("--lead-type=")) options.leadType = arg.split("=")[1];
    if (arg.startsWith("--object=")) options.object = arg.split("=")[1];
  }
  return options;
}

function csvEscape(value) {
  const text = Array.isArray(value) ? value.join("|") : String(value ?? "");
  return /[",\n]/.test(text) ? `"${text.replaceAll('"', '""')}"` : text;
}

const spec = readJson("data/operations/lead-handoff.json");
const playbook = readJson(spec.sources.handling_playbook);
const lifecycle = readJson(spec.sources.lifecycle_contract);
const options = parseArgs(process.argv.slice(2));

const templates = [];
for (const priority of playbook.priority_bands) {
  for (const role of playbook.form_roles) {
    for (const leadType of playbook.lead_types) {
      for (const object of playbook.object_contexts) {
        const sourceCheckRequired = Boolean(leadType.source_check_required_by_default || object.source_check_required);
        templates.push({
          id: [priority.id, role.id, leadType.id, object.id].join("__"),
          handling_contract_version: spec.rendering.handling_contract_version,
          lead_lifecycle_state: lifecycle.rules.initial_state,
          qualification_status: priority.id,
          response_guidance: priority.response_guidance,
          response_guidance_label: spec.rendering.response_guidance_labels[priority.response_guidance],
          form_role: role.id,
          lead_type: leadType.id,
          residential_complex_id: object.id,
          source_check_required: sourceCheckRequired,
          conversation_goal: role.conversation_goal,
          object_handling_focus: object.first_contact_focus,
          recommended_first_action: priority.first_action,
          required_contact_outcome: `${priority.required_outcome} ${role.required_outcome} ${leadType.required_outcome}`,
          allowed_next_actions: leadType.allowed_next_actions,
          blocked_claim_categories: object.blocked_claim_categories
        });
      }
    }
  }
}

const filtered = templates.filter((item) => {
  if (options.priority && item.qualification_status !== options.priority) return false;
  if (options.role && item.form_role !== options.role) return false;
  if (options.leadType && item.lead_type !== options.leadType) return false;
  if (options.object && item.residential_complex_id !== options.object) return false;
  return true;
});

const result = {
  status: spec.status,
  generated_at: new Date().toISOString(),
  summary: {
    total_templates: templates.length,
    selected_templates: filtered.length,
    packet_sections: spec.packet_sections.length,
    runtime_email_payload_changed: spec.rules.runtime_email_payload_changed,
    crm_connected: spec.rules.crm_connected
  },
  packet_sections: spec.packet_sections,
  templates: filtered
};

if (options.format === "json") {
  process.stdout.write(`${JSON.stringify(result, null, 2)}\n`);
  process.exit(0);
}

if (options.format === "csv") {
  const columns = [
    "id",
    "qualification_status",
    "response_guidance",
    "form_role",
    "lead_type",
    "residential_complex_id",
    "source_check_required",
    "recommended_first_action",
    "required_contact_outcome",
    "allowed_next_actions"
  ];
  console.log(columns.join(","));
  for (const item of filtered) console.log(columns.map((column) => csvEscape(item[column])).join(","));
  process.exit(0);
}

console.log("# Handoff-пакеты первичного обращения\n");
console.log(`Статус: \`${spec.status}\``);
console.log(`Шаблонов: **${filtered.length} из ${templates.length}**`);
console.log(`Текущая доставка писем изменена: **${spec.rules.runtime_email_payload_changed ? "да" : "нет"}**`);
console.log(`CRM подключена: **${spec.rules.crm_connected ? "да" : "нет"}**\n`);
console.log("| Приоритет | Роль | Тип заявки | Объект | Проверка источника | Рекомендация |");
console.log("|---|---|---|---|---|---|");
for (const item of filtered) {
  console.log(`| ${item.qualification_status} | ${item.form_role} | ${item.lead_type} | ${item.residential_complex_id} | ${item.source_check_required ? "да" : "нет"} | ${item.response_guidance_label} |`);
}
