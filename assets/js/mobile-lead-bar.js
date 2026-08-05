(function () {
  const form = document.querySelector("form[data-lead-form]");
  if (!form) return;

  function getContext(data = {}) {
    if (typeof window.getNewbuildFormAnalyticsContext === "function") {
      return window.getNewbuildFormAnalyticsContext(form, data);
    }

    const formRole = form.dataset.formRole || (form.closest("[data-primary-lead]") ? "primary" : "detailed");
    const objectId = data.object_id || data.residential_complex_id || form.dataset.complexId || "all-newbuilds";
    const placement = String(
      data.placement
      || form.dataset.placement
      || form.dataset.trackPlacement
      || form.closest("[data-track-placement]")?.dataset.trackPlacement
      || form.closest("[id]")?.id
      || `form_${data.form_id || form.dataset.formId || "lead"}`
    ).trim();

    return {
      form_id: data.form_id || form.dataset.formId || "",
      form_role: data.form_role || formRole,
      lead_type: data.lead_type || form.dataset.leadType || "",
      object_id: objectId,
      residential_complex_id: objectId,
      placement: placement || "lead_form"
    };
  }

  function enableInternalLeadIdPrivacy() {
    if (window.__NEWBUILD_INTERNAL_LEAD_ID_PRIVACY__ === true) return true;
    if (typeof trackLeadEvent !== "function") return false;

    trackLeadEvent = function trackLeadEventWithPrivateInternalId(data, result = {}) {
      const context = getContext(data);
      const publicPayload = {
        event: "lead_submit",
        lead_type: context.lead_type,
        form_id: context.form_id,
        form_role: context.form_role,
        object_id: context.object_id,
        project_id: data.project_id,
        project_name: data.project_name,
        residential_complex: data.residential_complex,
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

    window.__NEWBUILD_INTERNAL_LEAD_ID_PRIVACY__ = true;
    return true;
  }

  enableInternalLeadIdPrivacy();

  if (document.querySelector("[data-mobile-lead-bar]")) return;

  const currentScriptUrl = document.currentScript?.src || "";
  if (currentScriptUrl && !document.querySelector("link[data-mobile-lead-bar-style]")) {
    const stylesheet = document.createElement("link");
    stylesheet.rel = "stylesheet";
    stylesheet.href = new URL("../css/mobile-lead-bar.css", currentScriptUrl).href;
    stylesheet.setAttribute("data-mobile-lead-bar-style", "");
    document.head.appendChild(stylesheet);
  }

  const leadSection = form.closest("[data-primary-lead]") || form.closest("#lead") || document.getElementById("lead") || form;
  if (!leadSection.id) leadSection.id = "lead";

  const complexName = form.dataset.complex || "новостройке";
  const formId = form.dataset.formId || "";
  const bar = document.createElement("aside");
  bar.className = "mobile-lead-bar";
  bar.setAttribute("data-mobile-lead-bar", "");
  bar.setAttribute("aria-label", "Быстрые действия");

  function trackAction(action) {
    const context = getContext();
    const payload = {
      event: "mobile_lead_bar_click",
      action,
      form_id: formId,
      form_role: context.form_role,
      object_id: context.object_id,
      residential_complex: form.dataset.complex || complexName,
      residential_complex_id: context.residential_complex_id,
      placement: context.placement,
      page_path: window.location.pathname
    };

    window.dataLayer = window.dataLayer || [];
    window.dataLayer.push(payload);

    if (typeof window.gtag === "function") {
      window.gtag("event", "mobile_lead_bar_click", {
        event_category: "lead",
        event_label: action,
        form_id: formId,
        form_role: context.form_role,
        object_id: context.object_id,
        placement: context.placement
      });
    }
  }

  const leadLink = document.createElement("a");
  leadLink.className = "mobile-lead-bar__button mobile-lead-bar__button--primary";
  leadLink.href = `#${leadSection.id}`;
  leadLink.textContent = complexName === "Общий подбор новостройки" ? "Подобрать квартиру" : "Оставить заявку";
  leadLink.addEventListener("click", () => {
    trackAction("lead");
    window.setTimeout(() => {
      const firstField = form.querySelector("input:not([type='hidden']), select, textarea");
      firstField?.focus({ preventScroll: true });
    }, 450);
  });

  const phoneLink = document.createElement("a");
  phoneLink.className = "mobile-lead-bar__button mobile-lead-bar__button--phone";
  phoneLink.href = "tel:+79038576909";
  phoneLink.textContent = "Позвонить";
  phoneLink.setAttribute("aria-label", "Позвонить по номеру 8 903 857-69-09");
  phoneLink.addEventListener("click", () => trackAction("phone"));

  bar.append(leadLink, phoneLink);
  document.body.appendChild(bar);
  document.documentElement.classList.add("has-mobile-lead-bar");
})();
