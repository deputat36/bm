import fs from "node:fs";
import path from "node:path";

const ROOT = process.cwd();
const errors = [];

function read(relativePath) {
  const filePath = path.join(ROOT, relativePath);
  if (!fs.existsSync(filePath)) {
    errors.push(`${relativePath}: файл не найден`);
    return "";
  }
  return fs.readFileSync(filePath, "utf8");
}

function requireFragments(relativePath, content, fragments) {
  fragments.forEach((fragment) => {
    if (!content.includes(fragment)) {
      errors.push(`${relativePath}: отсутствует обязательный фрагмент ${fragment}`);
    }
  });
}

function countMatches(content, pattern) {
  return (content.match(pattern) || []).length;
}

const runtime = read("assets/js/page-accessibility.js");
const styles = read("assets/css/accessibility.css");
const conversion = read("assets/js/conversion-tracking.js");
const schema = read("assets/js/schema.js");
const home = read("index.html");
const contacts = read("contacts/index.html");
const notFound = read("404.html");

requireFragments("assets/js/page-accessibility.js", runtime, [
  'document.querySelector("main")',
  'main.id = "main-content"',
  'main.setAttribute("tabindex", "-1")',
  'skipLink.textContent = "Перейти к основному содержанию"',
  'skipLink.href = `#${main.id}`',
  'main.focus({ preventScroll: true })',
  'new URL("../css/accessibility.css", scriptUrl).href',
  'window.__NEWBUILD_PAGE_ACCESSIBILITY__ = true'
]);

requireFragments("assets/css/accessibility.css", styles, [
  "--focus-ring: #005fcc",
  ".skip-link",
  ":focus-visible",
  'main[tabindex="-1"]:focus',
  "@media (prefers-reduced-motion: reduce)",
  "scroll-behavior: auto !important",
  "transition-duration: 0.01ms !important"
]);

requireFragments("assets/js/conversion-tracking.js", conversion, [
  'const runtimeScriptUrl = document.currentScript?.src || "";',
  'new URL("page-accessibility.js", runtimeScriptUrl).href',
  'script.dataset.pageAccessibilityRuntime = "true"',
  "loadPageAccessibilityRuntime();"
]);

requireFragments("assets/js/schema.js", schema, [
  'loadPortalScript(schemaScriptUrl, "conversion-tracking.js")'
]);

[
  ["index.html", home, 2],
  ["contacts/index.html", contacts, 2]
].forEach(([relativePath, html, expectedForms]) => {
  if (!html.includes("assets/js/schema.js")) {
    errors.push(`${relativePath}: schema.js не подключён`);
  }
  const forms = countMatches(html, /<form\b[^>]*data-lead-form/gi);
  if (forms !== expectedForms) {
    errors.push(`${relativePath}: ожидалось ${expectedForms} лид-формы, найдено ${forms}`);
  }
});

requireFragments("404.html", notFound, [
  '<meta name="robots" content="noindex,follow">',
  '<script src="assets/js/page-accessibility.js"></script>'
]);

if (/<form\b[^>]*data-lead-form/i.test(notFound)) {
  errors.push("404.html: страница не должна собирать персональные данные");
}

console.log("Checked keyboard accessibility runtime, styles and page integration.");
console.log("Lead form scope preserved: homepage=2, contacts=2, 404=0.");

if (errors.length) {
  console.error("\nPage accessibility validation errors:");
  errors.forEach((error) => console.error(`- ${error}`));
  process.exit(1);
}

console.log("\nPage accessibility validation passed.");
