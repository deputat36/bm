(function () {
  const forms = Array.from(document.querySelectorAll("form[data-lead-form]"));
  const startedForms = new WeakSet();
  const viewedForms = new WeakSet();

  function compactPayload(values) {
    return Object.fromEntries(
      Object.entries(values).filter(([, value]) => value !== "" && value !== null && value !== undefined)
    );
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
      lead_type: form?.dataset.leadType || "",
      residential_complex: form?.dataset.complex || "",
      residential_complex_id: form?.dataset.complexId || ""
    };
  }

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
