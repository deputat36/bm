const ENDPOINT = process.env.LEAD_ENDPOINT || "https://ofewxuqfjhamgerwzull.supabase.co/functions/v1/newbuild-lead";
const ALLOWED_ORIGIN = process.env.TEST_ORIGIN || "https://novostroyki-borisoglebsk.ru";
const FORBIDDEN_ORIGIN = "https://example.invalid";
const SYNTHETIC_PHONE = "+70000000000";
const MAX_ATTEMPTS = 3;
const REQUEST_TIMEOUT_MS = 12_000;

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

function delay(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function fetchWithRetry(url, init = {}) {
  let lastError;

  for (let attempt = 1; attempt <= MAX_ATTEMPTS; attempt += 1) {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);

    try {
      const response = await fetch(url, { ...init, signal: controller.signal });
      clearTimeout(timeout);

      if (response.status >= 500 && attempt < MAX_ATTEMPTS) {
        await response.text();
        await delay(attempt * 750);
        continue;
      }

      return response;
    } catch (error) {
      clearTimeout(timeout);
      lastError = error;
      if (attempt < MAX_ATTEMPTS) {
        await delay(attempt * 750);
        continue;
      }
    }
  }

  throw lastError || new Error("Endpoint request failed");
}

async function readJson(response, label) {
  const text = await response.text();
  try {
    return JSON.parse(text);
  } catch (_error) {
    throw new Error(`${label}: expected JSON response, received ${text.slice(0, 240)}`);
  }
}

function assertAllowedCors(response, label) {
  assert(response.headers.get("access-control-allow-origin") === ALLOWED_ORIGIN, `${label}: allowed origin header mismatch`);
  assert((response.headers.get("vary") || "").toLowerCase().includes("origin"), `${label}: Vary must include Origin`);
}

async function checkHealth() {
  const response = await fetchWithRetry(`${ENDPOINT}?health=1`, {
    method: "GET",
    headers: { Accept: "application/json" }
  });
  const body = await readJson(response, "health");

  assert(response.status === 200, `health: expected 200, received ${response.status}`);
  assert(body.success === true, "health: success must be true");
  assert(body.status === "ok", `health: expected ok, received ${body.status}`);
  assert(body.storage_ready === true, "health: storage must be ready");
  assert(body.event_log_ready === true, "health: event log must be ready");
  assert(body.rate_limit_ready === true, "health: rate limit must be ready");
  assert(body.schema_version === "2.0", `health: unexpected schema version ${body.schema_version}`);
  assert(body.system_of_record === "supabase:newbuild_leads", `health: unexpected system of record ${body.system_of_record}`);
  assert((response.headers.get("cache-control") || "").includes("no-store"), "health: response must not be cached");
  assert((response.headers.get("x-robots-tag") || "").includes("noindex"), "health: endpoint must be noindex");

  console.log("PASS health: deployed storage contract is ready");
}

async function checkCorsPreflight() {
  const response = await fetchWithRetry(ENDPOINT, {
    method: "OPTIONS",
    headers: {
      Origin: ALLOWED_ORIGIN,
      "Access-Control-Request-Method": "POST",
      "Access-Control-Request-Headers": "content-type"
    }
  });

  assert(response.status === 204, `preflight: expected 204, received ${response.status}`);
  assertAllowedCors(response, "preflight");
  assert((response.headers.get("access-control-allow-methods") || "").includes("POST"), "preflight: POST must be allowed");
  assert((response.headers.get("access-control-allow-headers") || "").toLowerCase().includes("content-type"), "preflight: content-type must be allowed");

  console.log("PASS preflight: production portal origin is allowed");
}

async function postCase(label, body, expectedStatus, expectedError) {
  const response = await fetchWithRetry(ENDPOINT, {
    method: "POST",
    headers: {
      Origin: ALLOWED_ORIGIN,
      "Content-Type": "application/json",
      Accept: "application/json"
    },
    body
  });
  const payload = await readJson(response, label);

  assert(response.status === expectedStatus, `${label}: expected ${expectedStatus}, received ${response.status}`);
  assert(payload.success === false, `${label}: request must not be accepted`);
  assertAllowedCors(response, label);

  const errors = Array.isArray(payload.errors) ? payload.errors : [];
  const actualError = payload.error || errors[0] || "";
  assert(actualError === expectedError || errors.includes(expectedError), `${label}: expected ${expectedError}, received ${actualError}`);

  console.log(`PASS ${label}: rejected safely before storage`);
}

async function checkForbiddenOrigin() {
  const response = await fetchWithRetry(ENDPOINT, {
    method: "POST",
    headers: {
      Origin: FORBIDDEN_ORIGIN,
      "Content-Type": "application/json",
      Accept: "application/json"
    },
    body: "{}"
  });
  const payload = await readJson(response, "forbidden-origin");

  assert(response.status === 403, `forbidden-origin: expected 403, received ${response.status}`);
  assert(payload.success === false && payload.error === "origin_not_allowed", "forbidden-origin: origin must be rejected");
  assert(!response.headers.get("access-control-allow-origin"), "forbidden-origin: CORS header must not be reflected");

  console.log("PASS forbidden-origin: unknown sites cannot submit forms");
}

async function main() {
  console.log(`Live endpoint: ${ENDPOINT}`);
  console.log(`Allowed origin: ${ALLOWED_ORIGIN}`);
  console.log("Safety mode: only health, preflight and requests rejected before persistence");

  await checkHealth();
  await checkCorsPreflight();
  await postCase("invalid-json", "{", 400, "invalid_json");
  await postCase("missing-phone", "{}", 422, "phone_required");
  await postCase("missing-consent", JSON.stringify({ phone: SYNTHETIC_PHONE }), 422, "personal_data_consent_required");
  await checkForbiddenOrigin();

  console.log("\nLive lead endpoint smoke test passed without an accepted lead payload.");
}

main().catch((error) => {
  console.error("\nLive lead endpoint smoke test failed:");
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
});
