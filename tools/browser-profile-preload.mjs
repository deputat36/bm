import { chromium, devices, webkit } from "playwright";

const PROFILE_CONTRACTS = Object.freeze({
  desktop_chromium_emulation: Object.freeze({
    browserEngine: "chromium",
    emulatedDevice: "desktop-custom",
    browserType: chromium,
    deviceName: ""
  }),
  android_chromium_emulation: Object.freeze({
    browserEngine: "chromium",
    emulatedDevice: "Pixel 7",
    browserType: chromium,
    deviceName: "Pixel 7"
  }),
  iphone_webkit_emulation: Object.freeze({
    browserEngine: "webkit",
    emulatedDevice: "iPhone 13",
    browserType: webkit,
    deviceName: "iPhone 13"
  })
});

const profileName = process.env.QA_DEVICE_PROFILE || "desktop_chromium_emulation";
const profile = PROFILE_CONTRACTS[profileName];

if (!profile) {
  throw new Error(`Unsupported QA_DEVICE_PROFILE: ${profileName}`);
}

if (profileName === "desktop_chromium_emulation") {
  globalThis.__NEWBUILD_BROWSER_PROFILE__ = {
    name: profileName,
    browser_engine: profile.browserEngine,
    emulated_device: profile.emulatedDevice,
    physical_device: false
  };
} else {
  const descriptor = devices[profile.deviceName];
  if (!descriptor) {
    throw new Error(`Playwright device descriptor is unavailable: ${profile.deviceName}`);
  }

  const { defaultBrowserType: _defaultBrowserType, ...deviceOptions } = descriptor;
  const originalChromiumLaunch = chromium.launch.bind(chromium);
  const selectedLaunch = profile.browserEngine === "webkit"
    ? webkit.launch.bind(webkit)
    : originalChromiumLaunch;

  chromium.launch = async function launchProfiledBrowser(options = {}) {
    const browser = await selectedLaunch(options);
    const originalNewContext = browser.newContext.bind(browser);

    return new Proxy(browser, {
      get(target, property) {
        if (property === "newContext") {
          return (contextOptions = {}) => originalNewContext({
            ...contextOptions,
            ...deviceOptions,
            locale: contextOptions.locale || "ru-RU",
            timezoneId: contextOptions.timezoneId || "Europe/Moscow"
          });
        }

        const value = Reflect.get(target, property, target);
        return typeof value === "function" ? value.bind(target) : value;
      }
    });
  };

  globalThis.__NEWBUILD_BROWSER_PROFILE__ = {
    name: profileName,
    browser_engine: profile.browserEngine,
    emulated_device: profile.emulatedDevice,
    physical_device: false
  };
}
