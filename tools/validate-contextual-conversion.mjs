import fs from "node:fs";
import path from "node:path";

const ROOT = process.cwd();
const errors = [];
const ALLOWED_QUERY_KEYS = new Set(["lead_source", "placement"]);
const FORBIDDEN_QUERY_PATTERN = /^(utm_|gclid$|yclid$|ymclid$|vkclid$|fbclid$|lead_test$|analytics_test$|test_ack$|name$|phone$|email$|comment$|client_fixation_id$)/i;

const pages = [
  {
    file: "guides/index.html",
    links: [
      { targetPath: "/catalog/", action: "quick_selection", placement: "guides_hero" },
      { targetPath: "/ipoteka/", action: "quick_mortgage", placement: "guides_hero" }
    ]
  },
  {
    file: "news/index.html",
    links: [
      { targetPath: "/catalog/", action: "quick_selection", placement: "news_hero" },
      { targetPath: "/contacts/", action: "quick_selection", placement: "news_hero" }
    ]
  },
  {
    file: "developers/index.html",
    links: [
      { targetPath: "/catalog/", action: "quick_selection", placement: "developers_hero" },
      { targetPath: "/contacts/", action: "quick_selection", placement: "developers_hero" }
    ]
  },
  {
    file: "guides/proverka-dokumentov-novostroyki/index.html",
    links: [
      { targetPath: "/catalog/", action: "quick_selection", placement: "guide_documents_footer" },
      { targetPath: "/contacts/", action: "quick_selection", placement: "guide_documents_footer" }
    ]
  },
  {
    file: "guides/proektnaya-deklaratsiya/index.html",
    links: [
      { targetPath: "/catalog/", action: "quick_selection", placement: "guide_declaration_footer" },
      { targetPath: "/contacts/", action: "quick_selection", placement: "guide_declaration_footer" }
    ]
  },
  {
    file: "guides/kak-vybrat-planirovku/index.html",
    links: [
      { targetPath: "/catalog/", action: "quick_selection", placement: "guide_layout_footer" },
      { targetPath: "/contacts/", action: "quick_selection", placement: "guide_layout_footer" }
    ]
  }
];

function read(relativePath) {
  const fullPath = path.join(ROOT, relativePath);
  if (!fs.existsSync(fullPath)) {
    errors.push(`${relativePath}: файл не найден`);
    return "";
  }
  return fs.readFileSync(fullPath, "utf8");
}

function escapeRegExp(value) {
  return String(value).replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function getAttribute(tag, name) {
  const pattern = new RegExp(`${escapeRegExp(name)}=["']([^"']*)["']`, "i");
  return tag.match(pattern)?.[1]?.trim() || "";
}

function decodeAttribute(value) {
  return String(value || "")
    .replace(/&amp;/gi, "&")
    .replace(/&#38;/g, "&");
}

function pageBaseUrl(sourceFile) {
  const directory = path.posix.dirname(`/${sourceFile}`);
  return new URL(`${directory.replace(/\/+$/, "")}/`, "https://portal.test/");
}

function parseInternalUrl(sourceFile, href) {
  try {
    return new URL(decodeAttribute(href), pageBaseUrl(sourceFile));
  } catch (error) {
    return null;
  }
}

function targetFileFromPathname(pathname) {
  const clean = String(pathname || "").replace(/^\/+/, "").replace(/\/+$/, "");
  return clean ? `${clean}/index.html` : "index.html";
}

const checkedTargets = new Set();
let checkedLinks = 0;

for (const page of pages) {
  const html = read(page.file);
  if (!html) continue;

  if (!html.includes('content="noindex,follow"') && !html.includes("content='noindex,follow'")) {
    errors.push(`${page.file}: справочная страница должна оставаться noindex,follow`);
  }

  if (/<form\b/i.test(html) || /data-lead-form|data-form-id=/i.test(html)) {
    errors.push(`${page.file}: редакционный контент не должен содержать самостоятельную лид-форму`);
  }

  if (/href=["'][^"']*#lead["']/i.test(html)) {
    errors.push(`${page.file}: контекстный CTA не должен вести к подробной форме #lead`);
  }

  const debugIndex = html.indexOf("analytics-debug.js");
  const trackingIndex = html.indexOf("conversion-tracking.js");
  if (debugIndex < 0 || trackingIndex < 0) {
    errors.push(`${page.file}: должны быть подключены analytics-debug.js и conversion-tracking.js`);
  } else if (debugIndex > trackingIndex) {
    errors.push(`${page.file}: analytics-debug.js должен подключаться раньше conversion-tracking.js`);
  }

  const anchors = Array.from(html.matchAll(/<a\b[^>]*>/gi), (match) => match[0]);

  for (const expected of page.links) {
    const candidates = anchors.filter((anchor) => {
      if (getAttribute(anchor, "data-track-action") !== expected.action) return false;
      if (getAttribute(anchor, "data-track-placement") !== expected.placement) return false;
      const url = parseInternalUrl(page.file, getAttribute(anchor, "href"));
      return url?.pathname === expected.targetPath;
    });

    if (candidates.length !== 1) {
      errors.push(`${page.file}: ожидался один CTA ${expected.action}/${expected.placement} на ${expected.targetPath}, найдено ${candidates.length}`);
      continue;
    }

    checkedLinks += 1;
    const anchor = candidates[0];
    const href = getAttribute(anchor, "href");
    const url = parseInternalUrl(page.file, href);

    if (!/class=["'][^"']*\bbutton\b/i.test(anchor)) {
      errors.push(`${page.file}: CTA ${expected.targetPath} должен использовать класс button`);
    }

    if (!url || url.origin !== "https://portal.test") {
      errors.push(`${page.file}: CTA должен вести на внутреннюю страницу портала`);
      continue;
    }

    if (url.hash !== "#quick-lead") {
      errors.push(`${page.file}: CTA ${expected.targetPath} должен вести к #quick-lead`);
    }

    if (url.searchParams.get("lead_source") !== "internal_content") {
      errors.push(`${page.file}: CTA ${expected.targetPath} должен использовать lead_source=internal_content`);
    }

    if (url.searchParams.get("placement") !== expected.placement) {
      errors.push(`${page.file}: query placement должен совпадать с data-track-placement=${expected.placement}`);
    }

    for (const key of url.searchParams.keys()) {
      if (!ALLOWED_QUERY_KEYS.has(key)) {
        errors.push(`${page.file}: CTA ${expected.targetPath} содержит неподдерживаемый query-параметр ${key}`);
      }
      if (FORBIDDEN_QUERY_PATTERN.test(key)) {
        errors.push(`${page.file}: CTA ${expected.targetPath} содержит запрещённый query-параметр ${key}`);
      }
    }

    if (Array.from(url.searchParams.keys()).length !== ALLOWED_QUERY_KEYS.size) {
      errors.push(`${page.file}: CTA ${expected.targetPath} должен содержать только lead_source и placement`);
    }

    const targetFile = targetFileFromPathname(url.pathname);
    if (!checkedTargets.has(targetFile)) {
      checkedTargets.add(targetFile);
      const targetHtml = read(targetFile);
      if (!targetHtml) continue;
      if (!targetHtml.includes('id="quick-lead"') && !targetHtml.includes("id='quick-lead'")) {
        errors.push(`${targetFile}: целевая страница должна содержать id=quick-lead`);
      }
      if (!targetHtml.includes("data-primary-lead")) {
        errors.push(`${targetFile}: целевая короткая форма должна находиться в data-primary-lead`);
      }
    }
  }
}

const mainScript = read("assets/js/main.js");
if (!mainScript.includes('"lead_source"') || !mainScript.includes('"placement"')) {
  errors.push("assets/js/main.js: TRACKING_KEYS должен сохранять lead_source и placement");
}
if (!mainScript.includes("hasIncomingTracking") || !mainScript.includes("last_touch")) {
  errors.push("assets/js/main.js: внутренняя атрибуция должна обновлять last_touch через существующий tracking-контур");
}

console.log(`Checked contextual content pages: ${pages.length}`);
console.log(`Checked attributed contextual CTA links: ${checkedLinks}`);
console.log(`Checked primary target pages: ${checkedTargets.size}`);

if (errors.length) {
  console.error("\nContextual conversion validation errors:");
  errors.forEach((error) => console.error(`- ${error}`));
  process.exit(1);
}

console.log("\nContextual conversion validation passed.");
