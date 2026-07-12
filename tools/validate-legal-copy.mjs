import fs from "node:fs";
import path from "node:path";

const ROOT = process.cwd();

const CORE_PATHS = [
  "index.html",
  "catalog/index.html",
  "catalog/prostornaya-4a/index.html",
  "catalog/aerodromnaya-18g/index.html",
  "catalog/sennaya-76/index.html",
  "developers/index.html",
  "guides/index.html",
  "news/index.html",
  "contacts/index.html",
  "ipoteka/index.html",
  "spasibo/index.html"
];

const FORM_PATHS = new Set([
  "index.html",
  "catalog/index.html",
  "catalog/prostornaya-4a/index.html",
  "catalog/aerodromnaya-18g/index.html",
  "catalog/sennaya-76/index.html",
  "contacts/index.html",
  "ipoteka/index.html"
]);

const UNVERIFIED_PROJECT_PATHS = new Set([
  "catalog/prostornaya-4a/index.html",
  "catalog/aerodromnaya-18g/index.html",
  "catalog/sennaya-76/index.html"
]);

const FORBIDDEN_PHRASES = [
  "официальный представитель",
  "цены от застройщика",
  "напрямую от застройщика",
  "гарантированная бронь",
  "гарантированное одобрение",
  "гарантированная ставка",
  "гарантируем наличие",
  "забронируем квартиру",
  "фиксируем цену"
];

const DISCLAIMER_VARIANTS = [
  "не является бронью",
  "не фиксирует цену",
  "не фиксирует стоимость",
  "не создаёт обязательств",
  "не создает обязательств",
  "бронированием квартиры",
  "фиксацией стоимости",
  "информация уточняется",
  "условия уточняются"
];

const errors = [];
let checked = 0;

function read(relativePath) {
  const fullPath = path.join(ROOT, relativePath);

  if (!fs.existsSync(fullPath)) {
    errors.push(`${relativePath}: файл не найден`);
    return "";
  }

  return fs.readFileSync(fullPath, "utf8");
}

function normalize(content) {
  return String(content || "")
    .replace(/<script\b[^>]*>[\s\S]*?<\/script>/gi, " ")
    .replace(/<style\b[^>]*>[\s\S]*?<\/style>/gi, " ")
    .replace(/<[^>]+>/g, " ")
    .replace(/&nbsp;/gi, " ")
    .replace(/\s+/g, " ")
    .trim()
    .toLowerCase();
}

function hasSafeOfficialSiteContext(text) {
  const occurrences = [...text.matchAll(/официальн(?:ым|ого|ый) сайт(?:ом|а)?/gi)];

  return occurrences.every((match) => {
    const start = Math.max(0, match.index - 60);
    const context = text.slice(start, match.index + match[0].length + 30).toLowerCase();
    return context.includes("не является") || context.includes("не выступает");
  });
}

for (const relativePath of CORE_PATHS) {
  const html = read(relativePath);
  if (!html) continue;

  checked += 1;
  const text = normalize(html);

  if (!text.includes("новостройки борисоглебска")) {
    errors.push(`${relativePath}: отсутствует нейтральное название портала`);
  }

  FORBIDDEN_PHRASES.forEach((phrase) => {
    if (text.includes(phrase)) {
      errors.push(`${relativePath}: найдена запрещённая формулировка «${phrase}»`);
    }
  });

  if (!hasSafeOfficialSiteContext(text)) {
    errors.push(`${relativePath}: формулировка про официальный сайт используется без отрицательного контекста`);
  }

  if (FORM_PATHS.has(relativePath)) {
    if (!html.includes("data-lead-form")) {
      errors.push(`${relativePath}: ожидается форма с data-lead-form`);
    }

    if (!DISCLAIMER_VARIANTS.some((variant) => text.includes(variant))) {
      errors.push(`${relativePath}: рядом с формой нет безопасного дисклеймера о предварительном характере заявки`);
    }
  }

  if (UNVERIFIED_PROJECT_PATHS.has(relativePath) && !html.includes('content="noindex,follow"')) {
    errors.push(`${relativePath}: неподтверждённая карточка должна содержать noindex,follow`);
  }
}

console.log(`Checked legal copy on portal pages: ${checked}`);

if (errors.length) {
  console.error("\nLegal copy validation errors:");
  errors.forEach((error) => console.error(`- ${error}`));
  process.exit(1);
}

console.log("\nLegal copy validation passed.");
