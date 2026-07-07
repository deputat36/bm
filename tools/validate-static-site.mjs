import fs from "node:fs";
import path from "node:path";

const ROOT = process.cwd();
const IGNORED_DIRS = new Set([".git", "node_modules"]);
const DRAFT_PREFIXES = [
  "portal-preview/",
  "novostroyki/",
  "zhk/",
  "zastroyschiki/",
  "spravochnik/",
  "sravnenie/"
];

const results = {
  checkedHtmlFiles: 0,
  checkedLocalReferences: 0,
  errors: [],
  warnings: []
};

function walk(dir, files = []) {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    if (IGNORED_DIRS.has(entry.name)) continue;

    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      walk(fullPath, files);
    } else if (entry.isFile() && entry.name.endsWith(".html")) {
      files.push(fullPath);
    }
  }

  return files;
}

function toPosix(value) {
  return value.split(path.sep).join("/");
}

function isExternalReference(value) {
  return (
    !value ||
    value.startsWith("#") ||
    value.startsWith("http://") ||
    value.startsWith("https://") ||
    value.startsWith("mailto:") ||
    value.startsWith("tel:") ||
    value.startsWith("data:") ||
    value.startsWith("javascript:")
  );
}

function stripQueryAndHash(value) {
  return value.split("#")[0].split("?")[0];
}

function resolveReference(fromFile, reference) {
  const cleanReference = stripQueryAndHash(reference);
  if (!cleanReference) return null;

  const resolved = cleanReference.startsWith("/")
    ? path.join(ROOT, cleanReference)
    : path.resolve(path.dirname(fromFile), cleanReference);

  if (path.extname(resolved)) return resolved;
  return path.join(resolved, "index.html");
}

function existsReference(targetPath) {
  return targetPath && fs.existsSync(targetPath);
}

function read(file) {
  return fs.readFileSync(file, "utf8");
}

function getLocalReferences(html) {
  const refs = [];
  const attrRegex = /\s(?:href|src)=["']([^"']+)["']/gi;
  let match;

  while ((match = attrRegex.exec(html))) {
    const value = match[1].trim();
    if (!isExternalReference(value)) refs.push(value);
  }

  return refs;
}

function getLeadForms(html) {
  return html.match(/<form\b[^>]*data-lead-form[^>]*>/gi) || [];
}

function getAttribute(tag, name) {
  const regex = new RegExp(`${name}=["']([^"']*)["']`, "i");
  const match = tag.match(regex);
  return match ? match[1].trim() : "";
}

function validateDraftRobots(relativePath, html) {
  const shouldBeNoindex = DRAFT_PREFIXES.some((prefix) => relativePath.startsWith(prefix));
  if (!shouldBeNoindex) return;

  if (!/<meta\s+name=["']robots["']\s+content=["']noindex,follow["']/i.test(html)) {
    results.errors.push(`${relativePath}: draft page must include <meta name="robots" content="noindex,follow">`);
  }
}

function validateLeadForms(relativePath, html) {
  const forms = getLeadForms(html);

  forms.forEach((form, index) => {
    const humanIndex = index + 1;
    const requiredDataAttributes = [
      "data-lead-type",
      "data-form-id",
      "data-project",
      "data-project-id",
      "data-project-name"
    ];

    requiredDataAttributes.forEach((attribute) => {
      if (!getAttribute(form, attribute)) {
        results.errors.push(`${relativePath}: lead form #${humanIndex} missing ${attribute}`);
      }
    });

    const leadType = getAttribute(form, "data-lead-type");
    if (leadType === "project_consultation" && !getAttribute(form, "data-complex-id")) {
      results.errors.push(`${relativePath}: project_consultation form #${humanIndex} missing data-complex-id`);
    }
  });
}

function validateLocalReferences(file, relativePath, html) {
  const refs = getLocalReferences(html);

  refs.forEach((reference) => {
    const target = resolveReference(file, reference);
    if (!target) return;

    results.checkedLocalReferences += 1;

    if (!existsReference(target)) {
      const normalizedTarget = toPosix(path.relative(ROOT, target));
      results.errors.push(`${relativePath}: broken local reference "${reference}" -> ${normalizedTarget}`);
    }
  });
}

function validateHtmlFile(file) {
  const html = read(file);
  const relativePath = toPosix(path.relative(ROOT, file));

  results.checkedHtmlFiles += 1;
  validateDraftRobots(relativePath, html);
  validateLeadForms(relativePath, html);
  validateLocalReferences(file, relativePath, html);
}

function main() {
  const htmlFiles = walk(ROOT);
  htmlFiles.forEach(validateHtmlFile);

  console.log(`Checked HTML files: ${results.checkedHtmlFiles}`);
  console.log(`Checked local references: ${results.checkedLocalReferences}`);

  if (results.warnings.length) {
    console.log("\nWarnings:");
    results.warnings.forEach((warning) => console.log(`- ${warning}`));
  }

  if (results.errors.length) {
    console.error("\nErrors:");
    results.errors.forEach((error) => console.error(`- ${error}`));
    process.exit(1);
  }

  console.log("\nStatic site validation passed.");
}

main();
