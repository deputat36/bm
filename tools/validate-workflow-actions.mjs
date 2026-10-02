import fs from "node:fs";
import path from "node:path";

const ROOT = process.cwd();
const WORKFLOWS_DIR = path.join(ROOT, ".github", "workflows");
const DEPRECATED_ACTIONS = new Map([
  ["actions/checkout@v4", "actions/checkout@v7"],
  ["actions/setup-node@v4", "actions/setup-node@v7"],
  ["actions/upload-artifact@v4", "actions/upload-artifact@v7"]
]);

const files = fs.readdirSync(WORKFLOWS_DIR)
  .filter((name) => /\.ya?ml$/i.test(name))
  .sort();

const errors = [];
let references = 0;

for (const name of files) {
  const relativePath = path.posix.join(".github/workflows", name);
  const content = fs.readFileSync(path.join(WORKFLOWS_DIR, name), "utf8");

  for (const [deprecated, replacement] of DEPRECATED_ACTIONS) {
    let index = content.indexOf(deprecated);
    while (index >= 0) {
      const line = content.slice(0, index).split("\n").length;
      errors.push(`${relativePath}:${line}: deprecated ${deprecated}; use ${replacement}`);
      index = content.indexOf(deprecated, index + deprecated.length);
    }
  }

  references += [...content.matchAll(/uses:\s*actions\//g)].length;
}

if (errors.length) {
  console.error("Workflow Actions validation errors:");
  errors.forEach((error) => console.error(`- ${error}`));
  process.exit(1);
}

console.log(`Checked workflow Actions: ${files.length} workflow files; official action references: ${references}; deprecated v4 references: 0`);
