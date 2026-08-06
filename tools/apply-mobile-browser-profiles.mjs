import fs from "node:fs";

function patchFile(file, replacements) {
  let source = fs.readFileSync(file, "utf8");
  for (const { before, after, label, all = false } of replacements) {
    if (!source.includes(before)) throw new Error(`${file}: missing patch target ${label}`);
    source = all ? source.split(before).join(after) : source.replace(before, after);
  }
  fs.writeFileSync(file, source, "utf8");
}

patchFile("tools/run-form-browser-qa.mjs", [
  {
    label: "playwright imports",
    before: 'import { chromium } from "playwright";',
    after: 'import { chromium, devices, webkit } from "playwright";'
  },
  {
    label: "browser profiles",
    before: ']);\n\nfunction cleanText(value, maxLength = 500) {',
    after: `]);

function getDeviceContext(deviceName) {
  const descriptor = devices[deviceName];
  if (!descriptor) throw new Error(\`Playwright device is unavailable: \${deviceName}\`);
  const { defaultBrowserType: _defaultBrowserType, ...contextOptions } = descriptor;
  return contextOptions;
}

const BROWSER_PROFILES = Object.freeze({
  desktop_chromium_emulation: Object.freeze({
    browserType: chromium,
    browserEngine: "chromium",
    emulatedDevice: "desktop-custom",
    contextOptions: Object.freeze({
      viewport: { width: 1440, height: 1100 },
      locale: "ru-RU",
      timezoneId: "Europe/Moscow"
    })
  }),
  android_chromium_emulation: Object.freeze({
    browserType: chromium,
    browserEngine: "chromium",
    emulatedDevice: "Pixel 7",
    contextOptions: Object.freeze({
      ...getDeviceContext("Pixel 7"),
      locale: "ru-RU",
      timezoneId: "Europe/Moscow"
    })
  }),
  iphone_webkit_emulation: Object.freeze({
    browserType: webkit,
    browserEngine: "webkit",
    emulatedDevice: "iPhone 13",
    contextOptions: Object.freeze({
      ...getDeviceContext("iPhone 13"),
      locale: "ru-RU",
      timezoneId: "Europe/Moscow"
    })
  })
});

function cleanText(value, maxLength = 500) {`
  },
  {
    label: "profile resolution",
    before: '  return {\n    baseUrl,',
    after: `  const deviceProfile = process.env.QA_DEVICE_PROFILE || "desktop_chromium_emulation";
  const profile = BROWSER_PROFILES[deviceProfile];
  if (!profile) {
    throw new Error(\`Unsupported QA_DEVICE_PROFILE: \${deviceProfile}\`);
  }

  return {
    baseUrl,`
  },
  {
    label: "profile config fields",
    before: '    runStorageChecks: parseBoolean(process.env.QA_RUN_STORAGE, true)\n  };',
    after: `    runStorageChecks: parseBoolean(process.env.QA_RUN_STORAGE, true),
    deviceProfile,
    browserEngine: profile.browserEngine,
    emulatedDevice: profile.emulatedDevice,
    browserType: profile.browserType,
    contextOptions: profile.contextOptions
  };`
  },
  {
    label: "scenario context",
    before: `  const context = await browser.newContext({
    viewport: { width: 1440, height: 1100 },
    locale: "ru-RU",
    timezoneId: "Europe/Moscow"
  });`,
    after: '  const context = await browser.newContext(config.contextOptions);',
    all: true
  },
  {
    label: "storage device result",
    before: 'device: "desktop_chromium_emulation"',
    after: 'device: config.deviceProfile',
    all: true
  },
  {
    label: "browser launch",
    before: '  const browser = await chromium.launch({ headless: config.headless });',
    after: '  const browser = await config.browserType.launch({ headless: config.headless });'
  },
  {
    label: "summary target",
    before: `      device_profile: "desktop_chromium_emulation",
      physical_device: false`,
    after: `      device_profile: config.deviceProfile,
      browser_engine: config.browserEngine,
      emulated_device: config.emulatedDevice,
      physical_device: false`
  }
]);

patchFile("tools/validate-form-browser-qa-artifact.mjs", [
  {
    label: "profile contracts",
    before: `const expectedOrigin = new URL(
  process.env.QA_EXPECTED_ORIGIN || "http://127.0.0.1:4173"
).origin;

if (!EXPECTED_MODES.has(expectedMode)) {`,
    after: `const expectedOrigin = new URL(
  process.env.QA_EXPECTED_ORIGIN || "http://127.0.0.1:4173"
).origin;
const PROFILE_CONTRACTS = Object.freeze({
  desktop_chromium_emulation: Object.freeze({ browserEngine: "chromium", emulatedDevice: "desktop-custom" }),
  android_chromium_emulation: Object.freeze({ browserEngine: "chromium", emulatedDevice: "Pixel 7" }),
  iphone_webkit_emulation: Object.freeze({ browserEngine: "webkit", emulatedDevice: "iPhone 13" })
});
const expectedDeviceProfile = process.env.QA_EXPECTED_DEVICE_PROFILE || "desktop_chromium_emulation";
const profileContract = PROFILE_CONTRACTS[expectedDeviceProfile];
const expectedBrowserEngine = process.env.QA_EXPECTED_BROWSER_ENGINE || profileContract?.browserEngine || "";
const expectedEmulatedDevice = process.env.QA_EXPECTED_EMULATED_DEVICE || profileContract?.emulatedDevice || "";

if (!EXPECTED_MODES.has(expectedMode)) {`
  },
  {
    label: "unsupported profile guard",
    before: `if (!EXPECTED_MODES.has(expectedMode)) {
  throw new Error(\`Unsupported QA_EXPECTED_MODE: \${expectedMode}\`);
}

const REQUIRED_EVENTS = [`,
    after: `if (!EXPECTED_MODES.has(expectedMode)) {
  throw new Error(\`Unsupported QA_EXPECTED_MODE: \${expectedMode}\`);
}
if (!profileContract) {
  throw new Error(\`Unsupported QA_EXPECTED_DEVICE_PROFILE: \${expectedDeviceProfile}\`);
}
if (expectedBrowserEngine !== profileContract.browserEngine || expectedEmulatedDevice !== profileContract.emulatedDevice) {
  throw new Error("Expected browser/device values do not match the selected profile contract.");
}

const REQUIRED_EVENTS = [`
  },
  {
    label: "target profile assertions",
    before: `assertEqual(summary.target?.device_profile, "desktop_chromium_emulation", "target.device_profile");
assertEqual(summary.target?.physical_device, false, "target.physical_device");`,
    after: `assertEqual(summary.target?.device_profile, expectedDeviceProfile, "target.device_profile");
assertEqual(summary.target?.browser_engine, expectedBrowserEngine, "target.browser_engine");
assertEqual(summary.target?.emulated_device, expectedEmulatedDevice, "target.emulated_device");
assertEqual(summary.target?.physical_device, false, "target.physical_device");`
  },
  {
    label: "storage profile assertion",
    before: `  assertEqual(result.status, "passed", \`${label}.status\`);
  assertTrue(result.checks && Object.values(result.checks).every(Boolean), \`${label}: not all checks passed\`);`,
    after: `  assertEqual(result.status, "passed", \`${label}.status\`);
  assertEqual(result.device, expectedDeviceProfile, \`${label}.device\`);
  assertTrue(result.checks && Object.values(result.checks).every(Boolean), \`${label}: not all checks passed\`);`
  },
  {
    label: "validation summary target",
    before: 'console.log(`Target: ${expectedMode} (${expectedOrigin})`);',
    after: 'console.log(`Target: ${expectedMode} (${expectedOrigin}); ${expectedDeviceProfile} / ${expectedBrowserEngine} / ${expectedEmulatedDevice}`);'
  }
]);

console.log("Mobile browser profile support applied to runner and artifact validator.");
