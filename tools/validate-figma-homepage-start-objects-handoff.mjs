import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const generatorPath = path.join(ROOT, "tools/figma/generate-portal-v2-homepage-start-objects-screen.mjs");
const docsPath = path.join(ROOT, "docs/design/FIGMA_HOMEPAGE_START_OBJECTS_HANDOFF.md");
const sourcePaths = [
  "index.html",
  "assets/css/home-polish.css",
  "tools/figma/generate-portal-v2-scenario-card-components.mjs",
  "tools/figma/generate-portal-v2-project-card-components.mjs"
];

const errors = [];
function assert(condition, message) {
  if (!condition) errors.push(message);
}

for (const item of [generatorPath, docsPath, ...sourcePaths.map((value) => path.join(ROOT, value))]) {
  assert(fs.existsSync(item), `Missing required file: ${path.relative(ROOT, item)}`);
}

let code = "";
if (fs.existsSync(generatorPath)) {
  const run = spawnSync(process.execPath, [generatorPath], {
    cwd: ROOT,
    encoding: "utf8",
    maxBuffer: 1024 * 1024
  });
  assert(run.status === 0, `Homepage Start & Objects generator failed: ${run.stderr.trim()}`);
  code = run.stdout || "";
}

if (code) {
  assert(code.length <= 50000, "Homepage Start & Objects generator exceeds Figma.use_figma 50,000 character limit");
  assert(code.includes("16 Screen · Homepage Start & Objects"), "Screen uses the wrong Figma page name");
  assert((code.match(/await figma\.setCurrentPageAsync\(/g) || []).length === 1, "Screen must switch page exactly once");
  assert(!/#[0-9a-f]{3,8}\b/i.test(code), "Screen contains hardcoded HEX");

  for (const pattern of [
    "figma.notify(",
    "figma.closePlugin(",
    "figma.currentPage =",
    "loadAllPagesAsync",
    ".getPluginData(",
    ".setPluginData("
  ]) assert(!code.includes(pattern), `Screen uses unsupported API: ${pattern}`);

  for (const marker of [
    "getLocalComponentsAsync",
    ".createInstance()",
    "componentProperties",
    "setProperties(",
    "setSharedPluginData",
    "Scenario Card",
    "Project Card",
    "Button"
  ]) assert(code.includes(marker), `Screen misses dependency/API marker: ${marker}`);

  for (const marker of [
    "for (const layout of [\"Desktop\", \"Mobile\"])",
    "screenWidth = desktop ? 1440 : 360",
    "contentWidth = desktop ? 1200 : 336",
    "Intent=Object",
    "Intent=Selection",
    "Intent=Mortgage",
    "Verification=Pending",
    "Priority project cards"
  ]) assert(code.includes(marker), `Screen misses layout or variant marker: ${marker}`);

  for (const marker of [
    "С чего начать",
    "Выберите свою задачу",
    "Приоритет сбора заявок",
    "Выберите интересующий объект",
    "Просторная 4А",
    "Аэродромная 18Г",
    "Сенная 76",
    "Оставить заявку",
    "Посмотреть другие новостройки",
    "Неподтверждённые цены не публикуются"
  ]) assert(code.includes(marker), `Screen misses production content: ${marker}`);

  const tempFile = path.join(os.tmpdir(), `portal-v2-homepage-start-objects-${process.pid}.mjs`);
  fs.writeFileSync(tempFile, `async function __figmaUseWrapper() {\n${code}\n}\n`, "utf8");
  const syntax = spawnSync(process.execPath, ["--check", tempFile], { encoding: "utf8" });
  fs.rmSync(tempFile, { force: true });
  assert(syntax.status === 0, `Screen generated invalid JavaScript: ${syntax.stderr.trim()}`);
}

if (fs.existsSync(docsPath)) {
  const docs = fs.readFileSync(docsPath, "utf8");
  for (const marker of [
    "16 Screen · Homepage Start & Objects",
    "Homepage Start and Objects / Desktop",
    "Homepage Start and Objects / Mobile",
    "Scenario Card",
    "Project Card",
    "Verification: `Pending`",
    "Оставить заявку",
    "Внешних изображений",
    "Visual QA",
    "issue №116",
    "resource:figma-generate-design"
  ]) assert(docs.includes(marker), `Screen documentation misses: ${marker}`);
}

if (errors.length) {
  console.error(`Figma homepage Start & Objects validation failed:\n- ${errors.join("\n- ")}`);
  process.exit(1);
}

console.log("Figma homepage Start & Objects handoff validation passed.");
