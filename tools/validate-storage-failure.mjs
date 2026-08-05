import fs from "node:fs";

const schemaPath = "assets/js/schema.js";
const debugPath = "assets/js/analytics-debug.js";
const schema = fs.readFileSync(schemaPath, "utf8");
const debug = fs.readFileSync(debugPath, "utf8");
const errors = [];

function requireFragment(source, fragment, label) {
  if (!source.includes(fragment)) errors.push(`${label}: missing ${fragment}`);
}
function forbidPattern(source, pattern, label) {
  if (pattern.test(source)) errors.push(`${label}: forbidden pattern ${pattern}`);
}

[
  'params.get("lead_test") === "dry-run"',
  'params.get("analytics_test") === "debug"',
  'params.get("test_ack") === "1"',
  'return ["local", "session"].includes(mode) ? mode : ""',
  'window.__NEWBUILD_STORAGE_FAILURE_MODE__ = getStorageFailureMode()',
  'safeStorageSet("session", storageKey',
  'safeStorageSet("local", lastLeadStorageKey',
  'const shouldRedirect = form.dataset.redirectSuccess !== "false" && evidenceSaved && lastLeadSaved',
  'form.removeAttribute("aria-busy")',
  'button.disabled = false',
  'storage_fail'
].forEach((fragment) => requireFragment(schema, fragment, schemaPath));

[
  'window.__NEWBUILD_SAFE_STORAGE__',
  'let memoryEvents = []',
  'storageGet("session", STORAGE_KEY',
  'storageSet("session", STORAGE_KEY',
  'storageRemove("session", STORAGE_KEY)'
].forEach((fragment) => requireFragment(debug, fragment, debugPath));

forbidPattern(schema, /fetch\s*\(/, `${schemaPath} dry-run`);
forbidPattern(schema, /newbuild-lead/, `${schemaPath} dry-run`);
forbidPattern(schema, /storage_fail\s*=\s*(?!["'](?:local|session)["'])/, schemaPath);
forbidPattern(schema, /searchParams\.set\([^,]+,\s*(?:payload\.(?:name|phone|comment|question)|formData)/, schemaPath);

if (errors.length) {
  console.error("Storage failure validation errors:");
  errors.forEach((error) => console.error(`- ${error}`));
  process.exit(1);
}
console.log("Storage failure contract passed: local/session failures are allowlisted, test-only and fail-safe.");
