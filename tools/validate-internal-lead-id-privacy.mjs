import fs from "node:fs";
import path from "node:path";

const ROOT = process.cwd();
const RUNTIME_PATH = "assets/js/mobile-lead-bar.js";
const SCHEMA_PATH = "assets/js/schema.js";
const EVENTS_PATH = "data/analytics/events.json";
const errors = [];

function read(relativePath) {
  const fullPath = path.join(ROOT, relativePath);
  if (!fs.existsSync(fullPath)) {
    errors.push(`${relativePath}: file does not exist`);
    return "";
  }
  return fs.readFileSync(fullPath, "utf8");
}

function requireFragment(source, fragment, sourcePath) {
  if (!source.includes(fragment)) errors.push(`${sourcePath}: missing ${fragment}`);
}

const runtime = read(RUNTIME_PATH);
const schema = read(SCHEMA_PATH);
let registry = null;
try {
  registry = JSON.parse(read(EVENTS_PATH));
} catch (error) {
  errors.push(`${EVENTS_PATH}: invalid JSON`);
}

[
  "function enableInternalLeadIdPrivacy()",
  "trackLeadEvent = function trackLeadEventWithPrivateInternalId",
  "const publicPayload = {",
  "window.dataLayer.push(publicPayload)",
  'window.gtag("event", "lead_submit"',
  'window.ym(counterId, "reachGoal", "lead_submit", publicPayload)',
  'new CustomEvent("newbuildLeadSubmit"',
  "...publicPayload",
  'client_fixation_id: data.client_fixation_id || ""',
  "window.__NEWBUILD_INTERNAL_LEAD_ID_PRIVACY__ = true;",
  "enableInternalLeadIdPrivacy();"
].forEach((fragment) => requireFragment(runtime, fragment, RUNTIME_PATH));

requireFragment(schema, 'loadPortalScript(schemaScriptUrl, "mobile-lead-bar.js")', SCHEMA_PATH);

const overrideStart = runtime.indexOf("trackLeadEvent = function trackLeadEventWithPrivateInternalId");
const internalStart = runtime.indexOf('window.dispatchEvent(new CustomEvent("newbuildLeadSubmit"', overrideStart);
const overrideEnd = runtime.indexOf("window.__NEWBUILD_INTERNAL_LEAD_ID_PRIVACY__", overrideStart);

if (overrideStart < 0 || internalStart < 0 || overrideEnd < 0) {
  errors.push(`${RUNTIME_PATH}: privacy override boundaries not found`);
} else {
  const publicBlock = runtime.slice(overrideStart, internalStart);
  const internalBlock = runtime.slice(internalStart, overrideEnd);

  [
    "client_fixation_id",
    "phone:",
    "phone_normalized:",
    "email:",
    "comment:",
    "question:",
    "user_agent:"
  ].forEach((field) => {
    if (publicBlock.includes(field)) errors.push(`${RUNTIME_PATH}: public analytics contains ${field}`);
  });

  if (!internalBlock.includes("client_fixation_id")) {
    errors.push(`${RUNTIME_PATH}: internal event must keep client_fixation_id`);
  }
}

const privacyCall = runtime.indexOf("enableInternalLeadIdPrivacy();");
const duplicateBarReturn = runtime.indexOf('document.querySelector("[data-mobile-lead-bar]")');
if (!(privacyCall >= 0 && duplicateBarReturn > privacyCall)) {
  errors.push(`${RUNTIME_PATH}: privacy override must install before mobile bar duplicate return`);
}

const leadSubmit = (registry?.events || []).find((event) => event.id === "lead_submit");
if (!leadSubmit) {
  errors.push(`${EVENTS_PATH}: lead_submit is missing`);
} else if (!(leadSubmit.forbidden_fields || []).includes("client_fixation_id")) {
  errors.push(`${EVENTS_PATH}: client_fixation_id must remain forbidden`);
}

console.log("Public analytics client fixation IDs: 0");
console.log("Internal browser event client fixation ID: allowed");

if (errors.length) {
  console.error("\nInternal lead ID privacy validation errors:");
  errors.forEach((error) => console.error(`- ${error}`));
  process.exit(1);
}

console.log("Internal lead ID privacy validation passed.");