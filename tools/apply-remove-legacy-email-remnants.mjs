import fs from "node:fs";

function replaceRequired(source, fragment, replacement, label) {
  const count = source.split(fragment).length - 1;
  if (count !== 1) throw new Error(`${label}: ожидалось одно совпадение, найдено ${count}`);
  return source.replace(fragment, replacement);
}

function removeFunction(source, name) {
  const marker = `function ${name}(`;
  const start = source.indexOf(marker);
  if (start < 0) throw new Error(`Function ${name} not found`);
  const bodyStart = source.indexOf("{", start);
  let depth = 0;
  let quote = "";
  let escaped = false;

  for (let index = bodyStart; index < source.length; index += 1) {
    const char = source[index];
    if (quote) {
      if (escaped) escaped = false;
      else if (char === "\\") escaped = true;
      else if (char === quote) quote = "";
      continue;
    }
    if (char === '"' || char === "'" || char === "`") {
      quote = char;
      continue;
    }
    if (char === "{") depth += 1;
    if (char === "}") depth -= 1;
    if (depth === 0) {
      let end = index + 1;
      while (source[end] === "\n" || source[end] === "\r") end += 1;
      return source.slice(0, start) + source.slice(end);
    }
  }

  throw new Error(`Function ${name} closing brace not found`);
}

let main = fs.readFileSync("assets/js/main.js", "utf8");
main = main.replace(/^\s*WEB3FORMS_ACCESS_KEY:.*\r?\n/m, "");
main = main.replace(/^\s*SEND_EMAIL_COPY:.*\r?\n/m, "");
main = removeFunction(main, "leadToReadableText");
fs.writeFileSync("assets/js/main.js", main);

let primary = fs.readFileSync("tools/validate-primary-lead-route.mjs", "utf8");
primary = primary.replace(/^requireFragment\(main, 'WEB3FORMS_ACCESS_KEY: ""', MAIN_PATH\);\r?\n/m, "");
primary = primary.replace(/^requireFragment\(main, "SEND_EMAIL_COPY: false", MAIN_PATH\);\r?\n/m, "");
primary = replaceRequired(
  primary,
  '  "api.web3forms.com",\n',
  '  "WEB3FORMS_ACCESS_KEY",\n  "SEND_EMAIL_COPY",\n  "leadToReadableText",\n  "api.web3forms.com",\n',
  "primary forbidden list"
);
fs.writeFileSync("tools/validate-primary-lead-route.mjs", primary);

let integrity = fs.readFileSync("tools/validate-lead-submit-integrity.mjs", "utf8");
integrity = integrity.replace(/^\s*'WEB3FORMS_ACCESS_KEY: ""',\r?\n/m, "");
integrity = integrity.replace(/^\s*"SEND_EMAIL_COPY: false",\r?\n/m, "");
integrity = replaceRequired(
  integrity,
  '  "api.web3forms.com",\n',
  '  "WEB3FORMS_ACCESS_KEY",\n  "SEND_EMAIL_COPY",\n  "leadToReadableText",\n  "api.web3forms.com",\n',
  "integrity forbidden list"
);
fs.writeFileSync("tools/validate-lead-submit-integrity.mjs", integrity);

let offline = fs.readFileSync("tools/validate-offline-draft-privacy.mjs", "utf8");
offline = offline.replace(
  'if (!main.includes(\'WEB3FORMS_ACCESS_KEY: ""\')) errors.push("browser Web3Forms key must be empty");\nif (!main.includes("SEND_EMAIL_COPY: false")) errors.push("browser email copy must be disabled");\n',
  'if (main.includes("WEB3FORMS_ACCESS_KEY")) errors.push("browser Web3Forms key setting must be absent");\nif (main.includes("SEND_EMAIL_COPY")) errors.push("browser email copy setting must be absent");\nif (main.includes("leadToReadableText")) errors.push("legacy readable email formatter must be absent");\n'
);
fs.writeFileSync("tools/validate-offline-draft-privacy.mjs", offline);

const packagePath = "package.json";
const pkg = JSON.parse(fs.readFileSync(packagePath, "utf8"));
pkg.scripts ||= {};
pkg.scripts["validate:no-legacy-email-remnants"] = "node --check tools/validate-no-legacy-email-remnants.mjs && node tools/validate-no-legacy-email-remnants.mjs";
if (!String(pkg.scripts.validate || "").includes("validate-no-legacy-email-remnants.mjs")) {
  pkg.scripts.validate = `${pkg.scripts.validate} && node tools/validate-no-legacy-email-remnants.mjs`;
}
fs.writeFileSync(packagePath, `${JSON.stringify(pkg, null, 2)}\n`);

console.log("Removed legacy browser email remnants.");
