import fs from "node:fs";
import path from "node:path";

const ROOT = process.cwd();
const MATRIX_PATH = "data/qa/form-scenarios.json";
const EVENTS_PATH = "data/analytics/events.json";
const EXPECTED_SCENARIO_COUNT = 14;
const ALLOWED_ROLES = new Set(["primary", "detailed"]);
const ALLOWED_OBJECTS = new Set(["all-newbuilds", "prostornaya-4a", "aerodromnaya-18g", "sennaya-76"]);
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

function escapeRegExp(value) {
  return String(value).replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function findFormTag(html, formId) {
  const pattern = new RegExp(`<form\\b[^>]*data-form-id=["']${escapeRegExp(formId)}["'][^>]*>`, "i");
  return html.match(pattern)?.[0] || "";
}

function findPrimaryLeadBlock(html) {
  const markerIndex = html.indexOf("data-primary-lead");
  if (markerIndex < 0) return "";
  const tagStart = html.lastIndexOf("<", markerIndex);
  if (tagStart < 0) return "";
  const opening = html.slice(tagStart).match(/^<([a-z0-9-]+)\b[^>]*>/i);
  if (!opening) return "";
  const closeTag = `</${opening[1]}>`;
  const closeIndex = html.indexOf(closeTag, tagStart + opening[0].length);
  return closeIndex >= 0 ? html.slice(tagStart, closeIndex + closeTag.length) : "";
}

const matrix = readJson(MATRIX_PATH);
const eventRegistry = readJson(EVENTS_PATH);
const eventIds = new Set(Array.isArray(eventRegistry?.events) ? eventRegistry.events.map((event) => event.id) : []);
const seenIds = new Set();
const seenForms = new Set();
const roleCounts = { primary: 0, detailed: 0 };

if (!matrix || !Array.isArray(matrix.scenarios)) {
  errors.push(`${MATRIX_PATH}: scenarios must be an array`);
} else {
  if (matrix.portal_id !== "newbuilds-borisoglebsk") errors.push(`${MATRIX_PATH}: invalid portal_id`);
  if (matrix.base_url !== "https://novostroyki-borisoglebsk.ru") errors.push(`${MATRIX_PATH}: invalid base_url`);
  if (matrix.scenarios.length !== EXPECTED_SCENARIO_COUNT) {
    errors.push(`${MATRIX_PATH}: expected ${EXPECTED_SCENARIO_COUNT} scenarios, found ${matrix.scenarios.length}`);
  }

  const params = matrix.test_parameters || {};
  if (params.lead_test !== "dry-run" || params.analytics_test !== "debug" || params.test_ack !== "1") {
    errors.push(`${MATRIX_PATH}: test_parameters must enable dry-run and local analytics debug`);
  }

  if (matrix.rules?.real_submission_forbidden !== true || matrix.rules?.public_content_links_forbidden !== true) {
    errors.push(`${MATRIX_PATH}: safety rules must forbid real submission and public test links`);
  }

  ["desktop", "android", "iphone"].forEach((device) => {
    if (!matrix.rules?.expected_devices?.includes(device)) errors.push(`${MATRIX_PATH}: missing device ${device}`);
  });

  for (const eventId of [...(matrix.required_events || []), ...(matrix.optional_events || [])]) {
    if (!eventIds.has(eventId)) errors.push(`${MATRIX_PATH}: unknown analytics event ${eventId}`);
  }

  for (const [index, scenario] of matrix.scenarios.entries()) {
    const label = `${MATRIX_PATH}#${index + 1}:${scenario?.id || "unknown"}`;
    const id = String(scenario?.id || "").trim();
    const role = String(scenario?.form_role || "").trim();
    const formId = String(scenario?.form_id || "").trim();
    const pageFile = String(scenario?.page_file || "").trim();
    const pagePath = String(scenario?.page_path || "").trim();
    const anchor = String(scenario?.anchor || "").trim();
    const leadType = String(scenario?.lead_type || "").trim();
    const objectId = String(scenario?.object_id || "").trim();

    if (!id || seenIds.has(id)) errors.push(`${label}: missing or duplicate id`);
    seenIds.add(id);
    if (!formId || seenForms.has(formId)) errors.push(`${label}: missing or duplicate form_id`);
    seenForms.add(formId);
    if (!ALLOWED_ROLES.has(role)) errors.push(`${label}: invalid form_role=${role}`);
    else roleCounts[role] += 1;
    if (!ALLOWED_OBJECTS.has(objectId)) errors.push(`${label}: invalid object_id=${objectId}`);
    if (!pagePath.startsWith("/")) errors.push(`${label}: page_path must start with /`);
    if (!pageFile.endsWith(".html")) errors.push(`${label}: page_file must be an HTML file`);

    const expectedAnchor = role === "primary" ? matrix.rules.primary_anchor : matrix.rules.detailed_anchor;
    if (anchor !== expectedAnchor) errors.push(`${label}: anchor must be ${expectedAnchor}`);

    const html = read(pageFile);
    if (!html) continue;
    if (!html.includes(`id="${anchor}"`) && !html.includes(`id='${anchor}'`)) {
      errors.push(`${label}: page does not contain anchor #${anchor}`);
    }

    const formTag = findFormTag(html, formId);
    if (!formTag) {
      errors.push(`${label}: form ${formId} not found`);
      continue;
    }
    if (!formTag.includes(`data-lead-type="${leadType}"`) && !formTag.includes(`data-lead-type='${leadType}'`)) {
      errors.push(`${label}: lead_type does not match form`);
    }

    const primaryBlock = findPrimaryLeadBlock(html);
    const token = `data-form-id="${formId}"`;
    if (role === "primary" && !primaryBlock.includes(token)) {
      errors.push(`${label}: primary form must be inside data-primary-lead`);
    }
    if (role === "detailed" && primaryBlock.includes(token)) {
      errors.push(`${label}: detailed form must be outside data-primary-lead`);
    }

    if (objectId !== "all-newbuilds") {
      if (!formTag.includes(`data-complex-id="${objectId}"`) && !formTag.includes(`data-complex-id='${objectId}'`)) {
        errors.push(`${label}: project form object_id does not match data-complex-id`);
      }
    }
  }
}

if (roleCounts.primary !== 7 || roleCounts.detailed !== 7) {
  errors.push(`${MATRIX_PATH}: expected 7 primary and 7 detailed scenarios`);
}

console.log(`Checked form QA scenarios: ${matrix?.scenarios?.length || 0}`);
console.log(`Primary scenarios: ${roleCounts.primary}`);
console.log(`Detailed scenarios: ${roleCounts.detailed}`);

if (errors.length) {
  console.error("\nForm QA scenario validation errors:");
  errors.forEach((error) => console.error(`- ${error}`));
  process.exit(1);
}

console.log("Form QA scenario validation passed.");
