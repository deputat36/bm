import fs from "node:fs";
import path from "node:path";

const ROOT = process.cwd();
const PAGE_PATH = "design-system/index.html";
const CSS_PATH = "assets/css/design-system-preview.css";
const TOKENS_PATH = "data/design/portal-v2.tokens.json";
const SITEMAP_PATH = "sitemap.xml";
const errors = [];

function read(relativePath) {
  const absolutePath = path.join(ROOT, relativePath);
  if (!fs.existsSync(absolutePath)) {
    errors.push(`${relativePath}: file does not exist`);
    return "";
  }
  return fs.readFileSync(absolutePath, "utf8");
}

const page = read(PAGE_PATH);
const css = read(CSS_PATH);
const tokensRaw = read(TOKENS_PATH);
const sitemap = read(SITEMAP_PATH);

if (!page || !css || !tokensRaw) process.exit(1);

let tokens = null;
try {
  tokens = JSON.parse(tokensRaw);
} catch (error) {
  errors.push(`${TOKENS_PATH}: invalid JSON — ${error.message}`);
}

for (const fragment of [
  '<meta name="robots" content="noindex,nofollow">',
  'href="../assets/css/styles.css"',
  'href="../assets/css/home-polish.css"',
  'href="../assets/css/leadgen.css"',
  'href="../assets/css/project-conversion.css"',
  'href="../assets/css/design-system-preview.css"',
  'Design System v2',
  'Городской навигатор',
  'id="colors"',
  'id="typography"',
  'id="buttons"',
  'id="cards"',
  'id="forms"',
  'id="statuses"',
  'id="faq"',
  'id="mobile"',
  'https://www.figma.com/design/rhFYa5gPDhF009hZsfEGSX',
  'data/design/portal-v2.tokens.json'
]) {
  if (!page.includes(fragment)) errors.push(`${PAGE_PATH}: missing ${fragment}`);
}

for (const forbidden of [
  "<form",
  "data-lead-form",
  "WEB3FORMS_ACCESS_KEY",
  "assets/js/main.js",
  'type="submit"',
  'content="index,follow"'
]) {
  if (page.includes(forbidden)) errors.push(`${PAGE_PATH}: forbidden active/public fragment ${forbidden}`);
}

if (!page.includes('<button class="button" type="button">')) {
  errors.push(`${PAGE_PATH}: demo action must remain type=button`);
}

for (const componentClass of [
  "button",
  "button--ghost",
  "eyebrow",
  "card",
  "fact",
  "form",
  "project-status-card--available",
  "project-status-card--pending",
  "project-faq",
  "ds-mobile-shell__bar"
]) {
  if (!page.includes(componentClass)) errors.push(`${PAGE_PATH}: component ${componentClass} is not demonstrated`);
}

for (const fragment of [
  ".ds-hero",
  ".ds-principles",
  ".ds-swatch-grid",
  ".ds-type-sample",
  ".ds-component-grid",
  ".ds-mobile-shell",
  "@media (max-width: 980px)",
  "@media (max-width: 700px)"
]) {
  if (!css.includes(fragment)) errors.push(`${CSS_PATH}: missing ${fragment}`);
}

if (/https?:\/\/[^)\s]+\.(?:woff2?|ttf|otf)/i.test(css) || /@import\s+url\(/i.test(css)) {
  errors.push(`${CSS_PATH}: external font or CSS import is forbidden`);
}

if (sitemap && /design-system\/?/i.test(sitemap)) {
  errors.push(`${SITEMAP_PATH}: private design-system preview must not be indexed`);
}

if (tokens) {
  if (tokens.design_name !== "Городской навигатор") {
    errors.push(`${TOKENS_PATH}: unexpected design_name`);
  }
  if (tokens.figma_file !== "https://www.figma.com/design/rhFYa5gPDhF009hZsfEGSX") {
    errors.push(`${TOKENS_PATH}: unexpected Figma file URL`);
  }
  if ((tokens.components_v1 || []).length < 12) {
    errors.push(`${TOKENS_PATH}: components_v1 is incomplete`);
  }
  if (tokens.layout?.minimum_touch_target < 48) {
    errors.push(`${TOKENS_PATH}: minimum touch target must be at least 48px`);
  }
}

console.log("Design system preview active forms: 0");
console.log("Design system preview indexability: blocked");
console.log("Design system preview components: buttons, badges, cards, facts, forms, statuses, FAQ, mobile action bar");

if (errors.length) {
  console.error("\nDesign system preview validation errors:");
  errors.forEach((error) => console.error(`- ${error}`));
  process.exit(1);
}

console.log("Design system preview validation passed.");
