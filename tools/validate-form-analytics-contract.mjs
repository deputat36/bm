import fs from "node:fs";

const paths = {
  tracking: "assets/js/conversion-tracking.js",
  mobile: "assets/js/mobile-lead-bar.js",
  thankyou: "spasibo/index.html",
  registry: "data/analytics/events.json"
};
const errors = [];
const read = (file) => fs.readFileSync(file, "utf8");
const tracking = read(paths.tracking);
const mobile = read(paths.mobile);
const thankyou = read(paths.thankyou);
const registry = JSON.parse(read(paths.registry));
const requiredEvents = ["lead_form_view", "lead_form_start", "lead_submit", "lead_submit_classified", "lead_thankyou_view"];
const requiredContext = ["form_id", "form_role", "lead_type", "object_id", "placement"];

function requireFragment(source, fragment, label) {
  if (!source.includes(fragment)) errors.push(`${label}: missing ${fragment}`);
}
function forbidPattern(source, pattern, label) {
  if (pattern.test(source)) errors.push(`${label}: forbidden pattern ${pattern}`);
}

[
  "function getFormPlacement(form, data = {})",
  "function getFormDetails(form, data = {})",
  "window.getNewbuildFormAnalyticsContext = getFormDetails",
  "const viewedForms = new WeakSet()",
  "window.addEventListener(\"hashchange\", markHashTargetViewed)",
  "markHashTargetViewed()",
  "formObserver = new IntersectionObserver"
].forEach((fragment) => requireFragment(tracking, fragment, paths.tracking));

for (const eventName of ["lead_form_view", "lead_form_start", "lead_submit_classified"]) {
  requireFragment(tracking, `\"${eventName}\"`, paths.tracking);
}
requireFragment(mobile, 'event: "lead_submit"', paths.mobile);
requireFragment(thankyou, 'event: "lead_thankyou_view"', paths.thankyou);

for (const field of requiredContext) {
  requireFragment(tracking, `${field}:`, paths.tracking);
  requireFragment(mobile, `${field}:`, paths.mobile);
  requireFragment(thankyou, `${field}:`, paths.thankyou);
}

const registryById = new Map((registry.events || []).map((event) => [event.id, event]));
for (const eventName of requiredEvents) {
  const event = registryById.get(eventName);
  if (!event) {
    errors.push(`${paths.registry}: missing ${eventName}`);
    continue;
  }
  for (const field of requiredContext) {
    if (!(event.required_fields || []).includes(field)) {
      errors.push(`${paths.registry}:${eventName}: required_fields missing ${field}`);
    }
  }
  if (event.contains_personal_data !== false) errors.push(`${paths.registry}:${eventName}: contains_personal_data must be false`);
}

const combinedPublicRuntime = `${tracking}\n${mobile}\n${thankyou}`;
for (const field of ["name", "phone", "phone_normalized", "email", "comment", "question", "user_agent", "client_fixation_id"]) {
  const publicPayloadBinding = new RegExp(`(?:publicPayload|thankYouPayload|sendConversionEvent\\([^)]*\\{)[\\s\\S]{0,900}\\b${field}\\s*:`, "m");
  if (field !== "client_fixation_id" && publicPayloadBinding.test(combinedPublicRuntime)) {
    errors.push(`public analytics payload may expose ${field}`);
  }
}
forbidPattern(tracking, /window\.dataLayer\.push\([^)]*client_fixation_id/, paths.tracking);
forbidPattern(mobile, /publicPayload[\s\S]{0,800}client_fixation_id\s*:/, paths.mobile);

if ((tracking.match(/sendConversionEvent\("lead_submit_classified"/g) || []).length !== 2) {
  errors.push(`${paths.tracking}: expected classified event in live and dry-run paths`);
}
if ((mobile.match(/event:\s*"lead_submit"/g) || []).length !== 1) {
  errors.push(`${paths.mobile}: canonical lead_submit must be declared exactly once`);
}

if (errors.length) {
  console.error("Form analytics contract validation errors:");
  errors.forEach((error) => console.error(`- ${error}`));
  process.exit(1);
}
console.log("Form analytics contract passed: five events share form_id, form_role, lead_type, object_id and placement.");
