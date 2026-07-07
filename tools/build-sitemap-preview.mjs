import fs from "node:fs";
import path from "node:path";

const ROOT = process.cwd();
const PORTAL_BASE_URL = process.env.PORTAL_BASE_URL || "https://novostroyki-borisoglebsk.ru";
const LASTMOD = process.env.SITEMAP_LASTMOD || new Date().toISOString().slice(0, 10);

function fromRoot(...parts) {
  return path.join(ROOT, ...parts);
}

function readJson(relativePath) {
  const fullPath = fromRoot(relativePath);
  if (!fs.existsSync(fullPath)) {
    throw new Error(`${relativePath}: file does not exist`);
  }

  return JSON.parse(fs.readFileSync(fullPath, "utf8"));
}

function escapeXml(value) {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&apos;");
}

function normalizeUrl(baseUrl, pathValue) {
  const normalizedBase = baseUrl.replace(/\/+$/, "");
  const normalizedPath = String(pathValue || "/").startsWith("/") ? pathValue : `/${pathValue}`;
  return `${normalizedBase}${normalizedPath}`;
}

function isNoindex(page) {
  return page.robots === "noindex,follow" || page.robots === "noindex, follow";
}

function isSitemapCandidate(page) {
  return page.status === "published" && !isNoindex(page);
}

function getPriority(page) {
  const priorityByType = {
    home: "1.0",
    home_draft: "1.0",
    catalog: "0.95",
    project_list: "0.9",
    project: "0.9",
    project_apartments: "0.85",
    project_layouts: "0.8",
    project_prices: "0.85",
    project_documents: "0.75",
    project_gallery: "0.7",
    project_builder: "0.7",
    project_infrastructure: "0.7",
    project_mortgage: "0.8",
    project_construction_progress: "0.7",
    project_faq: "0.65",
    project_contacts: "0.85",
    project_address_landing: "0.75",
    project_news: "0.65",
    project_news_article: "0.6",
    builder_list: "0.75",
    builder: "0.7",
    comparison: "0.8",
    guide_index: "0.75"
  };

  return priorityByType[page.page_type] || "0.5";
}

function buildSitemapXml(pages) {
  const urls = pages
    .filter(isSitemapCandidate)
    .map((page) => {
      const loc = escapeXml(normalizeUrl(PORTAL_BASE_URL, page.url));
      const lastmod = escapeXml(page.lastmod || LASTMOD);
      const priority = escapeXml(page.priority || getPriority(page));

      return `  <url>\n    <loc>${loc}</loc>\n    <lastmod>${lastmod}</lastmod>\n    <priority>${priority}</priority>\n  </url>`;
    });

  return `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${urls.join("\n")}\n</urlset>`;
}

function main() {
  const pages = readJson("data/pages/index.json");
  if (!Array.isArray(pages)) throw new Error("data/pages/index.json must be an array");

  console.log(buildSitemapXml(pages));
}

try {
  main();
} catch (error) {
  console.error(error.message);
  process.exit(1);
}
