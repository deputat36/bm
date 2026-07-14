import fs from "node:fs";
import path from "node:path";

const ROOT = process.cwd();
const pagePath = path.join(ROOT, "spasibo/index.html");
const errors = [];

if (!fs.existsSync(pagePath)) {
  console.error("spasibo/index.html: file does not exist");
  process.exit(1);
}

const html = fs.readFileSync(pagePath, "utf8");
const requiredFragments = [
  'id="lead-form"',
  'id="object-return-link"',
  "data-postsubmit-action",
  "lastLead.client_fixation_id === queryId",
  "objectMap[lastLead.residential_complex_id]",
  "referrerUrl.origin !== window.location.origin",
  'event: "lead_thankyou_view"',
  'event: "lead_postsubmit_action"',
  "attribution_source",
  "if (isDryRun) return;"
];

requiredFragments.forEach((fragment) => {
  if (!html.includes(fragment)) {
    errors.push(`spasibo/index.html: missing attribution fragment ${fragment}`);
  }
});

["prostornaya-4a", "aerodromnaya-18g", "sennaya-76", "all-newbuilds"].forEach((objectId) => {
  if (!html.includes(`"${objectId}"`)) {
    errors.push(`spasibo/index.html: missing allowed object ${objectId}`);
  }
});

if (html.includes('params.get("object")')) {
  errors.push("spasibo/index.html: object must not be rendered directly from a query parameter");
}

if (html.includes("lastLead.residential_complex ||")) {
  errors.push("spasibo/index.html: object name must not be taken from unmatched localStorage data");
}

const thankYouEventStart = html.indexOf('event: "lead_thankyou_view"');
const thankYouEventEnd = thankYouEventStart >= 0 ? html.indexOf("if (typeof window.gtag", thankYouEventStart) : -1;
const thankYouEventBlock = thankYouEventStart >= 0 && thankYouEventEnd > thankYouEventStart
  ? html.slice(thankYouEventStart, thankYouEventEnd)
  : "";

if (!thankYouEventBlock) {
  errors.push("spasibo/index.html: lead_thankyou_view event block not found");
} else if (thankYouEventBlock.includes("client_fixation_id")) {
  errors.push("spasibo/index.html: thank-you analytics must not include client_fixation_id");
}

const inlineScripts = Array.from(html.matchAll(/<script>([\s\S]*?)<\/script>/gi));
if (!inlineScripts.length) {
  errors.push("spasibo/index.html: inline thank-you script not found");
} else {
  inlineScripts.forEach((match, index) => {
    try {
      new Function(match[1]);
    } catch (error) {
      errors.push(`spasibo/index.html: inline script ${index + 1} has invalid syntax: ${error.message}`);
    }
  });
}

console.log("Checked thank-you attribution and post-submit analytics.");

if (errors.length) {
  console.error("\nThank-you attribution validation errors:");
  errors.forEach((error) => console.error(`- ${error}`));
  process.exit(1);
}

console.log("Thank-you attribution validation passed.");
