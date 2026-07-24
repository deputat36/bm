import fs from "node:fs";
import path from "node:path";

const ROOT = process.cwd();
const MAIN_PATH = "assets/js/main.js";
const ACTIVE_FORM_PATHS = [
  "index.html",
  "catalog/index.html",
  "catalog/prostornaya-4a/index.html",
  "catalog/aerodromnaya-18g/index.html",
  "catalog/sennaya-76/index.html",
  "contacts/index.html",
  "ipoteka/index.html"
];
const errors = [];
let formCount = 0;

for (const relativePath of ACTIVE_FORM_PATHS) {
  const source = fs.readFileSync(path.join(ROOT, relativePath), "utf8");
  const forms = [...source.matchAll(/<form\b(?=[^>]*\bdata-lead-form\b)([^>]*)>([\s\S]*?)<\/form>/gi)];

  if (!forms.length) {
    errors.push(`${relativePath}: активные data-lead-form не найдены`);
    continue;
  }

  for (const match of forms) {
    formCount += 1;
    const attrs = match[1] || "";
    const body = match[2] || "";

    if (!/\bdata-fail-closed=["']true["']/i.test(attrs)) {
      errors.push(`${relativePath}: форма не помечена data-fail-closed=true`);
    }
    if (!/<fieldset\b[^>]*\bdata-lead-fieldset\b[^>]*\bdisabled\b[^>]*>/i.test(body)) {
      errors.push(`${relativePath}: отсутствует отключённый fieldset для no-JS режима`);
    }
    if (!/<noscript>[\s\S]*?8 903 857-69-09[\s\S]*?<\/noscript>/i.test(body)) {
      errors.push(`${relativePath}: отсутствует no-JS подсказка с резервным телефоном`);
    }
    const fieldset = body.match(/<fieldset\b[^>]*\bdata-lead-fieldset\b[^>]*>([\s\S]*?)<\/fieldset>/i)?.[1] || "";
    if (!/name=["']name["']/i.test(fieldset) || !/name=["']phone["']/i.test(fieldset)) {
      errors.push(`${relativePath}: имя и телефон должны находиться внутри отключаемого fieldset`);
    }
  }
}

if (formCount !== 14) errors.push(`ожидалось 14 активных форм, найдено ${formCount}`);

const mainSource = fs.readFileSync(path.join(ROOT, MAIN_PATH), "utf8");
[
  'form.querySelector("[data-lead-fieldset]")',
  "failClosedFieldset.disabled = false",
  'form.dataset.jsReady = "true"'
].forEach((fragment) => {
  if (!mainSource.includes(fragment)) errors.push(`${MAIN_PATH}: отсутствует фрагмент активации ${fragment}`);
});

const cssPaths = ["assets/css/leadgen.css", "assets/css/styles.css"];
const css = cssPaths.map((file) => fs.readFileSync(path.join(ROOT, file), "utf8")).join("\n");
if (!css.includes("[data-lead-fieldset]")) errors.push("CSS: отсутствует сброс оформления fail-closed fieldset");
if (!css.includes("form__status--noscript")) errors.push("CSS: отсутствует оформление no-JS сообщения");

console.log(`Checked fail-closed lead forms: ${formCount} forms on ${ACTIVE_FORM_PATHS.length} pages`);

if (errors.length) {
  console.error("\nFail-closed form validation errors:");
  errors.forEach((error) => console.error(`- ${error}`));
  process.exit(1);
}

console.log("Fail-closed form validation passed.");
