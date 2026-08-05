function createJsonLdScript(data) {
  const script = document.createElement("script");
  script.type = "application/ld+json";
  script.textContent = JSON.stringify(data);
  document.head.appendChild(script);
}

function buildBreadcrumbList() {
  const breadcrumbs = document.querySelector(".breadcrumbs");
  if (!breadcrumbs) return null;

  const items = [];
  const links = Array.from(breadcrumbs.querySelectorAll("a"));

  links.forEach((link, index) => {
    items.push({
      "@type": "ListItem",
      position: index + 1,
      name: link.textContent.trim(),
      item: new URL(link.getAttribute("href"), window.location.href).href
    });
  });

  const textParts = breadcrumbs.textContent
    .split("/")
    .map((part) => part.trim())
    .filter(Boolean);
  const lastText = textParts[textParts.length - 1];

  if (lastText && (!items.length || items[items.length - 1].name !== lastText)) {
    items.push({
      "@type": "ListItem",
      position: items.length + 1,
      name: lastText,
      item: window.location.href
    });
  }

  if (items.length < 2) return null;

  return {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: items
  };
}

function buildResidenceSchema() {
  const project = document.body.dataset.schemaProject;
  if (!project) return null;

  return {
    "@context": "https://schema.org",
    "@type": "Residence",
    name: document.body.dataset.schemaProjectName || project,
    url: window.location.href,
    address: {
      "@type": "PostalAddress",
      streetAddress: document.body.dataset.schemaAddress || "",
      addressLocality: document.body.dataset.schemaCity || "Борисоглебск",
      addressRegion: document.body.dataset.schemaRegion || "Воронежская область",
      addressCountry: "RU"
    },
    numberOfFloors: document.body.dataset.schemaFloors || ""
  };
}

function buildOrganizationSchema() {
  const organizationName = document.body.dataset.schemaOrganization;
  if (!organizationName) return null;

  const sameAs = (document.body.dataset.schemaSameAs || "")
    .split(",")
    .map((item) => item.trim())
    .filter(Boolean);

  const schema = {
    "@context": "https://schema.org",
    "@type": "Organization",
    name: organizationName,
    url: document.body.dataset.schemaOrganizationUrl || window.location.href
  };

  if (sameAs.length) schema.sameAs = sameAs;
  return schema;
}

function buildWebSiteSchema() {
  const siteName = document.body.dataset.schemaWebsite;
  if (!siteName) return null;

  const description = document.body.dataset.schemaDescription || document.querySelector('meta[name="description"]')?.getAttribute("content") || "";

  return {
    "@context": "https://schema.org",
    "@type": "WebSite",
    name: siteName,
    url: document.body.dataset.schemaWebsiteUrl || window.location.origin + "/",
    description
  };
}

function buildItemListSchema() {
  const listName = document.body.dataset.schemaItemList;
  if (!listName) return null;

  const cards = Array.from(document.querySelectorAll("[data-schema-list-item]"));
  if (!cards.length) return null;

  return {
    "@context": "https://schema.org",
    "@type": "ItemList",
    name: listName,
    itemListElement: cards.map((card, index) => {
      const link = card.querySelector("a[href]");
      const name = card.dataset.schemaItemName || card.querySelector("h2, h3")?.textContent?.trim() || link?.textContent?.trim() || `Объект ${index + 1}`;
      const url = card.dataset.schemaItemUrl || link?.getAttribute("href") || window.location.href;

      return {
        "@type": "ListItem",
        position: index + 1,
        name,
        url: new URL(url, window.location.href).href
      };
    })
  };
}

function loadPortalScript(baseUrl, fileName, options = {}) {
  return new Promise((resolve, reject) => {
    const script = document.createElement("script");
    script.src = new URL(fileName, baseUrl).href;
    script.async = options.ordered !== true;
    script.addEventListener("load", resolve, { once: true });
    script.addEventListener("error", reject, { once: true });
    document.head.appendChild(script);
  });
}

function isConfirmedPortalTestMode() {
  const params = new URLSearchParams(window.location.search);
  return params.get("lead_test") === "dry-run"
    && params.get("analytics_test") === "debug"
    && params.get("test_ack") === "1";
}

function isAnalyticsDebugRequested() {
  return isConfirmedPortalTestMode();
}

function getStorageFailureMode() {
  if (!isConfirmedPortalTestMode()) return "";
  const mode = new URLSearchParams(window.location.search).get("storage_fail") || "";
  return ["local", "session"].includes(mode) ? mode : "";
}

function getStorage(kind) {
  return kind === "session" ? window.sessionStorage : window.localStorage;
}

function safeStorageGet(kind, key, fallback = "") {
  if (getStorageFailureMode() === kind) return fallback;
  try {
    return getStorage(kind).getItem(key) ?? fallback;
  } catch (error) {
    return fallback;
  }
}

function safeStorageSet(kind, key, value) {
  if (getStorageFailureMode() === kind) return false;
  try {
    getStorage(kind).setItem(key, value);
    return true;
  } catch (error) {
    return false;
  }
}

function safeStorageRemove(kind, key) {
  if (getStorageFailureMode() === kind) return false;
  try {
    getStorage(kind).removeItem(key);
    return true;
  } catch (error) {
    return false;
  }
}

window.__NEWBUILD_STORAGE_FAILURE_MODE__ = getStorageFailureMode();
window.__NEWBUILD_SAFE_STORAGE__ = {
  get: safeStorageGet,
  set: safeStorageSet,
  remove: safeStorageRemove,
  failureMode: getStorageFailureMode
};

function neutralizeLegacyLeadFallback() {
  const neutralComplex = "Общий подбор новостройки";
  const legacyComplex = "ЖК Теллерманов сад";

  if (typeof SITE_CONFIG !== "undefined" && SITE_CONFIG) {
    SITE_CONFIG.defaultComplex = neutralComplex;
  }

  document.querySelectorAll("form[data-lead-form]").forEach((form) => {
    if (form.dataset.complex) return;

    const complexField = form.querySelector("[name='residential_complex']");
    if (complexField && complexField.value === legacyComplex) {
      complexField.value = neutralComplex;
    }
  });
}

function createDryRunLeadId() {
  const date = new Date().toISOString().slice(0, 10).replace(/-/g, "");
  const randomPart = Math.random().toString(36).slice(2, 8).toUpperCase();
  return `NB-TEST-${date}-${randomPart}`;
}

function normalizeDryRunPlacement(value) {
  return String(value || "")
    .trim()
    .toLowerCase()
    .replace(/[^a-zа-яё0-9_-]+/gi, "_")
    .replace(/^_+|_+$/g, "")
    .slice(0, 120);
}

function getDryRunFormContext(form, payload = {}) {
  if (typeof window.getNewbuildFormAnalyticsContext === "function") {
    return window.getNewbuildFormAnalyticsContext(form, payload);
  }

  const formRole = form.dataset.formRole || (form.closest("[data-primary-lead]") ? "primary" : "detailed");
  const objectId = payload.object_id || payload.residential_complex_id || form.dataset.complexId || "all-newbuilds";
  const placement = normalizeDryRunPlacement(
    payload.placement
    || form.dataset.placement
    || form.dataset.trackPlacement
    || form.closest("[data-track-placement]")?.dataset.trackPlacement
    || form.closest("[id]")?.id
    || `form_${payload.form_id || form.dataset.formId || "lead"}`
  ) || "lead_form";

  return {
    form_id: payload.form_id || form.dataset.formId || "dry_run_form",
    form_role: formRole,
    lead_type: payload.lead_type || form.dataset.leadType || "general",
    object_id: objectId,
    residential_complex_id: objectId,
    placement
  };
}

function enableLeadDryRunMode() {
  const params = new URLSearchParams(window.location.search);
  const isEnabled = params.get("lead_test") === "dry-run" && params.get("test_ack") === "1";
  const forms = Array.from(document.querySelectorAll("form[data-lead-form]"));

  if (!isEnabled || !forms.length) return false;

  const storageKey = "newbuildsBorisoglebskLeadDryRuns";
  const lastLeadStorageKey = "newbuildsBorisoglebskLastLead";
  window.__NEWBUILD_LEAD_TEST_MODE__ = true;
  document.body.dataset.leadTestMode = "dry-run";
  if (getStorageFailureMode()) document.body.dataset.storageFailureMode = getStorageFailureMode();

  const banner = document.createElement("div");
  banner.setAttribute("role", "status");
  banner.setAttribute("aria-live", "assertive");
  banner.style.cssText = "position:sticky;top:0;z-index:10000;padding:12px 16px;background:#7f1d1d;color:#fff;text-align:center;font-weight:700;box-shadow:0 2px 10px rgba(0,0,0,.25)";
  banner.innerHTML = 'ТЕСТОВЫЙ РЕЖИМ — данные не отправляются. <button type="button" data-disable-lead-test style="margin-left:10px;padding:6px 10px;border:0;border-radius:6px;cursor:pointer">Выключить тест</button>';
  document.body.prepend(banner);

  banner.querySelector("[data-disable-lead-test]")?.addEventListener("click", () => {
    const url = new URL(window.location.href);
    ["lead_test", "analytics_test", "test_ack", "storage_fail"].forEach((key) => url.searchParams.delete(key));
    window.location.href = url.toString();
  });

  forms.forEach((form) => {
    form.dataset.leadTestMode = "dry-run";

    form.addEventListener("submit", (event) => {
      event.preventDefault();
      event.stopImmediatePropagation();

      const status = form.querySelector("[data-form-status]");
      const button = form.querySelector("button[type='submit']");
      const originalText = button?.textContent || "";

      const restoreFormState = () => {
        if (button) {
          button.disabled = false;
          button.textContent = originalText;
        }
        form.removeAttribute("aria-busy");
        delete form.dataset.submitting;
        status?.focus({ preventScroll: true });
      };

      if (!form.checkValidity()) {
        form.reportValidity();
        return;
      }

      if (button) {
        button.disabled = true;
        button.textContent = "Проверяем...";
      }
      form.dataset.submitting = "true";
      form.setAttribute("aria-busy", "true");

      try {
        const payload = {};
        new FormData(form).forEach((value, key) => {
          payload[key] = String(value).trim();
        });

        payload.lead_type = payload.lead_type || form.dataset.leadType || "general";
        payload.form_id = payload.form_id || form.dataset.formId || "dry_run_form";
        payload.project_id = payload.project_id || form.dataset.projectId || "newbuilds-borisoglebsk";
        payload.project_name = payload.project_name || form.dataset.projectName || "Новостройки Борисоглебска";
        payload.residential_complex = payload.residential_complex || form.dataset.complex || "Общий подбор новостройки";
        payload.residential_complex_id = payload.residential_complex_id || form.dataset.complexId || "all-newbuilds";
        const context = getDryRunFormContext(form, payload);
        payload.form_role = context.form_role;
        payload.object_id = context.object_id;
        payload.residential_complex_id = context.residential_complex_id;
        payload.placement = context.placement;
        payload.client_fixation_id = createDryRunLeadId();
        payload.created_at = new Date().toISOString();
        payload.dry_run = true;
        payload.delivery_status = "not_sent";

        const evidence = {
          client_fixation_id: payload.client_fixation_id,
          lead_type: payload.lead_type,
          form_id: payload.form_id,
          form_role: payload.form_role,
          object_id: payload.object_id,
          project_id: payload.project_id,
          project_name: payload.project_name,
          residential_complex: payload.residential_complex,
          residential_complex_id: payload.residential_complex_id,
          lead_source: payload.lead_source || "",
          placement: payload.placement,
          created_at: payload.created_at,
          page_path: window.location.pathname,
          dry_run: true,
          delivery_status: "not_sent",
          personal_data_stored: false,
          field_presence: {
            name: Boolean(payload.name),
            phone: Boolean(payload.phone),
            interest: Boolean(payload.interest || payload.room_type),
            purchase_method: Boolean(payload.purchase_method || payload.mortgage_program),
            timeline: Boolean(payload.timeline || payload.purchase_timeline),
            comment: Boolean(payload.comment || payload.question),
            consent: payload.consent === "yes"
          }
        };

        let records = [];
        try {
          const parsed = JSON.parse(safeStorageGet("session", storageKey, "[]"));
          records = Array.isArray(parsed) ? parsed : [];
        } catch (error) {
          records = [];
        }
        records.push(evidence);
        const evidenceSaved = safeStorageSet("session", storageKey, JSON.stringify(records.slice(-20)));
        const lastLeadSaved = safeStorageSet("local", lastLeadStorageKey, JSON.stringify({
          client_fixation_id: evidence.client_fixation_id,
          lead_type: evidence.lead_type,
          form_id: evidence.form_id,
          form_role: evidence.form_role,
          placement: evidence.placement,
          object_id: evidence.object_id,
          project_id: evidence.project_id,
          project_name: evidence.project_name,
          residential_complex: evidence.residential_complex,
          residential_complex_id: evidence.residential_complex_id,
          qualification: { status: "test", score: 0, priority: "не отправлено" },
          created_at: evidence.created_at,
          dry_run: true
        }));

        window.dispatchEvent(new CustomEvent("newbuildLeadDryRun", { detail: evidence }));
        form.reset();

        if (status) {
          status.textContent = evidenceSaved && lastLeadSaved
            ? `Тест пройден локально. Данные не отправлены и не сохранены как заявка. ID: ${evidence.client_fixation_id}`
            : "Тест пройден без отправки. Хранилище недоступно: форма восстановлена, локальный контекст и персональные данные не сохранены.";
          status.classList.add("is-visible");
        }

        window.setTimeout(() => {
          const shouldRedirect = form.dataset.redirectSuccess !== "false" && evidenceSaved && lastLeadSaved;
          if (shouldRedirect) {
            const thankYouUrl = new URL("/spasibo/", window.location.origin);
            thankYouUrl.searchParams.set("type", evidence.lead_type);
            thankYouUrl.searchParams.set("id", evidence.client_fixation_id);
            thankYouUrl.searchParams.set("status", "test");
            thankYouUrl.searchParams.set("dry_run", "1");
            if (isAnalyticsDebugRequested()) {
              thankYouUrl.searchParams.set("lead_test", "dry-run");
              thankYouUrl.searchParams.set("analytics_test", "debug");
              thankYouUrl.searchParams.set("test_ack", "1");
            }
            window.location.href = thankYouUrl.toString();
            return;
          }

          restoreFormState();
        }, 250);
      } catch (error) {
        if (status) {
          status.textContent = "Тест выполнен без отправки, но локальный контекст недоступен. Форма восстановлена.";
          status.classList.add("is-visible");
        }
        restoreFormState();
      }
    }, true);
  });

  return true;
}

neutralizeLegacyLeadFallback();
enableLeadDryRunMode();

const websiteSchema = buildWebSiteSchema();
if (websiteSchema) createJsonLdScript(websiteSchema);

const breadcrumbSchema = buildBreadcrumbList();
if (breadcrumbSchema) createJsonLdScript(breadcrumbSchema);

const residenceSchema = buildResidenceSchema();
if (residenceSchema) createJsonLdScript(residenceSchema);

const organizationSchema = buildOrganizationSchema();
if (organizationSchema) createJsonLdScript(organizationSchema);

const itemListSchema = buildItemListSchema();
if (itemListSchema) createJsonLdScript(itemListSchema);

const schemaScriptUrl = document.currentScript?.src || "";
const portalLeadForm = document.querySelector("form[data-lead-form]");

if (schemaScriptUrl && portalLeadForm) {
  const debugReady = isAnalyticsDebugRequested()
    ? loadPortalScript(schemaScriptUrl, "analytics-debug.js", { ordered: true })
    : Promise.resolve();

  debugReady.catch(() => undefined).finally(() => {
    loadPortalScript(schemaScriptUrl, "conversion-tracking.js", { ordered: true })
      .catch(() => undefined)
      .finally(() => {
        if (portalLeadForm.querySelector("select[name='residential_complex']")) {
          loadPortalScript(schemaScriptUrl, "priority-leads.js");
        }
        loadPortalScript(schemaScriptUrl, "mobile-lead-bar.js");
        loadPortalScript(schemaScriptUrl, "form-accessibility.js");
      });
  });
}
