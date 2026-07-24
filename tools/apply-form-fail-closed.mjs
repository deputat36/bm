import fs from "node:fs";
import path from "node:path";

const ROOT = process.cwd();
const HTML_FORM_EXPECTED = 14;
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

let totalForms = 0;
let updatedForms = 0;
let updatedPages = 0;

for (const file of htmlFiles) {
  const before = fs.readFileSync(file, "utf8");
  if (!before.includes("data-lead-form")) continue;

  const after = before.replace(
    /<form\b(?=[^>]*\bdata-lead-form\b)([^>]*)>([\s\S]*?)<\/form>/gi,
    (match, attrs, body) => {
      totalForms += 1;
      if (/\bdata-fail-closed=["']true["']/i.test(attrs)) return match;
      updatedForms += 1;
      return `<form${attrs} data-fail-closed="true"><fieldset data-lead-fieldset disabled>${body}</fieldset><noscript><p class="form__status form__status--noscript is-visible">Для безопасной отправки заявки включите JavaScript или позвоните: <a href="tel:+79038576909">8 903 857-69-09</a>.</p></noscript></form>`;
    }
  );

  if (after !== before) {
    fs.writeFileSync(file, after);
    updatedPages += 1;
  }
}

if (totalForms !== HTML_FORM_EXPECTED) {
  throw new Error(`Expected ${HTML_FORM_EXPECTED} lead forms, found ${totalForms}`);
}
if (updatedForms !== HTML_FORM_EXPECTED) {
  throw new Error(`Expected to update ${HTML_FORM_EXPECTED} lead forms, updated ${updatedForms}`);
}

const mainPath = path.join(ROOT, "assets/js/main.js");
let mainSource = fs.readFileSync(mainPath, "utf8");
const mainMarker = "  form.dataset.startedAt = String(Date.now());";
const mainInsert = `${mainMarker}\n  const failClosedFieldset = form.querySelector(\"[data-lead-fieldset]\");\n  if (failClosedFieldset) failClosedFieldset.disabled = false;\n  form.dataset.jsReady = \"true\";`;
if (!mainSource.includes('form.querySelector("[data-lead-fieldset]")')) {
  if (!mainSource.includes(mainMarker)) throw new Error("main.js enhancement marker not found");
  mainSource = mainSource.replace(mainMarker, mainInsert);
  fs.writeFileSync(mainPath, mainSource);
}

const cssPath = path.join(ROOT, "assets/css/leadgen.css");
let css = fs.readFileSync(cssPath, "utf8");
const cssMarker = "/* Fail-closed lead forms */";
if (!css.includes(cssMarker)) {
  css += `\n\n${cssMarker}\n[data-lead-fieldset] {\n  border: 0;\n  margin: 0;\n  min-inline-size: 0;\n  padding: 0;\n}\n\n[data-lead-form]:not([data-js-ready=\"true\"]) [data-lead-fieldset] {\n  opacity: 0.72;\n}\n\n.form__status--noscript {\n  display: block;\n  margin-top: 12px;\n}\n`;
  fs.writeFileSync(cssPath, css);
}

const packagePath = path.join(ROOT, "package.json");
const pkg = JSON.parse(fs.readFileSync(packagePath, "utf8"));
pkg.scripts ||= {};
pkg.scripts["validate:form-fail-closed"] = "node --check tools/validate-form-fail-closed.mjs && node tools/validate-form-fail-closed.mjs";
if (!String(pkg.scripts.validate || "").includes("validate-form-fail-closed.mjs")) {
  pkg.scripts.validate = `${pkg.scripts.validate} && node tools/validate-form-fail-closed.mjs`;
}
fs.writeFileSync(packagePath, `${JSON.stringify(pkg, null, 2)}\n`);

console.log(`Updated ${updatedForms} forms on ${updatedPages} pages.`);
