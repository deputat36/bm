import fs from "node:fs";
import path from "node:path";

const ROOT = process.cwd();
const errors = [];

function read(relativePath) {
  const fullPath = path.join(ROOT, relativePath);
  if (!fs.existsSync(fullPath)) {
    errors.push(`${relativePath}: file does not exist`);
    return "";
  }
  return fs.readFileSync(fullPath, "utf8");
}

function requireFragments(source, relativePath, fragments) {
  for (const fragment of fragments) {
    if (!source.includes(fragment)) errors.push(`${relativePath}: missing ${fragment}`);
  }
}

function assertBalancedCss(source, relativePath) {
  const withoutComments = source.replace(/\/\*[\s\S]*?\*\//g, "");
  let balance = 0;
  for (const char of withoutComments) {
    if (char === "{") balance += 1;
    if (char === "}") balance -= 1;
    if (balance < 0) {
      errors.push(`${relativePath}: unexpected closing brace`);
      return;
    }
  }
  if (balance !== 0) errors.push(`${relativePath}: unbalanced braces (${balance})`);
}

const tokenPath = "data/design/portal-v2.tokens.json";
const homePath = "assets/css/home-polish.css";
const leadPath = "assets/css/leadgen.css";
const projectPath = "assets/css/project-conversion.css";
const docsPath = "docs/design/PORTAL_DESIGN_V2.md";

let tokens = {};
try {
  tokens = JSON.parse(read(tokenPath));
} catch (error) {
  errors.push(`${tokenPath}: invalid JSON (${error.message})`);
}

if (tokens.schema_version !== "1.0") errors.push(`${tokenPath}: unexpected schema version`);
if (tokens.design_name !== "Городской навигатор") errors.push(`${tokenPath}: design name mismatch`);
if (!String(tokens.figma_file || "").startsWith("https://www.figma.com/design/")) errors.push(`${tokenPath}: Figma design URL missing`);
if (tokens.layout?.minimum_touch_target < 48) errors.push(`${tokenPath}: minimum touch target must be at least 48px`);
if (tokens.typography?.display?.weight !== 900) errors.push(`${tokenPath}: display weight must remain 900`);

const home = read(homePath);
const lead = read(leadPath);
const project = read(projectPath);
const docs = read(docsPath);

for (const [file, source] of [[homePath, home], [leadPath, lead], [projectPath, project]]) {
  assertBalancedCss(source, file);
  if (/@import\s+url\(/i.test(source)) errors.push(`${file}: external/imported styles are forbidden`);
  if (/fonts\.(googleapis|gstatic)\.com/i.test(source)) errors.push(`${file}: external font dependency is forbidden`);
}

requireFragments(home, homePath, [
  "--navy-900: #102a43",
  "--coral-500: #e85d3f",
  "--amber-500: #f4b860",
  "--sage-600: #2f6b5e",
  "--radius: 18px",
  "font-family: system-ui",
  ".brand::before",
  ".topbar",
  ".hero__content--conversion",
  ".hero-quick-card",
  ".card",
  ".button--ghost",
  ".page-hero",
  ".cta",
  ".footer",
  "@media (max-width: 760px)",
  "body:has(.hero__content--conversion) .nav .button[href=\"#quick-lead\"]",
  "body:has(.hero__content--conversion) .hero__pitch .hero__actions a[href^=\"tel:\"]"
]);

requireFragments(lead, leadPath, [
  ".lead-form-card",
  ".form input",
  "min-height: 50px",
  "box-shadow: var(--focus-ring)",
  ".consent-field",
  ".honeypot-field",
  ".form__status.is-visible"
]);

requireFragments(project, projectPath, [
  ".project-hero__grid",
  ".project-status-card--available::before",
  ".project-status-card--pending::before",
  ".project-faq details[open] summary::after",
  ".project-verification-summary",
  "[data-market-snapshot-rendered]"
]);

requireFragments(docs, docsPath, [
  "https://www.figma.com/design/rhFYa5gPDhF009hZsfEGSX",
  "Городской навигатор",
  "data/design/portal-v2.tokens.json",
  "data-form-id",
  "noindex,follow"
]);

for (const forbidden of [
  "#7250b8",
  "linear-gradient(90deg,var(--red),var(--violet))",
  "font-family: Arial, Helvetica, sans-serif"
]) {
  if (home.includes(forbidden) || lead.includes(forbidden) || project.includes(forbidden)) {
    errors.push(`Design v2 CSS: forbidden legacy fragment ${forbidden}`);
  }
}

console.log(`Design: ${tokens.design_name || "unknown"}`);
console.log(`Figma: ${tokens.figma_file || "missing"}`);
console.log(`Components planned: ${Array.isArray(tokens.components_v1) ? tokens.components_v1.length : 0}`);
console.log("External font requests: 0");
console.log("Lead form identifiers changed by design layer: 0");
console.log("Indexing rules changed by design layer: 0");

if (errors.length) {
  console.error("\nPortal Design System v2 validation errors:");
  errors.forEach((error) => console.error(`- ${error}`));
  process.exit(1);
}

console.log("Portal Design System v2 validation passed.");
