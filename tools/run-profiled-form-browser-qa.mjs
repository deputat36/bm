import fs from "node:fs";
import path from "node:path";
import process from "node:process";
import { spawnSync } from "node:child_process";

const ROOT = process.cwd();
const BASE_RUNNER = path.join(ROOT, "tools/run-form-browser-qa.mjs");
const PRELOAD = path.join(ROOT, "tools/browser-profile-preload.mjs");
const DEFAULT_OUTPUT_DIR = path.join(ROOT, "artifacts/form-browser-qa");
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

const profileName = process.env.QA_DEVICE_PROFILE || "desktop_chromium_emulation";
const profile = PROFILE_CONTRACTS[profileName];
const outputDir = path.resolve(process.env.QA_OUTPUT_DIR || DEFAULT_OUTPUT_DIR);

if (!profile) {
  throw new Error(`Unsupported QA_DEVICE_PROFILE: ${profileName}`);
}

const result = spawnSync(
  process.execPath,
  ["--import", PRELOAD, BASE_RUNNER],
  {
    cwd: ROOT,
    env: {
      ...process.env,
      QA_DEVICE_PROFILE: profileName,
      QA_OUTPUT_DIR: outputDir
    },
    stdio: "inherit"
  }
);

const summaryPath = path.join(outputDir, "summary.json");
if (fs.existsSync(summaryPath)) {
  const summary = JSON.parse(fs.readFileSync(summaryPath, "utf8"));
  summary.target = {
    ...(summary.target || {}),
    device_profile: profileName,
    browser_engine: profile.browserEngine,
    emulated_device: profile.emulatedDevice,
    physical_device: false
  };

  if (Array.isArray(summary.storage_results)) {
    summary.storage_results = summary.storage_results.map((item) => ({
      ...item,
      device: profileName
    }));
  }

  fs.writeFileSync(summaryPath, `${JSON.stringify(summary, null, 2)}\n`, "utf8");
  console.log(`Applied browser profile metadata: ${profileName} / ${profile.browserEngine} / ${profile.emulatedDevice}`);
}

if (result.error) throw result.error;
if (result.signal) {
  console.error(`Profiled browser QA terminated by signal ${result.signal}`);
  process.exitCode = 1;
} else {
  process.exitCode = result.status ?? 1;
}
