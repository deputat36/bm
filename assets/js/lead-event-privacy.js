(() => {
  if (window.__NEWBUILD_INTERNAL_LEAD_ID_PRIVACY__ === true) return;
  if (typeof trackLeadEvent !== "function") return;

  trackLeadEvent = function trackLeadEventWithPrivateInternalId(data, result = {}) {
    const publicPayload = {
      event: "lead_submit",
      lead_type: data.lead_type,
      form_id: data.form_id,
      project_id: data.project_id,
      project_name: data.project_name,
      residential_complex: data.residential_complex,
      residential_complex_id: data.residential_complex_id,
      qualification_status: data.qualification?.status || "",
      qualification_score: data.qualification?.score || 0,
      lead_source: data.lead_source || "",
      placement: data.placement || "",
      blocked: Boolean(result.blocked),
      offline: Boolean(result.offline)
    };

    window.dataLayer = window.dataLayer || [];
    window.dataLayer.push(publicPayload);

    if (typeof window.gtag === "function") {
      window.gtag("event", "lead_submit", {
        event_category: "lead",
        event_label: data.lead_type,
        form_id: data.form_id,
        residential_complex_id: data.residential_complex_id || "",
        qualification_status: data.qualification?.status || "",
        lead_source: data.lead_source || "",
        placement: data.placement || "",
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

  window.__NEWBUILD_INTERNAL_LEAD_ID_PRIVACY__ = true;
})();