import fs from "node:fs";
import path from "node:path";

const ROOT = process.cwd();
const DISCOVERY_PATH = "data/research/object-source-discovery-2026-07-24.json";
const QUEUE_PATH = "data/research/source-collection.json";
const REQUEST_PACK_PATH = "docs/portal/OBJECT_SOURCE_REQUEST_PACK.md";
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
  const source = read(relativePath);
  if (!source) return null;
  try {
    return JSON.parse(source);
  } catch (error) {
    errors.push(`${relativePath}: invalid JSON: ${error.message}`);
    return null;
  }
}

function uniqueBy(items, key, label) {
  if (!Array.isArray(items)) {
    errors.push(`${label}: expected array`);
    return new Map();
  }
  const result = new Map();
  for (const item of items) {
    const id = String(item?.[key] || "").trim();
    if (!id) {
      errors.push(`${label}: item without ${key}`);
      continue;
    }
    if (result.has(id)) errors.push(`${label}: duplicate ${key} ${id}`);
    result.set(id, item);
  }
  return result;
}

const discovery = readJson(DISCOVERY_PATH);
const queue = readJson(QUEUE_PATH);
const requestPack = read(REQUEST_PACK_PATH);
if (!discovery || !queue || !requestPack) process.exit(1);

if (discovery.schema_version !== "1.0") errors.push(`${DISCOVERY_PATH}: schema_version must be 1.0`);
if (discovery.updated_at !== "2026-07-24") errors.push(`${DISCOVERY_PATH}: updated_at must be 2026-07-24`);
if (discovery.portal_id !== "newbuilds-borisoglebsk") errors.push(`${DISCOVERY_PATH}: invalid portal_id`);
if (discovery.status !== "secondary_discovery_complete_primary_acceptance_blocked") {
  errors.push(`${DISCOVERY_PATH}: invalid status`);
}

for (const key of [
  "secondary_source_is_discovery_only",
  "secondary_source_cannot_close_primary_task",
  "owner_statement_may_confirm_portal_naming_only",
  "absence_in_search_is_not_proof_of_absence",
  "exact_address_or_land_plot_link_required",
  "legal_entity_requires_primary_document_link",
  "permit_requires_official_document_or_registry_record",
  "sale_terms_require_current_property_level_documents",
  "media_requires_explicit_rights_evidence",
  "public_page_must_remain_noindex_until_gates_pass"
]) {
  if (discovery.rules?.[key] !== true) errors.push(`${DISCOVERY_PATH}: rules.${key} must be true`);
}

const projects = uniqueBy(discovery.projects, "project_id", `${DISCOVERY_PATH}:projects`);
const expectedProjects = new Set(["aerodromnaya-18g", "sennaya-76"]);
if (projects.size !== 2 || [...projects.keys()].some((id) => !expectedProjects.has(id))) {
  errors.push(`${DISCOVERY_PATH}: expected exactly aerodromnaya-18g and sennaya-76`);
}

const queueProjects = new Map((queue.projects || []).map((item) => [item.project_id, item]));
let clueCount = 0;
let requestCount = 0;
let acceptedEffects = 0;

for (const [projectId, project] of projects) {
  if (project.primary_source_status !== "not_found_in_public_search") {
    errors.push(`${DISCOVERY_PATH}:${projectId}: primary_source_status must remain not_found_in_public_search`);
  }
  if (project.accepted_primary_tasks !== 0) errors.push(`${DISCOVERY_PATH}:${projectId}: accepted_primary_tasks must be 0`);
  if (project.blocked_primary_tasks !== 5) errors.push(`${DISCOVERY_PATH}:${projectId}: blocked_primary_tasks must be 5`);
  if (project.next_action !== "send_primary_requests_and_store_responses") {
    errors.push(`${DISCOVERY_PATH}:${projectId}: invalid next_action`);
  }

  const queueProject = queueProjects.get(projectId);
  if (!queueProject) {
    errors.push(`${QUEUE_PATH}: missing ${projectId}`);
  } else {
    const missingTasks = (queueProject.tasks || []).filter((item) => item.status === "missing");
    if (queueProject.collection_status !== "blocked" || missingTasks.length !== 5) {
      errors.push(`${QUEUE_PATH}:${projectId}: source queue must remain blocked with 5 missing tasks`);
    }
  }

  const clues = uniqueBy(project.discovery_clues, "id", `${DISCOVERY_PATH}:${projectId}:discovery_clues`);
  const requests = uniqueBy(project.official_requests, "id", `${DISCOVERY_PATH}:${projectId}:official_requests`);
  if (clues.size !== 4) errors.push(`${DISCOVERY_PATH}:${projectId}: expected 4 discovery clues`);
  if (requests.size !== 4) errors.push(`${DISCOVERY_PATH}:${projectId}: expected 4 official requests`);
  clueCount += clues.size;
  requestCount += requests.size;

  for (const clue of clues.values()) {
    if (!/^https:\/\//.test(String(clue.reference || ""))) {
      errors.push(`${DISCOVERY_PATH}:${projectId}:${clue.id}: HTTPS reference required`);
    }
    if (!String(clue.source_class || "").startsWith("secondary_")) {
      errors.push(`${DISCOVERY_PATH}:${projectId}:${clue.id}: clue must remain secondary`);
    }
    if (clue.acceptance_effect === "accepted_primary") {
      acceptedEffects += 1;
      errors.push(`${DISCOVERY_PATH}:${projectId}:${clue.id}: secondary clue cannot accept a primary task`);
    }
    if (!Array.isArray(clue.observed_claims) || !clue.observed_claims.length) {
      errors.push(`${DISCOVERY_PATH}:${projectId}:${clue.id}: observed_claims required`);
    }
    if (!String(clue.reason_not_accepted || "").trim()) {
      errors.push(`${DISCOVERY_PATH}:${projectId}:${clue.id}: reason_not_accepted required`);
    }
  }

  const contradictions = uniqueBy(project.contradictions, "id", `${DISCOVERY_PATH}:${projectId}:contradictions`);
  if (contradictions.size !== 3) errors.push(`${DISCOVERY_PATH}:${projectId}: expected 3 contradictions`);
  for (const contradiction of contradictions.values()) {
    if (!Array.isArray(contradiction.values) || contradiction.values.length < 2) {
      errors.push(`${DISCOVERY_PATH}:${projectId}:${contradiction.id}: at least 2 values required`);
    }
    if (!String(contradiction.portal_rule || "").trim()) {
      errors.push(`${DISCOVERY_PATH}:${projectId}:${contradiction.id}: portal_rule required`);
    }
  }

  for (const request of requests.values()) {
    if (!String(request.target_role || "").trim()) errors.push(`${DISCOVERY_PATH}:${projectId}:${request.id}: target_role required`);
    if (!String(request.request_subject || "").trim()) errors.push(`${DISCOVERY_PATH}:${projectId}:${request.id}: request_subject required`);
    if (!Array.isArray(request.request_fields) || request.request_fields.length < 5) {
      errors.push(`${DISCOVERY_PATH}:${projectId}:${request.id}: at least 5 request_fields required`);
    }
    if (!Array.isArray(request.closes_tasks) || !request.closes_tasks.length) {
      errors.push(`${DISCOVERY_PATH}:${projectId}:${request.id}: closes_tasks required`);
    }
    const queueIds = new Set((queueProject?.tasks || []).map((item) => item.id));
    for (const taskId of request.closes_tasks || []) {
      if (!queueIds.has(taskId)) errors.push(`${DISCOVERY_PATH}:${projectId}:${request.id}: unknown queue task ${taskId}`);
    }
  }
}

const summary = discovery.search_summary || {};
if (summary.official_exact_object_records_found !== 0) errors.push(`${DISCOVERY_PATH}: no official exact record may be claimed`);
if (summary.secondary_discovery_sources_recorded !== clueCount || clueCount !== 8) {
  errors.push(`${DISCOVERY_PATH}: secondary clue count must be 8`);
}
if (summary.prepared_official_requests !== requestCount || requestCount !== 8) {
  errors.push(`${DISCOVERY_PATH}: prepared request count must be 8`);
}
if (summary.primary_tasks_closed !== 0 || summary.public_claims_unblocked !== 0 || acceptedEffects !== 0) {
  errors.push(`${DISCOVERY_PATH}: discovery must not close primary tasks or unblock claims`);
}
if (summary.future_recheck?.date !== "2026-09-01") errors.push(`${DISCOVERY_PATH}: future recheck date must be 2026-09-01`);

for (const fragment of [
  "## Запрос в администрацию: Аэродромная, 18Г",
  "## Запрос предполагаемому застройщику или правообладателю: Аэродромная, 18Г",
  "## Запрос продавцу конкретной квартиры: Аэродромная, 18Г",
  "## Запрос прав на материалы: Аэродромная, 18Г",
  "## Запрос в администрацию: Сенная, 76",
  "## Запрос предполагаемому застройщику или правообладателю: Сенная, 76",
  "## Запрос продавцу конкретной квартиры: Сенная, 76",
  "## Запрос прав на материалы: Сенная, 76",
  "Площади 58,8 м², 61,0 м² и 61,3 м²",
  "не публикуются как подтверждённые факты"
]) {
  if (!requestPack.includes(fragment)) errors.push(`${REQUEST_PACK_PATH}: missing fragment ${fragment}`);
}

console.log(`Checked discovery projects: ${projects.size}`);
console.log(`Checked secondary clues: ${clueCount}`);
console.log(`Checked official requests: ${requestCount}`);
console.log(`Primary tasks closed: ${summary.primary_tasks_closed}`);
console.log(`Public claims unblocked: ${summary.public_claims_unblocked}`);

if (errors.length) {
  console.error("\nObject source discovery validation errors:");
  errors.forEach((error) => console.error(`- ${error}`));
  process.exit(1);
}

console.log("Object source discovery validation passed.");