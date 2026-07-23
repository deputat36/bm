const DEFAULT_ALLOWED_ORIGINS = [
  "https://novostroyki-borisoglebsk.ru",
  "https://www.novostroyki-borisoglebsk.ru",
  "https://deputat36.github.io",
  "http://localhost:4000",
  "http://127.0.0.1:4000",
  "http://localhost:4173",
  "http://127.0.0.1:4173"
];

const envOrigins = (Deno.env.get("ALLOWED_ORIGINS") || "")
  .split(",")
  .map((value) => value.trim())
  .filter(Boolean);
const allowedOrigins = new Set([...DEFAULT_ALLOWED_ORIGINS, ...envOrigins]);

const allowedLeadTypes = new Set([
  "complex_interest",
  "mortgage",
  "apartment_selection",
  "portal_selection",
  "project_consultation",
  "comparison_request",
  "mortgage_calculation",
  "layout_request",
  "callback",
  "waitlist",
  "consultation",
  "general"
]);

const supabaseUrl = Deno.env.get("SUPABASE_URL") || "";
const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") || "";
const telegramBotToken = Deno.env.get("TELEGRAM_BOT_TOKEN") || "";
const telegramChatId = Deno.env.get("TELEGRAM_CHAT_ID") || "";
const rateLimitPerHour = Math.max(1, Number(Deno.env.get("RATE_LIMIT_PER_HOUR") || 12));
const maxBodyBytes = 50_000;

type JsonObject = Record<string, unknown>;

type RateLimitResult = {
  allowed: boolean;
  fingerprint: string;
  attemptCount: number;
  limit: number;
  degraded: boolean;
};

function isAllowedOrigin(origin: string | null): origin is string {
  return Boolean(origin && allowedOrigins.has(origin));
}

function corsHeaders(origin: string) {
  return {
    "Access-Control-Allow-Origin": origin,
    "Access-Control-Allow-Headers": "content-type",
    "Access-Control-Allow-Methods": "POST, OPTIONS",
    "Access-Control-Max-Age": "86400",
    "Vary": "Origin"
  };
}

function jsonResponse(body: JsonObject, status: number, origin?: string) {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      ...(origin ? corsHeaders(origin) : {}),
      "Content-Type": "application/json; charset=utf-8",
      "Cache-Control": "no-store"
    }
  });
}

function cleanText(value: unknown, maxLength = 500): string | null {
  if (typeof value !== "string") return null;
  const cleaned = value.replace(/[\u0000-\u001f\u007f]/g, " ").replace(/\s+/g, " ").trim();
  return cleaned ? cleaned.slice(0, maxLength) : null;
}

function cleanPhone(value: unknown): { phone: string; normalized: string } | null {
  const phone = cleanText(value, 40);
  if (!phone) return null;
  const normalized = phone.replace(/[^\d+]/g, "");
  const digits = normalized.replace(/\D/g, "");
  if (digits.length < 10 || digits.length > 15) return null;
  return { phone, normalized };
}

function cleanInteger(value: unknown): number | null {
  const number = typeof value === "number" ? value : Number(value);
  return Number.isInteger(number) && number >= 0 && number <= 86_400 ? number : null;
}

function cleanObject(value: unknown, maxBytes = 12_000): JsonObject {
  if (!value || typeof value !== "object" || Array.isArray(value)) return {};
  try {
    const serialized = JSON.stringify(value);
    if (new TextEncoder().encode(serialized).length > maxBytes) return {};
    return JSON.parse(serialized) as JsonObject;
  } catch (_error) {
    return {};
  }
}

function getClientIp(request: Request): string {
  const forwardedFor = request.headers.get("x-forwarded-for") || "";
  return (
    request.headers.get("cf-connecting-ip")
    || request.headers.get("x-real-ip")
    || forwardedFor.split(",")[0]
    || "unknown"
  ).trim();
}

async function sha256(value: string): Promise<string> {
  const digest = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(value));
  return Array.from(new Uint8Array(digest), (byte) => byte.toString(16).padStart(2, "0")).join("");
}

function restHeaders(prefer?: string) {
  return {
    "Authorization": `Bearer ${serviceRoleKey}`,
    "apikey": serviceRoleKey,
    "Content-Type": "application/json",
    ...(prefer ? { "Prefer": prefer } : {})
  };
}

async function restFetch(path: string, init: RequestInit = {}) {
  return fetch(`${supabaseUrl}/rest/v1/${path}`, {
    ...init,
    headers: {
      ...restHeaders(),
      ...(init.headers || {})
    }
  });
}

async function checkRateLimit(request: Request, phoneNormalized: string): Promise<RateLimitResult> {
  const userAgent = request.headers.get("user-agent") || "unknown";
  const fingerprint = await sha256(`${getClientIp(request)}|${userAgent}|${phoneNormalized.slice(-4)}`);
  const windowDate = new Date();
  windowDate.setUTCMinutes(0, 0, 0);
  const windowStart = windowDate.toISOString();
  const filters = `fingerprint=eq.${encodeURIComponent(fingerprint)}&window_start=eq.${encodeURIComponent(windowStart)}`;

  try {
    const selectResponse = await restFetch(`newbuild_lead_rate_limits?select=id,attempt_count&${filters}&limit=1`);
    if (!selectResponse.ok) throw new Error("rate_limit_select_failed");
    const existing = (await selectResponse.json()) as Array<{ id: string; attempt_count: number }>;

    if (existing.length) {
      const attemptCount = Number(existing[0].attempt_count || 0) + 1;
      const updateResponse = await restFetch(`newbuild_lead_rate_limits?id=eq.${encodeURIComponent(existing[0].id)}`, {
        method: "PATCH",
        headers: restHeaders("return=minimal"),
        body: JSON.stringify({ attempt_count: attemptCount, last_attempt_at: new Date().toISOString() })
      });
      if (!updateResponse.ok) throw new Error("rate_limit_update_failed");
      return { allowed: attemptCount <= rateLimitPerHour, fingerprint, attemptCount, limit: rateLimitPerHour, degraded: false };
    }

    const insertResponse = await restFetch("newbuild_lead_rate_limits", {
      method: "POST",
      headers: restHeaders("return=minimal"),
      body: JSON.stringify({
        fingerprint,
        window_start: windowStart,
        attempt_count: 1,
        first_attempt_at: new Date().toISOString(),
        last_attempt_at: new Date().toISOString()
      })
    });
    if (!insertResponse.ok) throw new Error("rate_limit_insert_failed");
    return { allowed: true, fingerprint, attemptCount: 1, limit: rateLimitPerHour, degraded: false };
  } catch (_error) {
    return { allowed: true, fingerprint, attemptCount: 0, limit: rateLimitPerHour, degraded: true };
  }
}

function buildLeadRow(payload: JsonObject, request: Request, phone: { phone: string; normalized: string }, rateLimit: RateLimitResult) {
  const tracking = cleanObject(payload.tracking);
  const qualification = cleanObject(payload.qualification);
  const spamCheck = cleanObject(payload.spam_check);
  const rawPayload = {
    lead_type: cleanText(payload.lead_type, 80),
    form_id: cleanText(payload.form_id, 160),
    project_id: cleanText(payload.project_id, 120),
    residential_complex_id: cleanText(payload.residential_complex_id, 120),
    interest: cleanText(payload.interest || payload.room_type, 500),
    budget: cleanText(payload.budget, 160),
    purchase_method: cleanText(payload.purchase_method || payload.mortgage_program, 160),
    timeline: cleanText(payload.timeline || payload.purchase_timeline, 160),
    tracking,
    qualification
  };

  return {
    client_fixation_id: cleanText(payload.client_fixation_id, 120) || crypto.randomUUID(),
    lead_type: cleanText(payload.lead_type, 80) || "general",
    form_id: cleanText(payload.form_id, 160),
    project: cleanText(payload.project, 200) || "Портал Новостройки Борисоглебска",
    project_id: cleanText(payload.project_id, 120) || "newbuilds-borisoglebsk",
    project_name: cleanText(payload.project_name, 200) || "Новостройки Борисоглебска",
    residential_complex: cleanText(payload.residential_complex, 200),
    residential_complex_id: cleanText(payload.residential_complex_id, 120),
    name: cleanText(payload.name, 120),
    phone: phone.phone,
    phone_normalized: phone.normalized,
    interest: cleanText(payload.interest, 500),
    room_type: cleanText(payload.room_type, 160),
    budget: cleanText(payload.budget, 160),
    purchase_method: cleanText(payload.purchase_method, 160),
    mortgage_program: cleanText(payload.mortgage_program, 160),
    initial_payment: cleanText(payload.initial_payment, 160),
    monthly_payment: cleanText(payload.monthly_payment, 160),
    income_confirmed: cleanText(payload.income_confirmed, 80),
    timeline: cleanText(payload.timeline || payload.purchase_timeline, 160),
    own_property_to_sell: cleanText(payload.own_property_to_sell, 80),
    question_type: cleanText(payload.question_type, 160),
    waitlist_reason: cleanText(payload.waitlist_reason, 300),
    contact_channel: cleanText(payload.contact_channel, 80),
    callback_time: cleanText(payload.callback_time, 120),
    convenient_time: cleanText(payload.convenient_time, 120),
    comment: cleanText(payload.comment, 1500),
    question: cleanText(payload.question, 1500),
    page_url: cleanText(payload.page_url, 500),
    page_title: cleanText(payload.page_title, 300),
    source_path: cleanText(payload.source, 300),
    referrer: cleanText(payload.referrer, 500),
    user_agent: cleanText(request.headers.get("user-agent"), 500),
    lead_source: cleanText(payload.lead_source, 160),
    placement: cleanText(payload.placement, 160),
    submit_time_seconds: cleanInteger(payload.submit_time_seconds),
    tracking,
    qualification,
    spam_check: {
      ...spamCheck,
      rate_limit_fingerprint: rateLimit.fingerprint,
      rate_limit_attempt_count: rateLimit.attemptCount,
      rate_limit_per_hour: rateLimit.limit,
      rate_limit_allowed: rateLimit.allowed,
      rate_limit_degraded: rateLimit.degraded
    },
    raw_payload: rawPayload,
    personal_data_consent: true,
    marketing_consent: payload.marketing_consent === "yes" || payload.marketing_consent === true,
    consent_text: cleanText(payload.consent_text, 1500),
    policy_url: cleanText(payload.policy_url, 500),
    consent_url: cleanText(payload.consent_url, 500),
    delivery_status: "received",
    crm_status: "new"
  };
}

function leadSummary(row: JsonObject) {
  const qualification = cleanObject(row.qualification);
  const tracking = cleanObject(row.tracking);
  const current = cleanObject(tracking.current);
  return [
    "Новая заявка: Новостройки Борисоглебска",
    `Тип: ${row.lead_type || ""}`,
    `ID: ${row.client_fixation_id || ""}`,
    `Имя: ${row.name || ""}`,
    `Телефон: ${row.phone || ""}`,
    `Объект: ${row.residential_complex || ""}`,
    `Интерес: ${row.interest || row.room_type || ""}`,
    `Бюджет: ${row.budget || ""}`,
    `Способ покупки: ${row.purchase_method || row.mortgage_program || ""}`,
    `Квалификация: ${qualification.status || ""}, ${qualification.score || 0} баллов`,
    `Источник: ${current.utm_source || ""} / ${current.utm_medium || ""} / ${current.utm_campaign || ""}`,
    `Страница: ${row.page_url || ""}`
  ].join("\n");
}

async function notifyTelegram(text: string) {
  if (!telegramBotToken || !telegramChatId) return;
  await fetch(`https://api.telegram.org/bot${telegramBotToken}/sendMessage`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ chat_id: telegramChatId, text, disable_web_page_preview: true })
  });
}

Deno.serve(async (request) => {
  const origin = request.headers.get("origin");

  if (!isAllowedOrigin(origin)) {
    return jsonResponse({ success: false, error: "origin_not_allowed" }, 403);
  }

  if (request.method === "OPTIONS") {
    return new Response(null, { status: 204, headers: corsHeaders(origin) });
  }

  if (request.method !== "POST") {
    return jsonResponse({ success: false, error: "method_not_allowed" }, 405, origin);
  }

  if (!supabaseUrl || !serviceRoleKey) {
    return jsonResponse({ success: false, error: "server_not_configured" }, 500, origin);
  }

  const contentLength = Number(request.headers.get("content-length") || 0);
  if (contentLength > maxBodyBytes) {
    return jsonResponse({ success: false, error: "payload_too_large" }, 413, origin);
  }

  let payload: JsonObject;
  try {
    payload = await request.json();
  } catch (_error) {
    return jsonResponse({ success: false, error: "invalid_json" }, 400, origin);
  }

  const honeypot = cleanText(payload.website || payload.company || payload.url, 100);
  const spamCheck = cleanObject(payload.spam_check);
  if (honeypot || spamCheck.likely_bot === true) {
    return jsonResponse({ success: true, blocked: true }, 200, origin);
  }

  const phone = cleanPhone(payload.phone);
  if (!phone) {
    return jsonResponse({ success: false, errors: ["phone_required"] }, 422, origin);
  }

  const consentAccepted = payload.personal_data_consent === "yes" || payload.personal_data_consent === true;
  if (!consentAccepted) {
    return jsonResponse({ success: false, errors: ["personal_data_consent_required"] }, 422, origin);
  }

  const leadType = cleanText(payload.lead_type, 80) || "general";
  if (!allowedLeadTypes.has(leadType)) {
    return jsonResponse({ success: false, errors: ["invalid_lead_type"] }, 422, origin);
  }
  payload.lead_type = leadType;

  const rateLimit = await checkRateLimit(request, phone.normalized);
  if (!rateLimit.allowed) {
    return jsonResponse({ success: true, blocked: true, reason: "rate_limit" }, 200, origin);
  }

  const row = buildLeadRow(payload, request, phone, rateLimit);
  const insertResponse = await restFetch("newbuild_leads?select=id,client_fixation_id,lead_type,crm_status,qualification", {
    method: "POST",
    headers: restHeaders("return=representation"),
    body: JSON.stringify(row)
  });

  if (insertResponse.status === 409) {
    return jsonResponse({ success: true, duplicate: true, client_fixation_id: row.client_fixation_id }, 200, origin);
  }

  if (!insertResponse.ok) {
    console.error("newbuild_lead_insert_failed", insertResponse.status, await insertResponse.text());
    return jsonResponse({ success: false, error: "lead_storage_failed" }, 500, origin);
  }

  const insertedRows = await insertResponse.json() as Array<JsonObject>;
  const lead = insertedRows[0];
  if (!lead?.id) {
    return jsonResponse({ success: false, error: "lead_storage_response_invalid" }, 500, origin);
  }

  const eventResponse = await restFetch("newbuild_lead_events", {
    method: "POST",
    headers: restHeaders("return=minimal"),
    body: JSON.stringify({
      lead_id: lead.id,
      event_type: "created",
      event_title: "Заявка создана с сайта",
      event_comment: "Заявка принята через защищённую Edge Function",
      payload: {
        client_fixation_id: row.client_fixation_id,
        lead_type: row.lead_type,
        form_id: row.form_id,
        residential_complex_id: row.residential_complex_id,
        qualification: row.qualification,
        delivery_status: row.delivery_status
      }
    })
  });

  if (!eventResponse.ok) {
    console.error("newbuild_lead_event_failed", eventResponse.status, await eventResponse.text());
  }

  try {
    await notifyTelegram(leadSummary(row));
  } catch (error) {
    console.error("newbuild_lead_telegram_failed", error);
  }

  return jsonResponse({
    success: true,
    request_id: lead.id,
    client_fixation_id: lead.client_fixation_id,
    lead_type: lead.lead_type,
    crm_status: lead.crm_status,
    qualification: lead.qualification
  }, 201, origin);
});