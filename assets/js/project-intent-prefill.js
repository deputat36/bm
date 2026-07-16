(() => {
  const links = Array.from(document.querySelectorAll("a[data-prefill-interest]"));
  if (!links.length) return;

  function resolveTarget(link) {
    const href = String(link.getAttribute("href") || "").trim();
    if (!href.startsWith("#")) return null;
    return document.getElementById(href.slice(1));
  }

  function findOption(select, requestedValue) {
    return Array.from(select.options).find((option) => {
      const value = String(option.value || "").trim();
      const text = String(option.textContent || "").trim();
      return value === requestedValue || text === requestedValue;
    }) || null;
  }

  links.forEach((link) => {
    link.addEventListener("click", (event) => {
      const requestedValue = String(link.dataset.prefillInterest || "").trim();
      const target = resolveTarget(link);
      const form = target?.querySelector("form[data-lead-form]");
      const select = form?.querySelector("select[name='interest']");
      const option = select ? findOption(select, requestedValue) : null;

      if (!target || !form || !select || !option) return;

      event.preventDefault();
      select.value = option.value;
      form.dataset.prefilledInterest = "true";
      target.scrollIntoView({ behavior: "smooth", block: "start" });

      window.setTimeout(() => {
        select.focus({ preventScroll: true });
      }, 250);
    });
  });
})();