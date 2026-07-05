// Supabase Edge Function: newbuild-lead
// Назначение: принять заявку с публичного сайта, проверить данные,
// записать в public.newbuild_leads и при необходимости отправить уведомление менеджеру.
//
// Переменные окружения:
// SUPABASE_URL
// SUPABASE_SERVICE_ROLE_KEY
// TELEGRAM_BOT_TOKEN          optional
// TELEGRAM_CHAT_ID            optional
// ALLOWED_ORIGINS             optional, comma separated

import { serve } from "https://deno.land/std@0.224.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.4";

type LeadPayload = Record<string, unknown>;

const SUPABASE_URL = Deno.env.get("SUPABASE_URL") || "";
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") || "";
const TELEGRAM_BOT_TOKEN = Deno.env.get("TELEGRAM_BOT_TOKEN") || "";
const TELEGRAM_CHAT_ID = Deno.env.get("TELEGRAM_CHAT_ID") || "";
const ALLOWED_ORIGINS = (Deno.env.get("ALLOWED_ORIGINS") || "https://tellermanovsad.ru,https://deputat36.github.io")
  .split(",")
  .map((origin) => origin.trim())
  .filter(Boolean);

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
  auth: { persistSession: false }
});

function corsHeaders(origin: string | null) {
  const allowedOrigin = origin && ALLOWED_ORIGINS.some((item) => origin.startsWith(item)) ? origin : ALLOWED_ORIGINS[0] || "*";

  return {
    "Access-Control-Allow-Origin": allowedOrigin,
    "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
    "Access-Control-Allow-Methods": "POST, OPTIONS",
    "Content-Type": "application/json; charset=utf-8"
  };
}

function jsonResponse(body: Record<string, unknown>, status = 200, origin: string | null = null) {
  return new Response(JSON.stringify(body), {
    status,
    headers: corsHeaders(origin)
  });
}

function getString(payload: LeadPayload, key: string): string {
  const value = payload[key];
  return typeof value === "string" ? value.trim() : "";
}

function normalizePhone(phone: string): string {
  return phone.replace(/[^\d+]/g, "");
}

function validatePayload(payload: LeadPayload) {
  const errors: string[] = [];
  const phone = getString(payload, "phone");
  const phoneNormalized = normalizePhone(phone);
  const leadType = getString(payload, "lead_type") || "general";
  const consent = getString(payload, "personal_data_consent");
  const spamCheck = typeof payload.spam_check === "object" && payload.spam_check !== null ? payload.spam_check as Record<string, unknown> : {};

  if (!phone || phoneNormalized.length < 10) errors.push("phone_required");
  if (consent !== "yes") errors.push("personal_data_consent_required");
  if (![
    "complex_interest",
    "mortgage",
    "apartment_selection",
    "consultation",
    "callback",
    "waitlist",
    "general"
  ].includes(leadType)) errors.push("invalid_lead_type");
  if (spamCheck.likely_bot === true) errors.push("spam_detected");

  return { errors, phoneNormalized, leadType };
}

function buildLeadRow(payload: LeadPayload, phoneNormalized: string, leadType: string) {
  return {
    client_fixation_id: getString(payload, "client_fixation_id"),
    lead_type: leadType,
    form_id: getString(payload, "form_id"),
    project: getString(payload, "project") || "Портал Новостройки Борисоглебска",
    residential_complex: getString(payload, "residential_complex"),

    name: getString(payload, "name"),
    phone: getString(payload, "phone"),
    phone_normalized: phoneNormalized,

    interest: getString(payload, "interest"),
    room_type: getString(payload, "room_type"),
    budget: getString(payload, "budget"),
    purchase_method: getString(payload, "purchase_method"),
    mortgage_program: getString(payload, "mortgage_program"),
    initial_payment: getString(payload, "initial_payment"),
    monthly_payment: getString(payload, "monthly_payment"),
    income_confirmed: getString(payload, "income_confirmed"),
    timeline: getString(payload, "timeline"),
    own_property_to_sell: getString(payload, "own_property_to_sell"),
    question_type: getString(payload, "question_type"),
    waitlist_reason: getString(payload, "waitlist_reason"),
    contact_channel: getString(payload, "contact_channel"),
    callback_time: getString(payload, "callback_time"),
    convenient_time: getString(payload, "convenient_time"),
    comment: getString(payload, "comment"),
    question: getString(payload, "question"),

    page_url: getString(payload, "page_url"),
    page_title: getString(payload, "page_title"),
    source_path: getString(payload, "source"),
    referrer: getString(payload, "referrer"),
    user_agent: getString(payload, "user_agent"),
    submit_time_seconds: Number(payload.submit_time_seconds || 0) || null,

    tracking: payload.tracking || {},
    qualification: payload.qualification || {},
    spam_check: payload.spam_check || {},
    raw_payload: payload,

    personal_data_consent: getString(payload, "personal_data_consent") === "yes",
    marketing_consent: getString(payload, "marketing_consent") === "yes",
    consent_text: getString(payload, "consent_text"),
    policy_url: getString(payload, "policy_url"),
    crm_status: "new"
  };
}

function leadSummary(row: Record<string, unknown>) {
  const qualification = typeof row.qualification === "object" && row.qualification !== null ? row.qualification as Record<string, unknown> : {};
  const tracking = typeof row.tracking === "object" && row.tracking !== null ? row.tracking as Record<string, unknown> : {};
  const currentTracking = typeof tracking.current === "object" && tracking.current !== null ? tracking.current as Record<string, unknown> : {};

  return [
    "Новая заявка: Новостройки Борисоглебска",
    `Тип: ${row.lead_type || ""}`,
    `ID фиксации: ${row.client_fixation_id || ""}`,
    `Имя: ${row.name || ""}`,
    `Телефон: ${row.phone || ""}`,
    `ЖК: ${row.residential_complex || ""}`,
    `Интерес: ${row.interest || row.room_type || ""}`,
    `Бюджет: ${row.budget || ""}`,
    `Способ покупки: ${row.purchase_method || row.mortgage_program || ""}`,
    `Квалификация: ${qualification.status || ""}, ${qualification.score || 0} баллов`,
    `Источник: ${currentTracking.utm_source || ""} / ${currentTracking.utm_medium || ""} / ${currentTracking.utm_campaign || ""}`,
    `Страница: ${row.page_url || ""}`
  ].join("\n");
}

async function notifyTelegram(text: string) {
  if (!TELEGRAM_BOT_TOKEN || !TELEGRAM_CHAT_ID) return;

  await fetch(`https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/sendMessage`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      chat_id: TELEGRAM_CHAT_ID,
      text,
      disable_web_page_preview: true
    })
  });
}

serve(async (request) => {
  const origin = request.headers.get("origin");

  if (request.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders(origin) });
  }

  if (request.method !== "POST") {
    return jsonResponse({ success: false, error: "method_not_allowed" }, 405, origin);
  }

  if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
    return jsonResponse({ success: false, error: "server_not_configured" }, 500, origin);
  }

  let payload: LeadPayload;

  try {
    payload = await request.json();
  } catch (_error) {
    return jsonResponse({ success: false, error: "invalid_json" }, 400, origin);
  }

  const { errors, phoneNormalized, leadType } = validatePayload(payload);

  if (errors.includes("spam_detected")) {
    return jsonResponse({ success: true, blocked: true }, 200, origin);
  }

  if (errors.length) {
    return jsonResponse({ success: false, errors }, 422, origin);
  }

  const row = buildLeadRow(payload, phoneNormalized, leadType);

  if (!row.client_fixation_id) {
    row.client_fixation_id = crypto.randomUUID();
  }

  const { data, error } = await supabase
    .from("newbuild_leads")
    .insert(row)
    .select("id, client_fixation_id, lead_type, crm_status, qualification")
    .single();

  if (error) {
    // При повторной отправке того же client_fixation_id не создаём дубль, а возвращаем управляемый ответ.
    if (error.code === "23505") {
      return jsonResponse({ success: true, duplicate: true, client_fixation_id: row.client_fixation_id }, 200, origin);
    }

    return jsonResponse({ success: false, error: error.message }, 500, origin);
  }

  await supabase.from("newbuild_lead_events").insert({
    lead_id: data.id,
    event_type: "created",
    event_title: "Заявка создана с сайта",
    event_comment: "Заявка принята через Supabase Edge Function",
    payload: row
  });

  try {
    await notifyTelegram(leadSummary(row));
  } catch (_error) {
    // Ошибка Telegram не должна ломать запись заявки.
  }

  return jsonResponse({
    success: true,
    id: data.id,
    client_fixation_id: data.client_fixation_id,
    lead_type: data.lead_type,
    crm_status: data.crm_status,
    qualification: data.qualification
  }, 200, origin);
});
