import fs from "node:fs";
import fsp from "node:fs/promises";
import http from "node:http";
import path from "node:path";
import { chromium } from "playwright";

const ROOT = process.cwd();
const PORT = 4179;
const BASE = `http://127.0.0.1:${PORT}`;
const projects = JSON.parse(fs.readFileSync(path.join(ROOT, "data/research/reference-projects.json"), "utf8")).projects;
const testProjects = projects.filter((p) => p.commercial_role === "reference_catalog" && p.verification_status === "confirmed" && p.is_public_ready === true).slice(0, 2);
if (testProjects.length !== 2) throw new Error("Two verified reference projects are required for context QA");

const MIME = {
  ".html": "text/html; charset=utf-8", ".js": "text/javascript; charset=utf-8",
  ".css": "text/css; charset=utf-8", ".json": "application/json; charset=utf-8",
  ".svg": "image/svg+xml", ".png": "image/png", ".jpg": "image/jpeg", ".webp": "image/webp"
};

async function startServer() {
  const server = http.createServer(async (req, res) => {
    const url = new URL(req.url || "/", BASE);
    const relative = decodeURIComponent(url.pathname).replace(/^\/+/, "");
    const normalized = path.normalize(relative || "index.html");
    if (!["GET", "HEAD"].includes(req.method || "") || normalized.startsWith("..") || path.isAbsolute(normalized)) {
      res.writeHead(403).end();
      return;
    }
    const filename = path.join(ROOT, normalized);
    if (!filename.startsWith(ROOT + path.sep)) {
      res.writeHead(403).end();
      return;
    }
    try {
      let target = filename;
      if ((await fsp.stat(target)).isDirectory()) target = path.join(target, "index.html");
      const stat = await fsp.stat(target);
      if (!stat.isFile()) throw new Error("Not a file");
      res.writeHead(200, { "Content-Type": MIME[path.extname(target)] || "application/octet-stream", "Content-Length": stat.size, "Cache-Control": "no-store" });
      if (req.method === "HEAD") res.end();
      else fs.createReadStream(target).pipe(res);
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

async function formState(page) {
  return page.evaluate(() => {
    const form = document.querySelector('form[data-form-id="catalog_priority_selection"]');
    const quick = document.querySelector('form[data-form-id="catalog_quick_selection"]');
    const select = form.querySelector('select[name="residential_complex"]');
    const values = new FormData(form);
    return {
      value: select.value,
      referenceOptions: select.querySelectorAll('option[data-reference-option]').length,
      referenceFields: form.querySelectorAll('[data-reference-catalog-field]').length,
      id: values.get("residential_complex_id") || "",
      referenceId: values.get("reference_object_id") || "",
      referenceName: values.get("reference_object_name") || "",
      referenceAddress: values.get("reference_object_address") || "",
      complex: form.dataset.complex || "",
      complexId: form.dataset.complexId || "",
      quickValue: quick.querySelector('select[name="residential_complex"]').value
    };
  });
}

function assert(condition, text) {
  if (!condition) throw new Error(text);
}

async function audit(browser, profile) {
  const page = await browser.newPage({ viewport: profile, locale: "ru-RU", reducedMotion: "reduce" });
  const errors = [];
  const posts = [];
  page.on("pageerror", (e) => errors.push(String(e.message || e)));
  await page.route("**/*", async (route) => {
    if (route.request().method() === "POST") {
      posts.push(route.request().url());
      return route.abort("blockedbyclient");
    }
    return route.continue();
  });
  try {
    const response = await page.goto(BASE + "/catalog/", { waitUntil: "domcontentloaded" });
    assert(response?.status() === 200, "Catalog HTTP failed");
    await page.waitForFunction(() =>
      document.querySelector('form[data-form-id="catalog_priority_selection"]')?.dataset.jsReady === "true"
      && document.querySelectorAll("[data-reference-catalog] article.card").length === 4
    );
    const initial = await formState(page);
    assert(!initial.id && !initial.referenceId, "Initial detailed form unexpectedly contains object IDs");

    async function pickReference(index) {
      await page.locator("[data-reference-catalog] article.card").nth(index).locator('a[href="#lead"]').click();
      const actual = await formState(page);
      const project = testProjects[index];
      assert(actual.value === project.display_name, `Reference ${index}: wrong selected name`);
      assert(actual.id === `reference:${project.id}`, `Reference ${index}: incorrect complex id`);
      assert(actual.referenceId === project.id, `Reference ${index}: incorrect reference id`);
      assert(actual.referenceName === project.display_name, `Reference ${index}: incorrect reference name`);
      assert(actual.referenceAddress === project.address, `Reference ${index}: incorrect reference address`);
      assert(actual.referenceOptions === 1 && actual.referenceFields === 4, `Reference ${index}: duplicate option/metadata`);
      assert(actual.complexId === actual.id, `Reference ${index}: form dataset complexId mismatch`);
      return actual;
    }

    await pickReference(0);
    await pickReference(1);
    const select = page.locator('form[data-form-id="catalog_priority_selection"] select[name="residential_complex"]');
    await select.selectOption("Просторная 4А");
    const switched = await formState(page);
    assert(switched.value === "Просторная 4А", "Switch to priority building failed");
    assert(!switched.id && !switched.referenceId && !switched.referenceName && !switched.referenceAddress, "Stale reference metadata after switching to priority building");
    assert(switched.referenceFields === 0 && switched.referenceOptions === 0, "Dynamic reference fields/options were not removed");
    assert(switched.complex === initial.complex && switched.complexId === initial.complexId, `General form dataset context not restored: ${JSON.stringify({ initial, switched })}`);

    await pickReference(0);
    await select.selectOption("Общий подбор новостройки");
    const general = await formState(page);
    assert(general.value === "Общий подбор новостройки", "General selection failed");
    assert(!general.id && !general.referenceId && general.referenceFields === 0 && general.referenceOptions === 0, "Stale metadata after general selection");
    assert(general.quickValue === initial.quickValue, "Reference selection unexpectedly mutated separate quick form");
    assert(!posts.length, `Unexpected live requests: ${posts.length}`);
    assert(!errors.length, `Browser exceptions: ${errors.join(" | ")}`);
    return { viewport: profile, passed: true, referencePicks: 3, manualSwitches: 2, liveLeadRequests: posts.length };
  } finally {
    await page.close();
  }
}

const server = await startServer();
let browser;
try {
  browser = await chromium.launch({ headless: true });
  const results = [];
  for (const size of [{ width: 1440, height: 900 }, { width: 390, height: 844 }]) {
    results.push(await audit(browser, size));
  }
  console.log(JSON.stringify({ status: "passed", profiles: results, liveLeadRequests: 0 }, null, 2));
} finally {
  if (browser) await browser.close();
  await new Promise((resolve) => server.close(resolve));
}
