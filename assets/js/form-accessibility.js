(() => {
  const forms = Array.from(document.querySelectorAll("form[data-lead-form]"));
  if (!forms.length) return;

  function safeId(value) {
    return String(value || "lead-form")
      .toLowerCase()
      .replace(/[^a-z0-9а-яё_-]+/gi, "-")
      .replace(/^-+|-+$/g, "") || "lead-form";
  }

  function setInvalidState(field, invalid) {
    if (!field) return;
    if (invalid) {
      field.setAttribute("aria-invalid", "true");
    } else {
      field.removeAttribute("aria-invalid");
    }
  }

  function enhanceForm(form, index) {
    if (form.dataset.accessibilityEnhanced === "true") return;

    const formKey = safeId(form.dataset.formId || `lead-form-${index + 1}`);
    const status = form.querySelector("[data-form-status]");
    const button = form.querySelector("button[type='submit'], input[type='submit']");
    const phone = form.querySelector("input[name='phone']");
    const name = form.querySelector("input[name='name']");

    form.dataset.accessibilityEnhanced = "true";

    if (!form.id) form.id = formKey;
    form.setAttribute("aria-busy", "false");

    if (name) {
      if (!name.autocomplete) name.autocomplete = "name";
      name.setAttribute("enterkeyhint", "next");
    }

    if (phone) {
      phone.inputMode = "tel";
      if (!phone.autocomplete) phone.autocomplete = "tel";
      phone.setAttribute("enterkeyhint", "next");
    }

    if (status) {
      if (!status.id) status.id = `${formKey}-status`;
      status.setAttribute("role", "status");
      status.setAttribute("aria-live", "polite");
      status.setAttribute("aria-atomic", "true");
      status.setAttribute("tabindex", "-1");
    }

    if (button) {
      if (status?.id) button.setAttribute("aria-controls", status.id);
      button.setAttribute("aria-disabled", button.disabled ? "true" : "false");

      const syncBusyState = () => {
        const busy = Boolean(button.disabled);
        form.setAttribute("aria-busy", busy ? "true" : "false");
        button.setAttribute("aria-disabled", busy ? "true" : "false");
      };

      new MutationObserver(syncBusyState).observe(button, {
        attributes: true,
        attributeFilter: ["disabled"]
      });
    }

    form.addEventListener("invalid", (event) => {
      setInvalidState(event.target, true);

      const firstInvalid = form.querySelector(":invalid");
      if (firstInvalid === event.target) {
        window.setTimeout(() => firstInvalid.focus({ preventScroll: false }), 0);
      }
    }, true);

    form.addEventListener("input", (event) => {
      const field = event.target;
      if (typeof field.checkValidity === "function" && field.checkValidity()) {
        setInvalidState(field, false);
      }
    });

    form.addEventListener("change", (event) => {
      const field = event.target;
      if (typeof field.checkValidity === "function" && field.checkValidity()) {
        setInvalidState(field, false);
      }
    });
  }

  forms.forEach(enhanceForm);
})();
