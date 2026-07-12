import fs from "node:fs";
import path from "node:path";

const ROOT = process.cwd();
const PORTAL_PATHS = [
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

const FORBIDDEN_PATTERNS = [
  {
    label: "старый домен tellermanovsad.ru",
    pattern: /tellermanovsad\.ru/i
  },
  {
    label: "логотип или класс BM Group",
    pattern: /brand__bm|bm-group-logo/i
  },
  {
    label: "старый бренд в шапке",
    pattern: /brand__etagi/i
  },
  {
    label: "ссылка на архивную главную",
    pattern: /portal-preview\//i
  }
];

const errors = [];
let checked = 0;

for (const relativePath of PORTAL_PATHS) {
  const fullPath = path.join(ROOT, relativePath);

  if (!fs.existsSync(fullPath)) {
    errors.push(`${relativePath}: файл не найден`);
    continue;
  }

  checked += 1;
  const content = fs.readFileSync(fullPath, "utf8");

  for (const rule of FORBIDDEN_PATTERNS) {
    if (rule.pattern.test(content)) {
      errors.push(`${relativePath}: найдено запрещённое наследие — ${rule.label}`);
    }
  }

  if (!content.includes("Новостройки Борисоглебска")) {
    errors.push(`${relativePath}: отсутствует нейтральное название портала`);
  }
}

console.log(`Checked portal pages: ${checked}`);

if (errors.length) {
  console.error("\nPortal branding audit errors:");
  errors.forEach((error) => console.error(`- ${error}`));
  process.exit(1);
}

console.log("\nPortal branding audit passed.");
