(() => {
  const forms = Array.from(document.querySelectorAll("form[data-lead-form]"));
  if (!forms.length) return;

  const PHONE_MIN_DIGITS = 10;
  const PHONE_MAX_DIGITS = 15;
  const PHONE_MAX_LENGTH = 24;
  const PHONE_PATTERN = "(?=(?:\\D*\\d){10,15}\\D*$)[+\\d\\s().-]+";
  const PHONE_ERROR_MESSAGE = "Укажите номер телефона от 10 до 15 цифр.";

  function enableLeadPayloadPrivacy() {
    if (window.__NEWBUILD_LEAD_PAYLOAD_PRIVACY__ === true) return true;
    if (typeof collectFormData !== "function" || typeof sendLead !== "function") return false;

    const originalCollectFormData = collectFormData;
    collectFormData = function collectLeadDataWithoutDeviceFingerprint(form) {
      const data = originalCollectFormData(form);
      delete data.user_agent;
      return data;
    };

    const originalSendLead = sendLead;
    sendLead = async function sendLeadWithoutDeviceFingerprint(data) {
      const privateData = { ...(data || {}) };
      delete privateData.user_agent;
      return originalSendLead(privateData);
    };

    window.__NEWBUILD_LEAD_PAYLOAD_PRIVACY__ = true;
    return true;
  }

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

  function phoneDigitCount(value) {
    return (String(value || "").match(/\d/g) || []).length;
  }

  function validatePhoneField(field) {
    if (!field) return true;

    const value = String(field.value || "").trim();
    const digits = phoneDigitCount(value);
    const invalid = Boolean(value) && (digits < PHONE_MIN_DIGITS || digits > PHONE_MAX_DIGITS);

    field.setCustomValidity(invalid ? PHONE_ERROR_MESSAGE : "");
    setInvalidState(field, invalid);
    return !invalid;
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
      phone.pattern = PHONE_PATTERN;
      phone.maxLength = PHONE_MAX_LENGTH;
      phone.title = PHONE_ERROR_MESSAGE;
      phone.addEventListener("input", () => validatePhoneField(phone));
      phone.addEventListener("blur", () => validatePhoneField(phone));
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

  enableLeadPayloadPrivacy();
  forms.forEach(enhanceForm);
})();