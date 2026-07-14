import fs from "node:fs";
import path from "node:path";

const ROOT = process.cwd();
const errors = [];

const pages = [
  {
    file: "guides/index.html",
    links: [
      { href: "../catalog/#quick-lead", action: "quick_selection", placement: "guides_hero" },
      { href: "../ipoteka/#quick-lead", action: "quick_mortgage", placement: "guides_hero" }
    ]
  },
  {
    file: "news/index.html",
    links: [
      { href: "../catalog/#quick-lead", action: "quick_selection", placement: "news_hero" },
      { href: "../contacts/#quick-lead", action: "quick_selection", placement: "news_hero" }
    ]
  },
  {
    file: "developers/index.html",
    links: [
      { href: "../catalog/#quick-lead", action: "quick_selection", placement: "developers_hero" },
      { href: "../contacts/#quick-lead", action: "quick_selection", placement: "developers_hero" }
    ]
  },
  {
    file: "guides/proverka-dokumentov-novostroyki/index.html",
    links: [
      { href: "../../catalog/#quick-lead", action: "quick_selection", placement: "guide_documents_footer" },
      { href: "../../contacts/#quick-lead", action: "quick_selection", placement: "guide_documents_footer" }
    ]
  },
  {
    file: "guides/proektnaya-deklaratsiya/index.html",
    links: [
      { href: "../../catalog/#quick-lead", action: "quick_selection", placement: "guide_declaration_footer" },
      { href: "../../contacts/#quick-lead", action: "quick_selection", placement: "guide_declaration_footer" }
    ]
  },
  {
    file: "guides/kak-vybrat-planirovku/index.html",
    links: [
      { href: "../../catalog/#quick-lead", action: "quick_selection", placement: "guide_layout_footer" },
      { href: "../../contacts/#quick-lead", action: "quick_selection", placement: "guide_layout_footer" }
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

function findAnchor(html, href) {
  const pattern = new RegExp(`<a\\b[^>]*href=["']${escapeRegExp(href)}["'][^>]*>`, "i");
  return html.match(pattern)?.[0] || "";
}

function hasAttribute(tag, name, value) {
  const pattern = new RegExp(`${escapeRegExp(name)}=["']${escapeRegExp(value)}["']`, "i");
  return pattern.test(tag);
}

function resolveTargetFile(sourceFile, href) {
  const [rawPath] = href.split("#");
  const normalized = rawPath.startsWith("/")
    ? rawPath.replace(/^\/+/, "")
    : path.posix.normalize(path.posix.join(path.posix.dirname(sourceFile), rawPath));
  const clean = normalized.replace(/^\.\//, "").replace(/\/+$/, "");
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

  for (const expected of page.links) {
    const anchor = findAnchor(html, expected.href);
    if (!anchor) {
      errors.push(`${page.file}: не найден CTA ${expected.href}`);
      continue;
    }
    checkedLinks += 1;

    if (!/class=["'][^"']*\bbutton\b/i.test(anchor)) {
      errors.push(`${page.file}: CTA ${expected.href} должен использовать класс button`);
    }
    if (!hasAttribute(anchor, "data-track-action", expected.action)) {
      errors.push(`${page.file}: CTA ${expected.href} должен использовать data-track-action=${expected.action}`);
    }
    if (!hasAttribute(anchor, "data-track-placement", expected.placement)) {
      errors.push(`${page.file}: CTA ${expected.href} должен использовать data-track-placement=${expected.placement}`);
    }

    const targetFile = resolveTargetFile(page.file, expected.href);
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

console.log(`Checked contextual content pages: ${pages.length}`);
console.log(`Checked contextual CTA links: ${checkedLinks}`);
console.log(`Checked primary target pages: ${checkedTargets.size}`);

if (errors.length) {
  console.error("\nContextual conversion validation errors:");
  errors.forEach((error) => console.error(`- ${error}`));
  process.exit(1);
}

console.log("\nContextual conversion validation passed.");
