import fs from "node:fs";
import fsp from "node:fs/promises";
import http from "node:http";
import path from "node:path";
import { chromium } from "playwright";

const ROOT = process.cwd();
const PORT = 4182;
const BASE = `http://127.0.0.1:${PORT}`;
const QA = JSON.parse(fs.readFileSync(path.join(ROOT, "data/qa/form-scenarios.json"), "utf8"));
const pages = [...new Set(QA.scenarios.map((scenario) => scenario.page_file))];
if (pages.length !== 7) throw new Error(`Expected 7 canonical lead pages, got ${pages.length}`);

const types = {
  ".html": "text/html; charset=utf-8", ".js": "text/javascript; charset=utf-8",
  ".css": "text/css; charset=utf-8", ".json": "application/json; charset=utf-8",
  ".svg": "image/svg+xml", ".png": "image/png", ".jpg": "image/jpeg",
  ".webp": "image/webp", ".ico": "image/x-icon"
};

async function startServer() {
  const server = http.createServer(async (req, res) => {
    const pathname = new URL(req.url || "/", BASE).pathname;
    let relative;
    try { relative = decodeURIComponent(pathname).replace(/^\/+/, ""); }
    catch { return res.writeHead(400).end("Bad path"); }
    const normalized = path.normalize(relative || "index.html");
    if (!["GET", "HEAD"].includes(req.method || "")
      || normalized.startsWith("..") || path.isAbsolute(normalized)) {
      return res.writeHead(403).end("Forbidden");
    }
    let file = path.join(ROOT, normalized);
    if (!file.startsWith(ROOT + path.sep)) return res.writeHead(403).end("Forbidden");
    try {
      if ((await fsp.stat(file)).isDirectory()) file = path.join(file, "index.html");
      const stat = await fsp.stat(file);
      if (!stat.isFile()) throw new Error("not a file");
      res.writeHead(200, {
        "Content-Type": types[path.extname(file).toLowerCase()] || "application/octet-stream",
        "Content-Length": stat.size,
        "Cache-Control": "no-store"
      });
      if (req.method === "HEAD") return res.end();
      fs.createReadStream(file).pipe(res);
    } catch {
      res.writeHead(404).end("Not found");
    }
  });
  await new Promise((resolve, reject) => {
    server.once("error", reject);
    server.listen(PORT, "127.0.0.1", resolve);
  });
  return server;
}

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

async function inspectFocus(page) {
  return page.evaluate(() => {
    const form = document.querySelector("form[data-lead-form]");
    const active = document.activeElement;
    const rect = active?.getBoundingClientRect();
    const style = active ? getComputedStyle(active) : null;
    return {
      name: active?.getAttribute("name") || "",
      tag: active?.tagName?.toLowerCase() || "",
      inForm: Boolean(active && form.contains(active)),
      honeypot: Boolean(active?.closest("[data-honeypot-field]")),
      disabled: Boolean(active?.disabled),
      visible: Boolean(rect && rect.width > 0 && rect.height > 0 && style.display !== "none" && style.visibility !== "hidden"),
      inViewport: Boolean(rect && rect.top >= -1 && rect.bottom <= window.innerHeight + 1),
      focusCount: form.querySelectorAll("[data-honeypot-field] input").length,
      requiredFields: form.querySelectorAll("input[required], select[required], textarea[required]").length,
      nextInvalid: [...form.querySelectorAll("input[required], select[required], textarea[required]")]
        .find((field) => !field.disabled && field.getClientRects().length > 0 && !field.checkValidity())?.name || ""
    };
  });
}

async function audit(browser, file, viewport) {
  const page = await browser.newPage({ viewport, locale: "ru-RU", reducedMotion: "reduce" });
  const errors = [];
  const blockedPosts = [];
  page.on("pageerror", (error) => errors.push(error.message));
  await page.route("**/*", (route) => {
    const request = route.request();
    if (request.method() === "POST") {
      blockedPosts.push(request.url());
      return route.abort("blockedbyclient");
    }
    if (!request.url().startsWith(BASE + "/")) return route.abort("blockedbyclient");
    return route.continue();
  });

  try {
    const target = "/" + file.replace(/(?:^|\/)index\.html$/, (match) => match.startsWith("/") ? "/" : "");
    const url = BASE + (target === "/" ? "/" : target.endsWith("/") ? target : target + "/");
    const response = await page.goto(url, { waitUntil: "domcontentloaded", timeout: 20_000 });
    assert(response?.status() === 200, `${file}: catalog URL returned ${response?.status()}`);

    await page.waitForFunction(() => {
      const form = document.querySelector("form[data-lead-form]");
      const bar = document.querySelector("[data-mobile-lead-bar]");
      return form?.dataset.jsReady === "true"
        && bar && getComputedStyle(bar).display !== "none"
        && form.querySelector("[data-honeypot-field] input[name='website']");
    }, { timeout: 12000 });

    const form = page.locator("form[data-lead-form]").first();
    const bar = page.locator("[data-mobile-lead-bar] .mobile-lead-bar__button--primary");
    await bar.click();
    await page.waitForTimeout(580);
    const initial = await inspectFocus(page);
    assert(initial.focusCount === 1, `${file}: honeypot count changed`);
    assert(initial.inForm && !initial.honeypot && !initial.disabled && initial.visible && initial.inViewport,
      `${file}: sticky CTA focused unusable element ${JSON.stringify(initial)}`);
    assert(initial.name === "phone", `${file}: expected required phone input, got ${JSON.stringify(initial)}`);

    const phone = form.locator("input[name='phone']");
    await phone.fill("+79031234567");
    const validPhone = await phone.evaluate((el) => el.checkValidity());
    assert(validPhone, `${file}: QA phone did not satisfy form validation`);
    await bar.click();
    await page.waitForTimeout(580);
    const next = await inspectFocus(page);
    assert(next.name === next.nextInvalid && next.name !== "phone"
      && next.inForm && !next.honeypot && next.visible && next.inViewport,
      `${file}: CTA should focus the page's next unanswered required control ${JSON.stringify(next)}`);
    assert(blockedPosts.length === 0, `${file}: QA unexpectedly attempted a lead POST`);
    assert(errors.length === 0, `${file}: uncaught browser errors: ${errors.join(" | ")}`);
    return { page: file, viewport: viewport.width, focus: initial.name, next: next.name, passed: true, livePosts: 0 };
  } finally {
    await page.close();
  }
}

let browser;
const server = await startServer();
try {
  browser = await chromium.launch({ headless: true });
  const results = [];
  for (const viewport of [
    { width: 390, height: 844 },
    { width: 320, height: 700 }
  ]) {
    for (const page of pages) results.push(await audit(browser, page, viewport));
  }
  console.log(JSON.stringify({
    status: "passed", canonicalPages: pages.length, profiles: 2,
    checks: results.length, realLeadPosts: 0, results
  }, null, 2));
} finally {
  if (browser) await browser.close();
  await new Promise((resolve) => server.close(resolve));
}
