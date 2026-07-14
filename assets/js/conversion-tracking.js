(function () {
  const forms = Array.from(document.querySelectorAll("form[data-lead-form]"));
  const startedForms = new WeakSet();
  const viewedForms = new WeakSet();
  const MORTGAGE_PRIMARY_ANCHOR = "quick-lead";
  const LAST_LEAD_STORAGE_KEY = "newbuildsBorisoglebskLastLead";
  const FORM_ROLES = new Set(["primary", "detailed"]);

  function compactPayload(values) {
    return Object.fromEntries(
      Object.entries(values).filter(([, value]) => value !== "" && value !== null && value !== undefined)
    );
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

  forms.forEach(ensureFormRole);
  enrichMortgageLinks();

  document.addEventListener("click", (event) => {
    const target = event.target.closest("[data-track-action]");
    if (!target) return;

    sendConversionEvent("lead_cta_click", {
      action: target.dataset.trackAction || "unknown",
      placement: target.dataset.trackPlacement || "",
      object_id: target.dataset.trackObject || "",
      link_url: target.getAttribute("href") || ""
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
      qualification_status: detail.qualification_status || ""
    });
  });

  window.addEventListener("newbuildLeadDryRun", (event) => {
    const detail = event.detail || {};
    const form = findFormById(detail.form_id);
    const formRole = ensureFormRole(form);
    updateStoredLeadRole(detail, formRole);
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
