import fs from "node:fs";
import path from "node:path";

const ROOT = process.cwd();
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
  const source = read(relativePath);
  if (!source) return null;
  try {
    return JSON.parse(source);
  } catch (error) {
    errors.push(`${relativePath}: invalid JSON: ${error.message}`);
    return null;
  }
}

function count(source, fragment) {
  return source.split(fragment).length - 1;
}

function extractSection(html, marker) {
  const markerIndex = html.indexOf(marker);
  if (markerIndex < 0) return "";
  const start = html.lastIndexOf("<section", markerIndex);
  const end = html.indexOf("</section>", markerIndex);
  return start >= 0 && end >= 0 ? html.slice(start, end + "</section>".length) : "";
}

const PAGE_PATH = "catalog/index.html";
const HOME_PATH = "index.html";
const RUNTIME_PATH = "assets/js/catalog-rule-quiz.js";
const MAIN_PATH = "assets/js/main.js";
const QA_PATH = "data/qa/catalog-rule-quiz.json";
const FORM_QA_PATH = "data/qa/form-scenarios.json";

const html = read(PAGE_PATH);
const homepage = read(HOME_PATH);
const runtime = read(RUNTIME_PATH);
const mainRuntime = read(MAIN_PATH);
const qa = readJson(QA_PATH);
const formQa = readJson(FORM_QA_PATH);
const quizSection = extractSection(html, "data-catalog-rule-quiz");

if (!quizSection) errors.push(`${PAGE_PATH}: rule-based quiz section not found`);
if (!qa || !Array.isArray(qa.steps) || qa.steps.length !== 5) {
  errors.push(`${QA_PATH}: expected exactly 5 steps`);
}
if (qa?.rules?.maximum_steps !== 5) errors.push(`${QA_PATH}: maximum_steps must be 5`);
if (qa?.rules?.contact_requested_after_result !== true) {
  errors.push(`${QA_PATH}: contact_requested_after_result must be true`);
}
for (const rule of [
  "new_form_forbidden",
  "query_parameters_forbidden",
  "browser_storage_forbidden",
  "specific_object_recommendation_forbidden",
  "availability_promise_forbidden"
]) {
  if (qa?.rules?.[rule] !== true) errors.push(`${QA_PATH}: ${rule} must be true`);
}
if (qa?.target_form_id !== "catalog_quick_selection") {
  errors.push(`${QA_PATH}: target_form_id must be catalog_quick_selection`);
}
if (qa?.expected_active_form_count !== 14) {
  errors.push(`${QA_PATH}: expected_active_form_count must remain 14`);
}

const scenarios = Array.isArray(formQa?.scenarios) ? formQa.scenarios : [];
const activeFormIds = new Set(scenarios.map((scenario) => scenario?.form_id).filter(Boolean));
if (scenarios.length !== 14 || activeFormIds.size !== 14) {
  errors.push(`${FORM_QA_PATH}: expected 14 unique active forms`);
}
if (!activeFormIds.has("catalog_quick_selection")) {
  errors.push(`${FORM_QA_PATH}: catalog_quick_selection scenario missing`);
}
if (count(html, "<form ") !== 2) errors.push(`${PAGE_PATH}: catalog must keep exactly 2 forms`);
if (quizSection.includes("<form")) errors.push(`${PAGE_PATH}: quiz must not create a form`);

for (const forbiddenContact of [
  'name="name"',
  'name="phone"',
  'name="email"',
  'autocomplete="name"',
  'autocomplete="tel"',
  'inputmode="tel"'
]) {
  if (quizSection.includes(forbiddenContact)) {
    errors.push(`${PAGE_PATH}: quiz must not request contact before result: ${forbiddenContact}`);
  }
}

const stepIds = (qa?.steps || []).map((step) => step.id);
if (new Set(stepIds).size !== 5) errors.push(`${QA_PATH}: step ids must be unique`);
for (const step of qa?.steps || []) {
  if (count(quizSection, `data-quiz-step="${step.id}"`) !== 1) {
    errors.push(`${PAGE_PATH}: expected one quiz step ${step.id}`);
  }
  for (const option of step.options || []) {
    if (!quizSection.includes(`value="${option}"`)) {
      errors.push(`${PAGE_PATH}: step ${step.id} missing option ${option}`);
    }
  }
}
if (count(quizSection, "data-quiz-step=") !== 5) {
  errors.push(`${PAGE_PATH}: quiz must contain exactly 5 steps`);
}
if (count(quizSection, "data-quiz-next") !== 4) {
  errors.push(`${PAGE_PATH}: quiz must contain 4 next buttons`);
}
if (count(quizSection, "data-quiz-back") !== 4) {
  errors.push(`${PAGE_PATH}: quiz must contain 4 back buttons`);
}
for (const marker of [
  "data-quiz-intro",
  "data-quiz-start",
  "data-quiz-progress",
  "data-quiz-status",
  "data-quiz-show-result",
  "data-quiz-result-panel",
  "data-quiz-result-title",
  "data-quiz-result-text",
  "data-quiz-result-reasons",
  "data-quiz-to-form",
  "data-quiz-reset"
]) {
  if (count(quizSection, marker) !== 1) errors.push(`${PAGE_PATH}: expected one ${marker}`);
}

for (const fragment of [
  "Сначала результат — потом контакты",
  "Телефон не нужен для прохождения вопросов",
  "После результата вы решите, оставлять ли заявку специалисту",
  "Результат основан только на ваших ответах",
  "Он не подтверждает наличие квартиры, цену, статус объекта или решение банка"
]) {
  if (!quizSection.includes(fragment)) errors.push(`${PAGE_PATH}: missing safe quiz fragment ${fragment}`);
}

const resultPanelPosition = quizSection.indexOf("data-quiz-result-panel");
const resultCtaPosition = quizSection.indexOf("data-quiz-to-form");
if (resultPanelPosition < 0 || resultCtaPosition < 0 || resultPanelPosition >= resultCtaPosition) {
  errors.push(`${PAGE_PATH}: contact CTA must appear inside the result panel`);
}
if (!quizSection.includes('href="#quick-lead" data-quiz-to-form')) {
  errors.push(`${PAGE_PATH}: result CTA must target existing quick form`);
}

const analytics = Array.isArray(qa?.analytics) ? qa.analytics : [];
if (analytics.length !== 8) errors.push(`${QA_PATH}: expected 8 analytics contracts`);
const analyticsPlacements = new Set();
for (const item of analytics) {
  const actionFragment = `data-track-action="${item.action}"`;
  const placementFragment = `data-track-placement="${item.placement}"`;
  if (!quizSection.includes(actionFragment)) errors.push(`${PAGE_PATH}: missing ${actionFragment}`);
  if (!quizSection.includes(placementFragment)) errors.push(`${PAGE_PATH}: missing ${placementFragment}`);
  if (count(html, placementFragment) !== 1) errors.push(`${PAGE_PATH}: placement must be unique ${item.placement}`);
  if (analyticsPlacements.has(item.placement)) errors.push(`${QA_PATH}: duplicate placement ${item.placement}`);
  analyticsPlacements.add(item.placement);
}

for (const forbidden of [
  "localStorage",
  "sessionStorage",
  "document.cookie",
  "URLSearchParams",
  "fetch(",
  "innerHTML",
  "navigator.userAgent",
  "window.location",
  "XMLHttpRequest"
]) {
  if (runtime.includes(forbidden)) errors.push(`${RUNTIME_PATH}: forbidden state or network access ${forbidden}`);
}
for (const projectName of ["Просторная 4А", "Аэродромная 18Г", "Сенная 76"]) {
  if (runtime.includes(projectName) || quizSection.includes(`Рекомендуем ${projectName}`)) {
    errors.push(`${RUNTIME_PATH}: quiz must not recommend a specific unverified project: ${projectName}`);
  }
}
for (const forbiddenPromise of [
  "гарантированное наличие",
  "квартира в наличии",
  "ипотека одобрена",
  "гарантируем цену",
  "подходит под семейную ипотеку"
]) {
  if (`${runtime}\n${quizSection}`.toLowerCase().includes(forbiddenPromise.toLowerCase())) {
    errors.push(`${PAGE_PATH}: forbidden quiz promise ${forbiddenPromise}`);
  }
}

for (const required of [
  'document.querySelector("[data-catalog-rule-quiz]")',
  'form[data-form-id="catalog_quick_selection"]',
  "steps.length !== 5",
  "chooseRecommendation",
  "prefillContactForm",
  'input.type = "hidden"',
  'input.setAttribute("data-catalog-quiz-field", "")',
  'form.dataset.quizCompleted = "true"',
  'target.scrollIntoView({ behavior: "smooth", block: "start" })',
  "resultTitle.textContent",
  "resultText.textContent",
  "resultReasons.replaceChildren()",
  "latestResult",
  "resetQuiz"
]) {
  if (!runtime.includes(required)) errors.push(`${RUNTIME_PATH}: missing required fragment ${required}`);
}

const handoffFields = Array.isArray(qa?.handoff_fields) ? qa.handoff_fields : [];
if (handoffFields.length !== 11) errors.push(`${QA_PATH}: expected 11 handoff fields`);
for (const field of handoffFields) {
  if (!runtime.includes(`"${field}"`)) errors.push(`${RUNTIME_PATH}: handoff field missing ${field}`);
}
for (const resultKey of qa?.result_keys || []) {
  if (!runtime.includes(`key: "${resultKey}"`)) errors.push(`${RUNTIME_PATH}: result key missing ${resultKey}`);
}

for (const requiredMainFragment of [
  "new FormData(form)",
  "data[key] = String(value).trim()",
  "fields_json: JSON.stringify(data, null, 2)",
  "body: JSON.stringify(data)"
]) {
  if (!mainRuntime.includes(requiredMainFragment)) {
    errors.push(`${MAIN_PATH}: handoff pipeline missing ${requiredMainFragment}`);
  }
}

for (const script of [
  "../assets/js/main.js",
  "../assets/js/project-intent-prefill.js",
  "../assets/js/catalog-rule-quiz.js",
  "../assets/js/catalog-verification-comparison.js",
  "../assets/js/reference-catalog.js",
  "../assets/js/schema.js"
]) {
  if (count(html, `src="${script}"`) !== 1) errors.push(`${PAGE_PATH}: script must load once ${script}`);
}
const scriptOrder = [
  "../assets/js/main.js",
  "../assets/js/project-intent-prefill.js",
  "../assets/js/catalog-rule-quiz.js",
  "../assets/js/catalog-verification-comparison.js",
  "../assets/js/reference-catalog.js",
  "../assets/js/schema.js"
].map((script) => html.indexOf(script));
if (scriptOrder.some((index) => index < 0) || scriptOrder.some((index, position) => position > 0 && index <= scriptOrder[position - 1])) {
  errors.push(`${PAGE_PATH}: script order is invalid`);
}

for (const fragment of [
  'href="catalog/#quiz"',
  'data-track-action="route_selection"',
  'data-track-placement="homepage_route_selection"',
  ">Пройти подбор</a>",
  "Ответьте на пять вопросов, получите предварительный следующий шаг и только потом решите, оставлять ли контакты"
]) {
  if (!homepage.includes(fragment)) errors.push(`${HOME_PATH}: quiz route missing ${fragment}`);
}
if (count(homepage, 'data-track-placement="homepage_route_selection"') !== 1) {
  errors.push(`${HOME_PATH}: homepage quiz route placement must be unique`);
}

console.log(`Quiz steps: ${count(quizSection, "data-quiz-step=")}`);
console.log(`Quiz analytics placements: ${analyticsPlacements.size}`);
console.log(`Handoff fields: ${handoffFields.length}`);
console.log(`Active forms: ${activeFormIds.size}`);
console.log("Contact fields before result: 0");
console.log("New forms: 0");
console.log("Browser storage: 0");
console.log("Specific project recommendations: 0");

if (errors.length) {
  console.error("\nCatalog rule quiz validation errors:");
  errors.forEach((error) => console.error(`- ${error}`));
  process.exit(1);
}

console.log("Catalog rule quiz validation passed.");
