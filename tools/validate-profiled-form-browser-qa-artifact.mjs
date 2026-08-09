import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import process from "node:process";
import { spawnSync } from "node:child_process";

const ROOT = process.cwd();
const artifactDir = path.resolve(process.argv[2] || "artifacts/form-browser-qa");
const summaryPath = path.join(artifactDir, "summary.json");
const BASE_VALIDATOR = path.join(ROOT, "tools/validate-form-browser-qa-artifact.mjs");
const PROFILE_CONTRACTS = Object.freeze({
  desktop_chromium_emulation: Object.freeze({
    browserEngine: "chromium",
    emulatedDevice: "desktop-custom"
  }),
  android_chromium_emulation: Object.freeze({
    browserEngine: "chromium",
    emulatedDevice: "Pixel 7"
  }),
  iphone_webkit_emulation: Object.freeze({
    browserEngine: "webkit",
    emulatedDevice: "iPhone 13"
  })
});

if (!fs.existsSync(summaryPath)) {
  console.error(`${path.relative(ROOT, summaryPath)}: file missing`);
  process.exit(1);
}

const expectedProfile = process.env.QA_EXPECTED_DEVICE_PROFILE || "desktop_chromium_emulation";
const contract = PROFILE_CONTRACTS[expectedProfile];
if (!contract) {
  throw new Error(`Unsupported QA_EXPECTED_DEVICE_PROFILE: ${expectedProfile}`);
}

const expectedEngine = process.env.QA_EXPECTED_BROWSER_ENGINE || contract.browserEngine;
const expectedDevice = process.env.QA_EXPECTED_EMULATED_DEVICE || contract.emulatedDevice;
if (expectedEngine !== contract.browserEngine || expectedDevice !== contract.emulatedDevice) {
  throw new Error("Expected browser/device values do not match the selected profile contract.");
}

const summary = JSON.parse(fs.readFileSync(summaryPath, "utf8"));
const profileErrors = [];
function assertEqual(actual, expected, label) {
  if (actual !== expected) {
    profileErrors.push(`${label}: expected ${JSON.stringify(expected)}, got ${JSON.stringify(actual)}`);
  }
}

assertEqual(summary.target?.device_profile, expectedProfile, "target.device_profile");
assertEqual(summary.target?.browser_engine, expectedEngine, "target.browser_engine");
assertEqual(summary.target?.emulated_device, expectedDevice, "target.emulated_device");
assertEqual(summary.target?.physical_device, false, "target.physical_device");

for (const item of Array.isArray(summary.storage_results) ? summary.storage_results : []) {
  assertEqual(item.device, expectedProfile, `storage.${item.mode || "unknown"}.device`);
}

if (profileErrors.length) {
  console.error("Profiled browser QA metadata errors:");
  profileErrors.forEach((error) => console.error(`- ${error}`));
  process.exit(1);
}

const tempRoot = fs.mkdtempSync(path.join(os.tmpdir(), "newbuild-form-qa-profile-"));
const normalizedArtifact = path.join(tempRoot, "artifact");
let validationStatus = 1;

try {
  fs.cpSync(artifactDir, normalizedArtifact, { recursive: true });
  const normalizedSummaryPath = path.join(normalizedArtifact, "summary.json");
  const normalizedSummary = JSON.parse(fs.readFileSync(normalizedSummaryPath, "utf8"));
  normalizedSummary.target = {
    ...(normalizedSummary.target || {}),
    device_profile: "desktop_chromium_emulation",
    physical_device: false
  };
  if (Array.isArray(normalizedSummary.storage_results)) {
    normalizedSummary.storage_results = normalizedSummary.storage_results.map((item) => ({
      ...item,
      device: "desktop_chromium_emulation"
    }));
  }
  fs.writeFileSync(normalizedSummaryPath, `${JSON.stringify(normalizedSummary, null, 2)}\n`, "utf8");

  const validation = spawnSync(process.execPath, [BASE_VALIDATOR, normalizedArtifact], {
    cwd: ROOT,
    env: process.env,
    stdio: "inherit"
  });

  if (validation.error) throw validation.error;
  validationStatus = validation.status ?? 1;
} finally {
  fs.rmSync(tempRoot, { recursive: true, force: true });
}

if (validationStatus !== 0) {
  process.exitCode = validationStatus;
} else {
  console.log(`Browser profile contract passed: ${expectedProfile} / ${expectedEngine} / ${expectedDevice}; physical_device=false`);
}
