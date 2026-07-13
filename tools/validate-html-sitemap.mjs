import fs from "node:fs";
import path from "node:path";

const ROOT = process.cwd();
const PAGE_INDEX_PATH = "data/pages/index.json";
const HTML_SITEMAP_PATH = "karta-sayta/index.html";
const BASE_URL = "https://novostroyki-borisoglebsk.ru";
const ACTIVE_STATUSES = new Set(["ready", "published"]);
const EXCLUDED_PAGE_TYPES = new Set(["html_sitemap", "thank_you", "legacy_transition"]);
const errors = [];

function read(relativePath) {
  const fullPath = path.join(ROOT, relativePath);
  if (!fs.existsSync(fullPath)) {
    errors.push(`${relativePath}: файл не найден`);
    return "";
  }
  return fs.readFileSync(fullPath, "utf8");
}

function readJson(relativePath) {
  const content = read(relativePath);
  if (!content) return null;

  try {
    return JSON.parse(content);
  } catch (error) {
    errors.push(`${relativePath}: некорректный JSON: ${error.message}`);
    return null;
  }
}

function normalizePathname(value) {
  const url = new URL(value, `${BASE_URL}/karta-sayta/`);
  let pathname = url.pathname.replace(/\/{2,}/g, "/");
  if (pathname !== "/" && !pathname.endsWith("/")) pathname += "/";
  return pathname;
}

function extractInternalLinks(html) {
  const links = new Set();
  const pattern = /\bhref=["']([^"']+)["']/gi;
  let match;

  while ((match = pattern.exec(html))) {
    const href = match[1].trim();
    if (!href || href.startsWith("#") || href.startsWith("tel:") || href.startsWith("mailto:") || href.startsWith("javascript:")) {
      continue;
    }

    let url;
    try {
      url = new URL(href, `${BASE_URL}/karta-sayta/`);
    } catch (error) {
      errors.push(`${HTML_SITEMAP_PATH}: некорректная ссылка ${href}`);
      continue;
    }

    if (url.origin === BASE_URL) links.add(normalizePathname(url.href));
  }

  return links;
}

const pages = readJson(PAGE_INDEX_PATH);
const html = read(HTML_SITEMAP_PATH);
const links = extractInternalLinks(html);
let requiredCount = 0;

if (html) {
  if (!html.includes('content="noindex,follow"')) {
    errors.push(`${HTML_SITEMAP_PATH}: HTML-карта должна оставаться noindex,follow`);
  }

  if (!html.includes(`<link rel="canonical" href="${BASE_URL}/karta-sayta/">`)) {
    errors.push(`${HTML_SITEMAP_PATH}: canonical должен вести на ${BASE_URL}/karta-sayta/`);
  }

  if (/tellermanovsad\.ru|brand__etagi|brand__bm|portal-preview\//i.test(html)) {
    errors.push(`${HTML_SITEMAP_PATH}: найден старый домен, брендинг или архивная навигация`);
  }
}

if (!Array.isArray(pages)) {
  errors.push(`${PAGE_INDEX_PATH}: ожидается массив страниц`);
} else {
  const seenUrls = new Set();

  for (const page of pages) {
    const url = normalizePathname(page.url || "/");
    if (seenUrls.has(url)) continue;
    seenUrls.add(url);

    if (ACTIVE_STATUSES.has(page.status) && !EXCLUDED_PAGE_TYPES.has(page.page_type)) {
      requiredCount += 1;
      if (!links.has(url)) {
        errors.push(`${HTML_SITEMAP_PATH}: отсутствует активная страница ${url}`);
      }
    }

    if ((page.status === "draft" || page.status === "archived") && links.has(url)) {
      errors.push(`${HTML_SITEMAP_PATH}: карта ведёт на ${page.status}-страницу ${url}`);
    }
  }
}

console.log(`Checked HTML sitemap links: ${links.size}`);
console.log(`Required active pages: ${requiredCount}`);

if (errors.length) {
  console.error("\nHTML sitemap validation errors:");
  errors.forEach((error) => console.error(`- ${error}`));
  process.exit(1);
}

console.log("\nHTML sitemap validation passed.");
