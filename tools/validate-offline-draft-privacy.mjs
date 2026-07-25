import fs from "node:fs";

const main = fs.readFileSync("assets/js/main.js", "utf8");
const schema = fs.readFileSync("assets/js/schema.js", "utf8");
const errors = [];

[
  "newbuildsBorisoglebskLeadsDraft",
  "newbuildsBorisoglebskOfflineReceipts",
  "DRAFT_STORAGE_KEY",
  "saved.push(data)",
  "enableOfflineDraftPrivacy",
  "sendLeadWithPrivateFallback"
].forEach((fragment) => {
  if (main.includes(fragment) || schema.includes(fragment)) errors.push(`legacy browser draft artifact remains: ${fragment}`);
});

const saveStart = main.indexOf("function saveLastLead(data)");
const trackStart = main.indexOf("function trackLeadEvent", saveStart);
if (saveStart < 0 || trackStart < 0) {
  errors.push("saveLastLead block not found");
} else {
  const block = main.slice(saveStart, trackStart);
  ["name", "phone", "phone_normalized", "email", "budget", "comment", "question", "tracking"].forEach((field) => {
    const pattern = new RegExp(`(?:^|\\n)\\s{4}${field}:`);
    if (pattern.test(block)) errors.push(`personal field stored in last lead receipt: ${field}`);
  });
  ["client_fixation_id", "lead_type", "form_id", "project_id", "residential_complex_id", "created_at"].forEach((field) => {
    const pattern = new RegExp(`(?:^|\\n)\\s{4}${field}:`);
    if (!pattern.test(block)) errors.push(`technical receipt field missing: ${field}`);
  });
}

if (main.includes("WEB3FORMS_ACCESS_KEY")) errors.push("browser Web3Forms key setting must be absent");
if (main.includes("SEND_EMAIL_COPY")) errors.push("browser email copy setting must be absent");
if (main.includes("leadToReadableText")) errors.push("legacy readable email formatter must be absent");
if (!main.includes("return sendCustomLead(data);")) errors.push("primary server route is missing");

if (errors.length) {
  console.error("Offline privacy validation errors:");
  errors.forEach((error) => console.error(`- ${error}`));
  process.exit(1);
}
console.log("Offline privacy validated: no browser PII drafts or direct email transport.");
