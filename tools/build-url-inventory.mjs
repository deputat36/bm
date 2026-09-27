import fs from "node:fs";
import path from "node:path";

const ROOT = process.cwd();
const PORTAL_BASE_URL = process.env.PORTAL_BASE_URL || "https://novostroyki-borisoglebsk.ru";
const LEGACY_REGISTRY_PATH = "data/migration/legacy-routes.json";

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

function routeReadiness(route) {
  if (route.migration_action === "retire") {
    return { ready: false, reason: route.blocking_reason || "route marked for retirement" };
  }
  if (route.migration_action === "retain_content" && route.content_migration_status !== "migrated") {
    return { ready: false, reason: route.blocking_reason || "content migration is pending" };
  }
  if (route.redirect_ready !== true) {
    return { ready: false, reason: route.blocking_reason || "redirect_ready=false" };
  }
  return { ready: true, reason: null };
}

function buildLegacyRouteInventory(routes) {
  return routes.map((route) => {
    const readiness = routeReadiness(route);
    return {
      source_url: route.source_url,
      source_absolute_url: normalizeUrl(PORTAL_BASE_URL, route.source_url),
      source_file: route.source_file,
      target_url: route.target_url,
      target_absolute_url: normalizeUrl(PORTAL_BASE_URL, route.target_url),
      target_file: route.target_file,
      status: route.status,
      migration_action: route.migration_action,
      content_migration_status: route.content_migration_status || null,
      redirect_phase: route.redirect_phase,
      redirect_ready: route.redirect_ready === true,
      can_be_activated: readiness.ready,
      activation_block_reason: readiness.reason
    };
  });
}

function groupBy(items, field) {
  return items.reduce((acc, item) => {
    const key = item[field] ?? "not_set";
    acc[key] = (acc[key] || 0) + 1;
    return acc;
  }, {});
}

function main() {
  const pages = readJson("data/pages/index.json");
  const registry = readJson(LEGACY_REGISTRY_PATH);

  if (!Array.isArray(pages)) throw new Error("data/pages/index.json must be an array");
  if (!registry || !Array.isArray(registry.routes)) {
    throw new Error(`${LEGACY_REGISTRY_PATH}: routes must be an array`);
  }

  const pageInventory = buildPageInventory(pages);
  const routeInventory = buildLegacyRouteInventory(registry.routes);

  const report = {
    generated_at: new Date().toISOString(),
    portal_base_url: PORTAL_BASE_URL,
    legacy_registry: LEGACY_REGISTRY_PATH,
    legacy_registry_schema: registry.schema_version || null,
    summary: {
      total_pages: pageInventory.length,
      pages_by_status: groupBy(pageInventory, "status"),
      pages_allowed_in_sitemap: pageInventory.filter((page) => page.can_be_in_sitemap).length,
      pages_blocked_from_sitemap: pageInventory.filter((page) => !page.can_be_in_sitemap).length,
      total_legacy_routes: routeInventory.length,
      legacy_routes_by_status: groupBy(routeInventory, "status"),
      legacy_routes_by_action: groupBy(routeInventory, "migration_action"),
      legacy_routes_ready: routeInventory.filter((route) => route.can_be_activated).length,
      legacy_routes_blocked: routeInventory.filter((route) => !route.can_be_activated).length
    },
    sitemap_candidates: pageInventory.filter((page) => page.can_be_in_sitemap),
    sitemap_blocked_pages: pageInventory.filter((page) => !page.can_be_in_sitemap),
    legacy_routes_ready: routeInventory.filter((route) => route.can_be_activated),
    legacy_routes_blocked: routeInventory.filter((route) => !route.can_be_activated)
  };

  console.log(JSON.stringify(report, null, 2));
}

try {
  main();
} catch (error) {
  console.error(error.message);
  process.exit(1);
}
