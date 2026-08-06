import fs from "node:fs";

const file = "tools/run-form-browser-qa.mjs";
let source = fs.readFileSync(file, "utf8");

function replaceRequired(before, after, label) {
  if (!source.includes(before)) throw new Error(`Missing patch target: ${label}`);
  source = source.replace(before, after);
}

replaceRequired(
`    const form = Array.from(document.querySelectorAll("form[data-lead-form]")).find((item) => item.dataset.formId === formId);
    return Boolean(
      form
      && form.dataset.jsReady === "true"
      && window.__NEWBUILD_LEAD_TEST_MODE__ === true
      && window.__NEWBUILD_ANALYTICS_DEBUG_MODE__ === true
      && typeof window.getPortalAnalyticsDebugEvents === "function"
    );`,
`    const form = Array.from(document.querySelectorAll("form[data-lead-form]")).find((item) => item.dataset.formId === formId);
    const phone = form?.querySelector("input[name='phone']");
    return Boolean(
      form
      && form.dataset.jsReady === "true"
      && form.dataset.accessibilityEnhanced === "true"
      && phone instanceof HTMLInputElement
      && phone.getAttribute("pattern")
      && phone.maxLength === 24
      && window.__NEWBUILD_LEAD_TEST_MODE__ === true
      && window.__NEWBUILD_ANALYTICS_DEBUG_MODE__ === true
      && typeof window.getPortalAnalyticsDebugEvents === "function"
    );`,
"accessibility readiness"
);

replaceRequired(
`  const metadata = await phone.evaluate((input) => ({
    inputmode: input.getAttribute("inputmode") || "",
    autocomplete: input.getAttribute("autocomplete") || "",
    maxlength: input.maxLength
  }));`,
`  const metadata = await phone.evaluate((input) => ({
    inputmode: input.getAttribute("inputmode") || "",
    autocomplete: input.getAttribute("autocomplete") || "",
    maxlength: input.maxLength,
    pattern: input.getAttribute("pattern") || "",
    accessibility_enhanced: input.closest("form")?.dataset.accessibilityEnhanced === "true"
  }));`,
"phone metadata"
);

replaceRequired(
`  assertCondition(metadata.inputmode === "tel", \`${scenario.id}: inputmode=tel is required\`);`,
`  assertCondition(metadata.accessibility_enhanced === true, \`${scenario.id}: accessibility layer is not ready\`);
  assertCondition(Boolean(metadata.pattern), \`${scenario.id}: phone pattern is missing\`);
  assertCondition(metadata.maxlength === 24, \`${scenario.id}: phone maxlength must be 24\`);
  assertCondition(metadata.inputmode === "tel", \`${scenario.id}: inputmode=tel is required\`);`,
"phone readiness assertions"
);

fs.writeFileSync(file, source, "utf8");
console.log("Browser QA now waits for the asynchronous accessibility layer.");
