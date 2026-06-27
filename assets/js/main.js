const SITE_CONFIG = {
  // После подключения Supabase/CRM/Google Forms сюда ставится URL обработчика.
  LEAD_ENDPOINT: "",
  phoneDisplay: "",
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
      await sendLead(collectFormData(form));
      form.reset();
      if (status) {
        status.textContent = SITE_CONFIG.LEAD_ENDPOINT
          ? "Заявка отправлена. Мы свяжемся с вами после уточнения информации по дому."
          : "Форма готова. Для реального сбора заявок подключите обработчик в assets/js/main.js.";
        status.classList.add("is-visible");
      }
    } catch (error) {
      if (status) {
        status.textContent = "Не удалось отправить заявку. Попробуйте ещё раз или позвоните специалисту.";
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
