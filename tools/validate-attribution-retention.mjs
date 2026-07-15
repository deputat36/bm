import fs from "node:fs";
import path from "node:path";

const ROOT = process.cwd();
const RUNTIME_PATH = "assets/js/form-accessibility.js";
const TRACKING_PATH = "assets/js/main.js";
const errors = [];

function read(relativePath) {
  const fullPath = path.join(ROOT, relativePath);
  if (!fs.existsSync(fullPath)) {
    errors.push(`${relativePath}: file does not exist`);
    return "";
  }
  return fs.readFileSync(fullPath, "utf8");
}

function requireFragment(source, fragment, label) {
  if (!source.includes(fragment)) errors.push(`${label}: missing ${fragment}`);
}

const runtime = read(RUNTIME_PATH);
const tracking = read(TRACKING_PATH);

[
  'const ATTRIBUTION_STORAGE_KEY = "newbuildsBorisoglebskTracking";',
  "const ATTRIBUTION_RETENTION_MS = 30 * 24 * 60 * 60_000;",
  "const ATTRIBUTION_FUTURE_SKEW_MS = 5 * 60_000;",
  "function isFreshAttributionTouch(touch, now = Date.now())",
  'Date.parse(String(touch?.captured_at || ""))',
  "if (!Number.isFinite(capturedAt)) return false;",
  "if (capturedAt > now + ATTRIBUTION_FUTURE_SKEW_MS) return false;",
  "return now - capturedAt <= ATTRIBUTION_RETENTION_MS;",
  "function pruneAttributionTracking(tracking)",
  "first_touch: firstTouchFresh ? source.first_touch : {}",
  "last_touch: lastTouchFresh ? source.last_touch : {}",
  "current: keepCurrent",
  "function enableAttributionRetention()",
  "persistAttributionTracking(pruneAttributionTracking(stored));",
  "const tracking = pruneAttributionTracking(originalGetTrackingData());",
  "data.tracking = pruneAttributionTracking(data.tracking);",
  "window.__NEWBUILD_ATTRIBUTION_RETENTION__ = true;",
  "enableAttributionRetention();"
].forEach((fragment) => requireFragment(runtime, fragment, RUNTIME_PATH));

[
  'const TRACKING_STORAGE_KEY = "newbuildsBorisoglebskTracking";',
  "captured_at: now",
  "first_touch: firstTouch",
  "last_touch: lastTouch",
  "current:"
].forEach((fragment) => requireFragment(tracking, fragment, TRACKING_PATH));

const retentionStart = runtime.indexOf("const ATTRIBUTION_STORAGE_KEY");
const retentionEnd = runtime.indexOf("function safeId", retentionStart);
const retentionBlock = retentionStart >= 0 && retentionEnd > retentionStart
  ? runtime.slice(retentionStart, retentionEnd)
  : "";

if (!retentionBlock) {
  errors.push(`${RUNTIME_PATH}: attribution retention block not found`);
} else {
  [
    "client_fixation_id",
    "phone",
    "phone_normalized",
    "email",
    "comment",
    "question",
    "name:",
    "fields_json",
    "consent_text"
  ].forEach((field) => {
    if (retentionBlock.includes(field)) {
      errors.push(`${RUNTIME_PATH}: retention block must not use ${field}`);
    }
  });

  if (retentionBlock.includes("sessionStorage")) {
    errors.push(`${RUNTIME_PATH}: attribution retention must use the existing localStorage tracking key`);
  }
}

const payloadPrivacyPosition = runtime.indexOf("enableLeadPayloadPrivacy();");
const retentionPosition = runtime.indexOf("enableAttributionRetention();");
const enhancePosition = runtime.indexOf("forms.forEach(enhanceForm);");
if (!(payloadPrivacyPosition >= 0 && retentionPosition > payloadPrivacyPosition && enhancePosition > retentionPosition)) {
  errors.push(`${RUNTIME_PATH}: attribution retention must install before forms are enhanced`);
}

console.log("Attribution retention window: 30 days");
console.log("Allowed future clock skew: 5 minutes");
console.log("Stored personal fields in retention module: 0");

if (errors.length) {
  console.error("\nAttribution retention validation errors:");
  errors.forEach((error) => console.error(`- ${error}`));
  process.exit(1);
}

console.log("Attribution retention validation passed.");