import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const changed = [];

function update(rel, replacements) {
  const filePath = path.join(ROOT, rel);
  let content = fs.readFileSync(filePath, "utf8");
  let next = content;
  for (const [from, to] of replacements) {
    if (next.includes(to)) continue;
    if (!next.includes(from)) throw new Error(`${rel} misses expected fragment: ${from}`);
    next = next.replace(from, to);
  }
  if (next !== content) {
    fs.writeFileSync(filePath, next, "utf8");
    changed.push(rel);
  }
}

update(".github/workflows/figma-execution-pack.yml", [
  ["manifest.stepCount !== 27", "manifest.stepCount !== 29"],
  ["Expected 27 steps", "Expected 29 steps"]
]);

update(".github/workflows/figma-visual-qa-pack.yml", [
  ["manifest.auditCount !== 22", "manifest.auditCount !== 24"],
  ["Expected 22 audits", "Expected 24 audits"],
  ["screenshots !== 28", "screenshots !== 36"],
  ["Expected 28 screenshot targets", "Expected 36 screenshot targets"]
]);

console.log(JSON.stringify({ changed, changedCount: changed.length }, null, 2));
