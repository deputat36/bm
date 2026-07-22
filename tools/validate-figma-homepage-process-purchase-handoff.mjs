import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const generatorPath = path.join(ROOT, "tools/figma/generate-portal-v2-homepage-process-purchase-screen.mjs");
const stepGeneratorPath = path.join(ROOT, "tools/figma/generate-portal-v2-step-card-components.mjs");
const docsPath = path.join(ROOT, "docs/design/FIGMA_HOMEPAGE_PROCESS_PURCHASE_HANDOFF.md");
const stepDocsPath = path.join(ROOT, "docs/design/FIGMA_STEP_CARD_HANDOFF.md");
const sourcePaths = ["index.html", "assets/css/home-polish.css", "data/design/portal-v2.tokens.json"];

const errors = [];
function assert(condition, message) {
  if (!condition) errors.push(message);
}

for (const item of [generatorPath, stepGeneratorPath, docsPath, stepDocsPath, ...sourcePaths.map((value) => path.join(ROOT, value))]) {
  assert(fs.existsSync(item), `Missing required file: ${path.relative(ROOT, item)}`);
}

let code = "";
if (fs.existsSync(generatorPath)) {
  const run = spawnSync(process.execPath, [generatorPath], {
    cwd: ROOT,
    encoding: "utf8",
    maxBuffer: 1024 * 1024
  });
  assert(run.status === 0, `Homepage process purchase generator failed: ${run.stderr.trim()}`);
  code = run.stdout || "";
}

if (code) {
  assert(code.length <= 50000, "Homepage process purchase generator exceeds Figma.use_figma 50,000 character limit");
  assert(code.includes("20 Screen · Homepage Process & Purchase"), "Homepage process purchase screen uses the wrong Figma page name");
  assert((code.match(/await figma\.setCurrentPageAsync\(/g) || []).length === 1, "Homepage process purchase screen must switch page exactly once");
  assert(!/#[0-9a-f]{3,8}\b/i.test(code), "Homepage process purchase screen contains hardcoded HEX");

  for (const pattern of [
    "figma.notify(",
    "figma.closePlugin(",
    "figma.currentPage =",
    "loadAllPagesAsync",
    ".getPluginData(",
    ".setPluginData("
  ]) assert(!code.includes(pattern), `Homepage process purchase screen uses unsupported API: ${pattern}`);

  for (const marker of [
    "getLocalComponentsAsync",
    ".createInstance()",
    "componentProperties",
    "setProperties(",
    "Step Card",
    "Button",
    "Context=Light",
    "Grid=Three",
    "Grid=Four"
  ]) assert(code.includes(marker), `Homepage process purchase screen misses dependency/API marker: ${marker}`);

  for (const marker of [
    "for (const layout of [\"Desktop\", \"Mobile\"])",
    "screenWidth = desktop ? 1440 : 360",
    "contentWidth = desktop ? 1200 : 336",
    "Homepage Process & Purchase / ",
    "Consultation process cards",
    "Purchase step cards"
  ]) assert(code.includes(marker), `Homepage process purchase screen misses layout marker: ${marker}`);

  for (const marker of [
    "От вопроса к понятному следующему шагу",
    "Без бронирования, фиксации цены и обязательств со стороны покупателя.",
    "Уточняем задачу",
    "Сверяем информацию",
    "Определяем действие",
    "Как купить квартиру в новостройке Борисоглебска",
    "Определить параметры",
    "Сравнить новые дома",
    "Проверить документы",
    "Рассчитать покупку",
    "Начать подбор",
    "Что проверить перед покупкой"
  ]) assert(code.includes(marker), `Homepage process purchase screen misses production content: ${marker}`);

  for (const prohibited of [
    "Забронировать квартиру",
    "Зафиксировать цену",
    "Гарантированное одобрение",
    "Квартира в наличии"
  ]) assert(!code.includes(prohibited), `Homepage process purchase screen contains prohibited promise: ${prohibited}`);

  const tempFile = path.join(os.tmpdir(), `portal-v2-homepage-process-purchase-${process.pid}.mjs`);
  fs.writeFileSync(tempFile, `async function __figmaUseWrapper() {\n${code}\n}\n`, "utf8");
  const syntax = spawnSync(process.execPath, ["--check", tempFile], { encoding: "utf8" });
  fs.rmSync(tempFile, { force: true });
  assert(syntax.status === 0, `Homepage process purchase generated invalid JavaScript: ${syntax.stderr.trim()}`);
}

if (fs.existsSync(docsPath)) {
  const docs = fs.readFileSync(docsPath, "utf8");
  for (const marker of [
    "20 Screen · Homepage Process & Purchase",
    "Homepage Process & Purchase / Desktop",
    "Homepage Process & Purchase / Mobile",
    "3 карточки по 384 px",
    "4 карточки по 284 px",
    "Step Card",
    "Button",
    "Code Connect",
    "Visual QA",
    "issue №116",
    "resource:figma-generate-design"
  ]) assert(docs.includes(marker), `Homepage process purchase documentation misses: ${marker}`);
}

if (errors.length) {
  console.error(`Figma homepage process purchase validation failed:\n- ${errors.join("\n- ")}`);
  process.exit(1);
}

console.log("Figma homepage process purchase handoff validation passed.");
