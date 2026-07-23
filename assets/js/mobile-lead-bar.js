(function () {
  const form = document.querySelector("form[data-lead-form]");
  if (!form) return;

  function enableInternalLeadIdPrivacy() {
    if (window.__NEWBUILD_INTERNAL_LEAD_ID_PRIVACY__ === true) return true;
    if (typeof trackLeadEvent !== "function") return false;

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
    return true;
  }

  function enablePrimaryLeadDelivery() {
    if (window.__NEWBUILD_PRIMARY_LEAD_DELIVERY__ === true) return true;
    if (
      typeof SITE_CONFIG === "undefined"
      || typeof sendLead !== "function"
      || typeof sendCustomLead !== "function"
      || typeof sendWeb3FormsLead !== "function"
    ) return false;

    SITE_CONFIG.LEAD_ENDPOINT = "https://ofewxuqfjhamgerwzull.supabase.co/functions/v1/newbuild-lead";
    const endpoint = SITE_CONFIG.LEAD_ENDPOINT;

    sendLead = async function sendLeadWithPrimaryStorage(data) {
      if (data.spam_check?.likely_bot) return { blocked: true };

      let primaryResult;
      try {
        primaryResult = await sendCustomLead(data);
        if (!primaryResult || primaryResult.success === false) {
          throw new Error(primaryResult?.error || "Primary lead storage rejected the request");
        }
      } catch (primaryError) {
        if (SITE_CONFIG.WEB3FORMS_ACCESS_KEY && SITE_CONFIG.SEND_EMAIL_COPY) {
          try {
            await sendWeb3FormsLead(data);
          } catch (emailError) {
            console.error("Lead backup email failed", emailError);
          }
        }
        throw primaryError;
      }

      let emailCopySent = false;
      if (
        !primaryResult.blocked
        && !primaryResult.duplicate
        && SITE_CONFIG.WEB3FORMS_ACCESS_KEY
        && SITE_CONFIG.SEND_EMAIL_COPY
      ) {
        try {
          await sendWeb3FormsLead(data);
          emailCopySent = true;
        } catch (emailError) {
          console.error("Lead email copy failed", emailError);
        }
      }

      return {
        ...primaryResult,
        primary_destination: "supabase_newbuild_leads",
        endpoint,
        email_copy_sent: emailCopySent
      };
    };

    window.__NEWBUILD_PRIMARY_LEAD_DELIVERY__ = true;
    window.__NEWBUILD_LEAD_DELIVERY_STATUS__ = {
      primary_destination: "supabase_newbuild_leads",
      endpoint_configured: true,
      email_copy_enabled: Boolean(SITE_CONFIG.WEB3FORMS_ACCESS_KEY && SITE_CONFIG.SEND_EMAIL_COPY)
    };
    return true;
  }

  enableInternalLeadIdPrivacy();
  enablePrimaryLeadDelivery();

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
    const payload = {
      event: "mobile_lead_bar_click",
      action,
      form_id: formId,
      residential_complex: form.dataset.complex || complexName,
      residential_complex_id: form.dataset.complexId || "",
      page_path: window.location.pathname
    };

    window.dataLayer = window.dataLayer || [];
    window.dataLayer.push(payload);

    if (typeof window.gtag === "function") {
      window.gtag("event", "mobile_lead_bar_click", {
        event_category: "lead",
        event_label: action,
        form_id: formId
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