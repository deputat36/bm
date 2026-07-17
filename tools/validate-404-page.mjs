import fs from "node:fs";
import path from "node:path";

const ROOT = process.cwd();
const FILE = "404.html";
const fullPath = path.join(ROOT, FILE);
const errors = [];

if (!fs.existsSync(fullPath)) {
  console.error(`${FILE}: file does not exist`);
  process.exit(1);
}

const html = fs.readFileSync(fullPath, "utf8");

for (const fragment of [
  '<meta name="robots" content="noindex,follow">',
  '<title>Страница не найдена — Новостройки Борисоглебска</title>',
  '<h1>Страница не найдена</h1>',
  'Портал не является официальным сайтом застройщика.',
  'href="./" data-track-action="not_found_home" data-track-placement="not_found_hero"',
  'href="catalog/" data-track-action="catalog_open" data-track-placement="not_found_hero"',
  'href="contacts/#quick-lead" data-track-action="quick_selection" data-track-placement="not_found_footer"',
  'href="tel:+79038576909" data-track-action="phone" data-track-placement="not_found_hero"',
  'href="tel:+79038576909" data-track-action="phone" data-track-placement="not_found_footer"',
  'assets/js/main.js',
  'assets/js/schema.js'
]) {
  if (!html.includes(fragment)) errors.push(`${FILE}: missing ${fragment}`);
}

if (/<form\b/i.test(html)) {
  errors.push(`${FILE}: 404 page must not create a new lead form`);
}

if (/ЖК\s*[«"]?Теллерманов сад|tellermanovsad\.ru|\/kvartiry\//i.test(html)) {
  errors.push(`${FILE}: legacy project branding or route detected`);
}

const phoneLinks = (html.match(/href="tel:\+79038576909"/g) || []).length;
if (phoneLinks !== 2) {
  errors.push(`${FILE}: expected exactly 2 phone links, found ${phoneLinks}`);
}

const quickLeadLinks = (html.match(/href="contacts\/#quick-lead"/g) || []).length;
if (quickLeadLinks !== 2) {
  errors.push(`${FILE}: expected exactly 2 quick lead links, found ${quickLeadLinks}`);
}

console.log(`404 phone paths: ${phoneLinks}`);
console.log(`404 quick lead paths: ${quickLeadLinks}`);
console.log("404 indexability: noindex,follow");
console.log("New forms: 0");

if (errors.length) {
  console.error("\n404 page validation errors:");
  errors.forEach((error) => console.error(`- ${error}`));
  process.exit(1);
}

console.log("404 page validation passed.");
