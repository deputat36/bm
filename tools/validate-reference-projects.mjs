import fs from "node:fs";
import path from "node:path";

const ROOT = process.cwd();
const errors = [];
const warnings = [];

function readJson(relativePath) {
  const fullPath = path.join(ROOT, relativePath);

  if (!fs.existsSync(fullPath)) {
    errors.push(`${relativePath}: file does not exist`);
    return null;
  }

  try {
    return JSON.parse(fs.readFileSync(fullPath, "utf8"));
  } catch (error) {
    errors.push(`${relativePath}: invalid JSON: ${error.message}`);
    return null;
  }
}

function isHttpUrl(value) {
  return /^https?:\/\//i.test(String(value || ""));
}

function validateSource(projectId, source, index) {
  const label = `${projectId}: source #${index + 1}`;

  if (!source || typeof source !== "object") {
    errors.push(`${label} must be an object`);
    return;
  }

  if (!source.title) errors.push(`${label}: missing title`);
  if (!source.url || !isHttpUrl(source.url)) errors.push(`${label}: url must be an absolute http(s) URL`);
  if (!source.checked_at) warnings.push(`${label}: missing checked_at`);
}

function validateProject(project, index, priorityIds, seenIds, seenSlugs) {
  const id = project?.id || `project-${index + 1}`;

  if (!project || typeof project !== "object") {
    errors.push(`reference project #${index + 1} must be an object`);
    return;
  }

  if (!project.id) errors.push(`${id}: missing id`);
  if (!project.slug) errors.push(`${id}: missing slug`);
  if (!project.display_name) errors.push(`${id}: missing display_name`);
  if (!project.address) errors.push(`${id}: missing address`);
  if (project.city !== "Борисоглебск") errors.push(`${id}: city must be Борисоглебск`);

  if (project.commercial_role !== "reference_catalog") {
    errors.push(`${id}: commercial_role must be reference_catalog`);
  }

  if (project.verification_status !== "confirmed") {
    errors.push(`${id}: public reference project must have verification_status=confirmed`);
  }

  if (project.is_public_ready !== true) {
    errors.push(`${id}: public reference project must have is_public_ready=true`);
  }

  if (!project.last_checked_at) errors.push(`${id}: missing last_checked_at`);

  if (!Array.isArray(project.sources) || project.sources.length < 1) {
    errors.push(`${id}: at least one public source is required`);
  } else {
    project.sources.forEach((source, sourceIndex) => validateSource(id, source, sourceIndex));
  }

  if (project.lead_form_id || project.lead_type === "project_consultation") {
    errors.push(`${id}: reference project must not define a dedicated lead form`);
  }

  if (project.page_url) {
    warnings.push(`${id}: page_url is set; reference projects should normally remain short catalog cards`);
  }

  if (priorityIds.has(project.id)) {
    errors.push(`${id}: project is already registered as priority_lead`);
  }

  if (seenIds.has(project.id)) errors.push(`${id}: duplicate id`);
  if (seenSlugs.has(project.slug)) errors.push(`${id}: duplicate slug ${project.slug}`);
  seenIds.add(project.id);
  seenSlugs.add(project.slug);
}

const register = readJson("data/research/reference-projects.json");
const priorityRegister = readJson("data/research/priority-projects.json");
const priorityIds = new Set(
  Array.isArray(priorityRegister?.projects)
    ? priorityRegister.projects.map((project) => project.id)
    : []
);

if (register) {
  if (register.catalog_role !== "reference_catalog") {
    errors.push("data/research/reference-projects.json: catalog_role must be reference_catalog");
  }

  if (!Array.isArray(register.projects)) {
    errors.push("data/research/reference-projects.json: projects must be an array");
  } else {
    const seenIds = new Set();
    const seenSlugs = new Set();
    register.projects.forEach((project, index) => validateProject(project, index, priorityIds, seenIds, seenSlugs));

    if (!register.projects.length) {
      warnings.push("Reference catalog has no published projects yet; empty state will be shown.");
    }
  }

  if (!Array.isArray(register.research_queue)) {
    errors.push("data/research/reference-projects.json: research_queue must be an array");
  }
}

console.log(`Checked reference projects: ${Array.isArray(register?.projects) ? register.projects.length : 0}`);

if (warnings.length) {
  console.log("\nWarnings:");
  warnings.forEach((warning) => console.log(`- ${warning}`));
}

if (errors.length) {
  console.error("\nErrors:");
  errors.forEach((error) => console.error(`- ${error}`));
  process.exit(1);
}

console.log("\nReference catalog validation passed.");
