import fs from "node:fs";
import path from "node:path";

const ROOT = process.cwd();
const BASE_URL = "https://novostroyki-borisoglebsk.ru";

const PAGES = [
  { file: "about/index.html", url: "/about/", requiresDraftNotice: false },
  { file: "sources/index.html", url: "/sources/", requiresDraftNotice: false },
  { file: "legal/index.html", url: "/legal/", requiresDraftNotice: true },
  { file: "privacy/index.html", url: "/privacy/", requiresDraftNotice: true },
  { file: "personal-data-consent/index.html", url: "/personal-data-consent/", requiresDraftNotice: true }
];

const errors = [];

for (const page of PAGES) {
  const fullPath = path.join(ROOT, page.file);
  if (!fs.existsSync(fullPath)) {
    errors.push(`${page.file}: файл не найден`);
    continue;
  }

  const html = fs.readFileSync(fullPath, "utf8");
  const lower = html.toLowerCase();
  const expectedCanonical = `<link rel="canonical" href="${BASE_URL}${page.url}">`;

  if (!html.includes('content="noindex,follow"')) {
    errors.push(`${page.file}: до финальной проверки требуется noindex,follow`);
  }

  if (!html.includes(expectedCanonical)) {
    errors.push(`${page.file}: canonical должен вести на ${BASE_URL}${page.url}`);
  }

  if (!html.includes("Новостройки Борисоглебска")) {
    errors.push(`${page.file}: отсутствует название портала`);
  }

  if (/tellermanovsad\.ru|brand__etagi|brand__bm|bm-group-logo|portal-preview\//i.test(html)) {
    errors.push(`${page.file}: найден старый домен, брендинг или архивная навигация`);
  }

  if (/data-lead-form/i.test(html)) {
    errors.push(`${page.file}: на доверительной странице не должно быть самостоятельной лид-формы`);
  }

  if (/href=["'][^"']*\/zayavka\//i.test(html)) {
    errors.push(`${page.file}: найдена ссылка на legacy-страницу заявок`);
  }

  if (page.requiresDraftNotice) {
    if (!lower.includes("рабоч") || !lower.includes("юрист")) {
      errors.push(`${page.file}: требуется явная пометка о рабочей редакции и юридической проверке`);
    }
  }
}

console.log(`Checked trust pages: ${PAGES.length}`);

if (errors.length) {
  console.error("\nTrust page validation errors:");
  errors.forEach((error) => console.error(`- ${error}`));
  process.exit(1);
}

console.log("\nTrust page validation passed.");