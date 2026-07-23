create extension if not exists pgcrypto;

create table public.newbuild_leads (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  client_fixation_id text not null unique,
  lead_type text not null,
  form_id text,
  project text not null default 'Портал Новостройки Борисоглебска',
  project_id text not null default 'newbuilds-borisoglebsk',
  project_name text not null default 'Новостройки Борисоглебска',
  residential_complex text,
  residential_complex_id text,
  name text,
  phone text not null,
  phone_normalized text not null,
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
  lead_source text,
  placement text,
  submit_time_seconds integer,
  tracking jsonb not null default '{}'::jsonb,
  qualification jsonb not null default '{}'::jsonb,
  spam_check jsonb not null default '{}'::jsonb,
  raw_payload jsonb not null default '{}'::jsonb,
  personal_data_consent boolean not null default false,
  marketing_consent boolean not null default false,
  consent_text text,
  policy_url text,
  consent_url text,
  delivery_status text not null default 'received',
  manager_id uuid,
  manager_name text,
  crm_status text not null default 'new',
  crm_status_reason text,
  first_contact_at timestamptz,
  next_contact_at timestamptz,
  last_contact_at timestamptz,
  lost_reason text,
  constraint newbuild_leads_lead_type_check check (lead_type in (
    'complex_interest','mortgage','apartment_selection','portal_selection',
    'project_consultation','comparison_request','mortgage_calculation',
    'layout_request','callback','waitlist','consultation','general'
  )),
  constraint newbuild_leads_delivery_status_check check (delivery_status in (
    'received','duplicate','blocked','delivery_error'
  )),
  constraint newbuild_leads_crm_status_check check (crm_status in (
    'new','in_work','first_contact_done','no_answer','qualified','mortgage_check',
    'selection','waiting_prices','meeting_planned','booking_interest','deal_started',
    'lost','duplicate','spam'
  ))
);

create index newbuild_leads_created_at_idx on public.newbuild_leads (created_at desc);
create index newbuild_leads_phone_normalized_idx on public.newbuild_leads (phone_normalized);
create index newbuild_leads_lead_type_idx on public.newbuild_leads (lead_type);
create index newbuild_leads_crm_status_idx on public.newbuild_leads (crm_status);
create index newbuild_leads_complex_idx on public.newbuild_leads (residential_complex_id);
create index newbuild_leads_tracking_gin_idx on public.newbuild_leads using gin (tracking);
create index newbuild_leads_qualification_gin_idx on public.newbuild_leads using gin (qualification);

create table public.newbuild_lead_events (
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

create index newbuild_lead_events_lead_id_idx on public.newbuild_lead_events (lead_id, created_at desc);
create index newbuild_lead_events_event_type_idx on public.newbuild_lead_events (event_type);

create table public.newbuild_lead_rate_limits (
  id uuid primary key default gen_random_uuid(),
  fingerprint text not null,
  window_start timestamptz not null,
  attempt_count integer not null default 1,
  first_attempt_at timestamptz not null default now(),
  last_attempt_at timestamptz not null default now(),
  constraint newbuild_lead_rate_limits_unique_window unique (fingerprint, window_start)
);

create index newbuild_lead_rate_limits_fingerprint_idx on public.newbuild_lead_rate_limits (fingerprint);
create index newbuild_lead_rate_limits_window_start_idx on public.newbuild_lead_rate_limits (window_start desc);

create or replace function public.set_newbuild_leads_updated_at()
returns trigger
language plpgsql
security invoker
set search_path = public
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create trigger trg_newbuild_leads_updated_at
before update on public.newbuild_leads
for each row execute function public.set_newbuild_leads_updated_at();

alter table public.newbuild_leads enable row level security;
alter table public.newbuild_leads force row level security;
alter table public.newbuild_lead_events enable row level security;
alter table public.newbuild_lead_events force row level security;
alter table public.newbuild_lead_rate_limits enable row level security;
alter table public.newbuild_lead_rate_limits force row level security;

revoke all on table public.newbuild_leads from anon, authenticated;
revoke all on table public.newbuild_lead_events from anon, authenticated;
revoke all on table public.newbuild_lead_rate_limits from anon, authenticated;
revoke all on function public.set_newbuild_leads_updated_at() from public, anon, authenticated;

grant select, insert, update, delete on table public.newbuild_leads to service_role;
grant select, insert, update, delete on table public.newbuild_lead_events to service_role;
grant select, insert, update, delete on table public.newbuild_lead_rate_limits to service_role;