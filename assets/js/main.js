const SITE_CONFIG = {
  WEB3FORMS_ACCESS_KEY: ["c6b147c0", "0ce0", "43cb", "a41d", "2d112b6f1364"].join("-"),
  LEAD_ENDPOINT: "",
  SEND_EMAIL_COPY: true,
  ENABLE_THANK_YOU_REDIRECT: true,
  project: "Портал Новостройки Борисоглебска",
  projectId: "newbuilds-borisoglebsk",
  projectName: "Новостройки Борисоглебска",
  defaultComplex: "Общий подбор новостройки",
  phoneDisplay: "8 903 857-69-09",
  phoneHref: "tel:+79038576909",
  privacyPath: "/privacy/",
  consentPath: "/personal-data-consent/",
  thankYouPath: "/spasibo/"
};

const TRACKING_KEYS = [
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
];

const TRACKING_STORAGE_KEY = "newbuildsBorisoglebskTracking";
const LEGACY_TRACKING_STORAGE_KEY = "prostornayaTracking";
const DRAFT_STORAGE_KEY = "newbuildsBorisoglebskLeadsDraft";
const LAST_LEAD_STORAGE_KEY = "newbuildsBorisoglebskLastLead";

function safeJsonParse(value, fallback) {
  try {
    return JSON.parse(value) || fallback;
  } catch (error) {
    return fallback;
  }
}

function getTrackingData() {
  const params = new URLSearchParams(window.location.search);
  const saved = safeJsonParse(localStorage.getItem(TRACKING_STORAGE_KEY), {});
  const legacy = safeJsonParse(localStorage.getItem(LEGACY_TRACKING_STORAGE_KEY), {});
  const incoming = {};

  TRACKING_KEYS.forEach((key) => {
    const value = params.get(key);
    if (value) incoming[key] = value.trim();
  });

  const hasIncomingTracking = Object.keys(incoming).length > 0;
  const now = new Date().toISOString();
  const pageSnapshot = {
    page_url: window.location.href,
    page_path: window.location.pathname,
    page_title: document.title,
    referrer: document.referrer || "",
    captured_at: now
  };

  const firstTouch = saved.first_touch || {
    ...pageSnapshot,
    values: { ...legacy, ...incoming }
  };

  const lastTouch = hasIncomingTracking
    ? { ...pageSnapshot, values: incoming }
    : saved.last_touch || { ...pageSnapshot, values: { ...legacy } };

  const tracking = {
    first_touch: firstTouch,
    last_touch: lastTouch,
    current: { ...legacy, ...(saved.current || {}), ...incoming }
  };

  localStorage.setItem(TRACKING_STORAGE_KEY, JSON.stringify(tracking));
  return tracking;
}

function normalizePhone(phone) {
  return String(phone || "").replace(/[^\d+]/g, "");
}

function createClientFixationId() {
  const date = new Date().toISOString().slice(0, 10).replace(/-/g, "");
  const randomPart = Math.random().toString(36).slice(2, 8).toUpperCase();
  return `NB-${date}-${randomPart}`;
}

function getConsentText(form) {
  const consent = form.querySelector("[data-consent-field] span");
  return consent ? consent.textContent.replace(/\s+/g, " ").trim() : "Согласие на обработку персональных данных для обработки заявки и обратной связи.";
}

function qualifyLead(data) {
  let score = 0;
  const reasons = [];
  const leadType = String(data.lead_type || "").toLowerCase();
  const budget = String(data.budget || data.comment || "").toLowerCase();
  const timeline = String(data.timeline || data.purchase_timeline || "").toLowerCase();
  const purchaseMethod = String(data.purchase_method || data.mortgage_program || "").toLowerCase();
  const callbackTime = String(data.callback_time || data.convenient_time || "").toLowerCase();

  if (normalizePhone(data.phone).length >= 10) {
    score += 15;
    reasons.push("оставлен телефон");
  }

  if (data.room_type || data.interest) {
    score += 10;
    reasons.push("понятен интерес по квартире или услуге");
  }

  if (budget && !["не знаю", "пока не знаю", ""].includes(budget)) {
    score += 15;
    reasons.push("указан бюджет или финансовый ориентир");
  }

  if (purchaseMethod) {
    score += 15;
    reasons.push("указан способ покупки или ипотечная программа");
  }

  if (timeline.includes("сейчас") || timeline.includes("месяц") || timeline.includes("1-2") || timeline.includes("ближай")) {
    score += 20;
    reasons.push("короткий срок принятия решения");
  } else if (timeline) {
    score += 8;
    reasons.push("указан срок покупки");
  }

  if (leadType.includes("callback") || callbackTime) {
    score += 15;
    reasons.push("запрошен звонок");
  }

  if (leadType.includes("mortgage") || purchaseMethod.includes("ипотек")) {
    score += 10;
    reasons.push("нужна ипотечная квалификация");
  }

  if (String(data.own_property_to_sell || "").toLowerCase().includes("да")) {
    score += 8;
    reasons.push("есть встречная продажа");
  }

  const status = score >= 65 ? "hot" : score >= 40 ? "warm" : "cold";
  const priority = status === "hot" ? "срочно обработать" : status === "warm" ? "обработать в рабочий день" : "добавить в прогрев";

  return {
    score,
    status,
    priority,
    reasons
  };
}

function collectFormData(form) {
  const data = {};

  new FormData(form).forEach((value, key) => {
    data[key] = String(value).trim();
  });

  const startedAt = Number(form.dataset.startedAt || Date.now());
  const submitTimeSeconds = Math.max(0, Math.round((Date.now() - startedAt) / 1000));
  const honeypotFilled = Boolean(data.website);

  data.project = data.project || form.dataset.project || SITE_CONFIG.project;
  data.project_id = data.project_id || form.dataset.projectId || SITE_CONFIG.projectId;
  data.project_name = data.project_name || form.dataset.projectName || SITE_CONFIG.projectName || data.project;
  data.residential_complex = data.residential_complex || form.dataset.complex || SITE_CONFIG.defaultComplex;
  data.residential_complex_id = data.residential_complex_id || form.dataset.complexId || "";
  data.lead_type = data.lead_type || form.dataset.leadType || "general";
  data.form_id = data.form_id || form.dataset.formId || `${data.lead_type}_${window.location.pathname.replace(/[^a-zа-я0-9]/gi, "_")}`;
  data.phone_normalized = normalizePhone(data.phone);
  data.phone_for_contact = SITE_CONFIG.phoneDisplay;
  data.source = window.location.pathname;
  data.page_url = window.location.href;
  data.page_title = document.title;
  data.referrer = document.referrer;
  data.tracking = getTrackingData();
  data.created_at = new Date().toISOString();
  data.client_fixation_id = createClientFixationId();
  data.client_fixation_basis = "Заявка с формы сайта с сохранением страницы, времени, формы, согласия и рекламных меток.";
  data.personal_data_consent = form.querySelector("input[name='consent']")?.checked ? "yes" : "no";
  data.marketing_consent = form.querySelector("input[name='marketing_consent']")?.checked ? "yes" : "no";
  data.consent_text = getConsentText(form);
  data.policy_url = new URL(SITE_CONFIG.privacyPath, window.location.origin).href;
  data.consent_url = new URL(SITE_CONFIG.consentPath, window.location.origin).href;
  data.user_agent = navigator.userAgent;
  data.submit_time_seconds = submitTimeSeconds;
  data.spam_check = {
    honeypot_empty: !honeypotFilled,
    submit_time_seconds: submitTimeSeconds,
    suspicious_fast_submit: submitTimeSeconds < 2,
    likely_bot: honeypotFilled
  };
  delete data.website;
  data.qualification = qualifyLead(data);

  return data;
}

function leadToReadableText(data) {
  const tracking = data.tracking || {};
  const current = tracking.current || {};
  const firstTouch = tracking.first_touch || {};
  const lastTouch = tracking.last_touch || {};
  const qualification = data.qualification || {};

  return [
    `Тип заявки: ${data.lead_type || ""}`,
    `ID фиксации клиента: ${data.client_fixation_id || ""}`,
    `Проект: ${data.project || ""}`,
    `ID проекта: ${data.project_id || ""}`,
    `Название проекта: ${data.project_name || ""}`,
    `ЖК: ${data.residential_complex || ""}`,
    `ID ЖК: ${data.residential_complex_id || ""}`,
    `Имя: ${data.name || ""}`,
    `Телефон: ${data.phone || ""}`,
    `Телефон нормализованный: ${data.phone_normalized || ""}`,
    `Интерес: ${data.interest || data.room_type || ""}`,
    `Бюджет: ${data.budget || ""}`,
    `Способ покупки: ${data.purchase_method || data.mortgage_program || ""}`,
    `Срок покупки: ${data.timeline || data.purchase_timeline || ""}`,
    `Комментарий: ${data.comment || data.question || ""}`,
    `Квалификация: ${qualification.status || ""}, ${qualification.score || 0} баллов, ${qualification.priority || ""}`,
    `Причины квалификации: ${(qualification.reasons || []).join(", ")}`,
    `Время заполнения формы: ${data.submit_time_seconds || 0} сек.`,
    `Форма: ${data.form_id || ""}`,
    `Страница: ${data.page_url || data.source || ""}`,
    `Заголовок страницы: ${data.page_title || ""}`,
    `Источник перехода: ${data.referrer || ""}`,
    `Первое касание: ${firstTouch.page_url || ""}`,
    `Последнее касание: ${lastTouch.page_url || ""}`,
    `utm_source: ${current.utm_source || ""}`,
    `utm_medium: ${current.utm_medium || ""}`,
    `utm_campaign: ${current.utm_campaign || ""}`,
    `utm_content: ${current.utm_content || ""}`,
    `utm_term: ${current.utm_term || ""}`,
    `gclid: ${current.gclid || ""}`,
    `yclid: ${current.yclid || ""}`,
    `vkclid: ${current.vkclid || ""}`,
    `realtor: ${current.realtor || ""}`,
    `realtor_id: ${current.realtor_id || ""}`,
    `Согласие на обработку данных: ${data.personal_data_consent || ""}`,
    `Согласие на новости/ожидание: ${data.marketing_consent || ""}`,
    `Текст согласия: ${data.consent_text || ""}`,
    `Политика обработки данных: ${data.policy_url || ""}`,
    `Страница согласия: ${data.consent_url || ""}`,
    `Дата: ${data.created_at || ""}`
  ].join("\n");
}

async function sendWeb3FormsLead(data) {
  const payload = {
    access_key: SITE_CONFIG.WEB3FORMS_ACCESS_KEY,
    subject: `Заявка ${data.lead_type || "general"} — ${data.residential_complex || data.project || "Новостройки Борисоглебска"}`,
    from_name: "Портал Новостройки Борисоглебска",
    name: data.name || "",
    phone: data.phone || "",
    lead_type: data.lead_type || "",
    form_id: data.form_id || "",
    interest: data.interest || data.room_type || "",
    budget: data.budget || "",
    purchase_method: data.purchase_method || data.mortgage_program || "",
    timeline: data.timeline || data.purchase_timeline || "",
    comment: data.comment || data.question || "",
    project: data.project || "",
    project_id: data.project_id || "",
    project_name: data.project_name || "",
    residential_complex: data.residential_complex || "",
    residential_complex_id: data.residential_complex_id || "",
    client_fixation_id: data.client_fixation_id || "",
    qualification_status: data.qualification?.status || "",
    qualification_score: String(data.qualification?.score || 0),
    page_url: data.page_url || "",
    page_title: data.page_title || "",
    referrer: data.referrer || "",
    tracking: JSON.stringify(data.tracking || {}),
    personal_data_consent: data.personal_data_consent || "yes",
    marketing_consent: data.marketing_consent || "no",
    consent_text: data.consent_text || "",
    policy_url: data.policy_url || "",
    consent_url: data.consent_url || "",
    submit_time_seconds: String(data.submit_time_seconds || 0),
    created_at: data.created_at || "",
    fields_json: JSON.stringify(data, null, 2),
    message: leadToReadableText(data)
  };

  const response = await fetch("https://api.web3forms.com/submit", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload)
  });

  const result = await response.json().catch(() => ({}));
  if (!response.ok || result.success === false) throw new Error(result.message || "Web3Forms error");
  return result;
}

async function sendCustomLead(data) {
  const response = await fetch(SITE_CONFIG.LEAD_ENDPOINT, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data)
  });

  if (!response.ok) throw new Error("Lead endpoint error");
  return response.json().catch(() => ({}));
}

async function sendLead(data) {
  const tasks = [];

  if (data.spam_check?.likely_bot) {
    return { blocked: true };
  }

  if (SITE_CONFIG.LEAD_ENDPOINT) tasks.push(sendCustomLead(data));
  if (SITE_CONFIG.WEB3FORMS_ACCESS_KEY && SITE_CONFIG.SEND_EMAIL_COPY) tasks.push(sendWeb3FormsLead(data));

  if (!tasks.length) {
    const saved = safeJsonParse(localStorage.getItem(DRAFT_STORAGE_KEY), []);
    saved.push(data);
    localStorage.setItem(DRAFT_STORAGE_KEY, JSON.stringify(saved));
    return { offline: true };
  }

  const results = await Promise.allSettled(tasks);
  const success = results.find((result) => result.status === "fulfilled");
  if (success) return success.value || { success: true };

  throw new Error("All lead destinations failed");
}

function addHiddenField(form, name, value) {
  if (!value || form.querySelector(`[name='${name}']`)) return;
  const input = document.createElement("input");
  input.type = "hidden";
  input.name = name;
  input.value = value;
  form.prepend(input);
}

function addHoneypot(form) {
  if (form.querySelector("[data-honeypot-field]")) return;

  const field = document.createElement("label");
  field.className = "honeypot-field";
  field.setAttribute("data-honeypot-field", "");
  field.setAttribute("aria-hidden", "true");
  field.innerHTML = `Сайт<input name="website" tabindex="-1" autocomplete="off" placeholder="Не заполняйте это поле">`;
  form.prepend(field);
}

function addConsent(form) {
  if (form.querySelector("[data-consent-field]")) return;

  const button = form.querySelector("button[type='submit']");
  if (!button) return;

  const label = document.createElement("label");
  label.className = "consent-field";
  label.setAttribute("data-consent-field", "");
  label.innerHTML = `<input type="checkbox" name="consent" value="yes" required> <span>Согласен на обработку персональных данных для обработки заявки, обратной связи и фиксации обращения. Ознакомлен с <a href="${SITE_CONFIG.privacyPath}" target="_blank" rel="noopener">политикой обработки данных</a> и <a href="${SITE_CONFIG.consentPath}" target="_blank" rel="noopener">согласием на обработку персональных данных</a>. Заявка не является бронью квартиры и не фиксирует цену.</span>`;

  button.parentNode.insertBefore(label, button);
}

function saveLastLead(data) {
  const safeLead = {
    client_fixation_id: data.client_fixation_id,
    lead_type: data.lead_type,
    form_id: data.form_id,
    project_id: data.project_id,
    project_name: data.project_name,
    residential_complex: data.residential_complex,
    residential_complex_id: data.residential_complex_id,
    qualification: data.qualification,
    created_at: data.created_at
  };

  localStorage.setItem(LAST_LEAD_STORAGE_KEY, JSON.stringify(safeLead));
}

function trackLeadEvent(data, result = {}) {
  const eventPayload = {
    event: "lead_submit",
    lead_type: data.lead_type,
    form_id: data.form_id,
    project_id: data.project_id,
    project_name: data.project_name,
    residential_complex: data.residential_complex,
    residential_complex_id: data.residential_complex_id,
    client_fixation_id: data.client_fixation_id,
    qualification_status: data.qualification?.status || "",
    qualification_score: data.qualification?.score || 0,
    blocked: Boolean(result.blocked),
    offline: Boolean(result.offline)
  };

  window.dataLayer = window.dataLayer || [];
  window.dataLayer.push(eventPayload);

  if (typeof window.gtag === "function") {
    window.gtag("event", "lead_submit", {
      event_category: "lead",
      event_label: data.lead_type,
      form_id: data.form_id,
      value: data.qualification?.score || 0
    });
  }

  if (typeof window.ym === "function") {
    const counters = window.Ya?._metrika?.counters || {};
    Object.keys(counters).forEach((counterId) => {
      window.ym(counterId, "reachGoal", "lead_submit", eventPayload);
    });
  }

  window.dispatchEvent(new CustomEvent("newbuildLeadSubmit", { detail: eventPayload }));
}

function buildThankYouUrl(data) {
  const url = new URL(SITE_CONFIG.thankYouPath, window.location.origin);
  url.searchParams.set("type", data.lead_type || "general");
  url.searchParams.set("id", data.client_fixation_id || "");
  url.searchParams.set("status", data.qualification?.status || "");
  return url.toString();
}

function shouldRedirectAfterSuccess(form, result) {
  if (result?.blocked || result?.offline) return false;
  if (form.dataset.redirectSuccess === "false") return false;
  return SITE_CONFIG.ENABLE_THANK_YOU_REDIRECT || form.dataset.redirectSuccess === "true";
}

function enhanceLeadForm(form) {
  getTrackingData();
  form.dataset.startedAt = String(Date.now());
  addHoneypot(form);
  addHiddenField(form, "lead_type", form.dataset.leadType);
  addHiddenField(form, "form_id", form.dataset.formId);
  addHiddenField(form, "project", form.dataset.project || SITE_CONFIG.project);
  addHiddenField(form, "project_id", form.dataset.projectId || SITE_CONFIG.projectId);
  addHiddenField(form, "project_name", form.dataset.projectName || SITE_CONFIG.projectName);
  addHiddenField(form, "residential_complex", form.dataset.complex || SITE_CONFIG.defaultComplex);
  addHiddenField(form, "residential_complex_id", form.dataset.complexId);
  addConsent(form);

  form.addEventListener("submit", async (event) => {
    event.preventDefault();

    const status = form.querySelector("[data-form-status]");
    const button = form.querySelector("button[type='submit']");
    const originalText = button ? button.textContent : "";

    if (!form.checkValidity()) {
      form.reportValidity();
      return;
    }

    if (button) {
      button.disabled = true;
      button.textContent = "Отправляем...";
    }

    try {
      const data = collectFormData(form);
      const result = await sendLead(data);
      saveLastLead(data);
      trackLeadEvent(data, result);
      form.reset();
      form.dataset.startedAt = String(Date.now());

      if (result.blocked) {
        return;
      }

      if (shouldRedirectAfterSuccess(form, result)) {
        window.location.href = buildThankYouUrl(data);
        return;
      }

      if (status) {
        status.innerHTML = result.offline
          ? `Форма пока работает в тестовом режиме. Для быстрой связи позвоните: <a href="${SITE_CONFIG.phoneHref}">${SITE_CONFIG.phoneDisplay}</a>.`
          : form.dataset.successMessage || "Заявка отправлена. Специалист свяжется с вами и уточнит детали.";
        status.classList.add("is-visible");
      }
    } catch (error) {
      if (status) {
        status.innerHTML = `Не удалось отправить заявку. Позвоните специалисту: <a href="${SITE_CONFIG.phoneHref}">${SITE_CONFIG.phoneDisplay}</a>.`;
        status.classList.add("is-visible");
      }
    } finally {
      if (button) {
        button.disabled = false;
        button.textContent = originalText;
      }
    }
  });
}

document.querySelectorAll("[data-lead-form]").forEach(enhanceLeadForm);
