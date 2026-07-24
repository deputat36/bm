import fs from "node:fs";
import path from "node:path";

const ROOT = process.cwd();
const MAIN_PATH = "assets/js/main.js";
const errors = [];
const htmlFiles = [];

function walk(dir) {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    if ([".git", "node_modules", ".github"].includes(entry.name)) continue;
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) walk(full);
    else if (entry.isFile() && entry.name.endsWith(".html")) htmlFiles.push(full);
  }
}

walk(ROOT);

let formCount = 0;
let pageCount = 0;

for (const fullPath of htmlFiles) {
  const source = fs.readFileSync(fullPath, "utf8");
  if (!source.includes("data-lead-form")) continue;

  pageCount += 1;
  const relativePath = path.relative(ROOT, fullPath).replaceAll(path.sep, "/");
  const forms = [...source.matchAll(/<form\b(?=[^>]*\bdata-lead-form\b)([^>]*)>([\s\S]*?)<\/form>/gi)];

  if (!forms.length) {
    errors.push(`${relativePath}: data-lead-form найден, но форма не разобрана`);
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
    if (/name=["'](?:name|phone)["'][^>]*>[\s\S]*?<\/fieldset>/i.test(body) === false) {
      errors.push(`${relativePath}: контактные поля должны находиться внутри отключаемого fieldset`);
    }
  }
}

if (pageCount !== 7) errors.push(`ожидалось 7 страниц с формами, найдено ${pageCount}`);
if (formCount !== 14) errors.push(`ожидалось 14 форм, найдено ${formCount}`);

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

console.log(`Checked fail-closed lead forms: ${formCount} forms on ${pageCount} pages`);

if (errors.length) {
  console.error("\nFail-closed form validation errors:");
  errors.forEach((error) => console.error(`- ${error}`));
  process.exit(1);
}

console.log("Fail-closed form validation passed.");
