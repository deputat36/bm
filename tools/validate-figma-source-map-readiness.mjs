import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const SOURCE_MAP_PATH = path.join(ROOT, "data/design/portal-v2.source-map.json");
const BUILDER_PATH = path.join(ROOT, "tools/build-figma-code-connect-readiness.mjs");
const DOCS_PATH = path.join(ROOT, "docs/design/FIGMA_SOURCE_MAP_AND_CODE_CONNECT_READINESS.md");

const expectedComponentIds = [
  "button",
  "verification-status",
  "form-field",
  "faq-accordion",
  "brand",
  "top-navigation",
  "project-card",
  "fact-card",
  "lead-form-card",
  "scenario-card",
  "content-card",
  "step-card",
  "link-card",
  "site-footer"
];
const expectedScreenIds = [
  "homepage-hero",
  "homepage-start-objects",
  "homepage-apartments-outcomes",
  "homepage-process-purchase",
  "homepage-purchase-resources",
  "homepage-faq-lead",
  "homepage-full",
  "catalog",
  "project-detail"
];

const errors = [];
function assert(condition, message) {
  if (!condition) errors.push(message);
}
function readJson(filePath) {
  try {
    return JSON.parse(fs.readFileSync(filePath, "utf8"));
  } catch (error) {
    errors.push(`Cannot read JSON ${path.relative(ROOT, filePath)}: ${error.message}`);
    return null;
  }
}
function unique(values) {
  return new Set(values).size === values.length;
}
function validateGenerator(item, type) {
  const generatorPath = path.join(ROOT, item.generator || "");
  assert(Boolean(item.generator), `${type} ${item.id} misses generator`);
  assert(fs.existsSync(generatorPath), `${type} ${item.id} generator does not exist: ${item.generator}`);
  if (!fs.existsSync(generatorPath)) return;

  const run = spawnSync(process.execPath, [generatorPath], {
    cwd: ROOT,
    encoding: "utf8",
    maxBuffer: 2 * 1024 * 1024
  });
  assert(run.status === 0, `${type} ${item.id} generator failed: ${run.stderr.trim()}`);
  const code = run.stdout || "";
  if (!code) return;
  assert(code.length <= 50000, `${type} ${item.id} generator exceeds 50,000 characters`);
  assert(code.includes(item.figmaPage), `${type} ${item.id} generated code misses Figma page ${item.figmaPage}`);
  assert((code.match(/await figma\.setCurrentPageAsync\(/g) || []).length === 1, `${type} ${item.id} must switch page exactly once`);
}
function validateSources(item, type) {
  assert(Array.isArray(item.sources) && item.sources.length > 0, `${type} ${item.id} has no production sources`);
  for (const source of item.sources || []) {
    const sourcePath = path.join(ROOT, source.path || "");
    assert(Boolean(source.path), `${type} ${item.id} has source without path`);
    assert(fs.existsSync(sourcePath), `${type} ${item.id} source does not exist: ${source.path}`);
    assert(Array.isArray(source.markers) && source.markers.length > 0, `${type} ${item.id} source ${source.path} has no markers`);
    if (!fs.existsSync(sourcePath)) continue;
    const content = fs.readFileSync(sourcePath, "utf8");
    for (const marker of source.markers || []) {
      assert(content.includes(marker), `${type} ${item.id} source ${source.path} misses marker: ${marker}`);
    }
  }
}

assert(fs.existsSync(SOURCE_MAP_PATH), "Missing data/design/portal-v2.source-map.json");
assert(fs.existsSync(BUILDER_PATH), "Missing tools/build-figma-code-connect-readiness.mjs");
assert(fs.existsSync(DOCS_PATH), "Missing docs/design/FIGMA_SOURCE_MAP_AND_CODE_CONNECT_READINESS.md");

const sourceMap = fs.existsSync(SOURCE_MAP_PATH) ? readJson(SOURCE_MAP_PATH) : null;
if (sourceMap) {
  assert(sourceMap.schemaVersion === "1.0", "Source map schemaVersion must be 1.0");
  assert(sourceMap.figma?.fileKey === "rhFYa5gPDhF009hZsfEGSX", "Source map has wrong Figma file key");
  assert(sourceMap.figma?.componentSetsExpected === 14, "Source map must expect 14 ComponentSet");
  assert(sourceMap.figma?.variantsExpected === 119, "Source map must expect 119 variants");
  assert(sourceMap.figma?.screensExpected === 9, "Source map must expect 9 screens");
  assert(sourceMap.codeConnect?.status === "blocked", "Code Connect status must remain blocked until prerequisites are met");
  assert(sourceMap.codeConnect?.nodeIdsAvailable === false, "Code Connect nodeIdsAvailable must be false");
  assert(sourceMap.codeConnect?.componentsPublished === false, "Code Connect componentsPublished must be false");
  assert(sourceMap.codeConnect?.currentPlan === "Starter", "Current Figma plan must be documented as Starter");
  assert(sourceMap.codeConnect?.requiredPlan === "Organization or Enterprise", "Required Code Connect plan is not documented");
  assert(String(sourceMap.codeConnect?.rule || "").includes("Never invent or guess a nodeId"), "Source map must prohibit guessed node IDs");

  const components = sourceMap.components || [];
  const screens = sourceMap.screens || [];
  assert(components.length === 14, `Expected 14 components, received ${components.length}`);
  assert(screens.length === 9, `Expected 9 screens, received ${screens.length}`);
  assert(unique(components.map((item) => item.id)), "Component IDs must be unique");
  assert(unique(components.map((item) => item.figmaPage)), "Component Figma pages must be unique");
  assert(unique(screens.map((item) => item.id)), "Screen IDs must be unique");
  assert(unique(screens.map((item) => item.figmaPage)), "Screen Figma pages must be unique");
  assert(expectedComponentIds.every((id) => components.some((item) => item.id === id)), "Source map misses one or more expected component IDs");
  assert(expectedScreenIds.every((id) => screens.some((item) => item.id === id)), "Source map misses one or more expected screen IDs");

  for (const component of components) {
    assert(["direct", "composed", "gap"].includes(component.mapping), `Component ${component.id} has unsupported mapping ${component.mapping}`);
    assert(Boolean(component.componentSet), `Component ${component.id} misses ComponentSet name`);
    assert(Array.isArray(component.selectors) && component.selectors.length > 0, `Component ${component.id} has no selectors`);
    assert(component.nodeId === null, `Component ${component.id} nodeId must remain null until read from Figma`);
    assert(component.published === false, `Component ${component.id} published must remain false until confirmed`);
    validateSources(component, "Component");
    validateGenerator(component, "Component");
  }

  for (const screen of screens) {
    assert(["direct", "composed", "gap"].includes(screen.mapping), `Screen ${screen.id} has unsupported mapping ${screen.mapping}`);
    validateSources(screen, "Screen");
    validateGenerator(screen, "Screen");
  }

  assert(components.filter((item) => item.mapping === "direct").length === 8, "Expected 8 direct component mappings");
  assert(components.filter((item) => item.mapping === "composed").length === 6, "Expected 6 composed component mappings");
  assert(components.filter((item) => item.mapping === "gap").length === 0, "Expected zero component gaps");
  const faq = components.find((item) => item.id === "faq-accordion");
  assert(faq?.mapping === "direct", "FAQ Accordion must be marked as direct");
  assert(faq?.selectors?.includes(".faq-item"), "FAQ Accordion selectors must include .faq-item");
  assert(faq?.selectors?.includes(".faq-item summary"), "FAQ Accordion selectors must include summary");
  assert(!faq?.implementationGap, "FAQ Accordion must not retain implementationGap metadata");
  const faqScreen = screens.find((item) => item.id === "homepage-faq-lead");
  assert(faqScreen?.mapping === "direct", "Homepage FAQ & Lead screen must be marked as direct");
  assert(screens.filter((item) => item.mapping === "gap").length === 0, "Expected zero screen gaps");
}

if (fs.existsSync(BUILDER_PATH) && sourceMap) {
  const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), "figma-code-connect-readiness-"));
  const run = spawnSync(process.execPath, [BUILDER_PATH, tempDir], {
    cwd: ROOT,
    encoding: "utf8",
    maxBuffer: 2 * 1024 * 1024
  });
  assert(run.status === 0, `Readiness builder failed: ${run.stderr.trim()}`);

  const expectedFiles = [
    "manifest.json",
    "source-map.json",
    "pending-code-connect.json",
    "screen-source-map.json",
    "gaps.json",
    "README.md"
  ];
  for (const fileName of expectedFiles) {
    assert(fs.existsSync(path.join(tempDir, fileName)), `Readiness artifact misses ${fileName}`);
  }

  if (fs.existsSync(path.join(tempDir, "manifest.json"))) {
    const manifest = readJson(path.join(tempDir, "manifest.json"));
    assert(manifest?.componentCount === 14, "Readiness manifest must contain 14 components");
    assert(manifest?.screenCount === 9, "Readiness manifest must contain 9 screens");
    assert(manifest?.directMappings === 8, "Readiness manifest must contain 8 direct mappings");
    assert(manifest?.composedMappings === 6, "Readiness manifest must contain 6 composed mappings");
    assert(manifest?.gapMappings === 0, "Readiness manifest must contain zero component gaps");
    assert(manifest?.codeConnectStatus === "blocked", "Readiness manifest must preserve blocked status");
  }

  if (fs.existsSync(path.join(tempDir, "pending-code-connect.json"))) {
    const pending = readJson(path.join(tempDir, "pending-code-connect.json"));
    assert(Array.isArray(pending) && pending.length === 14, "Pending Code Connect file must contain 14 components");
    for (const item of pending || []) {
      assert(item.nodeId === null, `Pending mapping ${item.id} contains a guessed node ID`);
      assert(item.published === false, `Pending mapping ${item.id} incorrectly claims publication`);
      assert(item.codeConnectStatus === "blocked", `Pending mapping ${item.id} must remain blocked`);
      assert(Array.isArray(item.blockers) && item.blockers.length === 3, `Pending mapping ${item.id} must list three blockers`);
    }
  }

  if (fs.existsSync(path.join(tempDir, "gaps.json"))) {
    const gaps = readJson(path.join(tempDir, "gaps.json"));
    assert(Array.isArray(gaps) && gaps.length === 0, "Gaps artifact must be empty after FAQ parity is implemented");
  }

  fs.rmSync(tempDir, { recursive: true, force: true });
}

if (fs.existsSync(DOCS_PATH)) {
  const docs = fs.readFileSync(DOCS_PATH, "utf8");
  for (const marker of [
    "14 ComponentSet",
    "119 вариантов",
    "9 экранов",
    "direct",
    "composed",
    "gap",
    "FAQ Accordion",
    "semantic details/summary",
    "gap closed",
    "nodeId",
    "Organization or Enterprise",
    "Starter",
    "Figma Execution Pack",
    "Figma Visual QA Pack",
    "issue №116"
  ]) assert(docs.includes(marker), `Documentation misses: ${marker}`);
}

if (errors.length) {
  console.error(`Figma source map readiness validation failed:\n- ${errors.join("\n- ")}`);
  process.exit(1);
}

console.log("Figma source map and Code Connect readiness validation passed.");
