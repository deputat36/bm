import fs from "node:fs";
import path from "node:path";
import process from "node:process";
import { spawnSync } from "node:child_process";

const ROOT = process.cwd();
const BASE_RUNNER = path.join(ROOT, "tools/run-form-browser-qa.mjs");
const TEMP_RUNNER = path.join(ROOT, "tools", `.run-form-browser-qa-profile-${process.pid}.mjs`);
const PROFILE_CONTRACTS = Object.freeze({
  desktop_chromium_emulation: Object.freeze({
    browserEngine: "chromium",
    emulatedDevice: "desktop-custom",
    deviceName: ""
  }),
  android_chromium_emulation: Object.freeze({
    browserEngine: "chromium",
    emulatedDevice: "Pixel 7",
    deviceName: "Pixel 7"
  }),
  iphone_webkit_emulation: Object.freeze({
    browserEngine: "webkit",
    emulatedDevice: "iPhone 13",
    deviceName: "iPhone 13"
  })
});

const profileName = process.env.QA_DEVICE_PROFILE || "desktop_chromium_emulation";
const profile = PROFILE_CONTRACTS[profileName];
if (!profile) {
  throw new Error(`Unsupported QA_DEVICE_PROFILE: ${profileName}`);
}

function replaceExact(source, before, after, label, expectedCount = 1) {
  const actualCount = source.split(before).length - 1;
  if (actualCount !== expectedCount) {
    throw new Error(`${label}: expected ${expectedCount} patch target(s), found ${actualCount}`);
  }
  return source.split(before).join(after);
}

let generatedSource = fs.readFileSync(BASE_RUNNER, "utf8");
const profileBootstrap = `import { chromium, devices, webkit } from "playwright";

const PROFILE_NAME = ${JSON.stringify(profileName)};
const PROFILE_BROWSER_ENGINE = ${JSON.stringify(profile.browserEngine)};
const PROFILE_EMULATED_DEVICE = ${JSON.stringify(profile.emulatedDevice)};
const PROFILE_DEVICE_NAME = ${JSON.stringify(profile.deviceName)};
const PROFILE_BROWSER_TYPE = PROFILE_BROWSER_ENGINE === "webkit" ? webkit : chromium;
const PROFILE_CONTEXT_OPTIONS = (() => {
  if (!PROFILE_DEVICE_NAME) {
    return {
      viewport: { width: 1440, height: 1100 },
      locale: "ru-RU",
      timezoneId: "Europe/Moscow"
    };
  }
  const descriptor = devices[PROFILE_DEVICE_NAME];
  if (!descriptor) throw new Error(\`Playwright device descriptor is unavailable: \${PROFILE_DEVICE_NAME}\`);
  const { defaultBrowserType: _defaultBrowserType, ...deviceOptions } = descriptor;
  return {
    ...deviceOptions,
    locale: "ru-RU",
    timezoneId: "Europe/Moscow"
  };
})();`;

generatedSource = replaceExact(
  generatedSource,
  'import { chromium } from "playwright";',
  profileBootstrap,
  "Playwright import"
);
generatedSource = replaceExact(
  generatedSource,
  `  const context = await browser.newContext({
    viewport: { width: 1440, height: 1100 },
    locale: "ru-RU",
    timezoneId: "Europe/Moscow"
  });`,
  "  const context = await browser.newContext(PROFILE_CONTEXT_OPTIONS);",
  "browser context",
  2
);
generatedSource = replaceExact(
  generatedSource,
  'device: "desktop_chromium_emulation"',
  "device: PROFILE_NAME",
  "storage device metadata",
  2
);
generatedSource = replaceExact(
  generatedSource,
  "  const browser = await chromium.launch({ headless: config.headless });",
  "  const browser = await PROFILE_BROWSER_TYPE.launch({ headless: config.headless });",
  "browser launch"
);
generatedSource = replaceExact(
  generatedSource,
  `      device_profile: "desktop_chromium_emulation",
      physical_device: false`,
  `      device_profile: PROFILE_NAME,
      browser_engine: PROFILE_BROWSER_ENGINE,
      emulated_device: PROFILE_EMULATED_DEVICE,
      physical_device: false`,
  "summary target metadata"
);

fs.writeFileSync(TEMP_RUNNER, generatedSource, "utf8");

let result;
try {
  result = spawnSync(process.execPath, [TEMP_RUNNER], {
    cwd: ROOT,
    env: process.env,
    stdio: "inherit"
  });
} finally {
  fs.rmSync(TEMP_RUNNER, { force: true });
}

if (result?.error) throw result.error;
if (result?.signal) {
  console.error(`Profiled browser QA terminated by signal ${result.signal}`);
  process.exitCode = 1;
} else {
  process.exitCode = result?.status ?? 1;
}
