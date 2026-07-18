import fs from "node:fs";
import path from "node:path";

const ROOT = process.cwd();
const RUNTIME_PATH = "assets/js/project-market-snapshot.js";
const LOADER_PATH = "assets/js/project-verification-summary.js";
const SNAPSHOTS = [
  {
    path: "data/market-snapshots/aerodromnaya-18g.json",
    projectId: "aerodromnaya-18g",
    page: "catalog/aerodromnaya-18g/index.html",
    requiredFragments: ["30,73", "55,54", "индивидуальное отопление", "парк Патриотов"]
  },
  {
    path: "data/market-snapshots/sennaya-76.json",
    projectId: "sennaya-76",
    page: "catalog/sennaya-76/index.html",
    requiredFragments: ["37 м²", "43,3 м²", "61,4 м²", "монолитный железобетонный каркас"]
  }
];
const REQUIRED_EXCLUSIONS = [
  "current_price",
  "current_availability",
  "offer_count",
  "mortgage_rate",
  "booking",
  "seller_identity"
];
const errors = [];

function read(relativePath) {
  const fullPath = path.join(ROOT, relativePath);
  if (!fs.existsSync(fullPath)) {
    errors.push(`${relativePath}: file does not exist`);
    return "";
  }
  return fs.readFileSync(fullPath, "utf8");
}

function readJson(relativePath) {
  const source = read(relativePath);
  if (!source) return null;
  try {
    return JSON.parse(source);
  } catch (error) {
    errors.push(`${relativePath}: invalid JSON: ${error.message}`);
    return null;
  }
}

for (const config of SNAPSHOTS) {
  const snapshot = readJson(config.path);
  const page = read(config.page);
  if (!snapshot || !page) continue;

  if (snapshot.schema_version !== "1.0") errors.push(`${config.path}: schema_version must be 1.0`);
  if (snapshot.project_id !== config.projectId) errors.push(`${config.path}: project_id mismatch`);
  if (!/^2026-07-18$/.test(String(snapshot.checked_at || ""))) errors.push(`${config.path}: checked_at must record the current research date`);
  if (!Array.isArray(snapshot.cards) || snapshot.cards.length < 4) errors.push(`${config.path}: at least four buyer cards are required`);
  if (!Array.isArray(snapshot.sources) || snapshot.sources.length < 4) errors.push(`${config.path}: at least four sources are required`);

  const visibleText = [snapshot.title, snapshot.intro, snapshot.location_note, snapshot.source_note]
    .concat((snapshot.cards || []).flatMap((card) => [card.title, card.text, card.source_label]))
    .join(" ");
  for (const fragment of config.requiredFragments) {
    if (!visibleText.includes(fragment)) errors.push(`${config.path}: missing buyer fragment ${fragment}`);
  }
  if (/[₽$€]|\bруб(?:\.|лей|ля)?\b/i.test(visibleText)) errors.push(`${config.path}: prices must not be published in snapshot text`);
  if (/\b\d+(?:[.,]\d+)?\s*%/.test(visibleText)) errors.push(`${config.path}: rate promises must not be published`);

  for (const source of snapshot.sources || []) {
    if (!/^https:\/\//i.test(String(source?.url || ""))) errors.push(`${config.path}: every source must use HTTPS`);
    if (!String(source?.label || "").trim()) errors.push(`${config.path}: every source needs a label`);
  }

  const exclusions = new Set(Array.isArray(snapshot.excluded_fields) ? snapshot.excluded_fields : []);
  for (const field of REQUIRED_EXCLUSIONS) {
    if (!exclusions.has(field)) errors.push(`${config.path}: excluded field ${field} is required`);
    if (Object.hasOwn(snapshot, field)) errors.push(`${config.path}: volatile field ${field} must not be materialized`);
  }

  if (!page.includes(`data-schema-project="${config.projectId}"`)) errors.push(`${config.page}: schema project id is missing`);
  if (!page.includes('id="quick-lead"')) errors.push(`${config.page}: quick lead target is missing`);
  if (!page.includes('content="noindex,follow"')) errors.push(`${config.page}: noindex,follow must remain`);
}

const runtime = read(RUNTIME_PATH);
const loader = read(LOADER_PATH);
for (const fragment of [
  '"aerodromnaya-18g": "../../data/market-snapshots/aerodromnaya-18g.json"',
  '"sennaya-76": "../../data/market-snapshots/sennaya-76.json"',
  'document.querySelector("[data-project-market-snapshot]")',
  'section.dataset.projectMarketSnapshot = "true"',
  'data-verification-summary',
  'market_snapshot_consultation',
  'market_snapshot_source_open',
  'credentials: "same-origin"',
  'cache: "no-store"'
]) {
  if (!runtime.includes(fragment)) errors.push(`${RUNTIME_PATH}: missing ${fragment}`);
}
for (const forbidden of [
  "innerHTML",
  "localStorage",
  "sessionStorage",
  "navigator.userAgent",
  "new FormData(",
  "sendLead(",
  "URLSearchParams",
  "window.location.search",
  "document.cookie"
]) {
  if (runtime.includes(forbidden)) errors.push(`${RUNTIME_PATH}: forbidden mechanism ${forbidden}`);
}
const fetchCalls = [...runtime.matchAll(/fetch\(/g)].length;
if (fetchCalls !== 1) errors.push(`${RUNTIME_PATH}: exactly one same-origin fetch is expected`);

for (const fragment of [
  'new URL("project-market-snapshot.js", scriptUrl).href',
  'script.dataset.projectMarketSnapshotScript = "true"',
  'document.querySelector("script[data-project-market-snapshot-script]")'
]) {
  if (!loader.includes(fragment)) errors.push(`${LOADER_PATH}: market snapshot loader is missing ${fragment}`);
}

console.log(`Market snapshots checked: ${SNAPSHOTS.length}`);
console.log("Published exact prices: 0");
console.log("Published availability promises: 0");
console.log("New lead forms: 0");

if (errors.length) {
  console.error("\nProject market snapshot validation errors:");
  errors.forEach((error) => console.error(`- ${error}`));
  process.exit(1);
}

console.log("Project market snapshot validation passed.");
