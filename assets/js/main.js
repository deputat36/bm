const SITE_CONFIG = {
  // После подключения Web3Forms/Supabase/CRM сюда ставится URL обработчика.
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
  data.page_title = document.title;
  data.referrer = document.referrer;
  data.tracking = getTrackingData();
  data.created_at = new Date().toISOString();
  return data;
}

async function sendLead(data) {
  if (!SITE_CONFIG.LEAD_ENDPOINT) {
    const saved = JSON.parse(localStorage.getItem("prostornayaLeadsDraft") || "[]");
    saved.push(data);
    localStorage.setItem("prostornayaLeadsDraft", JSON.stringify(saved));
    return { offline: true };
  }

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
