import fs from "node:fs";
import path from "node:path";

const ROOT = process.cwd();
const BASE_URL = "https://novostroyki-borisoglebsk.ru";

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
  "spasibo/index.html",
  "about/index.html",
  "sources/index.html",
  "legal/index.html",
  "privacy/index.html",
  "personal-data-consent/index.html"
];

const LEGACY_PREFIXES = [
  "/portal-preview/",
  "/novostroyki/",
  "/zhk/",
  "/zastroyschiki/",
  "/spravochnik/",
  "/novosti/",
  "/o-zhk/",
  "/kvartiry/",
  "/planirovki/",
  "/ceny/",
  "/dokumenty/",
  "/galereya/",
  "/zastroyschik/",
  "/infrastruktura/",
  "/hod-stroitelstva/",
  "/proektnaya-deklaratsiya-36-001139/",
  "/faq/",
  "/zayavka/"
];

const errors = [];
let checkedLinks = 0;

function pageUrl(relativePath) {
  if (relativePath === "index.html") return `${BASE_URL}/`;
  return `${BASE_URL}/${relativePath.replace(/index\.html$/, "")}`;
}

function repositoryTarget(pathname) {
  const clean = decodeURIComponent(pathname).replace(/^\/+/, "");
  if (!clean) return "index.html";
  if (clean.endsWith("/")) return `${clean}index.html`;
  return clean;
}

function extractHrefs(html) {
  return [...html.matchAll(/\bhref=["']([^"']+)["']/gi)].map((match) => match[1].trim());
}

for (const relativePath of CORE_PATHS) {
  const fullPath = path.join(ROOT, relativePath);

  if (!fs.existsSync(fullPath)) {
    errors.push(`${relativePath}: файл не найден`);
    continue;
  }

  const html = fs.readFileSync(fullPath, "utf8");

  for (const href of extractHrefs(html)) {
    if (!href || href.startsWith("#") || href.startsWith("tel:") || href.startsWith("mailto:") || href.startsWith("javascript:")) {
      continue;
    }

    let url;
    try {
      url = new URL(href, pageUrl(relativePath));
    } catch (error) {
      errors.push(`${relativePath}: некорректная ссылка ${href}`);
      continue;
    }

    if (url.origin !== BASE_URL) continue;

    checkedLinks += 1;
    const pathname = url.pathname.replace(/\/{2,}/g, "/");

    if (LEGACY_PREFIXES.some((prefix) => pathname.startsWith(prefix))) {
      errors.push(`${relativePath}: основная страница ведёт в legacy-раздел ${pathname}`);
    }

    const target = repositoryTarget(pathname);
    if (!fs.existsSync(path.join(ROOT, target))) {
      errors.push(`${relativePath}: внутренняя ссылка ${href} ведёт на отсутствующий файл ${target}`);
    }
  }
}

console.log(`Checked portal internal links: ${checkedLinks}`);

if (errors.length) {
  console.error("\nPortal link validation errors:");
  errors.forEach((error) => console.error(`- ${error}`));
  process.exit(1);
}

console.log("\nPortal link validation passed.");
