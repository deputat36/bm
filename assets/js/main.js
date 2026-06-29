const SITE_CONFIG = {
  // Быстрый вариант для статического сайта: получить ключ на Web3Forms и вставить сюда.
  WEB3FORMS_ACCESS_KEY: "c6b147c0-0ce0-43cb-a41d-2d112b6f1364",

  // Альтернативный вариант: свой обработчик, Supabase Edge Function или CRM endpoint.
  LEAD_ENDPOINT: "",

  phoneDisplay: "8 903 857-69-09",
  phoneHref: "tel:+79038576909",
  vkLink: ""
};

const TRACKING_KEYS = [
  "utm_source",
  "utm_medium",
  "utm_campaign",
  "utm_content",
  "utm_term",
  "realtor",
  "realtor_id"
];

function getTrackingData() {
  const params = new URLSearchParams(window.location.search);
  const saved = JSON.parse(localStorage.getItem("prostornayaTracking") || "{}");
  const current = { ...saved };

  TRACKING_KEYS.forEach((key) => {
    const value = params.get(key);
    if (value) {
      current[key] = value.trim();
    }
  });

  localStorage.setItem("prostornayaTracking", JSON.stringify(current));
  return current;
}

function collectFormData(form) {
  const data = {};
  new FormData(form).forEach((value, key) => {
    data[key] = String(value).trim();
  });

  data.project = "ЖК Теллерманов сад";
  data.phone_for_contact = SITE_CONFIG.phoneDisplay;
  data.source = window.location.pathname;
  data.page_url = window.location.href;
  data.page_title = document.title;
  data.referrer = document.referrer;
  data.tracking = getTrackingData();
  data.created_at = new Date().toISOString();

  return data;
}

function leadToReadableText(data) {
  const tracking = data.tracking || {};

  return [
    `Проект: ${data.project || ""}`,
    `Имя: ${data.name || ""}`,
    `Телефон: ${data.phone || ""}`,
    `Интерес: ${data.interest || ""}`,
    `Комментарий: ${data.comment || ""}`,
    `Страница: ${data.page_url || data.source || ""}`,
    `Заголовок страницы: ${data.page_title || ""}`,
    `Источник перехода: ${data.referrer || ""}`,
    `utm_source: ${tracking.utm_source || ""}`,
    `utm_medium: ${tracking.utm_medium || ""}`,
    `utm_campaign: ${tracking.utm_campaign || ""}`,
    `utm_content: ${tracking.utm_content || ""}`,
    `utm_term: ${tracking.utm_term || ""}`,
    `realtor: ${tracking.realtor || ""}`,
    `realtor_id: ${tracking.realtor_id || ""}`,
    `Дата: ${data.created_at || ""}`
  ].join("\n");
}

async function sendWeb3FormsLead(data) {
  const payload = {
    access_key: SITE_CONFIG.WEB3FORMS_ACCESS_KEY,
    subject: `Заявка с сайта tellermanovsad.ru — ${data.interest || "консультация"}`,
    from_name: "Сайт ЖК Теллерманов сад",
    name: data.name || "",
    phone: data.phone || "",
    interest: data.interest || "",
    comment: data.comment || "",
    project: data.project || "ЖК Теллерманов сад",
    page_url: data.page_url || "",
    page_title: data.page_title || "",
    referrer: data.referrer || "",
    tracking: JSON.stringify(data.tracking || {}),
    created_at: data.created_at || "",
    message: leadToReadableText(data)
  };

  const response = await fetch("https://api.web3forms.com/submit", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload)
  });

  const result = await response.json().catch(() => ({}));

  if (!response.ok || result.success === false) {
    throw new Error(result.message || "Web3Forms error");
  }

  return result;
}

async function sendCustomLead(data) {
  const response = await fetch(SITE_CONFIG.LEAD_ENDPOINT, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data)
  });

  if (!response.ok) {
    throw new Error("Lead endpoint error");
  }

  return response.json().catch(() => ({}));
}

async function sendLead(data) {
  if (SITE_CONFIG.WEB3FORMS_ACCESS_KEY) {
    return sendWeb3FormsLead(data);
  }

  if (SITE_CONFIG.LEAD_ENDPOINT) {
    return sendCustomLead(data);
  }

  const saved = JSON.parse(localStorage.getItem("prostornayaLeadsDraft") || "[]");
  saved.push(data);
  localStorage.setItem("prostornayaLeadsDraft", JSON.stringify(saved));
  return { offline: true };
}

document.querySelectorAll("[data-lead-form]").forEach((form) => {
  getTrackingData();

  form.addEventListener("submit", async (event) => {
    event.preventDefault();

    const status = form.querySelector("[data-form-status]");
    const button = form.querySelector("button[type='submit']");
    const originalText = button ? button.textContent : "";

    if (button) {
      button.disabled = true;
      button.textContent = "Отправляем...";
    }

    try {
      const result = await sendLead(collectFormData(form));
      form.reset();

      if (status) {
        if (result.offline) {
          status.innerHTML = `Форма пока работает в тестовом режиме. Для быстрой связи позвоните: <a href="${SITE_CONFIG.phoneHref}">${SITE_CONFIG.phoneDisplay}</a>.`;
        } else {
          status.textContent = "Заявка отправлена. Мы свяжемся с вами по ЖК «Теллерманов сад».";
        }

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
});
