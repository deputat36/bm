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
      data.page_url = sanitizeAttributionUrl(data.page_url, true);
      data.referrer = sanitizeAttributionUrl(data.referrer, false);
      data.tracking = sanitizeTrackingData(data.tracking);
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

  function findFormById(formId) {
    return forms.find((form) => form.dataset.formId === formId) || null;
  }

  function updateStoredLeadRole(detail, formRole) {
    if (!formRole) return;

    try {
      const stored = JSON.parse(localStorage.getItem(LAST_LEAD_STORAGE_KEY) || "{}");
      const eventId = String(detail?.client_fixation_id || "").trim();
      const storedId = String(stored?.client_fixation_id || "").trim();
      if (eventId && storedId && eventId !== storedId) return;

      stored.form_role = formRole;
      localStorage.setItem(LAST_LEAD_STORAGE_KEY, JSON.stringify(stored));
    } catch (error) {
      // Ошибка локального хранилища не должна мешать отправке заявки.
    }
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

  function getFormDetails(form) {
    return {
      form_id: form?.dataset.formId || "",
      form_role: getFormRole(form),
      lead_type: form?.dataset.leadType || "",
      residential_complex: form?.dataset.complex || "",
      residential_complex_id: form?.dataset.complexId || ""
    };
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

  loadPageAccessibilityRuntime();
  installAttributionUrlPrivacy();
  forms.forEach(ensureFormRole);
  enrichMortgageLinks();

  document.addEventListener("click", (event) => {
    const target = event.target.closest("[data-track-action]");
    if (!target) return;

    sendConversionEvent("lead_cta_click", {
      action: target.dataset.trackAction || "unknown",
      placement: target.dataset.trackPlacement || "",
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
    const formRole = ensureFormRole(form);
    if (!formRole) return;

    updateStoredLeadRole(detail, formRole);
    sendConversionEvent("lead_submit_classified", {
      form_id: detail.form_id || "",
      form_role: formRole,
      lead_type: detail.lead_type || "",
      residential_complex_id: detail.residential_complex_id || "",
      qualification_status: detail.qualification_status || "",
      lead_source: detail.lead_source || "",
      placement: detail.placement || "",
      blocked: Boolean(detail.blocked),
      offline: Boolean(detail.offline)
    });
  });

  window.addEventListener("newbuildLeadDryRun", (event) => {
    const detail = event.detail || {};
    const form = findFormById(detail.form_id);
    const formRole = ensureFormRole(form);
    updateStoredLeadRole(detail, formRole);

    if (isAnalyticsDebugMode()) {
      sendConversionEvent("lead_submit", {
        form_id: detail.form_id || "",
        lead_type: detail.lead_type || "",
        project_id: detail.project_id || "",
        project_name: detail.project_name || "",
        residential_complex: detail.residential_complex || "",
        residential_complex_id: detail.residential_complex_id || "",
        qualification_status: "test",
        qualification_score: 0,
        lead_source: detail.lead_source || "",
        placement: detail.placement || "",
        blocked: false,
        offline: true,
        simulated: true
      });
      sendConversionEvent("lead_submit_classified", {
        form_id: detail.form_id || "",
        form_role: formRole,
        lead_type: detail.lead_type || "",
        residential_complex_id: detail.residential_complex_id || "",
        qualification_status: "test",
        lead_source: detail.lead_source || "",
        placement: detail.placement || "",
        blocked: false,
        offline: true,
        simulated: true
      });
    }
  });

  if ("IntersectionObserver" in window) {
    const observer = new IntersectionObserver((entries) => {
      entries.forEach((entry) => {
        const form = entry.target;
        if (!entry.isIntersecting || viewedForms.has(form)) return;

        viewedForms.add(form);
        sendConversionEvent("lead_form_view", getFormDetails(form));
        observer.unobserve(form);
      });
    }, { threshold: 0.35 });

    forms.forEach((form) => observer.observe(form));
  }
})();
