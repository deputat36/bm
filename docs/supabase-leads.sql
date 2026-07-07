-- Схема хранения заявок портала «Новостройки Борисоглебска».
-- Рекомендуемый вариант: фронтенд отправляет заявку не напрямую в таблицу,
-- а в Supabase Edge Function / CRM webhook. Edge Function валидирует данные,
-- нормализует телефон, пишет запись в public.newbuild_leads и создаёт уведомление менеджеру.

create extension if not exists pgcrypto;

create table if not exists public.newbuild_leads (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),

  client_fixation_id text not null unique,
  lead_type text not null,
  form_id text,
  project text not null default 'Портал Новостройки Борисоглебска',
  residential_complex text,

  name text,
  phone text not null,
  phone_normalized text,

  interest text,
  room_type text,
  budget text,
  purchase_method text,
  mortgage_program text,
  initial_payment text,
  monthly_payment text,
  income_confirmed text,
  timeline text,
  own_property_to_sell text,
  question_type text,
  waitlist_reason text,
  contact_channel text,
  callback_time text,
  convenient_time text,
  comment text,
  question text,

  page_url text,
  page_title text,
  source_path text,
  referrer text,
  user_agent text,
  submit_time_seconds integer,

  tracking jsonb not null default '{}'::jsonb,
  qualification jsonb not null default '{}'::jsonb,
  spam_check jsonb not null default '{}'::jsonb,
  raw_payload jsonb not null default '{}'::jsonb,

  personal_data_consent boolean not null default false,
  marketing_consent boolean not null default false,
  consent_text text,
  policy_url text,

  manager_id uuid,
  manager_name text,
  crm_status text not null default 'new',
  crm_status_reason text,
  first_contact_at timestamptz,
  next_contact_at timestamptz,
  last_contact_at timestamptz,
  lost_reason text,

  constraint newbuild_leads_lead_type_check check (
    lead_type in (
      'complex_interest',
      'mortgage',
      'apartment_selection',
      'consultation',
      'callback',
      'waitlist',
      'portal_selection',
      'project_consultation',
      'general'
    )
  ),
  constraint newbuild_leads_crm_status_check check (
    crm_status in (
      'new',
      'in_work',
      'first_contact_done',
      'no_answer',
      'qualified',
      'mortgage_check',
      'selection',
      'waiting_prices',
      'meeting_planned',
      'booking_interest',
      'deal_started',
      'lost',
      'duplicate',
      'spam'
    )
  )
);

create index if not exists newbuild_leads_created_at_idx on public.newbuild_leads (created_at desc);
create index if not exists newbuild_leads_phone_normalized_idx on public.newbuild_leads (phone_normalized);
create index if not exists newbuild_leads_lead_type_idx on public.newbuild_leads (lead_type);
create index if not exists newbuild_leads_crm_status_idx on public.newbuild_leads (crm_status);
create index if not exists newbuild_leads_manager_id_idx on public.newbuild_leads (manager_id);
create index if not exists newbuild_leads_tracking_gin_idx on public.newbuild_leads using gin (tracking);
create index if not exists newbuild_leads_qualification_gin_idx on public.newbuild_leads using gin (qualification);
create index if not exists newbuild_leads_spam_check_gin_idx on public.newbuild_leads using gin (spam_check);

create table if not exists public.newbuild_lead_events (
  id uuid primary key default gen_random_uuid(),
  lead_id uuid not null references public.newbuild_leads(id) on delete cascade,
  created_at timestamptz not null default now(),
  event_type text not null,
  event_title text,
  event_comment text,
  manager_id uuid,
  manager_name text,
  payload jsonb not null default '{}'::jsonb
);

create index if not exists newbuild_lead_events_lead_id_idx on public.newbuild_lead_events (lead_id, created_at desc);
create index if not exists newbuild_lead_events_event_type_idx on public.newbuild_lead_events (event_type);

create table if not exists public.newbuild_lead_rate_limits (
  id uuid primary key default gen_random_uuid(),
  fingerprint text not null,
  window_start timestamptz not null,
  attempt_count integer not null default 1,
  first_attempt_at timestamptz not null default now(),
  last_attempt_at timestamptz not null default now(),
  last_payload jsonb not null default '{}'::jsonb,
  constraint newbuild_lead_rate_limits_unique_window unique (fingerprint, window_start)
);

create index if not exists newbuild_lead_rate_limits_fingerprint_idx on public.newbuild_lead_rate_limits (fingerprint);
create index if not exists newbuild_lead_rate_limits_window_start_idx on public.newbuild_lead_rate_limits (window_start desc);
create index if not exists newbuild_lead_rate_limits_last_attempt_idx on public.newbuild_lead_rate_limits (last_attempt_at desc);

create or replace function public.set_newbuild_leads_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists trg_newbuild_leads_updated_at on public.newbuild_leads;
create trigger trg_newbuild_leads_updated_at
before update on public.newbuild_leads
for each row
execute function public.set_newbuild_leads_updated_at();

-- RLS включаем сразу. Публичному сайту нельзя давать прямую запись в таблицы через anon key.
-- Запись должна делать Edge Function с service role или серверный webhook.
alter table public.newbuild_leads enable row level security;
alter table public.newbuild_lead_events enable row level security;
alter table public.newbuild_lead_rate_limits enable row level security;

-- Пример политики для чтения внутри админки нужно адаптировать под реальную авторизацию.
-- create policy "Managers can read leads"
-- on public.newbuild_leads
-- for select
-- using (auth.role() = 'authenticated');

-- Пример вставки из server-side обработчика:
-- insert into public.newbuild_leads (
--   client_fixation_id,
--   lead_type,
--   form_id,
--   project,
--   residential_complex,
--   name,
--   phone,
--   phone_normalized,
--   submit_time_seconds,
--   tracking,
--   qualification,
--   spam_check,
--   raw_payload,
--   personal_data_consent,
--   marketing_consent,
--   consent_text,
--   policy_url
-- ) values (
--   payload->>'client_fixation_id',
--   payload->>'lead_type',
--   payload->>'form_id',
--   payload->>'project',
--   payload->>'residential_complex',
--   payload->>'name',
--   payload->>'phone',
--   payload->>'phone_normalized',
--   nullif(payload->>'submit_time_seconds', '')::integer,
--   coalesce(payload->'tracking', '{}'::jsonb),
--   coalesce(payload->'qualification', '{}'::jsonb),
--   coalesce(payload->'spam_check', '{}'::jsonb),
--   payload,
--   payload->>'personal_data_consent' = 'yes',
--   payload->>'marketing_consent' = 'yes',
--   payload->>'consent_text',
--   payload->>'policy_url'
-- );

-- Если таблица уже была создана до добавления полей антиспама и rate limit, выполнить миграцию:
-- alter table public.newbuild_leads add column if not exists submit_time_seconds integer;
-- alter table public.newbuild_leads add column if not exists spam_check jsonb not null default '{}'::jsonb;
-- create index if not exists newbuild_leads_spam_check_gin_idx on public.newbuild_leads using gin (spam_check);
-- create table if not exists public.newbuild_lead_rate_limits (
--   id uuid primary key default gen_random_uuid(),
--   fingerprint text not null,
--   window_start timestamptz not null,
--   attempt_count integer not null default 1,
--   first_attempt_at timestamptz not null default now(),
--   last_attempt_at timestamptz not null default now(),
--   last_payload jsonb not null default '{}'::jsonb,
--   constraint newbuild_lead_rate_limits_unique_window unique (fingerprint, window_start)
-- );
-- create index if not exists newbuild_lead_rate_limits_fingerprint_idx on public.newbuild_lead_rate_limits (fingerprint);
-- create index if not exists newbuild_lead_rate_limits_window_start_idx on public.newbuild_lead_rate_limits (window_start desc);
-- create index if not exists newbuild_lead_rate_limits_last_attempt_idx on public.newbuild_lead_rate_limits (last_attempt_at desc);
-- alter table public.newbuild_lead_rate_limits enable row level security;

-- Если таблица уже создана до добавления портальных типов заявок, обновить CHECK-ограничение:
-- alter table public.newbuild_leads drop constraint if exists newbuild_leads_lead_type_check;
-- alter table public.newbuild_leads add constraint newbuild_leads_lead_type_check check (
--   lead_type in (
--     'complex_interest',
--     'mortgage',
--     'apartment_selection',
--     'consultation',
--     'callback',
--     'waitlist',
--     'portal_selection',
--     'project_consultation',
--     'general'
--   )
-- );
