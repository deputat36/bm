import fs from "node:fs";
import path from "node:path";

const ROOT = process.cwd();
const ACTIVE_FORM_PATHS = [
  "index.html",
  "catalog/index.html",
  "catalog/prostornaya-4a/index.html",
  "catalog/aerodromnaya-18g/index.html",
  "catalog/sennaya-76/index.html",
  "contacts/index.html",
  "ipoteka/index.html"
];
const source = '<a href="tel:+79038576909">8 903 857-69-09</a>';
const replacement = '<strong>8 903 857-69-09</strong>';
let replaced = 0;

for (const relativePath of ACTIVE_FORM_PATHS) {
  const fullPath = path.join(ROOT, relativePath);
  const before = fs.readFileSync(fullPath, "utf8");
  const count = before.split(source).length - 1;
  if (!count) continue;
  const after = before.split(source).join(replacement);
  fs.writeFileSync(fullPath, after);
  replaced += count;
}

if (replaced !== 14) throw new Error(`Expected 14 no-JS phone links, replaced ${replaced}`);
console.log(`Replaced ${replaced} no-JS phone links with safe text.`);
