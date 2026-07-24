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
          lead_lifecycle_state: rulesInitialState(),
          post_storage_state: spec.rules.post_storage_state,
          lead_class: leadType.lead_class,
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
          next_action: "assign_owner",
          form_id: "runtime_value",
          lead_source: "runtime_value",
          placement: "runtime_value",
          source_system: spec.sources.system_of_record.replace(/^public\./, "supabase:"),
          record_locator: "runtime_uuid",
          blocked_claim_categories: object.blocked_claim_categories
        });
      }
    }
  }
}

function rulesInitialState() {
  return lifecycle.rules.initial_state;
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
  schema_version: spec.schema_version,
  generated_at: new Date().toISOString(),
  rules: spec.rules,
  system_of_record: spec.sources.system_of_record,
  runtime_function: spec.sources.runtime_function,
  summary: {
    total_templates: templates.length,
    selected_templates: filtered.length,
    packet_sections: spec.packet_sections.length,
    packet_fields: spec.packet_sections.reduce((sum, section) => sum + (section.fields || []).length, 0),
    runtime_email_payload_changed: spec.rules.runtime_email_payload_changed,
    server_storage_connected: spec.rules.server_storage_connected,
    automatic_triage_enabled: spec.rules.automatic_triage_enabled,
    automatic_owner_assignment_enabled: spec.rules.automatic_owner_assignment_enabled,
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
    "lead_class",
    "residential_complex_id",
    "source_check_required",
    "recommended_first_action",
    "required_contact_outcome",
    "allowed_next_actions",
    "next_action",
    "source_system"
  ];
  console.log(columns.join(","));
  for (const item of filtered) console.log(columns.map((column) => csvEscape(item[column])).join(","));
  process.exit(0);
}

console.log("# Handoff-пакеты первичного обращения\n");
console.log(`Статус: \`${spec.status}\``);
console.log(`Шаблонов: **${filtered.length} из ${templates.length}**`);
console.log(`Защищённое хранилище подключено: **${spec.rules.server_storage_connected ? "да" : "нет"}**`);
console.log(`Автоматический технический триаж: **${spec.rules.automatic_triage_enabled ? "да" : "нет"}**`);
console.log(`Автоматическое назначение владельца: **${spec.rules.automatic_owner_assignment_enabled ? "да" : "нет"}**`);
console.log(`CRM подключена: **${spec.rules.crm_connected ? "да" : "нет"}**\n`);
console.log("| Приоритет | Роль | Тип заявки | Класс | Объект | Проверка источника | Следующее действие |");
console.log("|---|---|---|---|---|---|---|");
for (const item of filtered) {
  console.log(`| ${item.qualification_status} | ${item.form_role} | ${item.lead_type} | ${item.lead_class} | ${item.residential_complex_id} | ${item.source_check_required ? "да" : "нет"} | ${item.next_action} |`);
}