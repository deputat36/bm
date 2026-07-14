import fs from "node:fs";
import path from "node:path";

const ROOT = process.cwd();
const REGISTRY_PATH = "data/analytics/events.json";
const EXPECTED_EVENTS = new Set([
  "lead_cta_click",
  "lead_form_view",
  "lead_form_start",
  "lead_submit",
  "lead_submit_classified",
  "lead_thankyou_view",
  "lead_postsubmit_action"
]);
const FIELD_PATTERN = /^[a-z][a-z0-9_]*$/;
const errors = [];

function read(relativePath) {
  const fullPath = path.join(ROOT, relativePath);
  if (!fs.existsSync(fullPath)) {
    errors.push(`${relativePath}: file does not exist`);
    return "";
  }
  return fs.readFileSync(fullPath, "utf8");
}

function readJson(relativePath) {
  const content = read(relativePath);
  if (!content) return null;
  try {
    return JSON.parse(content);
  } catch (error) {
    errors.push(`${relativePath}: invalid JSON: ${error.message}`);
    return null;
  }
}

function requireText(item, field, label) {
  const value = String(item?.[field] || "").trim();
  if (!value) errors.push(`${label}: missing ${field}`);
  return value;
}

const registry = readJson(REGISTRY_PATH);
const seen = new Set();
let checked = 0;

if (!registry || !Array.isArray(registry.events)) {
  errors.push(`${REGISTRY_PATH}: events must be an array`);
} else {
  if (registry.portal_id !== "newbuilds-borisoglebsk") {
    errors.push(`${REGISTRY_PATH}: invalid portal_id`);
  }

  const rules = registry.rules || {};
  if (rules.canonical_submission_event !== "lead_submit") {
    errors.push(`${REGISTRY_PATH}: canonical submission event must be lead_submit`);
  }
  if (rules.classified_submission_event !== "lead_submit_classified") {
    errors.push(`${REGISTRY_PATH}: classified submission event must be lead_submit_classified`);
  }
  if (rules.classified_event_is_not_additive !== true) {
    errors.push(`${REGISTRY_PATH}: classified event must be marked non-additive`);
  }
  if (rules.dry_run_events_forbidden !== true || rules.personal_data_in_analytics_forbidden !== true) {
    errors.push(`${REGISTRY_PATH}: privacy and dry-run rules must be enabled`);
  }

  const prohibited = new Set(Array.isArray(rules.prohibited_fields) ? rules.prohibited_fields : []);
  ["name", "phone", "budget", "comment", "client_fixation_id"].forEach((field) => {
    if (!prohibited.has(field)) errors.push(`${REGISTRY_PATH}: prohibited_fields missing ${field}`);
  });

  for (const event of registry.events) {
    const id = requireText(event, "id", "event");
    const label = `${REGISTRY_PATH}:${id || "unknown"}`;
    if (seen.has(id)) errors.push(`${label}: duplicate id`);
    seen.add(id);
    checked += 1;

    requireText(event, "stage", label);
    requireText(event, "metric_role", label);
    requireText(event, "purpose", label);
    const sourceFile = requireText(event, "source_file", label);
    requireText(event, "count_rule", label);
    requireText(event, "count_filter", label);

    if (event.status !== "active") errors.push(`${label}: status must be active`);
    if (event.contains_personal_data !== false) errors.push(`${label}: contains_personal_data must be false`);

    const requiredFields = Array.isArray(event.required_fields) ? event.required_fields : [];
    const optionalFields = Array.isArray(event.optional_fields) ? event.optional_fields : [];
    if (!requiredFields.includes("event")) errors.push(`${label}: required_fields must include event`);

    [...requiredFields, ...optionalFields].forEach((field) => {
      if (!FIELD_PATTERN.test(field)) errors.push(`${label}: invalid field ${field}`);
      if (prohibited.has(field)) errors.push(`${label}: analytics field is prohibited: ${field}`);
    });

    const source = sourceFile ? read(sourceFile) : "";
    const fragments = Array.isArray(event.implementation_fragments) ? event.implementation_fragments : [];
    if (!fragments.length) errors.push(`${label}: implementation_fragments must be non-empty`);
    fragments.forEach((fragment) => {
      if (source && !source.includes(fragment)) errors.push(`${label}: source missing fragment ${fragment}`);
    });
  }
}

EXPECTED_EVENTS.forEach((eventId) => {
  if (!seen.has(eventId)) errors.push(`${REGISTRY_PATH}: missing expected event ${eventId}`);
});
seen.forEach((eventId) => {
  if (!EXPECTED_EVENTS.has(eventId)) errors.push(`${REGISTRY_PATH}: unexpected event ${eventId}`);
});

const submit = registry?.events?.find((event) => event.id === "lead_submit");
const classified = registry?.events?.find((event) => event.id === "lead_submit_classified");
if (submit?.metric_role !== "canonical_conversion" || submit?.count_filter !== "blocked=false") {
  errors.push("lead_submit: invalid canonical counting rule");
}
if (classified?.metric_role !== "classification_dimension" || classified?.count_filter !== "blocked=false") {
  errors.push("lead_submit_classified: invalid classification counting rule");
}
if (!classified?.must_not_add_to?.includes("lead_submit")) {
  errors.push("lead_submit_classified: must_not_add_to must include lead_submit");
}
["form_role", "blocked", "offline"].forEach((field) => {
  if (!classified?.required_fields?.includes(field)) errors.push(`lead_submit_classified: missing required field ${field}`);
});

console.log(`Checked analytics events: ${checked}`);
if (errors.length) {
  console.error("\nAnalytics event registry validation errors:");
  errors.forEach((error) => console.error(`- ${error}`));
  process.exit(1);
}
console.log("Analytics event registry validation passed.");
