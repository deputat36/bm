import fs from "node:fs";
import path from "node:path";

const ROOT = process.cwd();
const DATA_DIR = path.join(ROOT, "data");
const results = {
  checked: 0,
  errors: []
};

function walk(dir, files = []) {
  if (!fs.existsSync(dir)) return files;

  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const fullPath = path.join(dir, entry.name);

    if (entry.isDirectory()) {
      walk(fullPath, files);
    } else if (entry.isFile() && entry.name.endsWith(".json")) {
      files.push(fullPath);
    }
  }

  return files;
}

function toPosix(value) {
  return value.split(path.sep).join("/");
}

function validateJson(filePath) {
  const relativePath = toPosix(path.relative(ROOT, filePath));

  try {
    JSON.parse(fs.readFileSync(filePath, "utf8"));
    results.checked += 1;
  } catch (error) {
    results.errors.push(`${relativePath}: ${error.message}`);
  }
}

walk(DATA_DIR).forEach(validateJson);

console.log(`Checked JSON files: ${results.checked}`);

if (results.errors.length) {
  console.error("\nJSON errors:");
  results.errors.forEach((error) => console.error(`- ${error}`));
  process.exit(1);
}

console.log("\nJSON validation passed.");
