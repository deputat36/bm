import fs from "node:fs";
import path from "node:path";

const ROOT = process.cwd();
const MAIN_PATH = "assets/js/main.js";
const EVENTS_PATH = "data/analytics/events.json";
const errors = [];

function read(relativePath) {
  const fullPath = path.join(ROOT, relativePath);
  if (!fs.existsSync(fullPath)) {
    errors.push(`${relativePath}: file does not exist`);
    return "";
  }
  return fs.readFileSync(fullPath, "utf8");
}

function readJson(relativePath) {
  const content = read(relativePath);
  if (!content) return null;
  try {
    return JSON.parse(content);
  } catch (error) {
    errors.push(`${relativePath}: invalid JSON: ${error.message}`);
    return null;
  }
}

function requireFragment(source, fragment, label = fragment) {
  if (!source.includes(fragment)) errors.push(`${MAIN_PATH}: missing ${label}`);
}

const source = read(MAIN_PATH);
const registry = readJson(EVENTS_PATH);
if (!source || !registry) process.exit(1);

const event = (registry.events || []).find((item) => item.id === "lead_submit");
if (!event) {
  errors.push(`${EVENTS_PATH}: lead_submit is missing`);
} else {
  if (event.metric_role !== "canonical_conversion") errors.push(`${EVENTS_PATH}: lead_submit must remain canonical_conversion`);
  if (event.count_filter !== "blocked=false") errors.push(`${EVENTS_PATH}: lead_submit filter must be blocked=false`);
  ["blocked", "offline"].forEach((field) => {
    if (!(event.required_fields || []).includes(field)) errors.push(`${EVENTS_PATH}: lead_submit required_fields missing ${field}`);
  });
}

const trackStart = source.indexOf("function trackLeadEvent(data, result = {})");
const trackEnd = source.indexOf("\nfunction buildThankYouUrl", trackStart);
if (trackStart < 0 || trackEnd < 0) {
  errors.push(`${MAIN_PATH}: trackLeadEvent block not found`);
} else {
  const block = source.slice(trackStart, trackEnd);
  [
    'event: "lead_submit"',
    "blocked: Boolean(result.blocked)",
    "offline: Boolean(result.offline)",
    "window.dataLayer.push(eventPayload)",
    'window.gtag("event", "lead_submit"',
    'window.ym(counterId, "reachGoal", "lead_submit", eventPayload)',
    'new CustomEvent("newbuildLeadSubmit", { detail: eventPayload })'
  ].forEach((fragment) => requireFragment(block, fragment));

  const gtagStart = block.indexOf('window.gtag("event", "lead_submit", {');
  const gtagEnd = block.indexOf("    });", gtagStart);
  if (gtagStart < 0 || gtagEnd < 0) {
    errors.push(`${MAIN_PATH}: direct gtag lead_submit parameters not found`);
  } else {
    const gtagBlock = block.slice(gtagStart, gtagEnd);
    [
      "form_id: data.form_id",
      "residential_complex_id: data.residential_complex_id",
      "qualification_status: data.qualification?.status",
      "lead_source: data.lead_source",
      "placement: data.placement",
      "blocked: Boolean(result.blocked)",
      "offline: Boolean(result.offline)"
    ].forEach((fragment) => {
      if (!gtagBlock.includes(fragment)) errors.push(`${MAIN_PATH}: gtag lead_submit missing ${fragment}`);
    });

    [
      "name:",
      "phone:",
      "phone_normalized:",
      "email:",
      "budget:",
      "comment:",
      "question:",
      "consent_text:",
      "user_agent:",
      "client_fixation_id:"
    ].forEach((fragment) => {
      if (gtagBlock.includes(fragment)) errors.push(`${MAIN_PATH}: gtag lead_submit contains forbidden field ${fragment}`);
    });
  }
}

console.log("Checked analytics channels: dataLayer, gtag, Yandex Metrica");
console.log("Checked canonical filters: blocked and offline");
console.log("Checked direct gtag privacy: no personal or restricted fields");

if (errors.length) {
  console.error("\nAnalytics delivery consistency errors:");
  errors.forEach((error) => console.error(`- ${error}`));
  process.exit(1);
}

console.log("Analytics delivery consistency validation passed.");
