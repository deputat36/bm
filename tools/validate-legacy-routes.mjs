import fs from "node:fs";
import path from "node:path";

const ROOT = process.cwd();
const REGISTRY_PATH = "data/migration/legacy-routes.json";
const SITEMAP_PATH = "sitemap.xml";
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

function normalizeUrl(value) {
  const url = String(value || "").trim();
  if (!url.startsWith("/")) return url;
  return url === "/" ? url : `${url.replace(/\/+$/, "")}/`;
}

const registry = readJson(REGISTRY_PATH);
const sitemap = read(SITEMAP_PATH);
const seenSources = new Set();
const allowedStatuses = new Set(["transition_page", "redirect_ready", "redirected", "retired"]);
const allowedActions = new Set(["redirect", "retain_content", "retire"]);
const allowedContentStatuses = new Set(["pending", "migrated", "not_required"]);
const actionCounts = {
  redirect: 0,
  retain_content: 0,
  retire: 0
};

if (!registry || !Array.isArray(registry.routes) || !registry.routes.length) {
  errors.push(`${REGISTRY_PATH}: routes должен быть непустым массивом`);
} else {
  for (const route of registry.routes) {
    const sourceUrl = normalizeUrl(route.source_url);
    const targetUrl = normalizeUrl(route.target_url);
    const label = sourceUrl || route.source_file || "unknown-route";

    if (!sourceUrl || !route.source_file || !targetUrl || !route.target_file) {
      errors.push(`${label}: не заполнены source_url, source_file, target_url или target_file`);
      continue;
    }

    if (seenSources.has(sourceUrl)) {
      errors.push(`${label}: дублирующий source_url`);
    }
    seenSources.add(sourceUrl);

    if (!allowedStatuses.has(route.status)) {
      errors.push(`${label}: неподдерживаемый status=${route.status}`);
    }

    if (!allowedActions.has(route.migration_action)) {
      errors.push(`${label}: migration_action должен быть redirect, retain_content или retire`);
    } else {
      actionCounts[route.migration_action] += 1;
    }

    if (route.migration_action === "retain_content") {
      if (!allowedContentStatuses.has(route.content_migration_status)) {
        errors.push(`${label}: retain_content требует content_migration_status=pending|migrated|not_required`);
      }

      if (route.redirect_ready === true && route.content_migration_status !== "migrated") {
        errors.push(`${label}: редирект нельзя выпускать до переноса полезного содержания`);
      }
    }

    if (route.migration_action === "retire" && route.redirect_ready === true) {
      errors.push(`${label}: retire-маршрут не должен помечаться как redirect_ready`);
    }

    if (!Number.isInteger(route.redirect_phase) || route.redirect_phase < 1) {
      errors.push(`${label}: redirect_phase должен быть положительным целым числом`);
    }

    if (route.redirect_ready === false && !String(route.blocking_reason || "").trim()) {
      errors.push(`${label}: для заблокированного маршрута требуется blocking_reason`);
    }

    const sourceHtml = read(route.source_file);
    read(route.target_file);

    if (!sourceHtml) continue;

    if (route.status === "transition_page" || route.status === "redirect_ready") {
      if (!sourceHtml.includes('content="noindex,follow"')) {
        errors.push(`${label}: переходная страница должна содержать noindex,follow`);
      }

      if (!route.target_href || !sourceHtml.includes(`href="${route.target_href}"`)) {
        errors.push(`${label}: отсутствует явная ссылка на целевую страницу ${targetUrl}`);
      }

      if (/tellermanovsad\.ru/i.test(sourceHtml)) {
        errors.push(`${label}: найден старый домен tellermanovsad.ru`);
      }

      if (/brand__etagi|brand__bm|bm-group-logo/i.test(sourceHtml)) {
        errors.push(`${label}: найден старый брендинг переходного контура`);
      }

      if (/data-lead-form/i.test(sourceHtml)) {
        errors.push(`${label}: на переходной странице обнаружена устаревшая лид-форма`);
      }

      if (/http-equiv=["']refresh["']/i.test(sourceHtml) || /window\.location|location\.replace/i.test(sourceHtml)) {
        errors.push(`${label}: автоматическое перенаправление запрещено до ручного выпуска редиректа`);
      }
    }

    if (sitemap && sitemap.includes(sourceUrl)) {
      errors.push(`${label}: legacy URL не должен находиться в sitemap.xml`);
    }

    if (route.redirect_ready === true && !route.redirect_phase) {
      errors.push(`${label}: для redirect_ready должен быть указан redirect_phase`);
    }
  }
}

console.log(`Checked legacy routes: ${registry?.routes?.length || 0}`);
console.log(`Migration actions: redirect=${actionCounts.redirect}, retain_content=${actionCounts.retain_content}, retire=${actionCounts.retire}`);

if (errors.length) {
  console.error("\nLegacy route validation errors:");
  errors.forEach((error) => console.error(`- ${error}`));
  process.exit(1);
}

console.log("\nLegacy route validation passed.");