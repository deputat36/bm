import fs from "node:fs";
import path from "node:path";

const ROOT = process.cwd();
const SPEC_PATH = "data/analytics/phone-cta-report.json";
const EVENTS_PATH = "data/analytics/events.json";
const FUNNEL_PATH = "data/analytics/funnel-report.json";
const MATRIX_PATH = "data/qa/form-scenarios.json";
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

function getAttribute(tag, name) {
  const pattern = new RegExp(`${escapeRegExp(name)}=["']([^"']*)["']`, "i");
  return tag.match(pattern)?.[1]?.trim() || "";
}

function anchors(html) {
  return html.match(/<a\b[^>]*href=["'][^"']+["'][^>]*>/gi) || [];
}

function uniqueStrings(values, label) {
  if (!Array.isArray(values)) {
    errors.push(`${label}: must be an array`);
    return [];
  }
  const normalized = values.map((value) => String(value || "").trim()).filter(Boolean);
  if (new Set(normalized).size !== normalized.length) errors.push(`${label}: values must be unique`);
  return normalized;
}

const spec = readJson(SPEC_PATH);
const registry = readJson(EVENTS_PATH);
const funnel = readJson(FUNNEL_PATH);
const matrix = readJson(MATRIX_PATH);

if (!spec || !registry || !funnel || !matrix) process.exit(1);

if (spec.portal_id !== "newbuilds-borisoglebsk" || spec.portal_id !== registry.portal_id || spec.portal_id !== funnel.portal_id) {
  errors.push(`${SPEC_PATH}: portal_id must match analytics sources`);
}
if (spec.schema_version !== "1.0") errors.push(`${SPEC_PATH}: schema_version must be 1.0`);
if (spec.status !== "specification_only_no_live_data") errors.push(`${SPEC_PATH}: status must prohibit live-data claims`);
if (spec.source?.event_registry !== EVENTS_PATH) errors.push(`${SPEC_PATH}: invalid event_registry path`);
if (spec.source?.funnel_report !== FUNNEL_PATH) errors.push(`${SPEC_PATH}: invalid funnel_report path`);
if (spec.source?.qa_matrix !== MATRIX_PATH) errors.push(`${SPEC_PATH}: invalid qa_matrix path`);
if (spec.source?.event !== "lead_cta_click" || spec.source?.action_filter !== "phone") {
  errors.push(`${SPEC_PATH}: source must be lead_cta_click with action=phone`);
}

const event = (registry.events || []).find((item) => item.id === "lead_cta_click");
const eventFields = new Set([...(event?.required_fields || []), ...(event?.optional_fields || [])]);
["page_path", "action", "placement", "object_id"].forEach((field) => {
  if (!eventFields.has(field)) errors.push(`${EVENTS_PATH}: lead_cta_click missing ${field}`);
});

const baseMetric = (funnel.metrics || []).find((metric) => metric.id === "cta_clicks");
if (!baseMetric || baseMetric.source_event !== "lead_cta_click" || baseMetric.filter !== "none") {
  errors.push(`${FUNNEL_PATH}: cta_clicks base metric is missing or invalid`);
}

const rules = spec.rules || {};
[
  "click_is_not_confirmed_call",
  "click_is_not_lead_submission",
  "call_duration_unknown",
  "call_answered_unknown",
  "unique_caller_unknown",
  "personal_data_forbidden",
  "business_phone_number_not_exported",
  "project_link_requires_object_id"
].forEach((rule) => {
  if (rules[rule] !== true) errors.push(`${SPEC_PATH}: rule ${rule} must be true`);
});
if (rules.ratio_zero_denominator_result !== null) errors.push(`${SPEC_PATH}: zero denominator must return null`);
if (rules.reporting_timezone !== "Europe/Moscow") errors.push(`${SPEC_PATH}: reporting timezone must be Europe/Moscow`);

const allowedDimensions = new Set(uniqueStrings(rules.allowed_dimensions, `${SPEC_PATH}:allowed_dimensions`));
const prohibitedDimensions = new Set(uniqueStrings(rules.prohibited_dimensions, `${SPEC_PATH}:prohibited_dimensions`));
["page_path", "placement", "object_id"].forEach((field) => {
  if (!allowedDimensions.has(field)) errors.push(`${SPEC_PATH}: allowed_dimensions missing ${field}`);
});
["phone", "phone_normalized", "name", "email", "client_fixation_id", "call_duration", "call_status"].forEach((field) => {
  if (!prohibitedDimensions.has(field)) errors.push(`${SPEC_PATH}: prohibited_dimensions missing ${field}`);
});

const metrics = new Map();
for (const metric of Array.isArray(spec.metrics) ? spec.metrics : []) {
  const id = String(metric.id || "").trim();
  if (!id) {
    errors.push(`${SPEC_PATH}: metric id is required`);
    continue;
  }
  if (metrics.has(id)) errors.push(`${SPEC_PATH}: duplicate metric ${id}`);
  const dimensions = uniqueStrings(metric.dimensions, `${SPEC_PATH}:${id}:dimensions`);
  dimensions.forEach((dimension) => {
    if (!allowedDimensions.has(dimension)) errors.push(`${SPEC_PATH}:${id}: unsupported dimension ${dimension}`);
    if (prohibitedDimensions.has(dimension)) errors.push(`${SPEC_PATH}:${id}: prohibited dimension ${dimension}`);
  });
  if (metric.type === "count") {
    if (metric.unit !== "count" || metric.source_event !== "lead_cta_click" || metric.filter !== "action=phone") {
      errors.push(`${SPEC_PATH}:${id}: invalid phone count metric`);
    }
  } else if (metric.type === "ratio") {
    if (metric.unit !== "percent" || metric.zero_denominator_result !== null) {
      errors.push(`${SPEC_PATH}:${id}: invalid ratio settings`);
    }
  } else {
    errors.push(`${SPEC_PATH}:${id}: type must be count or ratio`);
  }
  metrics.set(id, metric);
}

if (metrics.size !== 2 || !metrics.has("phone_cta_clicks") || !metrics.has("phone_cta_share")) {
  errors.push(`${SPEC_PATH}: expected phone_cta_clicks and phone_cta_share only`);
}
const share = metrics.get("phone_cta_share");
if (share?.numerator_metric !== "phone_cta_clicks" || share?.denominator_metric !== "cta_clicks") {
  errors.push(`${SPEC_PATH}: phone_cta_share formula is invalid`);
}

const views = new Map();
for (const view of Array.isArray(spec.views) ? spec.views : []) {
  const id = String(view.id || "").trim();
  if (!id) {
    errors.push(`${SPEC_PATH}: view id is required`);
    continue;
  }
  if (views.has(id)) errors.push(`${SPEC_PATH}: duplicate view ${id}`);
  uniqueStrings(view.metrics, `${SPEC_PATH}:${id}:metrics`).forEach((metricId) => {
    if (!metrics.has(metricId)) errors.push(`${SPEC_PATH}:${id}: unknown metric ${metricId}`);
  });
  uniqueStrings(view.dimensions, `${SPEC_PATH}:${id}:dimensions`).forEach((dimension) => {
    if (!allowedDimensions.has(dimension)) errors.push(`${SPEC_PATH}:${id}: unknown dimension ${dimension}`);
  });
  views.set(id, view);
}
["phone_overview", "phone_by_placement", "phone_by_object"].forEach((id) => {
  if (!views.has(id)) errors.push(`${SPEC_PATH}: missing view ${id}`);
});
if (views.size !== 3) errors.push(`${SPEC_PATH}: expected exactly 3 views`);

const pageMap = new Map();
for (const scenario of Array.isArray(matrix.scenarios) ? matrix.scenarios : []) {
  const file = String(scenario.page_file || "").trim();
  if (!file) continue;
  if (!pageMap.has(file)) pageMap.set(file, { pagePath: scenario.page_path, objectIds: new Set() });
  if (scenario.object_id) pageMap.get(file).objectIds.add(scenario.object_id);
}

let phoneLinks = 0;
const placements = new Set();
for (const [file, page] of pageMap) {
  const html = read(file);
  if (!html) continue;
  for (const tag of anchors(html)) {
    const href = getAttribute(tag, "href");
    if (!href.toLowerCase().startsWith("tel:")) continue;
    phoneLinks += 1;
    const action = getAttribute(tag, "data-track-action");
    const placement = getAttribute(tag, "data-track-placement");
    const objectId = getAttribute(tag, "data-track-object");
    if (action !== "phone") errors.push(`${file}: phone link must use action=phone`);
    if (!placement) errors.push(`${file}: phone link must have placement`);
    if (placement) placements.add(placement);
    if (!/^tel:\+7\d{10}$/.test(href)) errors.push(`${file}: phone href must be normalized`);

    const projectIds = [...page.objectIds].filter((id) => id !== "all-newbuilds");
    if (projectIds.length === 1 && objectId !== projectIds[0]) {
      errors.push(`${file}: phone link must use object_id=${projectIds[0]}`);
    }
  }
}

if (pageMap.size !== 7) errors.push(`${MATRIX_PATH}: expected 7 active pages, got ${pageMap.size}`);
if (phoneLinks < 7) errors.push(`phone inventory: expected at least 7 links, got ${phoneLinks}`);
if (placements.size < 5) errors.push(`phone inventory: expected at least 5 placements, got ${placements.size}`);

const serialized = JSON.stringify(spec);
prohibitedDimensions.forEach((field) => {
  if (serialized.includes(`\"dimensions\":[\"${field}\"`)) errors.push(`${SPEC_PATH}: prohibited dimension used: ${field}`);
});
if (/confirmed_call|completed_call|answered_call|call_lead/.test(serialized)) {
  errors.push(`${SPEC_PATH}: specification must not claim confirmed calls or call leads`);
}

console.log(`Checked phone report metrics: ${metrics.size}`);
console.log(`Checked phone report views: ${views.size}`);
console.log(`Checked active pages: ${pageMap.size}`);
console.log(`Checked phone CTA links: ${phoneLinks}`);
console.log(`Checked phone placements: ${placements.size}`);

if (errors.length) {
  console.error("\nPhone CTA report validation errors:");
  errors.forEach((error) => console.error(`- ${error}`));
  process.exit(1);
}

console.log("Phone CTA report validation passed.");
