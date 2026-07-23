import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const generatorPath = path.join(ROOT, "tools/figma/generate-portal-v2-catalog-screen.mjs");
const docsPath = path.join(ROOT, "docs/design/FIGMA_CATALOG_SCREEN_HANDOFF.md");
const sourceMapPath = path.join(ROOT, "data/design/portal-v2.source-map.json");
const executionBuilderPath = path.join(ROOT, "tools/build-figma-execution-pack.mjs");
const visualBuilderPath = path.join(ROOT, "tools/build-figma-visual-qa-pack.mjs");
const catalogPath = path.join(ROOT, "catalog/index.html");
const quizPath = path.join(ROOT, "assets/js/catalog-rule-quiz.js");
const errors = [];

function assert(condition, message) {
  if (!condition) errors.push(message);
}
function textFile(filePath) {
  return fs.existsSync(filePath) ? fs.readFileSync(filePath, "utf8") : "";
}

for (const filePath of [generatorPath, docsPath, sourceMapPath, executionBuilderPath, visualBuilderPath, catalogPath, quizPath]) {
  assert(fs.existsSync(filePath), `Missing required file: ${path.relative(ROOT, filePath)}`);
}

const generatorSource = textFile(generatorPath);
const docs = textFile(docsPath);
const sourceMap = textFile(sourceMapPath) ? JSON.parse(textFile(sourceMapPath)) : null;
const executionBuilder = textFile(executionBuilderPath);
const visualBuilder = textFile(visualBuilderPath);
const catalog = textFile(catalogPath);
const quiz = textFile(quizPath);

const generated = fs.existsSync(generatorPath)
  ? spawnSync(process.execPath, [generatorPath], { cwd: ROOT, encoding: "utf8", maxBuffer: 4 * 1024 * 1024 })
  : { status: 1, stdout: "", stderr: "Generator missing" };
assert(generated.status === 0, `Catalog generator failed: ${String(generated.stderr || "").trim()}`);
const code = generated.stdout || "";
assert(code.length > 0, "Catalog generator returned empty payload");
assert(code.length <= 50000, `Catalog payload exceeds 50,000 characters: ${code.length}`);
assert((code.match(/await figma\.setCurrentPageAsync\(/g) || []).length === 1, "Catalog payload must switch page exactly once");

if (code) {
  const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), "figma-catalog-screen-"));
  const syntaxPath = path.join(tempDir, "catalog-screen.mjs");
  fs.writeFileSync(syntaxPath, `async function __figmaUseWrapper() {\n${code}\n}\n`, "utf8");
  const syntax = spawnSync(process.execPath, ["--check", syntaxPath], { encoding: "utf8" });
  assert(syntax.status === 0, `Catalog payload has invalid JavaScript: ${syntax.stderr.trim()}`);
  fs.rmSync(tempDir, { recursive: true, force: true });
}

for (const marker of [
  "26 Screen · Catalog",
  "catalog-screen",
  "catalog/index.html",
  "Top Navigation",
  "Lead Form Card",
  "Link Card",
  "Project Card",
  "Site Footer",
  "Active=Catalog",
  "catalog_quick_selection",
  "catalog_priority_selection",
  "catalog-rule-v1",
  "quiz-state",
  "quiz-version",
  "prefill-interest",
  "verification-profile",
  "tel:+79038576909",
  "Просторная 4А",
  "Аэродромная 18Г",
  "Сенная 76",
  "Заявка не является бронью",
  "не обещает одобрение ипотеки"
]) assert(code.includes(marker), `Generated catalog payload misses: ${marker}`);

assert(code.includes('for (const layout of ["Desktop", "Mobile"])'), "Catalog payload must generate Desktop and Mobile layouts");
assert(code.includes('auto("Catalog / " + layout, "VERTICAL")'), "Catalog payload must derive screen names from Desktop/Mobile layout");
assert(code.includes('"catalog-" + layout.toLowerCase()'), "Catalog payload must derive catalog-desktop/catalog-mobile screen keys");

for (const sectionKey of ["header", "hero", "catalog-navigator", "questions", "quiz", "priority", "reference", "lead", "footer"]) {
  assert(code.includes(`"${sectionKey}"`), `Generated catalog payload misses section-key: ${sectionKey}`);
}

for (const route of ["#questions", "#quiz", "#priority", "#reference", "#quick-lead", "action:catalog_quiz_start"]) {
  assert(code.includes(route), `Generated catalog payload misses route/action: ${route}`);
}

for (const forbidden of [
  "figma.notify(",
  "figma.closePlugin(",
  "figma.currentPage =",
  "loadAllPagesAsync",
  ".getPluginData(",
  ".setPluginData("
]) assert(!code.includes(forbidden), `Generated catalog payload uses unsupported API: ${forbidden}`);

assert(!/#[0-9a-fA-F]{3,8}\b/.test(generatorSource), "Catalog generator must not hardcode HEX colors");
for (const unsafePhrase of ["гарантируем одобрение", "гарантированная цена", "забронируем квартиру", "официальный сайт застройщика"]) {
  assert(!generatorSource.toLowerCase().includes(unsafePhrase), `Catalog generator contains unsafe phrase: ${unsafePhrase}`);
}

for (const marker of [
  "data-catalog-question-routes",
  "data-catalog-rule-quiz",
  "data-catalog-verification-comparison",
  "data-reference-catalog",
  "catalog_quick_selection",
  "catalog_priority_selection",
  "Цена, наличие квартир и условия покупки уточняются",
  "Заявка не является бронью"
]) assert(catalog.includes(marker), `Production catalog misses source marker: ${marker}`);

for (const marker of [
  "steps.length !== 5",
  "catalog-rule-v1",
  "quiz_completed",
  "Каталог не обещает фактическое наличие без проверки"
]) assert(quiz.includes(marker), `Catalog quiz source misses marker: ${marker}`);

if (sourceMap) {
  assert(sourceMap.figma?.componentSetsExpected === 14, "Source map must preserve 14 ComponentSet");
  assert(sourceMap.figma?.variantsExpected === 119, "Source map must preserve 119 variants");
  assert(sourceMap.figma?.screensExpected === 8, `Source map must expect 8 screens, found ${sourceMap.figma?.screensExpected}`);
  const catalogScreen = (sourceMap.screens || []).find((item) => item.id === "catalog");
  assert(Boolean(catalogScreen), "Source map misses catalog screen");
  assert(catalogScreen?.figmaPage === "26 Screen · Catalog", "Catalog source-map entry has wrong page");
  assert(catalogScreen?.generator === "tools/figma/generate-portal-v2-catalog-screen.mjs", "Catalog source-map entry has wrong generator");
  assert(catalogScreen?.mapping === "composed", "Catalog source-map entry must be composed");
  assert((catalogScreen?.sources || []).some((item) => item.path === "catalog/index.html"), "Catalog source-map entry misses catalog/index.html");
}

for (const marker of [
  "id: \"catalog\"",
  "26 Screen · Catalog",
  "generate-portal-v2-catalog-screen.mjs"
]) assert(executionBuilder.includes(marker), `Execution Pack builder misses catalog marker: ${marker}`);

for (const marker of [
  "id: \"catalog\"",
  "26 Screen · Catalog",
  "catalog-desktop",
  "catalog-mobile",
  "catalog-navigator"
]) assert(visualBuilder.includes(marker), `Visual QA builder misses catalog marker: ${marker}`);

for (const marker of [
  "26 Screen · Catalog",
  "catalog-desktop",
  "catalog-mobile",
  "catalog-rule-v1",
  "28 атомарных шагов",
  "23 audit payload",
  "30",
  "issue №116",
  "Figma Starter"
]) assert(docs.includes(marker), `Catalog handoff documentation misses: ${marker}`);

if (errors.length) {
  console.error(`Figma catalog screen handoff validation failed:\n- ${errors.join("\n- ")}`);
  process.exit(1);
}

console.log("Figma catalog screen handoff validation passed: Desktop/Mobile, 9 sections, metadata, source map and pack integration are valid.");
