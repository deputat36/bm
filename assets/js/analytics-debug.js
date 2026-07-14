(function () {
  const params = new URLSearchParams(window.location.search);
  const enabled = params.get("analytics_test") === "debug"
    && params.get("lead_test") === "dry-run"
    && params.get("test_ack") === "1";

  if (!enabled) return;

  const STORAGE_KEY = "newbuildsBorisoglebskAnalyticsDebugEvents";
  const MAX_EVENTS = 100;
  const PROHIBITED_FIELDS = new Set([
    "name",
    "phone",
    "phone_normalized",
    "budget",
    "comment",
    "question",
    "consent_text",
    "client_fixation_id",
    "user_agent",
    "access_key",
    "fields_json",
    "message"
  ]);

  window.__NEWBUILD_ANALYTICS_DEBUG_MODE__ = true;
  document.body.dataset.analyticsTestMode = "debug";

  function sanitizeValue(value) {
    if (value === null || value === undefined) return value;
    if (["string", "number", "boolean"].includes(typeof value)) return value;
    if (Array.isArray(value)) return value.map(sanitizeValue).slice(0, 20);
    if (typeof value === "object") return sanitizePayload(value);
    return String(value);
  }

  function sanitizePayload(payload) {
    return Object.fromEntries(
      Object.entries(payload || {})
        .filter(([key]) => !PROHIBITED_FIELDS.has(key))
        .map(([key, value]) => [key, sanitizeValue(value)])
    );
  }

  function readEvents() {
    try {
      const parsed = JSON.parse(sessionStorage.getItem(STORAGE_KEY) || "[]");
      return Array.isArray(parsed) ? parsed : [];
    } catch (error) {
      return [];
    }
  }

  function writeEvents(events) {
    sessionStorage.setItem(STORAGE_KEY, JSON.stringify(events.slice(-MAX_EVENTS)));
  }

  function formatTime(iso) {
    try {
      return new Date(iso).toLocaleTimeString("ru-RU", { hour: "2-digit", minute: "2-digit", second: "2-digit" });
    } catch (error) {
      return "—";
    }
  }

  const panel = document.createElement("aside");
  panel.setAttribute("data-analytics-debug-panel", "");
  panel.setAttribute("aria-label", "Локальная проверка аналитики");
  panel.style.cssText = "position:fixed;right:12px;bottom:12px;z-index:10001;width:min(380px,calc(100vw - 24px));max-height:55vh;overflow:auto;padding:14px;border:2px solid #2563eb;border-radius:12px;background:#eff6ff;color:#172554;box-shadow:0 12px 35px rgba(15,23,42,.25);font:14px/1.4 system-ui,sans-serif";
  panel.innerHTML = [
    '<div style="display:flex;align-items:center;justify-content:space-between;gap:12px">',
    '<strong>Аналитика: локальный debug</strong>',
    '<button type="button" data-debug-toggle aria-expanded="true" style="border:0;background:transparent;color:inherit;cursor:pointer;font-weight:700">Скрыть</button>',
    '</div>',
    '<p style="margin:8px 0">События сохраняются только в sessionStorage и не отправляются в GA или Метрику.</p>',
    '<div data-debug-body>',
    '<p style="margin:8px 0"><strong data-debug-count>0</strong> событий</p>',
    '<ol data-debug-events style="margin:8px 0;padding-left:22px"></ol>',
    '<div style="display:flex;flex-wrap:wrap;gap:8px">',
    '<button type="button" data-debug-copy style="padding:7px 10px;border:1px solid #2563eb;border-radius:8px;background:#fff;cursor:pointer">Копировать JSON</button>',
    '<button type="button" data-debug-clear style="padding:7px 10px;border:1px solid #2563eb;border-radius:8px;background:#fff;cursor:pointer">Очистить</button>',
    '</div>',
    '<p data-debug-status role="status" aria-live="polite" style="margin:8px 0 0"></p>',
    '</div>'
  ].join("");
  document.body.appendChild(panel);

  const body = panel.querySelector("[data-debug-body]");
  const list = panel.querySelector("[data-debug-events]");
  const count = panel.querySelector("[data-debug-count]");
  const status = panel.querySelector("[data-debug-status]");
  const toggle = panel.querySelector("[data-debug-toggle]");

  function render() {
    const events = readEvents();
    count.textContent = String(events.length);
    const recent = events.slice(-8).reverse();
    list.innerHTML = recent.length
      ? recent.map((item) => `<li><code>${String(item.event || "unknown")}</code> — ${formatTime(item.recorded_at)}</li>`).join("")
      : "<li>Событий пока нет</li>";
  }

  async function copyEvents() {
    const json = JSON.stringify(readEvents(), null, 2);
    try {
      await navigator.clipboard.writeText(json);
      status.textContent = "JSON скопирован.";
    } catch (error) {
      const textarea = document.createElement("textarea");
      textarea.value = json;
      textarea.style.position = "fixed";
      textarea.style.opacity = "0";
      document.body.appendChild(textarea);
      textarea.select();
      document.execCommand("copy");
      textarea.remove();
      status.textContent = "JSON скопирован резервным способом.";
    }
  }

  window.recordPortalAnalyticsDebugEvent = function (payload) {
    const safePayload = sanitizePayload(payload);
    const events = readEvents();
    events.push({
      ...safePayload,
      debug_only: true,
      recorded_at: new Date().toISOString(),
      page_path: safePayload.page_path || window.location.pathname
    });
    writeEvents(events);
    render();
    window.dispatchEvent(new CustomEvent("portalAnalyticsDebugEvent", { detail: safePayload }));
  };

  panel.querySelector("[data-debug-copy]")?.addEventListener("click", copyEvents);
  panel.querySelector("[data-debug-clear]")?.addEventListener("click", () => {
    sessionStorage.removeItem(STORAGE_KEY);
    status.textContent = "Локальный журнал очищен.";
    render();
  });
  toggle?.addEventListener("click", () => {
    const expanded = toggle.getAttribute("aria-expanded") === "true";
    toggle.setAttribute("aria-expanded", String(!expanded));
    toggle.textContent = expanded ? "Показать" : "Скрыть";
    body.hidden = expanded;
  });

  render();
})();
