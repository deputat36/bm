(() => {
  const root = document.querySelector("[data-catalog-rule-quiz]");
  if (!root) return;

  const target = document.getElementById("quick-lead");
  const form = target?.querySelector('form[data-form-id="catalog_quick_selection"]');
  const steps = Array.from(root.querySelectorAll("[data-quiz-step]"));
  const intro = root.querySelector("[data-quiz-intro]");
  const resultPanel = root.querySelector("[data-quiz-result-panel]");
  const progress = root.querySelector("[data-quiz-progress]");
  const status = root.querySelector("[data-quiz-status]");
  const resultTitle = root.querySelector("[data-quiz-result-title]");
  const resultText = root.querySelector("[data-quiz-result-text]");
  const resultReasons = root.querySelector("[data-quiz-result-reasons]");

  if (!form || steps.length !== 5 || !resultPanel) return;

  const LABELS = {
    priority: {
      availability: "актуальное наличие и статус",
      documents: "документы и юридическая схема",
      mortgage: "ипотека и финансовый расчёт",
      alternatives: "сравнение и альтернативы"
    },
    rooms: {
      studio: "студия",
      one_room: "1-комнатная квартира",
      two_room: "2-комнатная квартира",
      three_room: "3-комнатная квартира",
      undecided: "комнатность пока не определена"
    },
    budget: {
      up_to_4: "до 4 млн ₽",
      from_4_to_6: "от 4 до 6 млн ₽",
      above_6: "более 6 млн ₽",
      undecided: "бюджет пока не определён"
    },
    purchase_method: {
      cash: "наличные",
      mortgage: "ипотека",
      family_mortgage: "семейная ипотека",
      maternity_capital: "материнский капитал",
      sale_property: "продажа своей недвижимости",
      undecided: "способ покупки пока не определён"
    },
    timeline: {
      one_month: "в ближайший месяц",
      one_to_three: "в течение 1–3 месяцев",
      half_year: "в течение полугода",
      research: "пока изучаю варианты"
    }
  };

  const FIELD_NAMES = {
    priority: "quiz_priority",
    rooms: "room_type",
    budget: "budget",
    purchase_method: "purchase_method",
    timeline: "timeline"
  };

  let currentStep = 0;
  let latestResult = null;

  function setStatus(message) {
    if (!status) return;
    status.textContent = message;
    status.hidden = !message;
  }

  function showStep(index) {
    currentStep = Math.max(0, Math.min(index, steps.length - 1));
    intro?.setAttribute("hidden", "");
    resultPanel.setAttribute("hidden", "");
    steps.forEach((step, position) => {
      step.hidden = position !== currentStep;
    });
    if (progress) {
      progress.hidden = false;
      progress.textContent = `Шаг ${currentStep + 1} из ${steps.length}`;
    }
    setStatus("");
    root.dataset.quizState = `step-${currentStep + 1}`;
  }

  function selectedValue(step) {
    return step.querySelector('input[type="radio"]:checked')?.value || "";
  }

  function selectedAnswers() {
    return Object.fromEntries(
      steps.map((step) => [String(step.dataset.quizStep || ""), selectedValue(step)])
    );
  }

  function validateStep(step) {
    if (selectedValue(step)) return true;
    setStatus("Выберите один вариант, чтобы продолжить.");
    step.querySelector('input[type="radio"]')?.focus({ preventScroll: true });
    return false;
  }

  function chooseRecommendation(answers) {
    if (answers.priority === "documents") {
      return {
        key: "documents",
        title: "Сначала проверьте документы и схему покупки",
        interest: "Документы по объекту",
        text: "До выбора квартиры важно уточнить первичные документы, сторону договора и порядок оплаты. После этого можно переходить к сравнению вариантов."
      };
    }

    if (
      answers.priority === "mortgage"
      || answers.purchase_method === "mortgage"
      || answers.purchase_method === "family_mortgage"
      || answers.purchase_method === "maternity_capital"
    ) {
      return {
        key: "mortgage",
        title: "Сначала рассчитайте финансовый сценарий",
        interest: "Ипотека и расчёт покупки",
        text: "Полезно заранее сопоставить бюджет, первоначальный взнос и способ покупки, а затем отдельно проверить, подходит ли выбранный объект под нужную программу."
      };
    }

    if (answers.priority === "availability" && answers.rooms !== "undecided") {
      return {
        key: "availability",
        title: "Сначала уточните актуальные варианты",
        interest: "Наличие и актуальный статус",
        text: "Ваш следующий шаг — проверить, какие предложения по выбранной комнатности можно подтвердить на текущую дату. Каталог не обещает фактическое наличие без проверки."
      };
    }

    return {
      key: "alternatives",
      title: "Начните с общего подбора и сравнения",
      interest: "Альтернативы и общий подбор",
      text: "Пока параметры не окончательные, лучше сравнить несколько сценариев и не привязываться к одному дому до проверки документов, условий и доступности."
    };
  }

  function label(group, value) {
    return LABELS[group]?.[value] || "не указано";
  }

  function upsertHidden(name, value) {
    let input = form.querySelector(`input[data-catalog-quiz-field][name="${name}"]`);
    if (!input) {
      input = document.createElement("input");
      input.type = "hidden";
      input.name = name;
      input.setAttribute("data-catalog-quiz-field", "");
      form.prepend(input);
    }
    input.value = String(value || "").slice(0, 500);
  }

  function findOption(select, requestedValue) {
    return Array.from(select?.options || []).find((option) => {
      const value = String(option.value || "").trim();
      const text = String(option.textContent || "").trim();
      return value === requestedValue || text === requestedValue;
    }) || null;
  }

  function prefillContactForm(answers, recommendation) {
    const objectSelect = form.querySelector('select[name="residential_complex"]');
    const interestSelect = form.querySelector('select[name="interest"]');
    const objectOption = findOption(objectSelect, "Общий подбор новостройки");
    const interestOption = findOption(interestSelect, recommendation.interest);

    if (objectSelect && objectOption) {
      objectSelect.value = objectOption.value;
      objectSelect.dataset.quizPrefilled = "true";
    }
    if (interestSelect && interestOption) {
      interestSelect.value = interestOption.value;
      interestSelect.dataset.quizPrefilled = "true";
    }

    const readableAnswers = [
      `Приоритет: ${label("priority", answers.priority)}`,
      `Квартира: ${label("rooms", answers.rooms)}`,
      `Бюджет: ${label("budget", answers.budget)}`,
      `Покупка: ${label("purchase_method", answers.purchase_method)}`,
      `Срок: ${label("timeline", answers.timeline)}`
    ].join("; ");

    upsertHidden(FIELD_NAMES.priority, label("priority", answers.priority));
    upsertHidden(FIELD_NAMES.rooms, label("rooms", answers.rooms));
    upsertHidden(FIELD_NAMES.budget, label("budget", answers.budget));
    upsertHidden(FIELD_NAMES.purchase_method, label("purchase_method", answers.purchase_method));
    upsertHidden(FIELD_NAMES.timeline, label("timeline", answers.timeline));
    upsertHidden("quiz_result", recommendation.title);
    upsertHidden("quiz_result_key", recommendation.key);
    upsertHidden("quiz_answers", readableAnswers);
    upsertHidden("quiz_completed", "yes");
    upsertHidden("quiz_version", "catalog-rule-v1");
    upsertHidden("placement", "catalog_rule_quiz_result");
    form.dataset.quizCompleted = "true";
  }

  function renderResult() {
    const finalStep = steps[steps.length - 1];
    if (!validateStep(finalStep)) return;

    const answers = selectedAnswers();
    const recommendation = chooseRecommendation(answers);
    latestResult = { answers, recommendation };
    prefillContactForm(answers, recommendation);

    steps.forEach((step) => {
      step.hidden = true;
    });
    if (progress) progress.hidden = true;
    resultPanel.hidden = false;
    root.dataset.quizState = "result";
    if (resultTitle) resultTitle.textContent = recommendation.title;
    if (resultText) resultText.textContent = recommendation.text;

    if (resultReasons) {
      resultReasons.replaceChildren();
      [
        `Комнатность: ${label("rooms", answers.rooms)}.`,
        `Бюджет: ${label("budget", answers.budget)}.`,
        `Способ покупки: ${label("purchase_method", answers.purchase_method)}.`,
        `Срок: ${label("timeline", answers.timeline)}.`
      ].forEach((text) => {
        const item = document.createElement("li");
        item.textContent = text;
        resultReasons.appendChild(item);
      });
    }
    setStatus("");
    resultTitle?.focus({ preventScroll: true });
  }

  function resetQuiz() {
    steps.forEach((step) => {
      step.hidden = true;
      step.querySelectorAll('input[type="radio"]').forEach((input) => {
        input.checked = false;
      });
    });
    form.querySelectorAll("[data-catalog-quiz-field]").forEach((field) => field.remove());
    form.querySelectorAll("[data-quiz-prefilled='true']").forEach((field) => {
      field.value = "";
      delete field.dataset.quizPrefilled;
    });
    delete form.dataset.quizCompleted;
    latestResult = null;
    currentStep = 0;
    intro?.removeAttribute("hidden");
    resultPanel.setAttribute("hidden", "");
    if (progress) progress.hidden = true;
    root.dataset.quizState = "intro";
    setStatus("");
    root.querySelector("[data-quiz-start]")?.focus({ preventScroll: true });
  }

  root.querySelector("[data-quiz-start]")?.addEventListener("click", () => showStep(0));

  root.querySelectorAll("[data-quiz-next]").forEach((button) => {
    button.addEventListener("click", () => {
      const step = button.closest("[data-quiz-step]");
      const index = steps.indexOf(step);
      if (index < 0 || !validateStep(step)) return;
      showStep(index + 1);
    });
  });

  root.querySelectorAll("[data-quiz-back]").forEach((button) => {
    button.addEventListener("click", () => {
      const step = button.closest("[data-quiz-step]");
      const index = steps.indexOf(step);
      showStep(index - 1);
    });
  });

  root.querySelector("[data-quiz-show-result]")?.addEventListener("click", renderResult);

  root.querySelector("[data-quiz-to-form]")?.addEventListener("click", (event) => {
    if (!latestResult) return;
    event.preventDefault();
    target.scrollIntoView({ behavior: "smooth", block: "start" });
    window.setTimeout(() => {
      form.querySelector('input[name="name"]')?.focus({ preventScroll: true });
    }, 250);
  });

  root.querySelector("[data-quiz-reset]")?.addEventListener("click", resetQuiz);

  steps.forEach((step) => {
    step.hidden = true;
  });
  resultPanel.hidden = true;
  if (progress) progress.hidden = true;
  root.dataset.quizState = "intro";
})();
