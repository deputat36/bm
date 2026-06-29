document.addEventListener("DOMContentLoaded", () => {
  const year = document.querySelector("[data-year]");
  if (year) year.textContent = new Date().getFullYear();

  if (!document.querySelector('link[href$="responsive.css"]')) {
    const responsive = document.createElement("link");
    responsive.rel = "stylesheet";
    responsive.href = "/assets/css/responsive.css";
    document.head.appendChild(responsive);
  }
});
