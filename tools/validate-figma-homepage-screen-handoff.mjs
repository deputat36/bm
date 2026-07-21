import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const generatorPath = path.join(ROOT, "tools/figma/generate-portal-v2-homepage-hero-screen.mjs");
const docsPath = path.join(ROOT, "docs/design/FIGMA_HOMEPAGE_HERO_HANDOFF.md");
const sourcePaths = [
  "index.html",
  "assets/css/home-polish.css",
  "assets/css/leadgen.css",
  "assets/js/main.js"
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
  assert(run.status === 0, `Homepage screen generator failed: ${run.stderr.trim()}`);
  code = run.stdout || "";
}

if (code) {
  assert(code.length <= 50000, "Homepage screen generator exceeds Figma.use_figma 50,000 character limit");
  assert(code.includes("14 Screen · Homepage Hero"), "Homepage screen uses the wrong Figma page name");
  assert((code.match(/await figma\.setCurrentPageAsync\(/g) || []).length === 1, "Homepage screen must switch page exactly once");
  assert(!/#[0-9a-f]{3,8}\b/i.test(code), "Homepage screen contains hardcoded HEX");

  for (const pattern of [
    "figma.notify(",
    "figma.closePlugin(",
    "figma.currentPage =",
    "loadAllPagesAsync",
    ".getPluginData(",
    ".setPluginData("
  ]) assert(!code.includes(pattern), `Homepage screen uses unsupported API: ${pattern}`);

  for (const marker of [
    "getLocalComponentsAsync",
    ".createInstance()",
    "componentProperties",
    "setProperties(",
    "setSharedPluginData",
    "Top Navigation",
    "Button",
    "Fact Card",
    "Lead Form Card"
  ]) assert(code.includes(marker), `Homepage screen misses dependency/API marker: ${marker}`);

  for (const marker of [
    "for (const layout of [\"Desktop\", \"Mobile\"])",
    "screenWidth = desktop ? 1440 : 360",
    "contentWidth = desktop ? 1200 : 336",
    "Context=Hero",
    "Context=Light",
    "Mobile sticky action bar"
  ]) assert(code.includes(marker), `Homepage screen misses layout marker: ${marker}`);

  for (const marker of [
    "Новостройки Борисоглебска",
    "Городской каталог новых домов",
    "приоритетных объекта",
    "1 каталог",
    "ипотека",
    "без брони",
    "Портал не является официальным сайтом застройщика",
    "Заявка не является бронью и не фиксирует цену"
  ]) assert(code.includes(marker), `Homepage screen misses production content: ${marker}`);

  const tempFile = path.join(os.tmpdir(), `portal-v2-homepage-screen-${process.pid}.mjs`);
  fs.writeFileSync(tempFile, `async function __figmaUseWrapper() {\n${code}\n}\n`, "utf8");
  const syntax = spawnSync(process.execPath, ["--check", tempFile], { encoding: "utf8" });
  fs.rmSync(tempFile, { force: true });
  assert(syntax.status === 0, `Homepage screen generated invalid JavaScript: ${syntax.stderr.trim()}`);
}

if (fs.existsSync(docsPath)) {
  const docs = fs.readFileSync(docsPath, "utf8");
  for (const marker of [
    "14 Screen · Homepage Hero",
    "Homepage Hero / Desktop",
    "Homepage Hero / Mobile",
    "Code Connect",
    "изображения",
    "16 вариантов",
    "Visual QA",
    "issue №116",
    "resource:figma-generate-design"
  ]) assert(docs.includes(marker), `Homepage screen documentation misses: ${marker}`);
}

if (errors.length) {
  console.error(`Figma homepage screen validation failed:\n- ${errors.join("\n- ")}`);
  process.exit(1);
}

console.log("Figma homepage screen handoff validation passed.");