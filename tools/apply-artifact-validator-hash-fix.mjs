import fs from "node:fs";

const file = "tools/validate-form-browser-qa-artifact.mjs";
let source = fs.readFileSync(file, "utf8");

const beforePattern = 'const ISO_TIMESTAMP = /^\\d{4}-\\d{2}-\\d{2}T\\d{2}:\\d{2}:\\d{2}(?:\\.\\d{1,3})?Z$/;';
const afterPattern = `${beforePattern}\nconst COMMIT_HASH = /^[a-f0-9]{40,64}$/i;`;
if (!source.includes(beforePattern)) throw new Error("ISO timestamp pattern target not found");
source = source.replace(beforePattern, afterPattern);

const beforeGuard = '  if (typeof value !== "string" || ISO_TIMESTAMP.test(value)) return;';
const afterGuard = '  if (typeof value !== "string" || ISO_TIMESTAMP.test(value) || COMMIT_HASH.test(value)) return;';
if (!source.includes(beforeGuard)) throw new Error("Privacy value guard target not found");
source = source.replace(beforeGuard, afterGuard);

fs.writeFileSync(file, source, "utf8");
console.log("Commit hashes excluded from phone-like value detection.");
