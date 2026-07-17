(() => {
  "use strict";

  const MATRIX_URL = "../data/qa/form-scenarios.json";
  const CONTRACT_URL = "../data/qa/form-execution-contract.json";
  const RESULTS_URL = "../data/qa/form-results.json";
  const STORAGE_KEY = "newbuildsBorisoglebskFormQaRunnerV1";
  const ALLOWED_DEVICES = new Set(["desktop", "android", "iphone"]);
  const ALLOWED_STATUSES = new Set(["not_run", "passed", "failed", "blocked"]);
  const STATUS_LABELS = {
    not_run: "Не проверено",
    passed: "Пройдено",
    failed: "Ошибка",
    blocked: "Заблокировано"
  };
  const DEVICE_LABELS = {
    desktop: "компьютере",
    android: "Android",
    iphone: "iPhone"
  };
  const EMAIL_PATTERN = /[^\s@]+@[^\s@]+\.[^\s@]+/i;
  const PHONE_PATTERN = /(?:^|\D)(?:\+?7|8)[\s().-]*\d{3}[\s().-]*\d{3}[\s().-]*\d{2}[\s().-]*\d{2}(?:\D|$)/;

  const elements = {
    device: document.querySelector("[data-qa-device]"),
    browser: document.querySelector("[data-qa-browser]"),
    os: document.querySelector("[data-qa-os]"),
    deviceTitle: document.querySelector("[data-qa-device-title]"),
    scenarios: document.querySelector("[data-qa-scenarios]"),
    resilience: document.querySelector("[data-qa-resilience]"),
    status: document.querySelector("[data-qa-global-status]"),
    exportResults: document.querySelector("[data-qa-export-results]"),
    exportEvidence: document.querySelector("[data-qa-export-evidence]"),
    clearDevice: document.querySelector("[data-qa-clear-device]"),
    summary: {
      total: document.querySelector("[data-summary-total]"),
      recorded: document.querySelector("[data-summary-recorded]"),
      passed: document.querySelector("[data-summary-passed]"),
      failed: document.querySelector("[data-summary-failed]"),
      blocked: document.querySelector("[data-summary-blocked]")
    }
  };

  let matrix = null;
  let contract = null;
  let repositoryResults = null;
  let state = createEmptyState();

  function createEmptyState() {
    return {
      schema_version: "1.0",
      selected_device: "desktop",
      environment: {
        desktop: { browser: "", os: "" },
        android: { browser: "", os: "" },
        iphone: { browser: "", os: "" }
      },
      slots: {},
      resilience: {}
    };
  }

  function safeParse(value, fallback) {
    try {
      const parsed = JSON.parse(value);
      return parsed && typeof parsed === "object" ? parsed : fallback;
    } catch (error) {
      return fallback;
    }
  }

  function readStoredState() {
    try {
      return safeParse(localStorage.getItem(STORAGE_KEY) || "", createEmptyState());
    } catch (error) {
      return createEmptyState();
    }
  }

  function sanitizeText(value, maxLength) {
    return String(value || "")
      .replace(/[\u0000-\u001f\u007f]/g, "")
      .trim()
      .slice(0, maxLength);
  }

  function normalizeState(raw) {
    const clean = createEmptyState();
    const selected = sanitizeText(raw?.selected_device, 20);
    clean.selected_device = ALLOWED_DEVICES.has(selected) ? selected : "desktop";

    ALLOWED_DEVICES.forEach((device) => {
      clean.environment[device] = {
        browser: sanitizeText(raw?.environment?.[device]?.browser, 80),
        os: sanitizeText(raw?.environment?.[device]?.os, 80)
      };
    });

    const rawSlots = raw?.slots && typeof raw.slots === "object" ? raw.slots : {};
    Object.entries(rawSlots).forEach(([key, value]) => {
      const status = sanitizeText(value?.status, 20);
      const checks = value?.checks && typeof value.checks === "object" ? value.checks : {};
      clean.slots[key] = {
        status: ALLOWED_STATUSES.has(status) ? status : "not_run",
        tested_at: sanitizeText(value?.tested_at, 40),
        evidence_reference: sanitizeText(value?.evidence_reference, 300),
        event_log_attached: value?.event_log_attached === true,
        notes: sanitizeText(value?.notes, 1000),
        checks: Object.fromEntries(Object.entries(checks).map(([id, checked]) => [sanitizeText(id, 80), checked === true]))
      };
    });

    const rawResilience = raw?.resilience && typeof raw.resilience === "object" ? raw.resilience : {};
    Object.entries(rawResilience).forEach(([key, value]) => {
      const status = sanitizeText(value?.status, 20);
      clean.resilience[key] = {
        status: ALLOWED_STATUSES.has(status) ? status : "not_run",
        tested_at: sanitizeText(value?.tested_at, 40),
        notes: sanitizeText(value?.notes, 1000)
      };
    });

    return clean;
  }

  function saveState() {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
      return true;
    } catch (error) {
      showGlobalStatus("Не удалось сохранить прогресс в браузере. Скачайте evidence до закрытия страницы.", true);
      return false;
    }
  }

  function showGlobalStatus(message, isError = false) {
    if (!elements.status) return;
    elements.status.textContent = message;
    elements.status.classList.add("is-visible");
    elements.status.style.background = isError ? "#fff0ee" : "#eef7ed";
    elements.status.style.color = isError ? "#8d1b13" : "#1f5e2a";
    elements.status.focus({ preventScroll: true });
  }

  function clearGlobalStatus() {
    if (!elements.status) return;
    elements.status.textContent = "";
    elements.status.classList.remove("is-visible");
  }

  async function loadJson(url) {
    const response = await fetch(url, { cache: "no-store", credentials: "same-origin" });
    if (!response.ok) throw new Error(`${url}: HTTP ${response.status}`);
    return response.json();
  }

  function slotKey(scenarioId, device) {
    return `${scenarioId}__${device}`;
  }

  function resilienceKey(checkId, device) {
    return `${checkId}__${device}`;
  }

  function createSlot() {
    return {
      status: "not_run",
      tested_at: "",
      evidence_reference: "",
      event_log_attached: false,
      notes: "",
      checks: {}
    };
  }

  function getSlot(scenarioId, device) {
    const key = slotKey(scenarioId, device);
    if (!state.slots[key]) state.slots[key] = createSlot();
    return state.slots[key];
  }

  function getResilience(checkId, device) {
    const key = resilienceKey(checkId, device);
    if (!state.resilience[key]) {
      state.resilience[key] = { status: "not_run", tested_at: "", notes: "" };
    }
    return state.resilience[key];
  }

  function buildScenarioUrl(scenario) {
    const url = new URL(scenario.page_path, matrix.base_url);
    Object.entries(matrix.test_parameters || {}).forEach(([key, value]) => {
      url.searchParams.set(key, String(value));
    });
    url.hash = scenario.anchor;
    return url.toString();
  }

  function createTextElement(tag, className, text) {
    const node = document.createElement(tag);
    if (className) node.className = className;
    node.textContent = text;
    return node;
  }

  function createChip(text, className = "") {
    return createTextElement("span", `qa-chip ${className}`.trim(), text);
  }

  function setSlotMessage(node, message = "") {
    node.textContent = message;
    node.classList.toggle("is-visible", Boolean(message));
  }

  function containsPersonalData(value) {
    const text = String(value || "");
    return EMAIL_PATTERN.test(text) || PHONE_PATTERN.test(text);
  }

  function allChecksPassed(slot) {
    return (contract.slot_checks || []).every((check) => slot.checks[check.id] === true);
  }

  function validateSlot(scenario, device, slot) {
    const environment = state.environment[device] || {};
    const errors = [];

    if (slot.status === "not_run") return errors;
    if (!environment.browser) errors.push("Укажите браузер и версию для устройства.");
    if (!environment.os) errors.push("Укажите ОС и версию для устройства.");
    if (containsPersonalData(slot.notes)) errors.push("Удалите телефон или email из заметки.");

    if (slot.status === "passed") {
      if (!allChecksPassed(slot)) errors.push("Для статуса «Пройдено» отметьте все десять проверок.");
      if (!slot.evidence_reference) errors.push("Добавьте ссылку или идентификатор evidence.");
      if (!slot.event_log_attached) errors.push("Подтвердите наличие обезличенного event log.");
    }

    if ((slot.status === "failed" || slot.status === "blocked") && !slot.notes) {
      errors.push("Для ошибки или блокировки добавьте пояснение.");
    }

    if (slot.evidence_reference.length > 300 || slot.notes.length > 1000) {
      errors.push("Сократите evidence или заметку до допустимой длины.");
    }

    if (!scenario) errors.push("Сценарий отсутствует в матрице.");
    return errors;
  }

  function updateSlotVisual(card, chip, slot) {
    card.dataset.status = slot.status;
    chip.textContent = STATUS_LABELS[slot.status] || STATUS_LABELS.not_run;
    updateSummary();
  }

  function renderScenario(scenario, device) {
    const slot = getSlot(scenario.id, device);
    const card = document.createElement("article");
    card.className = "qa-scenario";
    card.dataset.status = slot.status;
    card.dataset.scenarioId = scenario.id;

    const header = document.createElement("div");
    header.className = "qa-scenario__header";

    const headingBlock = document.createElement("div");
    headingBlock.append(
      createTextElement("span", "eyebrow", scenario.form_role === "primary" ? "Короткая форма" : "Подробная форма"),
      createTextElement("h3", "", scenario.label)
    );

    const meta = document.createElement("div");
    meta.className = "qa-scenario__meta";
    const statusChip = createChip(STATUS_LABELS[slot.status], "qa-status-chip");
    meta.append(
      createChip(`form_id: ${scenario.form_id}`),
      createChip(`lead_type: ${scenario.lead_type}`),
      createChip(`object: ${scenario.object_id}`),
      statusChip
    );
    headingBlock.append(meta);

    const openLink = document.createElement("a");
    openLink.className = "button";
    openLink.href = buildScenarioUrl(scenario);
    openLink.target = "_blank";
    openLink.rel = "noopener nofollow";
    openLink.textContent = "Открыть dry-run";
    openLink.setAttribute("data-qa-scenario-link", scenario.id);

    header.append(headingBlock, openLink);

    const body = document.createElement("div");
    body.className = "qa-scenario__body";

    const checklist = document.createElement("ul");
    checklist.className = "qa-checklist";
    (contract.slot_checks || []).forEach((check) => {
      const item = document.createElement("li");
      const label = document.createElement("label");
      label.className = "qa-check";
      const checkbox = document.createElement("input");
      checkbox.type = "checkbox";
      checkbox.checked = slot.checks[check.id] === true;
      checkbox.dataset.checkId = check.id;
      const copy = document.createElement("span");
      copy.append(
        document.createTextNode(check.id.replaceAll("_", " ")),
        createTextElement("small", "", check.acceptance)
      );
      label.append(checkbox, copy);
      item.append(label);
      checklist.append(item);

      checkbox.addEventListener("change", () => {
        slot.checks[check.id] = checkbox.checked;
        saveState();
        const errors = validateSlot(scenario, device, slot);
        setSlotMessage(message, errors.join(" "));
      });
    });

    const panel = document.createElement("div");
    panel.className = "qa-result-panel";

    const evidenceLabel = createTextElement("label", "qa-field", "Evidence reference");
    const evidenceInput = document.createElement("input");
    evidenceInput.type = "text";
    evidenceInput.maxLength = 300;
    evidenceInput.placeholder = "Ссылка на обезличенный файл или ID";
    evidenceInput.value = slot.evidence_reference;
    evidenceLabel.append(evidenceInput);

    const eventLabel = document.createElement("label");
    eventLabel.className = "qa-inline-check";
    const eventCheckbox = document.createElement("input");
    eventCheckbox.type = "checkbox";
    eventCheckbox.checked = slot.event_log_attached;
    eventLabel.append(eventCheckbox, document.createTextNode("Обезличенный event log приложен"));

    const statusLabel = createTextElement("label", "qa-field", "Результат");
    const statusSelect = document.createElement("select");
    Object.entries(STATUS_LABELS).forEach(([value, label]) => {
      const option = document.createElement("option");
      option.value = value;
      option.textContent = label;
      option.selected = slot.status === value;
      statusSelect.append(option);
    });
    statusLabel.append(statusSelect);

    const notesLabel = createTextElement("label", "qa-field", "Заметка");
    const notes = document.createElement("textarea");
    notes.maxLength = 1000;
    notes.placeholder = "Обязательна для failed или blocked. Без персональных данных.";
    notes.value = slot.notes;
    notesLabel.append(notes);

    const message = createTextElement("div", "qa-slot-message", "");
    message.setAttribute("role", "status");

    const persistAndValidate = () => {
      saveState();
      const errors = validateSlot(scenario, device, slot);
      setSlotMessage(message, errors.join(" "));
      updateSlotVisual(card, statusChip, slot);
    };

    evidenceInput.addEventListener("input", () => {
      slot.evidence_reference = sanitizeText(evidenceInput.value, 300);
      persistAndValidate();
    });
    eventCheckbox.addEventListener("change", () => {
      slot.event_log_attached = eventCheckbox.checked;
      persistAndValidate();
    });
    notes.addEventListener("input", () => {
      slot.notes = sanitizeText(notes.value, 1000);
      persistAndValidate();
    });
    statusSelect.addEventListener("change", () => {
      slot.status = ALLOWED_STATUSES.has(statusSelect.value) ? statusSelect.value : "not_run";
      slot.tested_at = slot.status === "not_run" ? "" : new Date().toISOString();
      persistAndValidate();
    });

    const initialErrors = validateSlot(scenario, device, slot);
    setSlotMessage(message, initialErrors.join(" "));
    panel.append(evidenceLabel, eventLabel, statusLabel, notesLabel, message);
    body.append(checklist, panel);
    card.append(header, body);
    return card;
  }

  function renderResilience(device) {
    if (!elements.resilience) return;
    elements.resilience.replaceChildren();

    (contract.device_resilience_checks || []).forEach((check) => {
      const result = getResilience(check.id, device);
      const card = document.createElement("article");
      card.className = "card qa-resilience-card";
      card.append(
        createTextElement("h3", "", check.id.replaceAll("_", " ")),
        createTextElement("p", "", check.acceptance)
      );

      const controls = document.createElement("div");
      controls.className = "qa-resilience-controls";
      const selectLabel = createTextElement("label", "qa-field", "Результат");
      const select = document.createElement("select");
      Object.entries(STATUS_LABELS).forEach(([value, label]) => {
        const option = document.createElement("option");
        option.value = value;
        option.textContent = label;
        option.selected = result.status === value;
        select.append(option);
      });
      selectLabel.append(select);

      const notesLabel = createTextElement("label", "qa-field", "Заметка");
      const notes = document.createElement("textarea");
      notes.maxLength = 1000;
      notes.placeholder = "Что проверено или почему тест заблокирован";
      notes.value = result.notes;
      notesLabel.append(notes);

      select.addEventListener("change", () => {
        result.status = ALLOWED_STATUSES.has(select.value) ? select.value : "not_run";
        result.tested_at = result.status === "not_run" ? "" : new Date().toISOString();
        saveState();
        updateSummary();
      });
      notes.addEventListener("input", () => {
        result.notes = sanitizeText(notes.value, 1000);
        saveState();
      });

      controls.append(selectLabel, notesLabel);
      card.append(controls);
      elements.resilience.append(card);
    });
  }

  function renderDevice() {
    const device = state.selected_device;
    const environment = state.environment[device];
    elements.device.value = device;
    elements.browser.value = environment.browser;
    elements.os.value = environment.os;
    elements.deviceTitle.textContent = `Проверка на ${DEVICE_LABELS[device]}`;
    elements.scenarios.setAttribute("aria-busy", "false");
    elements.scenarios.replaceChildren(...matrix.scenarios.map((scenario) => renderScenario(scenario, device)));
    renderResilience(device);
    updateSummary();
  }

  function updateSummary() {
    const counts = { recorded: 0, passed: 0, failed: 0, blocked: 0 };
    Object.values(state.slots).forEach((slot) => {
      if (!slot || slot.status === "not_run") return;
      counts.recorded += 1;
      if (counts[slot.status] !== undefined) counts[slot.status] += 1;
    });
    elements.summary.total.textContent = String((matrix?.scenarios?.length || 14) * (contract?.required_devices?.length || 3));
    elements.summary.recorded.textContent = String(counts.recorded);
    elements.summary.passed.textContent = String(counts.passed);
    elements.summary.failed.textContent = String(counts.failed);
    elements.summary.blocked.textContent = String(counts.blocked);
  }

  function validateRecordedSlots() {
    const errors = [];
    const scenarioMap = new Map(matrix.scenarios.map((scenario) => [scenario.id, scenario]));
    Object.entries(state.slots).forEach(([key, slot]) => {
      if (!slot || slot.status === "not_run") return;
      const separator = key.lastIndexOf("__");
      const scenarioId = key.slice(0, separator);
      const device = key.slice(separator + 2);
      if (!scenarioMap.has(scenarioId) || !ALLOWED_DEVICES.has(device)) {
        errors.push(`${key}: неизвестный сценарий или устройство.`);
        return;
      }
      validateSlot(scenarioMap.get(scenarioId), device, slot).forEach((error) => {
        errors.push(`${scenarioMap.get(scenarioId).label} / ${device}: ${error}`);
      });
    });
    return errors;
  }

  function buildLocalResultRecords() {
    const records = [];
    Object.entries(state.slots).forEach(([key, slot]) => {
      if (!slot || slot.status === "not_run") return;
      const separator = key.lastIndexOf("__");
      const scenarioId = key.slice(0, separator);
      const device = key.slice(separator + 2);
      const environment = state.environment[device] || {};
      records.push({
        scenario_id: scenarioId,
        device,
        status: slot.status,
        tested_at: slot.tested_at || new Date().toISOString(),
        browser: environment.browser,
        os: environment.os,
        evidence_reference: slot.evidence_reference,
        event_log_attached: slot.event_log_attached === true,
        notes: slot.notes
      });
    });
    return records;
  }

  function mergeResultRecords(existing, local) {
    const map = new Map();
    (existing || []).forEach((item) => map.set(`${item.scenario_id}__${item.device}`, item));
    local.forEach((item) => map.set(`${item.scenario_id}__${item.device}`, item));
    return Array.from(map.values()).sort((a, b) => `${a.device}_${a.scenario_id}`.localeCompare(`${b.device}_${b.scenario_id}`));
  }

  function downloadJson(filename, value) {
    const blob = new Blob([`${JSON.stringify(value, null, 2)}\n`], { type: "application/json;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = filename;
    document.body.append(anchor);
    anchor.click();
    anchor.remove();
    URL.revokeObjectURL(url);
  }

  function exportResults() {
    clearGlobalStatus();
    const errors = validateRecordedSlots();
    if (errors.length) {
      showGlobalStatus(`Экспорт остановлен: ${errors.slice(0, 4).join(" ")}${errors.length > 4 ? ` Ещё ошибок: ${errors.length - 4}.` : ""}`, true);
      return;
    }

    const localRecords = buildLocalResultRecords();
    const output = {
      ...repositoryResults,
      updated_at: new Date().toISOString().slice(0, 10),
      results: mergeResultRecords(repositoryResults.results || [], localRecords)
    };
    downloadJson("form-results.json", output);
    showGlobalStatus(`Скачан реестр с ${output.results.length} фактически зафиксированными слотами. Проверьте evidence перед внесением в репозиторий.`);
  }

  function exportEvidence() {
    clearGlobalStatus();
    const errors = validateRecordedSlots();
    if (errors.length) {
      showGlobalStatus(`Evidence export остановлен: ${errors.slice(0, 4).join(" ")}${errors.length > 4 ? ` Ещё ошибок: ${errors.length - 4}.` : ""}`, true);
      return;
    }

    const slotEvidence = [];
    matrix.scenarios.forEach((scenario) => {
      ALLOWED_DEVICES.forEach((device) => {
        const slot = state.slots[slotKey(scenario.id, device)];
        if (!slot || slot.status === "not_run") return;
        slotEvidence.push({
          scenario_id: scenario.id,
          label: scenario.label,
          device,
          form_id: scenario.form_id,
          form_role: scenario.form_role,
          status: slot.status,
          tested_at: slot.tested_at,
          browser: state.environment[device].browser,
          os: state.environment[device].os,
          evidence_reference: slot.evidence_reference,
          event_log_attached: slot.event_log_attached,
          notes: slot.notes,
          checks: Object.fromEntries((contract.slot_checks || []).map((check) => [check.id, slot.checks[check.id] === true]))
        });
      });
    });

    const resilienceResults = Object.entries(state.resilience)
      .filter(([, result]) => result?.status && result.status !== "not_run")
      .map(([key, result]) => ({ id: key, ...result }));

    downloadJson("form-qa-evidence.json", {
      schema_version: "1.0",
      generated_at: new Date().toISOString(),
      portal_id: matrix.portal_id,
      status: "local_evidence_export_no_implied_approval",
      personal_data_forbidden: true,
      environment: state.environment,
      slot_evidence: slotEvidence,
      device_resilience_results: resilienceResults
    });
    showGlobalStatus(`Скачан обезличенный evidence-пакет: ${slotEvidence.length} слотов, ${resilienceResults.length} storage-проверок.`);
  }

  function clearCurrentDevice() {
    const device = state.selected_device;
    const confirmed = window.confirm(`Удалить локальный прогресс для устройства «${device}»? Данные в репозитории не изменятся.`);
    if (!confirmed) return;

    Object.keys(state.slots).forEach((key) => {
      if (key.endsWith(`__${device}`)) delete state.slots[key];
    });
    Object.keys(state.resilience).forEach((key) => {
      if (key.endsWith(`__${device}`)) delete state.resilience[key];
    });
    state.environment[device] = { browser: "", os: "" };
    saveState();
    renderDevice();
    showGlobalStatus(`Локальный прогресс для ${device} очищен.`);
  }

  function bindControls() {
    elements.device.addEventListener("change", () => {
      const device = ALLOWED_DEVICES.has(elements.device.value) ? elements.device.value : "desktop";
      state.selected_device = device;
      saveState();
      renderDevice();
      clearGlobalStatus();
    });

    elements.browser.addEventListener("input", () => {
      state.environment[state.selected_device].browser = sanitizeText(elements.browser.value, 80);
      saveState();
    });
    elements.os.addEventListener("input", () => {
      state.environment[state.selected_device].os = sanitizeText(elements.os.value, 80);
      saveState();
    });
    elements.exportResults.addEventListener("click", exportResults);
    elements.exportEvidence.addEventListener("click", exportEvidence);
    elements.clearDevice.addEventListener("click", clearCurrentDevice);
  }

  async function init() {
    try {
      [matrix, contract, repositoryResults] = await Promise.all([
        loadJson(MATRIX_URL),
        loadJson(CONTRACT_URL),
        loadJson(RESULTS_URL)
      ]);

      if (!Array.isArray(matrix.scenarios) || matrix.scenarios.length !== 14) {
        throw new Error("Матрица должна содержать 14 сценариев.");
      }
      if (!Array.isArray(contract.slot_checks) || contract.slot_checks.length !== 10) {
        throw new Error("Контракт должен содержать 10 проверок на слот.");
      }
      if (!Array.isArray(contract.required_devices) || contract.required_devices.length !== 3) {
        throw new Error("Контракт должен содержать три устройства.");
      }
      if (matrix.rules?.real_submission_forbidden !== true || contract.rules?.external_delivery_forbidden !== true) {
        throw new Error("В матрице или контракте не зафиксирован запрет реальной отправки.");
      }

      state = normalizeState(readStoredState());
      bindControls();
      renderDevice();
    } catch (error) {
      elements.scenarios.setAttribute("aria-busy", "false");
      elements.scenarios.replaceChildren(createTextElement("div", "qa-empty", `Не удалось запустить QA-панель: ${error.message}`));
      showGlobalStatus("Панель не готова к работе. Не проводите тесты, пока матрица и контракт не загрузятся.", true);
    }
  }

  init();
})();
