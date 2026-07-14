import fs from "node:fs";
import path from "node:path";

const ROOT = process.cwd();
const SPEC_PATH = "data/analytics/funnel-report.json";
const EVENTS_PATH = "data/analytics/events.json";
const FIELD_PATTERN = /^[a-z][a-z0-9_]*$/;
const EXPECTED_METRICS = new Set([
  "cta_clicks",
  "form_views",
  "form_starts",
  "valid_submissions",
  "online_submissions",
  "offline_submissions",
  "classified_valid_submissions",
  "classified_online_submissions",
  "content_assisted_submissions",
  "thankyou_views",
  "postsubmit_actions",
  "view_to_start_rate",
  "start_to_submit_rate",
  "view_to_submit_rate",
  "online_submission_share",
  "offline_submission_share",
  "classification_coverage_rate",
  "content_assisted_share",
  "thankyou_view_rate"
]);
const EXPECTED_VIEWS = new Set([
  "executive_summary",
  "cta_performance",
  "form_funnel",
  "source_performance",
  "content_assist",
  "post_submit"
]);
const errors = [];

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

function requireText(value, label) {
  const normalized = String(value || "").trim();
  if (!normalized) errors.push(`${label}: value is required`);
  return normalized;
}

function uniqueStrings(values, label) {
  if (!Array.isArray(values)) {
    errors.push(`${label}: must be an array`);
    return [];
  }

  const normalized = values.map((value) => String(value || "").trim()).filter(Boolean);
  if (new Set(normalized).size !== normalized.length) {
    errors.push(`${label}: values must be unique`);
  }
  return normalized;
}

function parseFilter(filter, label) {
  const text = String(filter || "").trim();
  if (!text) {
    errors.push(`${label}: filter is required`);
    return [];
  }
  if (text === "none") return [];

  return text.split(/\s+AND\s+/).map((part) => {
    const match = part.match(/^([a-z][a-z0-9_]*)=([^=\s]+)$/);
    if (!match) {
      errors.push(`${label}: unsupported filter clause ${part}`);
      return null;
    }
    return { field: match[1], value: match[2] };
  }).filter(Boolean);
}

const registry = readJson(EVENTS_PATH);
const spec = readJson(SPEC_PATH);

if (!registry || !spec) {
  process.exit(1);
}

const eventMap = new Map();
for (const event of Array.isArray(registry.events) ? registry.events : []) {
  const fields = new Set([...(event.required_fields || []), ...(event.optional_fields || [])]);
  eventMap.set(event.id, { ...event, fields });
}

if (spec.portal_id !== registry.portal_id || spec.portal_id !== "newbuilds-borisoglebsk") {
  errors.push(`${SPEC_PATH}: portal_id must match analytics registry`);
}
if (spec.schema_version !== "1.0") {
  errors.push(`${SPEC_PATH}: schema_version must be 1.0`);
}
if (spec.status !== "specification_only_no_live_data") {
  errors.push(`${SPEC_PATH}: status must explicitly prohibit live-data claims`);
}
requireText(spec.purpose, `${SPEC_PATH}:purpose`);

const rules = spec.rules || {};
if (rules.event_registry !== EVENTS_PATH) errors.push(`${SPEC_PATH}: event_registry must point to ${EVENTS_PATH}`);
if (rules.canonical_submission_metric !== "valid_submissions") errors.push(`${SPEC_PATH}: invalid canonical submission metric`);
if (rules.canonical_submission_event !== registry.rules?.canonical_submission_event) errors.push(`${SPEC_PATH}: canonical event must match registry`);
if (rules.classified_submission_metric !== "classified_valid_submissions") errors.push(`${SPEC_PATH}: invalid classified submission metric`);
if (rules.classified_submission_event !== registry.rules?.classified_submission_event) errors.push(`${SPEC_PATH}: classified event must match registry`);
if (rules.classified_metrics_are_non_additive_to_canonical !== true) errors.push(`${SPEC_PATH}: classified metrics must be non-additive`);
if (rules.valid_submission_filter !== "blocked=false") errors.push(`${SPEC_PATH}: valid submission filter must be blocked=false`);
if (rules.online_submission_filter !== "blocked=false AND offline=false") errors.push(`${SPEC_PATH}: invalid online filter`);
if (rules.offline_submission_filter !== "blocked=false AND offline=true") errors.push(`${SPEC_PATH}: invalid offline filter`);
if (rules.dry_run_excluded !== true) errors.push(`${SPEC_PATH}: dry-run events must be excluded`);
if (rules.ratio_zero_denominator_result !== null) errors.push(`${SPEC_PATH}: zero denominator must return null`);
if (rules.reporting_timezone !== "Europe/Moscow") errors.push(`${SPEC_PATH}: reporting timezone must be Europe/Moscow`);
if (rules.personal_data_forbidden !== true || rules.restricted_technical_id_forbidden !== true) {
  errors.push(`${SPEC_PATH}: privacy restrictions must be enabled`);
}

const registryProhibited = new Set(registry.rules?.prohibited_fields || []);
const prohibitedDimensions = new Set(uniqueStrings(rules.prohibited_dimensions, `${SPEC_PATH}:rules.prohibited_dimensions`));
registryProhibited.forEach((field) => {
  if (!prohibitedDimensions.has(field)) errors.push(`${SPEC_PATH}: prohibited dimension list missing ${field}`);
});
if (!prohibitedDimensions.has("client_fixation_id")) errors.push(`${SPEC_PATH}: client_fixation_id must be forbidden`);
const systemFilterFields = new Set(uniqueStrings(rules.allowed_system_filter_fields, `${SPEC_PATH}:rules.allowed_system_filter_fields`));

const dimensionMap = new Map();
for (const dimension of Array.isArray(spec.dimensions) ? spec.dimensions : []) {
  const id = requireText(dimension.id, "dimension.id");
  const label = `${SPEC_PATH}:dimension:${id || "unknown"}`;
  if (!FIELD_PATTERN.test(id)) errors.push(`${label}: invalid id`);
  if (dimensionMap.has(id)) errors.push(`${label}: duplicate id`);
  if (prohibitedDimensions.has(id)) errors.push(`${label}: prohibited dimension`);
  requireText(dimension.title, `${label}:title`);
  const events = uniqueStrings(dimension.events, `${label}:events`);
  if (!events.length) errors.push(`${label}: at least one event is required`);

  for (const eventId of events) {
    const event = eventMap.get(eventId);
    if (!event) {
      errors.push(`${label}: unknown event ${eventId}`);
      continue;
    }
    if (!event.fields.has(id)) errors.push(`${label}: ${eventId} does not declare field ${id}`);
  }
  dimensionMap.set(id, { ...dimension, events: new Set(events) });
}

const metricMap = new Map();
for (const metric of Array.isArray(spec.metrics) ? spec.metrics : []) {
  const id = requireText(metric.id, "metric.id");
  const label = `${SPEC_PATH}:metric:${id || "unknown"}`;
  if (!FIELD_PATTERN.test(id)) errors.push(`${label}: invalid id`);
  if (metricMap.has(id)) errors.push(`${label}: duplicate id`);
  requireText(metric.name, `${label}:name`);
  requireText(metric.purpose, `${label}:purpose`);
  const dimensions = uniqueStrings(metric.dimensions, `${label}:dimensions`);
  dimensions.forEach((dimensionId) => {
    if (!dimensionMap.has(dimensionId)) errors.push(`${label}: unknown dimension ${dimensionId}`);
    if (prohibitedDimensions.has(dimensionId)) errors.push(`${label}: prohibited dimension ${dimensionId}`);
  });

  if (metric.type === "count") {
    if (metric.unit !== "count") errors.push(`${label}: count metric must use count unit`);
    const event = eventMap.get(metric.source_event);
    if (!event) {
      errors.push(`${label}: unknown source_event ${metric.source_event}`);
    } else {
      dimensions.forEach((dimensionId) => {
        const dimension = dimensionMap.get(dimensionId);
        if (dimension && !dimension.events.has(metric.source_event)) {
          errors.push(`${label}: ${dimensionId} is not available on ${metric.source_event}`);
        }
      });
      for (const clause of parseFilter(metric.filter, `${label}:filter`)) {
        if (!event.fields.has(clause.field) && !systemFilterFields.has(clause.field)) {
          errors.push(`${label}: filter field ${clause.field} is not available on ${metric.source_event}`);
        }
      }
    }
  } else if (metric.type === "ratio") {
    if (metric.unit !== "percent") errors.push(`${label}: ratio metric must use percent unit`);
    if (metric.zero_denominator_result !== null) errors.push(`${label}: zero denominator must return null`);
    requireText(metric.numerator_metric, `${label}:numerator_metric`);
    requireText(metric.denominator_metric, `${label}:denominator_metric`);
  } else {
    errors.push(`${label}: type must be count or ratio`);
  }

  metricMap.set(id, { ...metric, dimensions: new Set(dimensions) });
}

for (const metric of metricMap.values()) {
  const label = `${SPEC_PATH}:metric:${metric.id}`;
  if (metric.type === "ratio") {
    const numerator = metricMap.get(metric.numerator_metric);
    const denominator = metricMap.get(metric.denominator_metric);
    if (!numerator) errors.push(`${label}: unknown numerator ${metric.numerator_metric}`);
    if (!denominator) errors.push(`${label}: unknown denominator ${metric.denominator_metric}`);
    if (numerator && denominator) {
      for (const dimensionId of metric.dimensions) {
        if (!numerator.dimensions.has(dimensionId) || !denominator.dimensions.has(dimensionId)) {
          errors.push(`${label}: dimension ${dimensionId} is not shared by numerator and denominator`);
        }
      }
    }
  }

  for (const targetId of uniqueStrings(metric.non_additive_to || [], `${label}:non_additive_to`)) {
    if (!metricMap.has(targetId)) errors.push(`${label}: unknown non-additive target ${targetId}`);
  }
}

EXPECTED_METRICS.forEach((id) => {
  if (!metricMap.has(id)) errors.push(`${SPEC_PATH}: missing metric ${id}`);
});
metricMap.forEach((_, id) => {
  if (!EXPECTED_METRICS.has(id)) errors.push(`${SPEC_PATH}: unexpected metric ${id}`);
});

const canonical = metricMap.get("valid_submissions");
if (canonical?.source_event !== "lead_submit" || canonical?.filter !== "blocked=false") {
  errors.push(`${SPEC_PATH}: valid_submissions must be the canonical filtered lead_submit count`);
}
const classified = metricMap.get("classified_valid_submissions");
if (classified?.source_event !== "lead_submit_classified" || !classified?.non_additive_to?.includes("valid_submissions")) {
  errors.push(`${SPEC_PATH}: classified submissions must be non-additive to canonical submissions`);
}
const contentAssisted = metricMap.get("content_assisted_submissions");
if (!String(contentAssisted?.filter || "").includes("lead_source=internal_content")) {
  errors.push(`${SPEC_PATH}: content-assisted metric must filter internal_content`);
}
const reconciliation = rules.reconciliation || {};
if (reconciliation.metric !== "classification_coverage_rate" || reconciliation.expected_value !== 1 || Number(reconciliation.warning_below) !== 0.98) {
  errors.push(`${SPEC_PATH}: reconciliation rule is incomplete`);
}

const viewMap = new Map();
for (const view of Array.isArray(spec.views) ? spec.views : []) {
  const id = requireText(view.id, "view.id");
  const label = `${SPEC_PATH}:view:${id || "unknown"}`;
  if (!FIELD_PATTERN.test(id)) errors.push(`${label}: invalid id`);
  if (viewMap.has(id)) errors.push(`${label}: duplicate id`);
  requireText(view.title, `${label}:title`);
  const metrics = uniqueStrings(view.metrics, `${label}:metrics`);
  const dimensions = uniqueStrings(view.dimensions, `${label}:dimensions`);
  if (!metrics.length) errors.push(`${label}: at least one metric is required`);

  metrics.forEach((metricId) => {
    const metric = metricMap.get(metricId);
    if (!metric) {
      errors.push(`${label}: unknown metric ${metricId}`);
      return;
    }
    dimensions.forEach((dimensionId) => {
      if (!metric.dimensions.has(dimensionId)) {
        errors.push(`${label}: metric ${metricId} does not support dimension ${dimensionId}`);
      }
    });
  });
  dimensions.forEach((dimensionId) => {
    if (!dimensionMap.has(dimensionId)) errors.push(`${label}: unknown dimension ${dimensionId}`);
  });
  viewMap.set(id, view);
}

EXPECTED_VIEWS.forEach((id) => {
  if (!viewMap.has(id)) errors.push(`${SPEC_PATH}: missing view ${id}`);
});
viewMap.forEach((_, id) => {
  if (!EXPECTED_VIEWS.has(id)) errors.push(`${SPEC_PATH}: unexpected view ${id}`);
});

const serialized = JSON.stringify(spec);
for (const field of prohibitedDimensions) {
  if (serialized.includes(`\"dimensions\":[\"${field}\"`)) {
    errors.push(`${SPEC_PATH}: prohibited dimension appears in metric or view: ${field}`);
  }
}
if (/\"observations\"|\"actual_values\"|\"sample_results\"/.test(serialized)) {
  errors.push(`${SPEC_PATH}: live or sample observations are forbidden in the specification`);
}

console.log(`Checked analytics dimensions: ${dimensionMap.size}`);
console.log(`Checked funnel metrics: ${metricMap.size}`);
console.log(`Checked report views: ${viewMap.size}`);

if (errors.length) {
  console.error("\nAnalytics funnel report validation errors:");
  errors.forEach((error) => console.error(`- ${error}`));
  process.exit(1);
}

console.log("Analytics funnel report validation passed.");
