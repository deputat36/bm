import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const generatorPath = path.join(ROOT, "tools/figma/generate-portal-v2-homepage-apartments-outcomes-screen.mjs");
const componentPath = path.join(ROOT, "tools/figma/generate-portal-v2-content-card-components.mjs");
const docsPath = path.join(ROOT, "docs/design/FIGMA_HOMEPAGE_APARTMENTS_OUTCOMES_HANDOFF.md");
const componentDocsPath = path.join(ROOT, "docs/design/FIGMA_CONTENT_CARD_HANDOFF.md");
const sourcePaths = [
  "index.html",
  "assets/css/home-polish.css",
  "assets/css/portal-v2.tokens.css"
];

const errors = [];
function assert(condition, message) {
  if (!condition) errors.push(message);
}

for (const item of [generatorPath, componentPath, docsPath, componentDocsPath, ...sourcePaths.map((value) => path.join(ROOT, value))]) {
  assert(fs.existsSync(item), `Missing required file: ${path.relative(ROOT, item)}`);
}

function generate(filePath, label) {
  if (!fs.existsSync(filePath)) return "";
  const run = spawnSync(process.execPath, [filePath], {
    cwd: ROOT,
    encoding: "utf8",
    maxBuffer: 1024 * 1024
  });
  assert(run.status === 0, `${label} generator failed: ${run.stderr.trim()}`);
  return run.stdout || "";
}

const componentCode = generate(componentPath, "Content Card");
const screenCode = generate(generatorPath, "Homepage Apartments & Outcomes");

for (const [label, code] of [["Content Card", componentCode], ["Homepage screen", screenCode]]) {
  if (!code) continue;
  assert(code.length <= 50000, `${label} generator exceeds Figma.use_figma 50,000 character limit`);
  assert((code.match(/await figma\.setCurrentPageAsync\(/g) || []).length === 1, `${label} must switch page exactly once`);
  assert(!/#[0-9a-f]{3,8}\b/i.test(code), `${label} contains hardcoded HEX`);
  for (const pattern of [
    "figma.notify(",
    "figma.closePlugin(",
    "figma.currentPage =",
    "loadAllPagesAsync",
    ".getPluginData(",
    ".setPluginData("
  ]) assert(!code.includes(pattern), `${label} uses unsupported API: ${pattern}`);
}

if (componentCode) {
  for (const marker of [
    "17 Component · Content Card",
    "combine(variants, stage, \"Content Card\")",
    "for (const layout of [\"Desktop\", \"Mobile\"])",
    "for (const purpose of [\"Selection\", \"Outcome\"])",
    "for (const state of [\"Default\", \"Hover\"])",
    "getLocalComponentsAsync",
    ".createInstance()",
    "componentProperties",
    "setProperties(",
    "Context=Light",
    "isExposedInstance",
    "Show action",
    "status/verified",
    "amber/500",
    "Effects/Card Hover"
  ]) assert(componentCode.includes(marker), `Content Card misses marker: ${marker}`);
}

if (screenCode) {
  assert(screenCode.includes("18 Screen · Homepage Apartments & Outcomes"), "Homepage screen uses the wrong Figma page name");
  for (const marker of [
    "getLocalComponentsAsync",
    ".createInstance()",
    "componentProperties",
    "setProperties(",
    "exposedInstances",
    "Content Card",
    "Button",
    "Purpose=Selection",
    "Purpose=Outcome",
    "for (const layout of [\"Desktop\", \"Mobile\"])",
    "screenWidth = desktop ? 1440 : 360",
    "contentWidth = desktop ? 1200 : 336"
  ]) assert(screenCode.includes(marker), `Homepage screen misses dependency/layout marker: ${marker}`);

  for (const marker of [
    "1-комнатные квартиры",
    "2-комнатные квартиры",
    "3-комнатные квартиры",
    "Подобрать 1-комнатную",
    "Подобрать 2-комнатную",
    "Подобрать 3-комнатную",
    "Ответить на 5 вопросов без телефона",
    "Позвонить: 8 903 857-69-09",
    "Подходящие объекты",
    "Финансовый сценарий",
    "Проверенные данные",
    "Следующий шаг",
    "Получить консультацию",
    "Изучить справочник",
    "без обещаний неподтверждённых цен и наличия"
  ]) assert(screenCode.includes(marker), `Homepage screen misses production content: ${marker}`);

  const tempFile = path.join(os.tmpdir(), `portal-v2-homepage-apartments-outcomes-${process.pid}.mjs`);
  fs.writeFileSync(tempFile, `async function __figmaUseWrapper() {\n${screenCode}\n}\n`, "utf8");
  const syntax = spawnSync(process.execPath, ["--check", tempFile], { encoding: "utf8" });
  fs.rmSync(tempFile, { force: true });
  assert(syntax.status === 0, `Homepage screen generated invalid JavaScript: ${syntax.stderr.trim()}`);
}

if (fs.existsSync(docsPath) && fs.existsSync(componentDocsPath)) {
  const docs = fs.readFileSync(docsPath, "utf8") + "\n" + fs.readFileSync(componentDocsPath, "utf8");
  for (const marker of [
    "17 Component · Content Card",
    "18 Screen · Homepage Apartments & Outcomes",
    "Homepage Apartments & Outcomes / Desktop",
    "Homepage Apartments & Outcomes / Mobile",
    "8 вариантов",
    "exposed instance",
    "384 × 292 px",
    "284 × 224 px",
    "336 px",
    "Code Connect",
    "Внешних изображений нет",
    "Visual QA",
    "issue №116",
    "resource:figma-generate-design"
  ]) assert(docs.includes(marker), `Homepage apartments/outcomes documentation misses: ${marker}`);
}

if (errors.length) {
  console.error(`Figma homepage apartments outcomes validation failed:\n- ${errors.join("\n- ")}`);
  process.exit(1);
}

console.log("Figma homepage apartments outcomes handoff validation passed.");