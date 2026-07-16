import fs from "node:fs";
import path from "node:path";

const ROOT = process.cwd();
const CONTACTS_PATH = "contacts/index.html";
const PAGE_INDEX_PATH = "data/pages/index.json";
const SITEMAP_PATH = "sitemap.xml";
const CONTACTS_URL = "https://novostroyki-borisoglebsk.ru/contacts/";
const errors = [];

function read(relativePath) {
  const fullPath = path.join(ROOT, relativePath);
  if (!fs.existsSync(fullPath)) {
    errors.push(`${relativePath}: file does not exist`);
    return "";
  }
  return fs.readFileSync(fullPath, "utf8");
}

function readJson(relativePath) {
  const source = read(relativePath);
  if (!source) return null;
  try {
    return JSON.parse(source);
  } catch (error) {
    errors.push(`${relativePath}: invalid JSON: ${error.message}`);
    return null;
  }
}

function count(source, fragment) {
  return source.split(fragment).length - 1;
}

const html = read(CONTACTS_PATH);
const sitemap = read(SITEMAP_PATH);
const pages = readJson(PAGE_INDEX_PATH);
if (!html || !sitemap || !pages) process.exit(1);

for (const fragment of [
  '<meta name="robots" content="index,follow,max-image-preview:large,max-snippet:-1,max-video-preview:-1">',
  `<link rel="canonical" href="${CONTACTS_URL}">`,
  `<link rel="alternate" hreflang="ru-RU" href="${CONTACTS_URL}">`,
  '<title>Консультация по новостройкам Борисоглебска — телефон и заявка</title>',
  '<h1>Консультация по новостройкам Борисоглебска</h1>',
  '"@type": "ContactPage"',
  '"@type": "WebSite"',
  'data-form-id="contacts_quick_selection"',
  'data-form-id="contacts_priority_selection"',
  'href="tel:+79038576909" data-track-action="phone" data-track-placement="contacts_hero"',
  'href="#quick-lead" data-track-action="quick_selection" data-track-placement="contacts_header"',
  'Портал не является официальным сайтом застройщика',
  'Заявка не является бронью и не фиксирует цену'
]) {
  if (!html.includes(fragment)) errors.push(`${CONTACTS_PATH}: missing ${fragment}`);
}

if (/content=["'][^"']*noindex/i.test(html)) {
  errors.push(`${CONTACTS_PATH}: indexable contacts page must not contain noindex`);
}

if (count(html, "<form ") !== 2) {
  errors.push(`${CONTACTS_PATH}: contacts page must keep exactly two forms`);
}

const formIds = Array.from(html.matchAll(/data-form-id="([^"]+)"/g), (match) => match[1]);
const expectedFormIds = ["contacts_quick_selection", "contacts_priority_selection"];
if (JSON.stringify(formIds) !== JSON.stringify(expectedFormIds)) {
  errors.push(`${CONTACTS_PATH}: unexpected form ids or order: ${formIds.join(", ")}`);
}

const phoneLinks = count(html, 'href="tel:+79038576909"');
if (phoneLinks < 4) errors.push(`${CONTACTS_PATH}: expected at least four visible phone paths, found ${phoneLinks}`);

for (const placement of [
  "contacts_header",
  "contacts_hero",
  "contacts_help",
  "contacts_detailed",
  "contacts_footer"
]) {
  if (count(html, `data-track-placement="${placement}"`) < 1) {
    errors.push(`${CONTACTS_PATH}: missing tracked placement ${placement}`);
  }
}

for (const forbidden of [
  "официальный представитель",
  "цены от застройщика",
  "напрямую от застройщика",
  "гарантированная бронь",
  "гарантированное одобрение",
  "гарантируем наличие",
  "фиксируем цену"
]) {
  if (html.toLowerCase().includes(forbidden)) {
    errors.push(`${CONTACTS_PATH}: forbidden promise ${forbidden}`);
  }
}

if (count(sitemap, `<loc>${CONTACTS_URL}</loc>`) !== 1) {
  errors.push(`${SITEMAP_PATH}: contacts URL must appear exactly once`);
}
if (!sitemap.includes("<changefreq>monthly</changefreq>")) {
  errors.push(`${SITEMAP_PATH}: contacts changefreq must be monthly`);
}
if (/[?&](?:lead_source|placement|utm_)/i.test(sitemap)) {
  errors.push(`${SITEMAP_PATH}: attribution parameters are forbidden`);
}

const contactEntries = Array.isArray(pages) ? pages.filter((page) => page?.url === "/contacts/") : [];
if (contactEntries.length !== 1) {
  errors.push(`${PAGE_INDEX_PATH}: expected exactly one /contacts/ entry`);
} else {
  const contact = contactEntries[0];
  if (contact.page_type !== "contacts") errors.push(`${PAGE_INDEX_PATH}: contacts page_type must remain contacts`);
  if (contact.robots !== "index,follow") errors.push(`${PAGE_INDEX_PATH}: contacts robots must be index,follow`);
  if (contact.status !== "published") errors.push(`${PAGE_INDEX_PATH}: contacts status must be published`);
  if (contact.title !== "Консультация по новостройкам Борисоглебска — телефон и заявка") {
    errors.push(`${PAGE_INDEX_PATH}: contacts title does not match the HTML title`);
  }
}

const publishedIndexable = Array.isArray(pages)
  ? pages.filter((page) => page?.status === "published" && page?.robots === "index,follow").map((page) => page.url).sort()
  : [];
if (JSON.stringify(publishedIndexable) !== JSON.stringify(["/", "/contacts/"])) {
  errors.push(`${PAGE_INDEX_PATH}: expected only home and contacts to be published indexable pages; got ${publishedIndexable.join(", ")}`);
}

console.log(`Contacts forms: ${formIds.length}`);
console.log(`Contacts phone links: ${phoneLinks}`);
console.log(`Published indexable pages: ${publishedIndexable.length}`);
console.log("ContactPage schema: enabled");

if (errors.length) {
  console.error("\nContacts indexability validation errors:");
  errors.forEach((error) => console.error(`- ${error}`));
  process.exit(1);
}

console.log("Contacts indexability validation passed.");
