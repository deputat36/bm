import fs from "node:fs";
import vm from "node:vm";
import assert from "node:assert/strict";

// Execute actual production collectFormData and conversion placement resolver.
// No DOM, network, personal data or real lead submission.
const mainRuntime = fs.readFileSync("assets/js/main.js", "utf8");
const conversionRuntime = fs.readFileSync("assets/js/conversion-tracking.js", "utf8");

function extractFunction(source, startText, endText) {
  const start = source.indexOf(startText);
  const end = source.indexOf(endText, start + startText.length);
  assert(start >= 0 && end > start, `Missing production function: ${startText}`);
  return source.slice(start, end);
}

const normalizePlacementSource = extractFunction(
  conversionRuntime,
  "  function normalizePlacement(value) {",
  "  function sanitizeTrackingValue(key, rawValue) {"
);
const getFormPlacementSource = extractFunction(
  conversionRuntime,
  "  function getFormPlacement(form, data = {}) {",
  "  function getFormDetails(form, data = {}) {"
);
const productionPlacement = vm.runInNewContext(
  normalizePlacementSource + "\n" + getFormPlacementSource + "\ngetFormPlacement",
  {}
);
assert.equal(typeof productionPlacement, "function");

class InertFormData {
  constructor(form) { this.values = form.testValues || {}; }
  forEach(callback) { Object.entries(this.values).forEach(([key, value]) => callback(value, key)); }
}

function collect({ page = "/catalog/", query = "", fields = {}, formPlacement = "", formId = "catalog_quick_selection", savedPlacement = "" }) {
  const store = new Map();
  if (savedPlacement) {
    // Persisted navigation touch may predate the last click but must remain intact as attribution.
    const entry = {
      current: { placement: savedPlacement },
      first_touch: { page_url: "https://novostroyki-borisoglebsk.ru/", values: { placement: savedPlacement } },
      last_touch: { page_url: "https://novostroyki-borisoglebsk.ru/", values: { placement: savedPlacement } }
    };
    store.set("newbuildsBorisoglebskTracking", JSON.stringify(entry));
  }
  const url = new URL(`https://novostroyki-borisoglebsk.ru${page}${query}`);
  const form = {
    dataset: {
      formId, leadType: "portal_selection", projectId: "newbuilds-borisoglebsk",
      projectName: "Новостройки Борисоглебска",
      complex: "Общий подбор новостройки", placement: formPlacement,
      startedAt: String(Date.now() - 6000)
    },
    testValues: {
      phone: "+7 903 123-45-67",
      residential_complex: "Общий подбор новостройки",
      ...fields
    },
    querySelector() { return null; },
    closest() { return null; }
  };
  const context = {
    URL,
    URLSearchParams,
    FormData: InertFormData,
    localStorage: {
      getItem(key) { return store.get(key) ?? null; },
      setItem(key, value) { store.set(key, value); }
    },
    window: { location: url },
    document: {
      title: "Каталог новостроек",
      referrer: "",
      querySelectorAll() { return []; }
    }
  };
  vm.runInNewContext(mainRuntime + "\nthis.__collectFormData = collectFormData;", context, {
    filename: "assets/js/main.js",
    timeout: 5000
  });
  const data = context.__collectFormData(form);
  const analyticsPlacement = productionPlacement(form, data);
  return { data, analyticsPlacement, form };
}

const inboundAndCta = collect({
  query: "?utm_source=vk&lead_source=internal_content&placement=guide_documents",
  formPlacement: "catalog_hero"
});
assert.equal(inboundAndCta.data.placement, "catalog_hero", "Clicked CTA must override inbound URL placement");
assert.equal(inboundAndCta.analyticsPlacement, "catalog_hero", "Analytics must match the lead payload");
assert.equal(inboundAndCta.data.tracking.current.placement, "guide_documents", "Inbound placement must remain in separate attribution");
assert.equal(inboundAndCta.data.tracking.current.utm_source, "vk");
assert.equal(inboundAndCta.data.lead_source, "internal_content");

const explicitQuiz = collect({
  query: "?placement=referrer_card",
  formPlacement: "catalog_quiz_to_form",
  fields: { placement: "catalog_rule_quiz_result" }
});
assert.equal(explicitQuiz.data.placement, "catalog_rule_quiz_result", "Explicit quiz placement must remain authoritative");
assert.equal(explicitQuiz.analyticsPlacement, explicitQuiz.data.placement);
assert.equal(explicitQuiz.data.tracking.current.placement, "referrer_card");

const inboundOnly = collect({ query: "?placement=mortgage_guide", formPlacement: "" });
assert.equal(inboundOnly.data.placement, "mortgage_guide", "Inbound parameter still works without CTA context");
assert.equal(inboundOnly.analyticsPlacement, "mortgage_guide");

const persistedAndCta = collect({ savedPlacement: "old_retargeting", formPlacement: "contacts_footer" });
assert.equal(persistedAndCta.data.placement, "contacts_footer", "Actual CTA must override prior session placement");
assert.equal(persistedAndCta.data.tracking.current.placement, "old_retargeting");

const simpleDirect = collect({});
assert.equal(simpleDirect.data.placement, "", "Absent tracking must not create fabricated payload value");
assert.ok(["quick-lead", "form_catalog_quick_selection", "lead_form"].includes(simpleDirect.analyticsPlacement));

const sanitized = collect({
  query: "?placement=referrer_card&realtor=partner",
  formPlacement: "hero cta"
});
assert.equal(sanitized.data.placement, "hero cta");
assert.equal(sanitized.analyticsPlacement, "hero_cta", "Analytics normalizes the CTA label");

console.log("CTA placement precedence passed: 6 real collectFormData + analytics resolution cases, no lead POSTs.");
