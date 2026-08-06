import fs from "node:fs";

const file = "assets/js/form-accessibility.js";
let source = fs.readFileSync(file, "utf8");
const before = '  const PHONE_PATTERN = "(?=(?:\\\\D*\\\\d){10,15}\\\\D*$)[+\\\\d\\\\s().-]+";';
const after = '  const PHONE_PATTERN = "(?=(?:\\\\D*\\\\d){10,15}\\\\D*$)[+\\\\d\\\\s\\\\.\\\\(\\\\)\\\\-]+";';

if (!source.includes(before)) {
  throw new Error("PHONE_PATTERN patch target not found");
}
source = source.replace(before, after);
fs.writeFileSync(file, source, "utf8");

const match = source.match(/const PHONE_PATTERN = "([^"]+)";/);
if (!match) throw new Error("Updated PHONE_PATTERN not found");
const runtimePattern = JSON.parse(`"${match[1]}"`);
new RegExp(runtimePattern, "v");
console.log("PHONE_PATTERN is valid with the HTML pattern v flag.");
