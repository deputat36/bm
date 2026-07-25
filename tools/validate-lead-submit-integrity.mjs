import fs from "node:fs";

const MAIN_PATH = "assets/js/main.js";
const ENDPOINT = "https://ofewxuqfjhamgerwzull.supabase.co/functions/v1/newbuild-lead";
const source = fs.readFileSync(MAIN_PATH, "utf8");
const errors = [];

function requireFragment(fragment) {
  if (!source.includes(fragment)) errors.push(`${MAIN_PATH}: missing ${fragment}`);
}

function forbidFragment(fragment) {
  if (source.includes(fragment)) errors.push(`${MAIN_PATH}: forbidden ${fragment}`);
}

[
  "function safeStorageGet(key, fallback = \"\")",
  "function safeStorageSet(key, value)",
  "return localStorage.getItem(key) ?? fallback;",
  "localStorage.setItem(key, value);",
  `LEAD_ENDPOINT: "${ENDPOINT}"`,
  "async function sendCustomLead(data)",
  "const result = await response.json().catch(() => ({}));",
  "if (!response.ok || result.success === false)",
  'if (!SITE_CONFIG.LEAD_ENDPOINT) throw new Error("Lead endpoint unavailable")',
  "return sendCustomLead(data);",
  'if (form.dataset.submitting === "true") return;',
  'form.dataset.submitting = "true";',
  'form.setAttribute("aria-busy", "true");',
  "delete form.dataset.submitting;",
  'form.removeAttribute("aria-busy");'
].forEach(requireFragment);

[
  "WEB3FORMS_ACCESS_KEY",
  "SEND_EMAIL_COPY",
  "leadToReadableText",
  "api.web3forms.com",
  "sendWeb3FormsLead",
  "Promise.allSettled",
  "DRAFT_STORAGE_KEY",
  "newbuildsBorisoglebskLeadsDraft",
  "saved.push(data)",
  "All lead destinations failed"
].forEach(forbidFragment);

if ((source.match(/localStorage\.getItem\(/g) || []).length !== 1) errors.push(`${MAIN_PATH}: direct localStorage.getItem must exist only in safeStorageGet`);
if ((source.match(/localStorage\.setItem\(/g) || []).length !== 1) errors.push(`${MAIN_PATH}: direct localStorage.setItem must exist only in safeStorageSet`);

const submitStart = source.indexOf('form.addEventListener("submit", async (event) => {');
const submitEnd = source.indexOf("  });\n}", submitStart);
if (submitStart < 0 || submitEnd < 0) {
  errors.push(`${MAIN_PATH}: submit handler not found`);
} else {
  const handler = source.slice(submitStart, submitEnd);
  const order = [
    "event.preventDefault();",
    'if (form.dataset.submitting === "true") return;',
    "if (!form.checkValidity())",
    'form.dataset.submitting = "true";',
    "const data = collectFormData(form);",
    "const result = await sendLead(data);",
    "trackLeadEvent(data, result);",
    "if (result.blocked)",
    "saveLastLead(data);"
  ];
  let previous = -1;
  for (const fragment of order) {
    const index = handler.indexOf(fragment);
    if (index < 0 || index <= previous) errors.push(`${MAIN_PATH}: invalid submit order at ${fragment}`);
    previous = index;
  }
}

console.log("Primary server route is mandatory");
console.log("Browser email fallback is disabled");
console.log("Browser PII draft storage is disabled");
if (errors.length) {
  console.error("\nLead submit integrity validation errors:");
  errors.forEach((error) => console.error(`- ${error}`));
  process.exit(1);
}
console.log("Lead submit integrity validation passed.");
