import fs from "node:fs";

const FILES = [
  "assets/js/main.js",
  "assets/js/schema.js",
  "assets/js/mobile-lead-bar.js"
];
const ENDPOINT = "https://ofewxuqfjhamgerwzull.supabase.co/functions/v1/newbuild-lead";
const forbidden = [
  "WEB3FORMS_ACCESS_KEY",
  "SEND_EMAIL_COPY",
  "leadToReadableText",
  "sendWeb3FormsLead",
  "api.web3forms.com",
  "fields_json:",
  "Promise.allSettled",
  "newbuildsBorisoglebskLeadsDraft",
  "newbuildsBorisoglebskOfflineReceipts"
];
const errors = [];

const sources = Object.fromEntries(FILES.map((file) => [file, fs.readFileSync(file, "utf8")]));

for (const [file, source] of Object.entries(sources)) {
  for (const fragment of forbidden) {
    if (source.includes(fragment)) errors.push(`${file}: найден старый фрагмент ${fragment}`);
  }
}

const main = sources["assets/js/main.js"];
if (!main.includes(`LEAD_ENDPOINT: "${ENDPOINT}"`)) errors.push("main.js: отсутствует основной серверный endpoint");
if (!main.includes("return sendCustomLead(data);")) errors.push("main.js: основной серверный маршрут не является единственным");
if (!main.includes("body: JSON.stringify(data)")) errors.push("main.js: отсутствует JSON payload основного маршрута");

console.log("Checked legacy email remnants in active browser scripts.");

if (errors.length) {
  console.error("\nLegacy email remnant validation errors:");
  errors.forEach((error) => console.error(`- ${error}`));
  process.exit(1);
}

console.log("Legacy email remnant validation passed.");
