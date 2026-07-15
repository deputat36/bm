(() => {
  const forms = Array.from(document.querySelectorAll("form[data-lead-form]"));
  if (!forms.length) return;

  const PHONE_MIN_DIGITS = 10;
  const PHONE_MAX_DIGITS = 15;
  const PHONE_MAX_LENGTH = 24;
  const PHONE_PATTERN = "(?=(?:\\D*\\d){10,15}\\D*$)[+\\d\\s().-]+";
  const PHONE_ERROR_MESSAGE = "Укажите номер телефона от 10 до 15 цифр.";
  const SUCCESS_COOLDOWN_STORAGE_KEY = "newbuildsBorisoglebskLeadSuccessCooldowns";
  const SUCCESS_COOLDOWN_MS = 30_000;
  const SUCCESS_COOLDOWN_RETENTION_MS = 5 * 60_000;
  const ATTRIBUTION_STORAGE_KEY = "newbuildsBorisoglebskTracking";
  const ATTRIBUTION_RETENTION_MS = 30 * 24 * 60 * 60_000;
  const ATTRIBUTION_FUTURE_SKEW_MS = 5 * 60_000;

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

  function isFreshAttributionTouch(touch, now = Date.now()) {
    const capturedAt = Date.parse(String(touch?.captured_at || ""));
    if (!Number.isFinite(capturedAt)) return false;
    if (capturedAt > now + ATTRIBUTION_FUTURE_SKEW_MS) return false;
    return now - capturedAt <= ATTRIBUTION_RETENTION_MS;
  }

  function pruneAttributionTracking(tracking) {
    const source = tracking && typeof tracking === "object" && !Array.isArray(tracking) ? tracking : {};
    const firstTouchFresh = isFreshAttributionTouch(source.first_touch);
    const lastTouchFresh = isFreshAttributionTouch(source.last_touch);
    const keepCurrent = firstTouchFresh || lastTouchFresh;

    return {
      first_touch: firstTouchFresh ? source.first_touch : {},
      last_touch: lastTouchFresh ? source.last_touch : {},
      current: keepCurrent && source.current && typeof source.current === "object" && !Array.isArray(source.current)
        ? source.current
        : {}
    };
  }

  function persistAttributionTracking(tracking) {
    try {
      localStorage.setItem(ATTRIBUTION_STORAGE_KEY, JSON.stringify(tracking));
      return true;
    } catch (error) {
      return false;
    }
  }

  function enableAttributionRetention() {
    if (window.__NEWBUILD_ATTRIBUTION_RETENTION__ === true) return true;
    if (typeof getTrackingData !== "function" || typeof collectFormData !== "function") return false;

    try {
      const stored = JSON.parse(localStorage.getItem(ATTRIBUTION_STORAGE_KEY) || "{}");
      persistAttributionTracking(pruneAttributionTracking(stored));
    } catch (error) {
      persistAttributionTracking(pruneAttributionTracking({}));
    }

    const originalGetTrackingData = getTrackingData;
    getTrackingData = function getRetainedTrackingData() {
      const tracking = pruneAttributionTracking(originalGetTrackingData());
      persistAttributionTracking(tracking);
      return tracking;
    };

    const originalCollectFormData = collectFormData;
    collectFormData = function collectFormDataWithRetainedAttribution(form) {
      const data = originalCollectFormData(form);
      data.tracking = pruneAttributionTracking(data.tracking);
      return data;
    };

    window.__NEWBUILD_ATTRIBUTION_RETENTION__ = true;
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

  function readSuccessCooldowns() {
    try {
      const parsed = JSON.parse(sessionStorage.getItem(SUCCESS_COOLDOWN_STORAGE_KEY) || "{}");
      const source = parsed && typeof parsed === "object" && !Array.isArray(parsed) ? parsed : {};
      const now = Date.now();
      const sanitized = {};

      Object.entries(source).forEach(([formId, rawTimestamp]) => {
        const timestamp = Number(rawTimestamp);
        if (!formId || !Number.isFinite(timestamp)) return;
        if (timestamp > now + 60_000) return;
        if (now - timestamp > SUCCESS_COOLDOWN_RETENTION_MS) return;
        sanitized[formId] = timestamp;
      });

      return sanitized;
    } catch (error) {
      return {};
    }
  }

  function writeSuccessCooldowns(cooldowns) {
    try {
      sessionStorage.setItem(SUCCESS_COOLDOWN_STORAGE_KEY, JSON.stringify(cooldowns));
      return true;
    } catch (error) {
      return false;
    }
  }

  function markSuccessfulSubmission(detail) {
    if (!detail || detail.blocked || detail.offline) return false;
    const formId = String(detail.form_id || "").trim();
    if (!formId) return false;

    const cooldowns = readSuccessCooldowns();
    cooldowns[formId] = Date.now();
    return writeSuccessCooldowns(cooldowns);
  }

  function getCooldownSeconds(formId) {
    if (!formId) return 0;
    const timestamp = Number(readSuccessCooldowns()[formId]);
    if (!Number.isFinite(timestamp)) return 0;
    return Math.max(0, Math.ceil((timestamp + SUCCESS_COOLDOWN_MS - Date.now()) / 1000));
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

    form.addEventListener("submit", (event) => {
      const seconds = getCooldownSeconds(String(form.dataset.formId || "").trim());
      if (seconds <= 0) return;

      event.preventDefault();
      event.stopImmediatePropagation();
      if (status) {
        status.textContent = `Заявка уже отправлена. Повторите через ${seconds} сек.`;
        status.classList.add("is-visible");
        status.focus({ preventScroll: false });
      }
    }, true);

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
  enableAttributionRetention();
  forms.forEach(enhanceForm);
  window.addEventListener("newbuildLeadSubmit", (event) => markSuccessfulSubmission(event.detail || {}));
})();