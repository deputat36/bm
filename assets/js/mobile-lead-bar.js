(function () {
  const form = document.querySelector("form[data-lead-form]");
  if (!form || document.querySelector("[data-mobile-lead-bar]")) return;

  const currentScriptUrl = document.currentScript?.src || "";
  if (currentScriptUrl && !document.querySelector("link[data-mobile-lead-bar-style]")) {
    const stylesheet = document.createElement("link");
    stylesheet.rel = "stylesheet";
    stylesheet.href = new URL("../css/mobile-lead-bar.css", currentScriptUrl).href;
    stylesheet.setAttribute("data-mobile-lead-bar-style", "");
    document.head.appendChild(stylesheet);
  }

  const leadSection = form.closest("#lead") || document.getElementById("lead") || form;
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
