import fs from "node:fs";
import path from "node:path";

const ROOT = process.cwd();
const PAGE_PATH = "index.html";
const errors = [];

function read(relativePath) {
  const fullPath = path.join(ROOT, relativePath);
  if (!fs.existsSync(fullPath)) {
    errors.push(`${relativePath}: file does not exist`);
    return "";
  }
  return fs.readFileSync(fullPath, "utf8");
}

function count(source, fragment) {
  return source.split(fragment).length - 1;
}

function extractSection(html, marker) {
  const markerIndex = html.indexOf(marker);
  if (markerIndex < 0) return "";
  const start = html.lastIndexOf("<section", markerIndex);
  const end = html.indexOf("</section>", markerIndex);
  return start >= 0 && end >= 0 ? html.slice(start, end + "</section>".length) : "";
}

const html = read(PAGE_PATH);
const routes = extractSection(html, "data-homepage-routes");
const process = extractSection(html, "data-homepage-consultation-process");

if (!routes) errors.push(`${PAGE_PATH}: homepage routes section not found`);
if (!process) errors.push(`${PAGE_PATH}: consultation process section not found`);

const routeContracts = [
  {
    action: "route_object",
    placement: "homepage_route_object",
    href: "#objects",
    label: "Выбрать дом"
  },
  {
    action: "route_selection",
    placement: "homepage_route_selection",
    href: "#quick-lead",
    label: "Начать подбор"
  },
  {
    action: "route_mortgage",
    placement: "homepage_route_mortgage",
    href: "ipoteka/#quick-lead",
    label: "Рассчитать покупку"
  }
];

for (const route of routeContracts) {
  for (const fragment of [
    `href="${route.href}"`,
    `data-track-action="${route.action}"`,
    `data-track-placement="${route.placement}"`,
    `>${route.label}</a>`
  ]) {
    if (!routes.includes(fragment)) errors.push(`${PAGE_PATH}: route missing ${fragment}`);
  }
  if (count(html, `data-track-placement="${route.placement}"`) !== 1) {
    errors.push(`${PAGE_PATH}: route placement must be unique: ${route.placement}`);
  }
}

for (const fragment of [
  'href="#start"',
  'data-track-action="route_start"',
  'data-track-placement="homepage_hero_route_start"',
  ">Выбрать сценарий</a>",
  "Выберите конкретный дом, получите общий подбор или предварительный расчёт покупки",
  "без обещаний неподтверждённых цен и наличия",
  "Что решим за один разговор",
  "От вопроса к понятному следующему шагу",
  "Портал не является официальным сайтом застройщика"
]) {
  if (!html.includes(fragment)) errors.push(`${PAGE_PATH}: missing conversion fragment ${fragment}`);
}

if (count(html, 'data-track-placement="homepage_hero_route_start"') !== 1) {
  errors.push(`${PAGE_PATH}: hero route placement must be unique`);
}

for (const step of ["Шаг 1", "Шаг 2", "Шаг 3"]) {
  if (count(process, `>${step}</span>`) !== 1) errors.push(`${PAGE_PATH}: consultation process missing ${step}`);
}
if (count(process, '<article class="card">') !== 3) {
  errors.push(`${PAGE_PATH}: consultation process must contain exactly 3 steps`);
}
if (routes.includes("<form") || process.includes("<form")) {
  errors.push(`${PAGE_PATH}: routes and process sections must not contain forms`);
}
if (count(html, "<form ") !== 2) {
  errors.push(`${PAGE_PATH}: homepage form count must remain 2`);
}
for (const formId of ["homepage_quick_selection", "homepage_priority_selection"]) {
  if (count(html, `data-form-id="${formId}"`) !== 1) {
    errors.push(`${PAGE_PATH}: form id must remain unique: ${formId}`);
  }
}

for (const forbidden of [
  "гарантируем цену",
  "гарантированное наличие",
  "квартира забронирована",
  "мы официальный сайт застройщика",
  "официальный отдел продаж застройщика",
  "одобрение ипотеки гарантировано"
]) {
  if (html.toLowerCase().includes(forbidden.toLowerCase())) {
    errors.push(`${PAGE_PATH}: forbidden promise ${forbidden}`);
  }
}

const routeHrefs = Array.from(routes.matchAll(/href="([^"]+)"/g), (match) => match[1]);
for (const href of routeHrefs) {
  if (href.includes("?") || href.includes("utm_") || href.includes("lead_source=") || href.includes("placement=")) {
    errors.push(`${PAGE_PATH}: route href must not use query attribution or personal parameters: ${href}`);
  }
}

console.log(`Homepage route cards: ${routeContracts.length}`);
console.log("Homepage forms: 2");
console.log("Consultation process steps: 3");
console.log("New query parameters: 0");

if (errors.length) {
  console.error("\nHomepage conversion route validation errors:");
  errors.forEach((error) => console.error(`- ${error}`));
  process.exit(1);
}

console.log("Homepage conversion route validation passed.");