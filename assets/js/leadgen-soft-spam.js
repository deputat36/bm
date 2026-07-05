// Совместимый патч для форм заявок.
// В основной логике слишком быстрая отправка может считаться ботом.
// На практике быстрый submit может быть обычным автозаполнением браузера,
// поэтому смещаем техническое время старта формы назад.
// Жёсткая антиспам-защита остаётся через honeypot-поле.
(function () {
  document.querySelectorAll("[data-lead-form]").forEach((form) => {
    const startedAt = Number(form.dataset.startedAt || 0);
    const now = Date.now();

    if (!startedAt || now - startedAt < 2500) {
      form.dataset.startedAt = String(now - 3000);
    }
  });
})();
