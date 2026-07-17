(() => {
  const main = document.querySelector("main");
  if (!main) return;

  const scriptUrl = document.currentScript?.src || "";
  if (scriptUrl && !document.querySelector("link[data-page-accessibility-styles]")) {
    const stylesheet = document.createElement("link");
    stylesheet.rel = "stylesheet";
    stylesheet.href = new URL("../css/accessibility.css", scriptUrl).href;
    stylesheet.dataset.pageAccessibilityStyles = "true";
    document.head.appendChild(stylesheet);
  }

  if (scriptUrl && !document.querySelector("script[data-buyer-project-content]")) {
    const buyerContentScript = document.createElement("script");
    buyerContentScript.src = new URL("buyer-project-content.js", scriptUrl).href;
    buyerContentScript.async = true;
    buyerContentScript.dataset.buyerProjectContent = "true";
    document.head.appendChild(buyerContentScript);
  }

  if (!main.id) main.id = "main-content";
  if (!main.hasAttribute("tabindex")) main.setAttribute("tabindex", "-1");

  let skipLink = document.querySelector("[data-skip-link]");
  if (!skipLink) {
    skipLink = document.createElement("a");
    skipLink.className = "skip-link";
    skipLink.href = `#${main.id}`;
    skipLink.textContent = "Перейти к основному содержанию";
    skipLink.dataset.skipLink = "true";
    document.body.prepend(skipLink);
  }

  const focusMain = () => {
    window.requestAnimationFrame(() => {
      main.focus({ preventScroll: true });
    });
  };

  skipLink.addEventListener("click", focusMain);
  window.addEventListener("hashchange", () => {
    if (window.location.hash === `#${main.id}`) focusMain();
  });

  window.__NEWBUILD_PAGE_ACCESSIBILITY__ = true;
})();
