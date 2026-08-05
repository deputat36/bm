(function () {
  const forms = Array.from(document.querySelectorAll("form[data-lead-form]"));
  const runtimeScriptUrl = document.currentScript?.src || "";
  const startedForms = new WeakSet();
  const viewedForms = new WeakSet();
  const MORTGAGE_PRIMARY_ANCHOR = "quick-lead";
  const LAST_LEAD_STORAGE_KEY = "newbuildsBorisoglebskLastLead";
  const ATTRIBUTION_STORAGE_KEY = "newbuildsBorisoglebskTracking";
  const PRIMARY_SALES_PHONE_DESTINATION = "phone:primary_sales_phone";
  const PORTAL_EMAIL_DESTINATION = "email:portal_contact";
  const FORM_ROLES = new Set(["primary", "detailed"]);
  const ATTRIBUTION_QUERY_KEYS = new Set([
    "utm_source",
    "utm_medium",
    "utm_campaign",
    "utm_content",
    "utm_term",
    "utm_id",
    "gclid",
    "yclid",
    "ymclid",
    "vkclid",
    "fbclid",
    "roistat",
    "openstat",
    "realtor",
    "realtor_id",
    "manager",
    "lead_source",
    "placement"
  ]);
  const OPAQUE_TRACKING_KEYS = new Set([
    "gclid",
    "yclid",
    "ymclid",
    "vkclid",
    "fbclid",
    "roistat",
    "openstat"
  ]);
  const EMAIL_VALUE_PATTERN = /[^\s@]+@[^\s@]+\.[^\s@]+/i;
  const PHONE_VALUE_PATTERN = /(?:^|\D)\+?\d[\d\s().-]{8,}\d(?:\D|$)/;
  let formObserver = null;
  let lastLeadContextSaved = true;

  function loadPageAccessibilityRuntime() {
    if (!runtimeScriptUrl || document.querySelector("script[data-page-accessibility-runtime]")) return;

    const script = document.createElement("script");
    script.src = new URL("page-accessibility.js", runtimeScriptUrl).href;
    script.async = true;
    script.dataset.pageAccessibilityRuntime = "true";
    document.head.appendChild(script);
  }

  function compactPayload(values) {
    return Object.fromEntries(
      Object.entries(values).filter(([, value]) => value !== "" && value !== null && value !== undefined)
    );
  }

  function normalizePlacement(value) {
    return String(value || "")
      .replace(/[\u0000-\u001f\u007f]/g, "")
      .trim()
      .toLowerCase()
      .replace(/[^a-zа-яё0-9_-]+/gi, "_")
      .replace(/^_+|_+$/g, "")
      .slice(0, 120);
  }

  function sanitizeTrackingValue(key, rawValue) {
    const value = String(rawValue || "")
      .replace(/[\u0000-\u001f\u007f]/g, "")
      .trim()
      .slice(0, 256);

    if (!value) return "";
    if (OPAQUE_TRACKING_KEYS.has(key)) return value;
    if (EMAIL_VALUE_PATTERN.test(value) || PHONE_VALUE_PATTERN.test(value)) return "";
    return value;
  }

  function sanitizeTrackingValues(values) {
    const source = values && typeof values === "object" ? values : {};
    const sanitized = {};

    ATTRIBUTION_QUERY_KEYS.forEach((key) => {
      const value = sanitizeTrackingValue(key, source[key]);
      if (value) sanitized[key] = value;
    });

    return sanitized;
  }

  function sanitizeAttributionUrl(rawUrl, keepAttribution = false) {
    if (!rawUrl) return "";

    try {
      const url = new URL(String(rawUrl), window.location.origin);
      const sanitized = new URL(`${url.origin}${url.pathname}`);

      if (keepAttribution && url.origin === window.location.origin) {
        ATTRIBUTION_QUERY_KEYS.forEach((key) => {
          const value = sanitizeTrackingValue(key, url.searchParams.get(key));
          if (value) sanitized.searchParams.set(key, value);
        });
      }

      return sanitized.toString();
    } catch (error) {
      return "";
    }
  }

  function sanitizeCtaDestination(target) {
    const rawHref = String(target?.getAttribute("href") || "").trim();
    const action = String(target?.dataset?.trackAction || "").trim();

    if (!rawHref) return "";
    if (action === "phone" || rawHref.toLowerCase().startsWith("tel:")) {
      return PRIMARY_SALES_PHONE_DESTINATION;
    }
    if (rawHref.toLowerCase().startsWith("mailto:")) {
      return PORTAL_EMAIL_DESTINATION;
    }

    try {
      const url = new URL(rawHref, window.location.origin);
      const isInternal = url.origin === window.location.origin;
      const sanitized = new URL(`${url.origin}${url.pathname}`);

      if (isInternal) {
        ATTRIBUTION_QUERY_KEYS.forEach((key) => {
          const value = sanitizeTrackingValue(key, url.searchParams.get(key));
          if (value) sanitized.searchParams.set(key, value);
        });
        return `${sanitized.pathname}${sanitized.search}`;
      }

      return sanitized.toString();
    } catch (error) {
      return "";
    }
  }

  function sanitizeTrackingTouch(touch) {
    const source = touch && typeof touch === "object" ? touch : {};

    return compactPayload({
      ...source,
      page_url: sanitizeAttributionUrl(source.page_url, true),
      referrer: sanitizeAttributionUrl(source.referrer, false),
      values: sanitizeTrackingValues(source.values)
    });
  }

  function sanitizeTrackingData(tracking) {
    const source = tracking && typeof tracking === "object" ? tracking : {};

    return {
      first_touch: sanitizeTrackingTouch(source.first_touch),
      last_touch: sanitizeTrackingTouch(source.last_touch),
      current: sanitizeTrackingValues(source.current)
    };
  }

  function persistSanitizedTracking(tracking) {
    try {
      localStorage.setItem(ATTRIBUTION_STORAGE_KEY, JSON.stringify(tracking));
      return true;
    } catch (error) {
      return false;
    }
  }

  function installAttributionUrlPrivacy() {
    if (typeof getTrackingData !== "function" || typeof collectFormData !== "function") return false;

    try {
      const stored = JSON.parse(localStorage.getItem(ATTRIBUTION_STORAGE_KEY) || "{}");
      persistSanitizedTracking(sanitizeTrackingData(stored));
    } catch (error) {
      persistSanitizedTracking(sanitizeTrackingData({}));
    }

    const originalGetTrackingData = getTrackingData;
    getTrackingData = function getPrivateTrackingData() {
      const tracking = sanitizeTrackingData(originalGetTrackingData());
      persistSanitizedTracking(tracking);
      return tracking;
    };

    const originalCollectFormData = collectFormData;
    collectFormData = function collectPrivateFormData(form) {
      const data = originalCollectFormData(form);
      const context = getFormDetails(form, data);
      data.page_url = sanitizeAttributionUrl(data.page_url, true);
      data.referrer = sanitizeAttributionUrl(data.referrer, false);
      data.tracking = sanitizeTrackingData(data.tracking);
      data.form_role = context.form_role;
      data.object_id = context.object_id;
      data.placement = context.placement;
      return data;
    };

    window.__NEWBUILD_ATTRIBUTION_URL_PRIVACY__ = true;
    return true;
  }

  function isAnalyticsDebugMode() {
    return window.__NEWBUILD_ANALYTICS_DEBUG_MODE__ === true;
  }

  function getFormRole(form) {
    if (!form) return "";
    const explicitRole = String(form.dataset.formRole || "").trim();
    if (FORM_ROLES.has(explicitRole)) return explicitRole;
    return form.closest("[data-primary-lead]") ? "primary" : "detailed";
  }

  function ensureFormRole(form) {
    if (!form) return "";
    const role = getFormRole(form);
    form.dataset.formRole = role;

    let hidden = form.querySelector("input[name='form_role']");
    if (!hidden) {
      hidden = document.createElement("input");
      hidden.type = "hidden";
      hidden.name = "form_role";
      form.prepend(hidden);
    }
    hidden.value = role;
    return role;
  }

  function getFormObjectId(form, data = {}) {
    return String(
      data.object_id
      || data.residential_complex_id
      || form?.dataset.complexId
      || form?.querySelector("input[name='residential_complex_id']")?.value
      || "all-newbuilds"
    ).trim();
  }

  function getFormPlacement(form, data = {}) {
    const direct = data.placement
      || form?.dataset.placement
      || form?.dataset.trackPlacement
      || form?.querySelector("input[name='placement']")?.value
      || form?.closest("[data-track-placement]")?.dataset.trackPlacement
      || data.tracking?.current?.placement
      || "";
    const normalizedDirect = normalizePlacement(direct);
    if (normalizedDirect) return normalizedDirect;

    const anchor = form?.closest("[id]")?.id || "";
    const anchorPlacement = normalizePlacement(anchor);
    if (anchorPlacement) return anchorPlacement;

    return normalizePlacement(`form_${form?.dataset.formId || data.form_id || "lead"}`) || "lead_form";
  }

  function getFormDetails(form, data = {}) {
    const objectId = getFormObjectId(form, data);
    return {
      form_id: String(data.form_id || form?.dataset.formId || "").trim(),
      form_role: getFormRole(form) || String(data.form_role || "").trim(),
      lead_type: String(data.lead_type || form?.dataset.leadType || "").trim(),
      object_id: objectId,
      residential_complex: String(data.residential_complex || form?.dataset.complex || "").trim(),
      residential_complex_id: objectId,
      placement: getFormPlacement(form, data)
    };
  }

  window.getNewbuildFormAnalyticsContext = getFormDetails;

  function findFormById(formId) {
    return forms.find((form) => form.dataset.formId === formId) || null;
  }

  function updateStoredLeadContext(detail, context) {
    if (!context.form_role && !context.placement && !context.object_id) return;

    try {
      const stored = JSON.parse(localStorage.getItem(LAST_LEAD_STORAGE_KEY) || "{}");
      const eventId = String(detail?.client_fixation_id || "").trim();
      const storedId = String(stored?.client_fixation_id || "").trim();
      if (eventId && storedId && eventId !== storedId) return;

      stored.form_role = context.form_role;
      stored.placement = context.placement;
      stored.object_id = context.object_id;
      stored.residential_complex_id = stored.residential_complex_id || context.object_id;
      localStorage.setItem(LAST_LEAD_STORAGE_KEY, JSON.stringify(stored));
    } catch (error) {
      // Storage failure must never stop form delivery or analytics fallback.
    }
  }

  function updateStoredLeadRole(detail, formRole) {
    const form = findFormById(detail?.form_id);
    const context = { ...getFormDetails(form, detail || {}), form_role: formRole || getFormRole(form) };
    updateStoredLeadContext(detail, context);
    return context;
  }

  function installLastLeadContextPersistence() {
    if (typeof saveLastLead !== "function") return false;

    saveLastLead = function saveLastLeadWithAnalyticsContext(data) {
      const safeLead = {
        client_fixation_id: data.client_fixation_id,
        lead_type: data.lead_type,
        form_id: data.form_id,
        form_role: data.form_role,
        placement: data.placement,
        object_id: data.object_id || data.residential_complex_id,
        project_id: data.project_id,
        project_name: data.project_name,
        residential_complex: data.residential_complex,
        residential_complex_id: data.residential_complex_id,
        qualification: data.qualification,
        created_at: data.created_at
      };

      try {
        lastLeadContextSaved = localStorage.setItem(LAST_LEAD_STORAGE_KEY, JSON.stringify(safeLead)) === undefined;
      } catch (error) {
        lastLeadContextSaved = false;
      }
      return lastLeadContextSaved;
    };

    if (typeof shouldRedirectAfterSuccess === "function") {
      const originalShouldRedirectAfterSuccess = shouldRedirectAfterSuccess;
      shouldRedirectAfterSuccess = function shouldRedirectWithSafeLocalContext(form, result) {
        return lastLeadContextSaved && originalShouldRedirectAfterSuccess(form, result);
      };
    }

    return true;
  }

  function installCanonicalSubmitEvent() {
    if (typeof trackLeadEvent !== "function") return false;

    trackLeadEvent = function trackCanonicalLeadEvent(data, result = {}) {
      const form = findFormById(data.form_id);
      const context = getFormDetails(form, data);
      const publicPayload = {
        event: "lead_submit",
        lead_type: context.lead_type,
        form_id: context.form_id,
        form_role: context.form_role,
        object_id: context.object_id,
        project_id: data.project_id,
        project_name: data.project_name,
        residential_complex: context.residential_complex,
        residential_complex_id: context.residential_complex_id,
        qualification_status: data.qualification?.status || "",
        qualification_score: data.qualification?.score || 0,
        lead_source: data.lead_source || "",
        placement: context.placement,
        blocked: Boolean(result.blocked),
        offline: Boolean(result.offline)
      };

      window.dataLayer = window.dataLayer || [];
      window.dataLayer.push(publicPayload);

      if (typeof window.gtag === "function") {
        window.gtag("event", "lead_submit", {
          event_category: "lead",
          event_label: context.lead_type,
          form_id: context.form_id,
          form_role: context.form_role,
          object_id: context.object_id,
          residential_complex_id: context.residential_complex_id,
          qualification_status: data.qualification?.status || "",
          lead_source: data.lead_source || "",
          placement: context.placement,
          blocked: Boolean(result.blocked),
          offline: Boolean(result.offline),
          value: data.qualification?.score || 0
        });
      }

      if (typeof window.ym === "function") {
        const counters = window.Ya?._metrika?.counters || {};
        Object.keys(counters).forEach((counterId) => {
          window.ym(counterId, "reachGoal", "lead_submit", publicPayload);
        });
      }

      window.dispatchEvent(new CustomEvent("newbuildLeadSubmit", {
        detail: {
          ...publicPayload,
          client_fixation_id: data.client_fixation_id || ""
        }
      }));
    };

    return true;
  }

  function sendConversionEvent(eventName, details = {}) {
    const payload = compactPayload({
      event: eventName,
      page_path: window.location.pathname,
      ...details
    });

    if (isAnalyticsDebugMode()) {
      window.recordPortalAnalyticsDebugEvent?.(payload);
      window.dispatchEvent(new CustomEvent("portalConversionEvent", { detail: payload }));
      return;
    }

    window.dataLayer = window.dataLayer || [];
    window.dataLayer.push(payload);

    if (typeof window.gtag === "function") {
      const { event, ...parameters } = payload;
      window.gtag("event", event, parameters);
    }

    window.dispatchEvent(new CustomEvent("portalConversionEvent", { detail: payload }));
  }

  function enrichMortgageLinks() {
    document.querySelectorAll('a[data-track-action="mortgage_open"][data-track-object]').forEach((link) => {
      const objectId = String(link.dataset.trackObject || "").trim();
      const rawHref = String(link.getAttribute("href") || "").trim();
      if (!objectId || !rawHref) return;

      const relativePath = rawHref.split(/[?#]/)[0];
      const queryPart = rawHref.includes("?") ? rawHref.split("?")[1].split("#")[0] : "";
      const params = new URLSearchParams(queryPart);
      params.set("object", objectId);

      link.setAttribute("href", `${relativePath}?${params.toString()}#${MORTGAGE_PRIMARY_ANCHOR}`);
    });
  }

  function markFormViewed(form) {
    if (!form || viewedForms.has(form)) return false;
    viewedForms.add(form);
    sendConversionEvent("lead_form_view", getFormDetails(form));
    formObserver?.unobserve(form);
    return true;
  }

  function getHashTargetForm() {
    const rawHash = String(window.location.hash || "").replace(/^#/, "");
    if (!rawHash) return null;

    let id = rawHash;
    try {
      id = decodeURIComponent(rawHash);
    } catch (error) {
      // Keep raw hash when decoding fails.
    }

    const target = document.getElementById(id);
    if (!target) return null;
    if (target.matches?.("form[data-lead-form]")) return target;
    return target.querySelector?.("form[data-lead-form]") || target.closest?.("form[data-lead-form]") || null;
  }

  function markHashTargetViewed() {
    const form = getHashTargetForm();
    if (form) markFormViewed(form);
  }

  loadPageAccessibilityRuntime();
  installAttributionUrlPrivacy();
  forms.forEach(ensureFormRole);
  installLastLeadContextPersistence();
  installCanonicalSubmitEvent();
  enrichMortgageLinks();

  document.addEventListener("click", (event) => {
    const target = event.target.closest("[data-track-action]");
    if (!target) return;

    sendConversionEvent("lead_cta_click", {
      action: target.dataset.trackAction || "unknown",
      placement: normalizePlacement(target.dataset.trackPlacement || ""),
      object_id: target.dataset.trackObject || "",
      link_url: sanitizeCtaDestination(target)
    });
  });

  forms.forEach((form) => {
    const markStarted = () => {
      if (startedForms.has(form)) return;
      startedForms.add(form);
      sendConversionEvent("lead_form_start", getFormDetails(form));
    };

    form.addEventListener("focusin", (event) => {
      if (event.target.matches("input:not([type='hidden']), select, textarea")) {
        markStarted();
      }
    });

    form.addEventListener("change", markStarted);
  });

  window.addEventListener("newbuildLeadSubmit", (event) => {
    const detail = event.detail || {};
    const form = findFormById(detail.form_id);
    const context = getFormDetails(form, detail);
    const formRole = context.form_role;
    if (!formRole) return;

    updateStoredLeadRole(detail, formRole);
    sendConversionEvent("lead_submit_classified", {
      form_id: context.form_id,
      form_role: formRole,
      lead_type: context.lead_type,
      object_id: context.object_id,
      residential_complex_id: context.residential_complex_id,
      qualification_status: detail.qualification_status || "",
      lead_source: detail.lead_source || "",
      placement: context.placement,
      blocked: Boolean(detail.blocked),
      offline: Boolean(detail.offline)
    });
  });

  window.addEventListener("newbuildLeadDryRun", (event) => {
    const detail = event.detail || {};
    const form = findFormById(detail.form_id);
    const context = getFormDetails(form, detail);
    updateStoredLeadContext(detail, context);

    if (isAnalyticsDebugMode()) {
      sendConversionEvent("lead_submit", {
        form_id: context.form_id,
        form_role: context.form_role,
        lead_type: context.lead_type,
        object_id: context.object_id,
        project_id: detail.project_id || "",
        project_name: detail.project_name || "",
        residential_complex: detail.residential_complex || "",
        residential_complex_id: context.residential_complex_id,
        qualification_status: "test",
        qualification_score: 0,
        lead_source: detail.lead_source || "",
        placement: context.placement,
        blocked: false,
        offline: true,
        simulated: true
      });
      sendConversionEvent("lead_submit_classified", {
        form_id: context.form_id,
        form_role: context.form_role,
        lead_type: context.lead_type,
        object_id: context.object_id,
        residential_complex_id: context.residential_complex_id,
        qualification_status: "test",
        lead_source: detail.lead_source || "",
        placement: context.placement,
        blocked: false,
        offline: true,
        simulated: true
      });
    }
  });

  if ("IntersectionObserver" in window) {
    formObserver = new IntersectionObserver((entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) markFormViewed(entry.target);
      });
    }, { threshold: 0.35 });

    forms.forEach((form) => formObserver.observe(form));
  }

  window.addEventListener("hashchange", markHashTargetViewed);
  window.setTimeout(markHashTargetViewed, 0);
})();
