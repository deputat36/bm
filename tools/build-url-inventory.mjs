import fs from "node:fs";
import path from "node:path";

const ROOT = process.cwd();
const PORTAL_BASE_URL = process.env.PORTAL_BASE_URL || "https://novostroyki-borisoglebsk.ru";
const LEGACY_BASE_URL = process.env.LEGACY_BASE_URL || "https://tellermanovsad.ru";

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

function normalizeUrl(baseUrl, pathValue) {
  const normalizedBase = baseUrl.replace(/\/+$/, "");
  const normalizedPath = String(pathValue || "/").startsWith("/") ? pathValue : `/${pathValue}`;
  return `${normalizedBase}${normalizedPath}`;
}

function isNoindex(page) {
  return page.robots === "noindex,follow" || page.robots === "noindex, follow";
}

function buildPageInventory(pages) {
  return pages.map((page) => {
    const canBeInSitemap = page.status === "published" && !isNoindex(page);

    return {
      url: page.url,
      absolute_url: normalizeUrl(PORTAL_BASE_URL, page.url),
      title: page.title,
      page_type: page.page_type,
      status: page.status,
      robots: page.robots,
      project_id: page.project_id || null,
      builder_id: page.builder_id || null,
      can_be_in_sitemap: canBeInSitemap,
      sitemap_block_reason: canBeInSitemap
        ? null
        : page.status !== "published"
          ? `status=${page.status}`
          : `robots=${page.robots || "not_set"}`
    };
  });
}

function buildRedirectInventory(redirects) {
  return redirects.map((redirect) => {
    const canBeActivated = redirect.status === "ready" || redirect.status === "active";

    return {
      source_url: redirect.source_url,
      source_absolute_url: normalizeUrl(LEGACY_BASE_URL, redirect.source_url),
      target_url: redirect.target_url,
      target_absolute_url: normalizeUrl(PORTAL_BASE_URL, redirect.target_url),
      redirect_type: redirect.redirect_type,
      status: redirect.status,
      can_be_activated: canBeActivated,
      activation_block_reason: canBeActivated ? null : `status=${redirect.status}`,
      notes: redirect.notes || ""
    };
  });
}

function groupByStatus(items, field) {
  return items.reduce((acc, item) => {
    const key = item[field] || "not_set";
    acc[key] = (acc[key] || 0) + 1;
    return acc;
  }, {});
}

function main() {
  const pages = readJson("data/pages/index.json");
  const redirects = readJson("data/pages/legacy-redirects.json");

  if (!Array.isArray(pages)) throw new Error("data/pages/index.json must be an array");
  if (!Array.isArray(redirects)) throw new Error("data/pages/legacy-redirects.json must be an array");

  const pageInventory = buildPageInventory(pages);
  const redirectInventory = buildRedirectInventory(redirects);

  const report = {
    generated_at: new Date().toISOString(),
    portal_base_url: PORTAL_BASE_URL,
    legacy_base_url: LEGACY_BASE_URL,
    summary: {
      total_pages: pageInventory.length,
      pages_by_status: groupByStatus(pageInventory, "status"),
      pages_allowed_in_sitemap: pageInventory.filter((page) => page.can_be_in_sitemap).length,
      pages_blocked_from_sitemap: pageInventory.filter((page) => !page.can_be_in_sitemap).length,
      total_legacy_redirects: redirectInventory.length,
      redirects_by_status: groupByStatus(redirectInventory, "status"),
      redirects_ready_or_active: redirectInventory.filter((redirect) => redirect.can_be_activated).length,
      redirects_blocked: redirectInventory.filter((redirect) => !redirect.can_be_activated).length
    },
    sitemap_candidates: pageInventory.filter((page) => page.can_be_in_sitemap),
    sitemap_blocked_pages: pageInventory.filter((page) => !page.can_be_in_sitemap),
    legacy_redirects_ready_or_active: redirectInventory.filter((redirect) => redirect.can_be_activated),
    legacy_redirects_blocked: redirectInventory.filter((redirect) => !redirect.can_be_activated)
  };

  console.log(JSON.stringify(report, null, 2));
}

try {
  main();
} catch (error) {
  console.error(error.message);
  process.exit(1);
}
