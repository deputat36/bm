import fs from "node:fs";
import path from "node:path";

const ROOT = process.cwd();
const REGISTRY_PATH = path.join(ROOT, "data/migration/legacy-routes.json");

function readRegistry() {
  if (!fs.existsSync(REGISTRY_PATH)) {
    throw new Error("data/migration/legacy-routes.json not found");
  }

  const content = fs.readFileSync(REGISTRY_PATH, "utf8");
  const registry = JSON.parse(content);

  if (!Array.isArray(registry.routes)) {
    throw new Error("legacy-routes.json: routes must be an array");
  }

  return registry;
}

function readiness(route) {
  if (route.migration_action === "retire") {
    return {
      ready: false,
      label: "retire_after_target_release",
      reason: route.blocking_reason || "Retired content still needs a controlled release decision."
    };
  }

  if (route.migration_action === "retain_content" && route.content_migration_status !== "migrated") {
    return {
      ready: false,
      label: "content_migration_pending",
      reason: route.blocking_reason || "Useful content has not been migrated yet."
    };
  }

  if (route.redirect_ready !== true) {
    return {
      ready: false,
      label: "blocked",
      reason: route.blocking_reason || "The route has not passed the release checklist."
    };
  }

  return {
    ready: true,
    label: "ready",
    reason: "All registry release flags are satisfied."
  };
}

function routeLine(route) {
  const state = readiness(route);
  const phase = Number.isInteger(route.redirect_phase) ? route.redirect_phase : "?";
  const contentStatus = route.content_migration_status ? `; content=${route.content_migration_status}` : "";

  return [
    `- phase ${phase}: ${route.source_url} -> ${route.target_url}`,
    `  action=${route.migration_action}; status=${route.status}; release=${state.label}${contentStatus}`,
    `  reason=${state.reason}`
  ].join("\n");
}

const registry = readRegistry();
const routes = [...registry.routes].sort((left, right) => {
  const phaseDiff = (left.redirect_phase || 999) - (right.redirect_phase || 999);
  return phaseDiff || String(left.source_url).localeCompare(String(right.source_url), "ru");
});

const readyRoutes = routes.filter((route) => readiness(route).ready);
const blockedRoutes = routes.filter((route) => !readiness(route).ready);
const actionCounts = routes.reduce(
  (counts, route) => {
    counts[route.migration_action] = (counts[route.migration_action] || 0) + 1;
    return counts;
  },
  {}
);

console.log("# Legacy redirect release preview");
console.log(`Registry schema: ${registry.schema_version || "unknown"}`);
console.log(`Routes: ${routes.length}`);
console.log(`Actions: redirect=${actionCounts.redirect || 0}, retain_content=${actionCounts.retain_content || 0}, retire=${actionCounts.retire || 0}`);
console.log(`Ready: ${readyRoutes.length}`);
console.log(`Blocked: ${blockedRoutes.length}`);

console.log("\n## Ready routes");
if (!readyRoutes.length) {
  console.log("No routes are approved for server-side redirect release.");
} else {
  readyRoutes.forEach((route) => console.log(routeLine(route)));
}

console.log("\n## Blocked routes");
blockedRoutes.forEach((route) => console.log(routeLine(route)));

console.log("\nThis command only builds a preview. It does not create hosting redirect rules.");
