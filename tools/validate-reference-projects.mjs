import fs from "node:fs";
import path from "node:path";

const ROOT = process.cwd();
const REGISTER_PATH = "data/research/reference-projects.json";
const CANDIDATE_PATH = "data/research/reference-candidates.json";
const PRIORITY_PATH = "data/research/priority-projects.json";
const CATALOG_PATH = "catalog/index.html";
const RUNTIME_PATH = "assets/js/reference-catalog.js";
const errors = [];
const warnings = [];

function readText(relativePath) {
  const fullPath = path.join(ROOT, relativePath);
  if (!fs.existsSync(fullPath)) {
    errors.push(`${relativePath}: file does not exist`);
    return "";
  }
  return fs.readFileSync(fullPath, "utf8");
}

function readJson(relativePath) {
  const source = readText(relativePath);
  if (!source) return null;

  try {
    return JSON.parse(source);
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

function validatePublicationRules(register) {
  const rules = register?.publication_rules || {};

  if (rules.required_commercial_role !== "reference_catalog") {
    errors.push(`${REGISTER_PATH}: publication_rules.required_commercial_role must be reference_catalog`);
  }
  if (rules.required_verification_status !== "confirmed") {
    errors.push(`${REGISTER_PATH}: publication_rules.required_verification_status must be confirmed`);
  }
  if (rules.required_is_public_ready !== true) {
    errors.push(`${REGISTER_PATH}: publication_rules.required_is_public_ready must be true`);
  }
  if (Number(rules.minimum_source_count) < 1) {
    errors.push(`${REGISTER_PATH}: publication_rules.minimum_source_count must be at least 1`);
  }
  if (rules.allow_separate_object_lead_form !== false) {
    errors.push(`${REGISTER_PATH}: separate reference-object lead forms must remain disabled`);
  }
  if (rules.general_lead_url !== "/catalog/#lead") {
    errors.push(`${REGISTER_PATH}: general_lead_url must remain /catalog/#lead`);
  }
  if (rules.unverified_objects_must_not_render !== true) {
    errors.push(`${REGISTER_PATH}: unverified_objects_must_not_render must be true`);
  }
}

function validateCatalogIntegration(html) {
  for (const fragment of [
    'id="reference"',
    "data-reference-catalog",
    'data-source="../data/research/reference-projects.json"',
    '<script src="../assets/js/reference-catalog.js"></script>',
    'data-form-id="catalog_priority_selection"',
    'id="lead"'
  ]) {
    if (!html.includes(fragment)) {
      errors.push(`${CATALOG_PATH}: missing reference catalog integration fragment ${fragment}`);
    }
  }

  if (html.includes("reference-candidates.json")) {
    errors.push(`${CATALOG_PATH}: candidate registry must never be loaded by the public catalog`);
  }
}

function validateRuntimeContract(source) {
  const requiredFragments = [
    'project.commercial_role === "reference_catalog"',
    'project.verification_status === "confirmed"',
    "project.is_public_ready === true",
    "project.sources.length > 0",
    'form[data-form-id=\'catalog_priority_selection\']',
    'const objectId = project.id ? `reference:${project.id}` : "reference-object";',
    'setHiddenField(form, "reference_object_id"',
    'setHiddenField(form, "reference_object_name"',
    'setHiddenField(form, "reference_object_address"',
    'selectionLink.href = "#lead";',
    'link.target = "_blank";',
    'link.rel = "noopener noreferrer";',
    'fetch(source, { cache: "no-store" })',
    'data.projects.filter(isPublishableReferenceProject)'
  ];

  for (const fragment of requiredFragments) {
    if (!source.includes(fragment)) {
      errors.push(`${RUNTIME_PATH}: missing fail-closed runtime fragment ${fragment}`);
    }
  }

  for (const forbiddenFragment of [
    'data-lead-type="project_consultation"',
    "publication_allowed = true",
    "is_public_ready = true",
    "reference-candidates.json"
  ]) {
    if (source.includes(forbiddenFragment)) {
      errors.push(`${RUNTIME_PATH}: forbidden runtime publication/form override ${forbiddenFragment}`);
    }
  }
}

function validateCandidateSource(candidateId, source, index) {
  const label = `${CANDIDATE_PATH}:${candidateId}: source #${index + 1}`;

  if (!source || typeof source !== "object") {
    errors.push(`${label} must be an object`);
    return;
  }
  if (!String(source.class || "").trim()) errors.push(`${label}: class is required`);
  if (!String(source.title || "").trim()) errors.push(`${label}: title is required`);
  if (!isHttpUrl(source.url)) errors.push(`${label}: absolute http(s) url is required`);
  if (!Array.isArray(source.supports) || source.supports.length < 1) {
    errors.push(`${label}: supports must contain at least one bounded observation`);
  }
}

function validateCandidateRegistry(candidateRegistry, publicProjectIds) {
  if (!candidateRegistry) return;

  if (candidateRegistry.schema_version !== "1.0") {
    errors.push(`${CANDIDATE_PATH}: schema_version must be 1.0`);
  }
  if (candidateRegistry.publication_effect !== "none") {
    errors.push(`${CANDIDATE_PATH}: publication_effect must remain none`);
  }
  if (candidateRegistry.promotion_rule?.target_registry !== REGISTER_PATH) {
    errors.push(`${CANDIDATE_PATH}: promotion target must be ${REGISTER_PATH}`);
  }
  if (candidateRegistry.promotion_rule?.candidate_never_renders_directly !== true) {
    errors.push(`${CANDIDATE_PATH}: candidate_never_renders_directly must be true`);
  }
  if (candidateRegistry.promotion_rule?.secondary_source_cannot_close_primary_gap !== true) {
    errors.push(`${CANDIDATE_PATH}: secondary sources must not close primary gaps`);
  }

  const allowedStatuses = new Set(candidateRegistry.allowed_statuses || []);
  for (const requiredStatus of ["needs_primary", "identity_conflict", "promoted"]) {
    if (!allowedStatuses.has(requiredStatus)) {
      errors.push(`${CANDIDATE_PATH}: allowed_statuses is missing ${requiredStatus}`);
    }
  }

  if (!Array.isArray(candidateRegistry.candidates)) {
    errors.push(`${CANDIDATE_PATH}: candidates must be an array`);
    return;
  }

  const seen = new Set();
  for (const candidate of candidateRegistry.candidates) {
    const id = String(candidate?.id || "").trim();
    if (!id) {
      errors.push(`${CANDIDATE_PATH}: candidate without id`);
      continue;
    }
    if (seen.has(id)) errors.push(`${CANDIDATE_PATH}: duplicate candidate id ${id}`);
    seen.add(id);

    if (!candidate.display_name) errors.push(`${CANDIDATE_PATH}:${id}: display_name is required`);
    if (!candidate.address) errors.push(`${CANDIDATE_PATH}:${id}: address is required`);
    if (candidate.city !== "Борисоглебск") errors.push(`${CANDIDATE_PATH}:${id}: city must be Борисоглебск`);
    if (!allowedStatuses.has(candidate.status)) errors.push(`${CANDIDATE_PATH}:${id}: invalid status ${candidate.status}`);
    if (!candidate.last_checked_at) errors.push(`${CANDIDATE_PATH}:${id}: last_checked_at is required`);

    if (!Array.isArray(candidate.sources) || candidate.sources.length < 1) {
      errors.push(`${CANDIDATE_PATH}:${id}: at least one discovery source is required`);
    } else {
      candidate.sources.forEach((source, index) => validateCandidateSource(id, source, index));
    }

    if (!Array.isArray(candidate.acceptance_gaps)) {
      errors.push(`${CANDIDATE_PATH}:${id}: acceptance_gaps must be an array`);
    }
    if (!Array.isArray(candidate.publication_limits) || candidate.publication_limits.length < 1) {
      errors.push(`${CANDIDATE_PATH}:${id}: publication_limits are required`);
    }
    if (!String(candidate.evidence || "").startsWith("docs/portal/research/")) {
      errors.push(`${CANDIDATE_PATH}:${id}: repository research evidence path is required`);
    } else if (!fs.existsSync(path.join(ROOT, candidate.evidence))) {
      errors.push(`${CANDIDATE_PATH}:${id}: evidence file does not exist: ${candidate.evidence}`);
    }

    if (candidate.is_public_ready === true || candidate.commercial_role === "reference_catalog") {
      errors.push(`${CANDIDATE_PATH}:${id}: candidate registry must not carry public-ready publication fields`);
    }

    if (candidate.status === "promoted") {
      if (!candidate.public_registry_id) {
        errors.push(`${CANDIDATE_PATH}:${id}: promoted candidate requires public_registry_id`);
      } else if (!publicProjectIds.has(candidate.public_registry_id)) {
        errors.push(`${CANDIDATE_PATH}:${id}: promoted candidate target is absent from public registry`);
      }
      if ((candidate.acceptance_gaps || []).length !== 0) {
        errors.push(`${CANDIDATE_PATH}:${id}: promoted candidate must have no remaining acceptance gaps`);
      }
    } else {
      if (candidate.public_registry_id !== null) {
        errors.push(`${CANDIDATE_PATH}:${id}: unresolved candidate public_registry_id must remain null`);
      }
      if (publicProjectIds.has(id)) {
        errors.push(`${CANDIDATE_PATH}:${id}: unresolved candidate must not exist in public registry`);
      }
      if ((candidate.acceptance_gaps || []).length < 1) {
        errors.push(`${CANDIDATE_PATH}:${id}: unresolved candidate requires acceptance gaps`);
      }
      if (!(candidate.publication_limits || []).includes("do_not_render")) {
        errors.push(`${CANDIDATE_PATH}:${id}: unresolved candidate must explicitly include do_not_render`);
      }
    }
  }
}

const register = readJson(REGISTER_PATH);
const candidateRegistry = readJson(CANDIDATE_PATH);
const priorityRegister = readJson(PRIORITY_PATH);
const catalogHtml = readText(CATALOG_PATH);
const runtimeSource = readText(RUNTIME_PATH);
const priorityIds = new Set(
  Array.isArray(priorityRegister?.projects)
    ? priorityRegister.projects.map((project) => project.id)
    : []
);
const publicProjectIds = new Set(
  Array.isArray(register?.projects)
    ? register.projects.map((project) => project.id)
    : []
);

if (register) {
  if (register.catalog_role !== "reference_catalog") {
    errors.push(`${REGISTER_PATH}: catalog_role must be reference_catalog`);
  }

  validatePublicationRules(register);

  if (!Array.isArray(register.projects)) {
    errors.push(`${REGISTER_PATH}: projects must be an array`);
  } else {
    const seenIds = new Set();
    const seenSlugs = new Set();
    register.projects.forEach((project, index) => validateProject(project, index, priorityIds, seenIds, seenSlugs));

    if (!register.projects.length) {
      warnings.push("Reference catalog has no published projects yet; empty state will be shown.");
    }
  }

  if (!Array.isArray(register.research_queue)) {
    errors.push(`${REGISTER_PATH}: research_queue must be an array`);
  }
}

validateCandidateRegistry(candidateRegistry, publicProjectIds);
if (catalogHtml) validateCatalogIntegration(catalogHtml);
if (runtimeSource) validateRuntimeContract(runtimeSource);

console.log(`Checked reference projects: ${Array.isArray(register?.projects) ? register.projects.length : 0}`);
console.log(`Checked reference candidates: ${Array.isArray(candidateRegistry?.candidates) ? candidateRegistry.candidates.length : 0}`);
console.log("Checked reference catalog data, candidate isolation, catalog integration and fail-closed runtime contract.");

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
