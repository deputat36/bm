import fs from "node:fs";
import path from "node:path";

const ROOT = process.cwd();
const REGISTRY_PATH = "data/research/source-collection.json";
const PROJECT_INDEX_PATH = "data/projects/index.json";
const ALLOWED_TASK_STATUSES = new Set([
  "missing",
  "candidate_found",
  "review_required",
  "accepted",
  "rejected",
  "not_applicable"
]);
const ALLOWED_PRIORITIES = new Set(["critical", "standard"]);
const ALLOWED_AUTHORITIES = new Set(["primary_required", "rights_evidence_required"]);
const ALLOWED_COLLECTION_STATUSES = new Set(["blocked", "in_progress", "ready_for_review"]);
const REQUIRED_SOURCE_TYPES = new Map([
  ["tellermanov-sad", new Set(["eiszh_project_card", "project_declaration", "building_permit", "media_rights"])],
  ["aerodromnaya-18g", new Set(["public_object_registry", "developer_legal_entity", "building_permit", "project_declaration", "media_rights"])],
  ["sennaya-76", new Set(["public_object_registry", "developer_legal_entity", "building_permit", "project_declaration", "media_rights"])]
]);
const errors = [];

function read(relativePath) {
  const fullPath = path.join(ROOT, relativePath);
  if (!fs.existsSync(fullPath)) {
    errors.push(`${relativePath}: файл не найден`);
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
    errors.push(`${relativePath}: некорректный JSON: ${error.message}`);
    return null;
  }
}

function repoPath(value) {
  return String(value || "").replace(/^\/+/, "");
}

function pageHasNoindex(pageUrl) {
  const clean = String(pageUrl || "").replace(/^\/+/, "").replace(/\/+$/, "");
  const pagePath = clean ? `${clean}/index.html` : "index.html";
  const html = read(pagePath);
  return html.includes('content="noindex,follow"') || html.includes("content='noindex,follow'");
}

function requireText(item, field, label) {
  const value = String(item?.[field] ?? "").trim();
  if (!value) errors.push(`${label}: отсутствует ${field}`);
  return value;
}

function isHttpsUrl(value) {
  try {
    return new URL(value).protocol === "https:";
  } catch {
    return false;
  }
}

function isValidDate(value) {
  return typeof value === "string" && value.trim() !== "" && !Number.isNaN(Date.parse(value));
}

const registry = readJson(REGISTRY_PATH);
const projectIndex = readJson(PROJECT_INDEX_PATH);
const activeProjects = Array.isArray(projectIndex)
  ? projectIndex.filter((project) => project.is_active !== false)
  : [];
const activeProjectMap = new Map(activeProjects.map((project) => [project.id, project]));
const seenProjectIds = new Set();
const seenTaskIds = new Set();
let taskCount = 0;
let acceptedCount = 0;
let missingCount = 0;

if (!Array.isArray(projectIndex)) {
  errors.push(`${PROJECT_INDEX_PATH}: ожидается массив проектов`);
}

if (!registry || !Array.isArray(registry.projects)) {
  errors.push(`${REGISTRY_PATH}: projects должен быть массивом`);
} else {
  if (registry.portal_id !== "newbuilds-borisoglebsk") {
    errors.push(`${REGISTRY_PATH}: portal_id должен быть newbuilds-borisoglebsk`);
  }
  if (registry.status !== "collection_required") {
    errors.push(`${REGISTRY_PATH}: status должен быть collection_required до завершения очереди`);
  }

  const requiredRules = [
    "accepted_requires_https_reference",
    "accepted_requires_verified_at",
    "accepted_requires_evidence_note",
    "secondary_sources_cannot_confirm_critical_claims",
    "volatile_claims_require_current_recheck",
    "media_publication_requires_rights_evidence",
    "missing_task_blocks_public_readiness"
  ];
  for (const rule of requiredRules) {
    if (registry.rules?.[rule] !== true) {
      errors.push(`${REGISTRY_PATH}: rules.${rule} должен быть true`);
    }
  }

  for (const project of registry.projects) {
    const projectId = requireText(project, "project_id", REGISTRY_PATH);
    const label = `${REGISTRY_PATH}:${projectId || "unknown-project"}`;
    requireText(project, "portal_slug", label);
    requireText(project, "display_name", label);
    const pageUrl = requireText(project, "page_url", label);
    const collectionStatus = requireText(project, "collection_status", label);

    if (seenProjectIds.has(projectId)) errors.push(`${label}: дублирующий project_id`);
    seenProjectIds.add(projectId);

    if (!activeProjectMap.has(projectId)) {
      errors.push(`${label}: проект отсутствует среди активных записей ${PROJECT_INDEX_PATH}`);
      continue;
    }
    if (!ALLOWED_COLLECTION_STATUSES.has(collectionStatus)) {
      errors.push(`${label}: неподдерживаемый collection_status=${collectionStatus}`);
    }

    const indexEntry = activeProjectMap.get(projectId);
    const projectFile = readJson(repoPath(indexEntry.data_file));
    if (!projectFile) continue;
    if (projectFile.is_public_ready !== false) {
      errors.push(`${label}: до завершения критических задач is_public_ready должен быть false`);
    }
    if (!pageHasNoindex(pageUrl)) {
      errors.push(`${label}: страница должна сохранять noindex,follow`);
    }

    const tasks = Array.isArray(project.tasks) ? project.tasks : [];
    if (!tasks.length) errors.push(`${label}: tasks должен быть непустым массивом`);
    const sourceTypes = new Set();
    let pendingTasks = 0;

    for (const task of tasks) {
      taskCount += 1;
      const taskId = requireText(task, "id", label);
      const taskLabel = `${label}:${taskId || "unknown-task"}`;
      const sourceType = requireText(task, "source_type", taskLabel);
      requireText(task, "title", taskLabel);
      const priority = requireText(task, "priority", taskLabel);
      const status = requireText(task, "status", taskLabel);
      const authority = requireText(task, "authority", taskLabel);
      const reference = String(task.reference || "").trim();
      const evidenceNote = String(task.evidence_note || "").trim();

      if (seenTaskIds.has(taskId)) errors.push(`${taskLabel}: дублирующий id задачи`);
      seenTaskIds.add(taskId);
      if (sourceTypes.has(sourceType)) errors.push(`${taskLabel}: дублирующий source_type внутри проекта`);
      sourceTypes.add(sourceType);

      if (!ALLOWED_PRIORITIES.has(priority)) errors.push(`${taskLabel}: неподдерживаемый priority=${priority}`);
      if (!ALLOWED_TASK_STATUSES.has(status)) errors.push(`${taskLabel}: неподдерживаемый status=${status}`);
      if (!ALLOWED_AUTHORITIES.has(authority)) errors.push(`${taskLabel}: неподдерживаемый authority=${authority}`);
      if (!Array.isArray(task.acceptance_criteria) || task.acceptance_criteria.length < 2) {
        errors.push(`${taskLabel}: acceptance_criteria должен содержать минимум два критерия`);
      }
      if (!Array.isArray(task.blocks_claims) || task.blocks_claims.length === 0) {
        errors.push(`${taskLabel}: blocks_claims должен быть непустым массивом`);
      }
      if (sourceType === "media_rights" && authority !== "rights_evidence_required") {
        errors.push(`${taskLabel}: media_rights требует authority=rights_evidence_required`);
      }
      if (sourceType !== "media_rights" && authority !== "primary_required") {
        errors.push(`${taskLabel}: документальный источник требует authority=primary_required`);
      }

      if (status === "missing") {
        missingCount += 1;
        pendingTasks += 1;
        if (reference) errors.push(`${taskLabel}: missing не должен содержать reference`);
        if (task.verified_at !== null) errors.push(`${taskLabel}: missing должен содержать verified_at=null`);
        if (evidenceNote) errors.push(`${taskLabel}: missing не должен содержать evidence_note`);
      } else if (status === "accepted") {
        acceptedCount += 1;
        if (!isHttpsUrl(reference)) errors.push(`${taskLabel}: accepted требует публичную HTTPS-ссылку`);
        if (!isValidDate(task.verified_at)) errors.push(`${taskLabel}: accepted требует корректный verified_at`);
        if (!evidenceNote) errors.push(`${taskLabel}: accepted требует evidence_note`);
      } else {
        pendingTasks += status === "not_applicable" ? 0 : 1;
        if (["candidate_found", "review_required"].includes(status) && !isHttpsUrl(reference)) {
          errors.push(`${taskLabel}: ${status} требует HTTPS reference для проверки`);
        }
        if (["rejected", "not_applicable"].includes(status) && !evidenceNote) {
          errors.push(`${taskLabel}: ${status} требует evidence_note`);
        }
      }
    }

    const requiredTypes = REQUIRED_SOURCE_TYPES.get(projectId) || new Set();
    for (const requiredType of requiredTypes) {
      if (!sourceTypes.has(requiredType)) errors.push(`${label}: отсутствует обязательный source_type=${requiredType}`);
    }
    for (const sourceType of sourceTypes) {
      if (!requiredTypes.has(sourceType)) errors.push(`${label}: незарегистрированный source_type=${sourceType}`);
    }

    if (pendingTasks > 0 && collectionStatus === "ready_for_review") {
      errors.push(`${label}: ready_for_review недопустим при незавершённых задачах`);
    }
    if (pendingTasks === 0 && collectionStatus !== "ready_for_review") {
      errors.push(`${label}: завершённая очередь должна иметь collection_status=ready_for_review`);
    }
  }
}

for (const activeProject of activeProjects) {
  if (!seenProjectIds.has(activeProject.id)) {
    errors.push(`${REGISTRY_PATH}: отсутствует активный проект ${activeProject.id}`);
  }
}

console.log(`Checked source collection projects: ${seenProjectIds.size}`);
console.log(`Checked source collection tasks: ${taskCount}`);
console.log(`Accepted source tasks: ${acceptedCount}`);
console.log(`Missing source tasks: ${missingCount}`);

if (errors.length) {
  console.error("\nSource collection validation errors:");
  errors.forEach((error) => console.error(`- ${error}`));
  process.exit(1);
}

console.log("\nSource collection validation passed.");
