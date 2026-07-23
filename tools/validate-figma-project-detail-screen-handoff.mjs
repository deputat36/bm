import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const GENERATOR = path.join(ROOT, "tools/figma/generate-portal-v2-project-detail-screen.mjs");
const DOCS = path.join(ROOT, "docs/design/FIGMA_PROJECT_DETAIL_SCREEN_HANDOFF.md");
const SOURCE_MAP = path.join(ROOT, "data/design/portal-v2.source-map.json");
const EXECUTION_BUILDER = path.join(ROOT, "tools/build-figma-execution-pack.mjs");
const QA_BUILDER = path.join(ROOT, "tools/build-figma-visual-qa-pack.mjs");
const errors = [];

function assert(condition, message) {
  if (!condition) errors.push(message);
}
function read(filePath) {
  return fs.readFileSync(filePath, "utf8");
}
function run(filePath, args = []) {
  return spawnSync(process.execPath, [filePath, ...args], {
    cwd: ROOT,
    encoding: "utf8",
    maxBuffer: 8 * 1024 * 1024
  });
}
function includesAll(content, markers, prefix) {
  for (const marker of markers) assert(content.includes(marker), `${prefix} misses: ${marker}`);
}

for (const filePath of [GENERATOR, DOCS, SOURCE_MAP, EXECUTION_BUILDER, QA_BUILDER]) {
  assert(fs.existsSync(filePath), `Missing ${path.relative(ROOT, filePath)}`);
}

const productionSources = [
  {
    path: "catalog/prostornaya-4a/index.html",
    markers: [
      "data-schema-project=\"prostornaya-4a\"",
      "catalog_prostornaya_4a_quick_consultation",
      "catalog_prostornaya_4a_priority_lead",
      "data-verification-profile=\"../../data/verification/prostornaya-4a.json\"",
      "ЖК «Теллерманов сад»"
    ]
  },
  {
    path: "catalog/aerodromnaya-18g/index.html",
    markers: [
      "data-schema-project=\"aerodromnaya-18g\"",
      "catalog_aerodromnaya_18g_quick_consultation",
      "catalog_aerodromnaya_18g_priority_lead",
      "data-verification-profile=\"../../data/verification/aerodromnaya-18g.json\"",
      "ЖК «Патриот»"
    ]
  },
  {
    path: "catalog/sennaya-76/index.html",
    markers: [
      "data-schema-project=\"sennaya-76\"",
      "catalog_sennaya_76_quick_consultation",
      "catalog_sennaya_76_priority_lead",
      "data-verification-profile=\"../../data/verification/sennaya-76.json\"",
      "Дом на Сенной 76"
    ]
  }
];
for (const source of productionSources) {
  const filePath = path.join(ROOT, source.path);
  assert(fs.existsSync(filePath), `Missing production source ${source.path}`);
  if (fs.existsSync(filePath)) includesAll(read(filePath), source.markers, source.path);
}

if (fs.existsSync(GENERATOR)) {
  const syntax = run(GENERATOR);
  assert(syntax.status === 0, `Project Detail generator failed: ${syntax.stderr.trim()}`);
  const code = syntax.stdout || "";
  assert(code.length > 0, "Project Detail generator returned empty payload");
  assert(code.length <= 50000, `Project Detail payload exceeds 50,000 characters: ${code.length}`);
  assert((code.match(/await figma\.setCurrentPageAsync\(/g) || []).length === 1, "Project Detail payload must switch page exactly once");
  includesAll(code, [
    "27 Screen · Project Detail",
    "project-detail-screen",
    "short: \"Prostornaya\"",
    "short: \"Aerodromnaya\"",
    "short: \"Sennaya\"",
    "id: \"prostornaya-4a\"",
    "id: \"aerodromnaya-18g\"",
    "id: \"sennaya-76\"",
    "for (const layout of [\"Desktop\", \"Mobile\"])",
    "auto(\"Project Detail / \" + profile.short + \" / \" + layout, \"VERTICAL\")",
    "\"project-detail-\" + profile.id + \"-\" + layout.toLowerCase()",
    "catalog_prostornaya_4a_quick_consultation",
    "catalog_prostornaya_4a_priority_lead",
    "catalog_aerodromnaya_18g_quick_consultation",
    "catalog_aerodromnaya_18g_priority_lead",
    "catalog_sennaya_76_quick_consultation",
    "catalog_sennaya_76_priority_lead",
    "data/verification/prostornaya-4a.json",
    "data/verification/aerodromnaya-18g.json",
    "data/verification/sennaya-76.json",
    "verification-state",
    "project_consultation",
    "Top Navigation",
    "Fact Card",
    "Lead Form Card",
    "Content Card",
    "FAQ Accordion",
    "Site Footer"
  ], "Generated Project Detail payload");
  for (const key of ["header", "hero", "highlights", "evidence", "verification", "faq", "lead", "footer"]) {
    assert(code.includes(`\"${key}\"`), `Project Detail payload misses section-key ${key}`);
  }
  for (const pattern of [
    "figma.notify(",
    "figma.closePlugin(",
    "figma.currentPage =",
    "loadAllPagesAsync",
    ".getPluginData(",
    ".setPluginData("
  ]) assert(!code.includes(pattern), `Project Detail payload uses unsupported API: ${pattern}`);
  for (const promise of [
    "гарантируем одобрение ипотеки",
    "гарантированное одобрение ипотеки",
    "цена зафиксирована",
    "забронируем квартиру",
    "портал является официальным сайтом застройщика"
  ]) {
    assert(!code.toLowerCase().includes(promise), `Project Detail payload contains prohibited promise: ${promise}`);
  }
  const tempSyntax = path.join(os.tmpdir(), `project-detail-${Date.now()}.mjs`);
  fs.writeFileSync(tempSyntax, `async function __figmaUseWrapper() {\n${code}\n}\n`, "utf8");
  const check = spawnSync(process.execPath, ["--check", tempSyntax], { encoding: "utf8" });
  assert(check.status === 0, `Generated Project Detail payload has invalid JavaScript: ${check.stderr.trim()}`);
  fs.rmSync(tempSyntax, { force: true });
}

if (fs.existsSync(SOURCE_MAP)) {
  const sourceMap = JSON.parse(read(SOURCE_MAP));
  assert(sourceMap.figma?.screensExpected === 9, `Source map must expect 9 screens, got ${sourceMap.figma?.screensExpected}`);
  const item = (sourceMap.screens || []).find((screen) => screen.id === "project-detail");
  assert(Boolean(item), "Source map misses project-detail screen");
  assert(item?.figmaPage === "27 Screen · Project Detail", "Project Detail source-map has wrong Figma page");
  assert(item?.generator === "tools/figma/generate-portal-v2-project-detail-screen.mjs", "Project Detail source-map has wrong generator");
  assert(item?.mapping === "composed", "Project Detail source-map must be composed");
  assert((item?.sources || []).length >= 4, "Project Detail source-map must include three pages and shared CSS/JS sources");
}

const tempRoot = fs.mkdtempSync(path.join(os.tmpdir(), "project-detail-handoff-"));
try {
  const executionDir = path.join(tempRoot, "execution");
  const execution = run(EXECUTION_BUILDER, [executionDir]);
  assert(execution.status === 0, `Execution Pack build failed: ${execution.stderr.trim()}`);
  const executionManifestPath = path.join(executionDir, "manifest.json");
  assert(fs.existsSync(executionManifestPath), "Execution Pack misses manifest.json");
  if (fs.existsSync(executionManifestPath)) {
    const manifest = JSON.parse(read(executionManifestPath));
    assert(manifest.stepCount === 29, `Execution Pack must contain 29 steps, got ${manifest.stepCount}`);
    const last = manifest.steps?.at(-1);
    assert(last?.id === "project-detail", "Project Detail must be the last Execution Pack step");
    assert(last?.page === "27 Screen · Project Detail", "Execution Pack has wrong Project Detail page");
    assert(last?.dependsOn?.includes("faq-accordion"), "Project Detail step misses FAQ Accordion dependency");
    assert(last?.dependsOn?.includes("site-footer"), "Project Detail step misses Site Footer dependency");
  }

  const qaDir = path.join(tempRoot, "qa");
  const qa = run(QA_BUILDER, [qaDir]);
  assert(qa.status === 0, `Visual QA Pack build failed: ${qa.stderr.trim()}`);
  const qaManifestPath = path.join(qaDir, "manifest.json");
  assert(fs.existsSync(qaManifestPath), "Visual QA Pack misses manifest.json");
  if (fs.existsSync(qaManifestPath)) {
    const manifest = JSON.parse(read(qaManifestPath));
    assert(manifest.auditCount === 24, `Visual QA Pack must contain 24 audits, got ${manifest.auditCount}`);
    assert(manifest.expectedTotals?.screenPageAudits === 9, "Visual QA Pack must contain 9 screen page audits");
    const audit = manifest.audits?.find((item) => item.id === "project-detail");
    assert(Boolean(audit), "Visual QA Pack misses project-detail audit");
    assert(audit?.expectedScreenKeys?.length === 6, "Project Detail audit must contain 6 screen keys");
    assert(audit?.expectedSectionKeys?.length === 8, "Project Detail audit must contain 8 section keys");
    assert(audit?.screenshotTargets?.length === 6, "Project Detail audit must contain 6 screenshot targets");
    const screenshotCount = manifest.audits.reduce((sum, item) => sum + item.screenshotTargets.length, 0);
    assert(screenshotCount === 36, `Visual QA Pack must contain 36 screenshot targets, got ${screenshotCount}`);
  }
} finally {
  fs.rmSync(tempRoot, { recursive: true, force: true });
}

if (fs.existsSync(DOCS)) {
  const docs = read(DOCS);
  includesAll(docs, [
    "27 Screen · Project Detail",
    "шесть frames",
    "Просторная 4А",
    "Аэродромная 18Г",
    "Сенная 76",
    "14 ComponentSet",
    "119 вариантов",
    "29 атомарных шагов",
    "24 audit payload",
    "36",
    "issue №116",
    "Figma Starter"
  ], "Project Detail documentation");
}

if (errors.length) {
  console.error(`Figma Project Detail handoff validation failed:\n- ${errors.join("\n- ")}`);
  process.exit(1);
}

console.log("Figma Project Detail handoff validation passed: 6 screens, 3 evidence profiles, 29 execution steps, 24 audits and 36 screenshot targets.");
