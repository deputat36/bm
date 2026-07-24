import fs from "node:fs";

const ENDPOINT = "https://ofewxuqfjhamgerwzull.supabase.co/functions/v1/newbuild-lead";

function replaceOnce(source, pattern, replacement, label) {
  const matches = typeof pattern === "string" ? source.split(pattern).length - 1 : [...source.matchAll(new RegExp(pattern.source, pattern.flags.includes("g") ? pattern.flags : `${pattern.flags}g`))].length;
  if (matches !== 1) throw new Error(`${label}: expected one match, found ${matches}`);
  return source.replace(pattern, replacement);
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
main = replaceOnce(main, /^\s*WEB3FORMS_ACCESS_KEY:.*$/m, '  WEB3FORMS_ACCESS_KEY: "",', "Web3Forms key");
main = replaceOnce(main, /LEAD_ENDPOINT:\s*"[^"]*",/, `LEAD_ENDPOINT: "${ENDPOINT}",`, "lead endpoint");
main = replaceOnce(main, /SEND_EMAIL_COPY:\s*(?:true|false),/, "SEND_EMAIL_COPY: false,", "email copy flag");
main = main.replace(/^const DRAFT_STORAGE_KEY = .*\r?\n/m, "");

const transportStart = main.indexOf("async function sendWeb3FormsLead");
const transportEnd = main.indexOf("function addHiddenField", transportStart);
if (transportStart < 0 || transportEnd < 0) throw new Error("Legacy transport block not found");
const primaryTransport = `async function sendCustomLead(data) {\n  const response = await fetch(SITE_CONFIG.LEAD_ENDPOINT, {\n    method: "POST",\n    headers: { "Content-Type": "application/json" },\n    body: JSON.stringify(data)\n  });\n\n  const result = await response.json().catch(() => ({}));\n  if (!response.ok || result.success === false) {\n    throw new Error(result.error || "Lead endpoint error");\n  }\n  return result;\n}\n\nasync function sendLead(data) {\n  if (data.spam_check?.likely_bot) {\n    return { blocked: true };\n  }\n\n  if (!SITE_CONFIG.LEAD_ENDPOINT) throw new Error("Lead endpoint unavailable");\n  return sendCustomLead(data);\n}\n\n`;
main = main.slice(0, transportStart) + primaryTransport + main.slice(transportEnd);
fs.writeFileSync("assets/js/main.js", main);

let schema = fs.readFileSync("assets/js/schema.js", "utf8");
schema = removeFunction(schema, "enableOfflineDraftPrivacy");
schema = schema.replace(/^enableOfflineDraftPrivacy\(\);\r?\n/m, "");
fs.writeFileSync("assets/js/schema.js", schema);

let privacy = fs.readFileSync("privacy/index.html", "utf8");
privacy = replaceOnce(
  privacy,
  "<li>Только после основной записи может быть создана резервная копия обращения на служебной электронной почте через отдельный сервис обработки форм.</li>",
  "<li>После основной записи сервер может отправить служебное уведомление в настроенный внутренний канал. Сбой уведомления не отменяет основную запись и не должен приводить к повторной отправке формы.</li>",
  "privacy notification description"
);
fs.writeFileSync("privacy/index.html", privacy);

const integrityValidator = `import fs from "node:fs";\n\nconst MAIN_PATH = "assets/js/main.js";\nconst ENDPOINT = "${ENDPOINT}";\nconst source = fs.readFileSync(MAIN_PATH, "utf8");\nconst errors = [];\n\nfunction requireFragment(fragment) {\n  if (!source.includes(fragment)) errors.push(\`\${MAIN_PATH}: missing \${fragment}\`);\n}\n\nfunction forbidFragment(fragment) {\n  if (source.includes(fragment)) errors.push(\`\${MAIN_PATH}: forbidden \${fragment}\`);\n}\n\n[\n  "function safeStorageGet(key, fallback = \\\"\\\")",\n  "function safeStorageSet(key, value)",\n  "return localStorage.getItem(key) ?? fallback;",\n  "localStorage.setItem(key, value);",\n  \`LEAD_ENDPOINT: "\${ENDPOINT}"\`,\n  'WEB3FORMS_ACCESS_KEY: ""',\n  "SEND_EMAIL_COPY: false",\n  "async function sendCustomLead(data)",\n  "const result = await response.json().catch(() => ({}));",\n  "if (!response.ok || result.success === false)",\n  'if (!SITE_CONFIG.LEAD_ENDPOINT) throw new Error("Lead endpoint unavailable")',\n  "return sendCustomLead(data);",\n  'if (form.dataset.submitting === "true") return;',\n  'form.dataset.submitting = "true";',\n  'form.setAttribute("aria-busy", "true");',\n  "delete form.dataset.submitting;",\n  'form.removeAttribute("aria-busy");'\n].forEach(requireFragment);\n\n[\n  "api.web3forms.com",\n  "sendWeb3FormsLead",\n  "Promise.allSettled",\n  "DRAFT_STORAGE_KEY",\n  "newbuildsBorisoglebskLeadsDraft",\n  "saved.push(data)",\n  "All lead destinations failed"\n].forEach(forbidFragment);\n\nif ((source.match(/localStorage\\.getItem\\(/g) || []).length !== 1) errors.push(\`\${MAIN_PATH}: direct localStorage.getItem must exist only in safeStorageGet\`);\nif ((source.match(/localStorage\\.setItem\\(/g) || []).length !== 1) errors.push(\`\${MAIN_PATH}: direct localStorage.setItem must exist only in safeStorageSet\`);\n\nconst submitStart = source.indexOf('form.addEventListener("submit", async (event) => {');\nconst submitEnd = source.indexOf("  });\\n}", submitStart);\nif (submitStart < 0 || submitEnd < 0) {\n  errors.push(\`\${MAIN_PATH}: submit handler not found\`);\n} else {\n  const handler = source.slice(submitStart, submitEnd);\n  const order = [\n    "event.preventDefault();",\n    'if (form.dataset.submitting === "true") return;',\n    "if (!form.checkValidity())",\n    'form.dataset.submitting = "true";',\n    "const data = collectFormData(form);",\n    "const result = await sendLead(data);",\n    "trackLeadEvent(data, result);",\n    "if (result.blocked)",\n    "saveLastLead(data);"\n  ];\n  let previous = -1;\n  for (const fragment of order) {\n    const index = handler.indexOf(fragment);\n    if (index < 0 || index <= previous) errors.push(\`\${MAIN_PATH}: invalid submit order at \${fragment}\`);\n    previous = index;\n  }\n}\n\nconsole.log("Primary server route is mandatory");\nconsole.log("Browser email fallback is disabled");\nconsole.log("Browser PII draft storage is disabled");\nif (errors.length) {\n  console.error("\\nLead submit integrity validation errors:");\n  errors.forEach((error) => console.error(\`- \${error}\`));\n  process.exit(1);\n}\nconsole.log("Lead submit integrity validation passed.");\n`;
fs.writeFileSync("tools/validate-lead-submit-integrity.mjs", integrityValidator);

const offlineValidator = `import fs from "node:fs";\n\nconst main = fs.readFileSync("assets/js/main.js", "utf8");\nconst schema = fs.readFileSync("assets/js/schema.js", "utf8");\nconst errors = [];\n\n[\n  "newbuildsBorisoglebskLeadsDraft",\n  "newbuildsBorisoglebskOfflineReceipts",\n  "DRAFT_STORAGE_KEY",\n  "saved.push(data)",\n  "enableOfflineDraftPrivacy",\n  "sendLeadWithPrivateFallback"\n].forEach((fragment) => {\n  if (main.includes(fragment) || schema.includes(fragment)) errors.push(\`legacy browser draft artifact remains: \${fragment}\`);\n});\n\nconst saveStart = main.indexOf("function saveLastLead(data)");\nconst trackStart = main.indexOf("function trackLeadEvent", saveStart);\nif (saveStart < 0 || trackStart < 0) {\n  errors.push("saveLastLead block not found");\n} else {\n  const block = main.slice(saveStart, trackStart);\n  ["name:", "phone:", "phone_normalized:", "email:", "budget:", "comment:", "question:", "tracking:"].forEach((field) => {\n    if (block.includes(field)) errors.push(\`personal field stored in last lead receipt: \${field}\`);\n  });\n  ["client_fixation_id:", "lead_type:", "form_id:", "project_id:", "residential_complex_id:", "created_at:"].forEach((field) => {\n    if (!block.includes(field)) errors.push(\`technical receipt field missing: \${field}\`);\n  });\n}\n\nif (!main.includes('WEB3FORMS_ACCESS_KEY: ""')) errors.push("browser Web3Forms key must be empty");\nif (!main.includes("SEND_EMAIL_COPY: false")) errors.push("browser email copy must be disabled");\nif (!main.includes("return sendCustomLead(data);")) errors.push("primary server route is missing");\n\nif (errors.length) {\n  console.error("Offline privacy validation errors:");\n  errors.forEach((error) => console.error(\`- \${error}\`));\n  process.exit(1);\n}\nconsole.log("Offline privacy validated: no browser PII drafts or direct email transport.");\n`;
fs.writeFileSync("tools/validate-offline-draft-privacy.mjs", offlineValidator);

const packagePath = "package.json";
const pkg = JSON.parse(fs.readFileSync(packagePath, "utf8"));
pkg.scripts ||= {};
pkg.scripts["validate:primary-lead-route"] = "node --check tools/validate-primary-lead-route.mjs && node tools/validate-primary-lead-route.mjs";
if (!String(pkg.scripts.validate || "").includes("validate-primary-lead-route.mjs")) {
  pkg.scripts.validate = `${pkg.scripts.validate} && node tools/validate-primary-lead-route.mjs`;
}
fs.writeFileSync(packagePath, `${JSON.stringify(pkg, null, 2)}\n`);

console.log("Primary lead route applied.");
