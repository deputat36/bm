-- Резервная схема для будущего хранения заявок в Supabase.
-- На первом этапе заявки отправляются через Web3Forms.

create table if not exists public.prostornaya_leads (
  id bigint generated always as identity primary key,
  created_at timestamptz not null default now(),
  name text,
  phone text not null,
  interest text,
  payment text,
  comment text,
  source text,
  page_title text,
  referrer text,
  utm_source text,
  utm_medium text,
  utm_campaign text,
  utm_content text,
  utm_term text,
  realtor text,
  realtor_id text,
  status text not null default 'new',
  raw_payload jsonb not null default '{}'::jsonb
);

alter table public.prostornaya_leads enable row level security;

-- Таблица не должна быть публично доступна через anon.
-- Для записи с сайта лучше использовать Edge Function или серверный webhook.
