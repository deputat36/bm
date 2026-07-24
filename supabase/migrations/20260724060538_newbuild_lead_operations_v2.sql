alter table public.newbuild_leads
  add column if not exists operational_status text not null default 'received',
  add column if not exists lead_class text not null default 'buyer_intent',
  add column if not exists lead_owner_ref text,
  add column if not exists backup_owner_ref text,
  add column if not exists assigned_role text,
  add column if not exists assigned_at timestamptz,
  add column if not exists routing_reason text,
  add column if not exists first_action_due_at timestamptz,
  add column if not exists first_action_at timestamptz,
  add column if not exists first_action_channel text,
  add column if not exists contact_outcome text,
  add column if not exists contact_attempt_count integer not null default 0,
  add column if not exists last_contact_attempt_at timestamptz,
  add column if not exists contacted_at timestamptz,
  add column if not exists qualified_at timestamptz,
  add column if not exists source_check_required boolean not null default false,
  add column if not exists next_action text not null default 'assign_owner',
  add column if not exists next_action_at timestamptz,
  add column if not exists result_status text,
  add column if not exists close_reason text,
  add column if not exists closed_at timestamptz,
  add column if not exists source_system text not null default 'supabase:newbuild_leads',
  add column if not exists record_locator text,
  add column if not exists last_event_at timestamptz not null default now(),
  add column if not exists sla_policy_id text,
  add column if not exists operations_version text not null default '2.0';

update public.newbuild_leads
set record_locator = coalesce(record_locator, id::text),
    source_system = coalesce(nullif(source_system, ''), 'supabase:newbuild_leads'),
    next_action = coalesce(nullif(next_action, ''), 'assign_owner'),
    operational_status = coalesce(nullif(operational_status, ''), 'received'),
    operations_version = coalesce(nullif(operations_version, ''), '2.0');

alter table public.newbuild_leads
  alter column record_locator set not null;

alter table public.newbuild_leads
  drop constraint if exists newbuild_leads_operational_status_check,
  add constraint newbuild_leads_operational_status_check check (operational_status in (
    'received','triage_ready','contact_pending','contact_attempted','contacted_qualified',
    'source_check_pending','consultation_active','follow_up_scheduled','duplicate',
    'invalid_or_spam','do_not_contact','closed_no_action'
  )),
  drop constraint if exists newbuild_leads_lead_class_check,
  add constraint newbuild_leads_lead_class_check check (lead_class in (
    'buyer_intent','mortgage_request','update_subscription','source_question','general'
  )),
  drop constraint if exists newbuild_leads_contact_attempt_count_check,
  add constraint newbuild_leads_contact_attempt_count_check check (contact_attempt_count >= 0),
  drop constraint if exists newbuild_leads_follow_up_due_check,
  add constraint newbuild_leads_follow_up_due_check check (
    operational_status <> 'follow_up_scheduled' or next_action_at is not null
  ),
  drop constraint if exists newbuild_leads_source_check_state_check,
  add constraint newbuild_leads_source_check_state_check check (
    operational_status <> 'source_check_pending' or source_check_required = true
  ),
  drop constraint if exists newbuild_leads_terminal_reason_check,
  add constraint newbuild_leads_terminal_reason_check check (
    (operational_status not in ('duplicate','invalid_or_spam','do_not_contact') or contact_outcome is not null)
    and (operational_status <> 'closed_no_action' or close_reason is not null)
  );

create index if not exists newbuild_leads_operational_status_idx
  on public.newbuild_leads (operational_status, created_at desc);
create index if not exists newbuild_leads_next_action_at_idx
  on public.newbuild_leads (next_action_at)
  where next_action_at is not null;
create index if not exists newbuild_leads_first_action_due_at_idx
  on public.newbuild_leads (first_action_due_at)
  where first_action_due_at is not null;
create index if not exists newbuild_leads_owner_ref_idx
  on public.newbuild_leads (lead_owner_ref)
  where lead_owner_ref is not null;
create index if not exists newbuild_leads_lead_class_idx
  on public.newbuild_leads (lead_class, created_at desc);

alter table public.newbuild_lead_events
  add column if not exists from_state text,
  add column if not exists to_state text,
  add column if not exists actor_role text not null default 'portal_system',
  add column if not exists source_system text not null default 'portal_form',
  add column if not exists contact_outcome text,
  add column if not exists next_action text,
  add column if not exists next_action_at timestamptz,
  add column if not exists reason_code text,
  add column if not exists payload_version text not null default '2.0';

alter table public.newbuild_lead_events
  drop constraint if exists newbuild_lead_events_actor_role_check,
  add constraint newbuild_lead_events_actor_role_check check (actor_role in (
    'portal_system','lead_operator','manager','source_reviewer','integration_system'
  ));

create index if not exists newbuild_lead_events_transition_idx
  on public.newbuild_lead_events (lead_id, created_at desc, to_state);
create index if not exists newbuild_lead_events_actor_role_idx
  on public.newbuild_lead_events (actor_role, created_at desc);

create table if not exists public.newbuild_lead_operational_policies (
  id text primary key,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  status text not null default 'draft',
  is_active boolean not null default false,
  timezone text,
  working_schedule jsonb not null default '{}'::jsonb,
  first_action_minutes_working integer,
  first_action_minutes_off_hours integer,
  owner_role text,
  backup_owner_role text,
  routing_policy jsonb not null default '{}'::jsonb,
  contact_attempt_policy jsonb not null default '{}'::jsonb,
  closure_reasons jsonb not null default '[]'::jsonb,
  approved_at timestamptz,
  approved_by_role text,
  notes text,
  constraint newbuild_lead_operational_policies_status_check check (status in ('draft','active','retired')),
  constraint newbuild_lead_operational_policies_minutes_check check (
    (first_action_minutes_working is null or first_action_minutes_working > 0)
    and (first_action_minutes_off_hours is null or first_action_minutes_off_hours > 0)
  )
);

create unique index if not exists newbuild_lead_operational_policies_one_active_idx
  on public.newbuild_lead_operational_policies (is_active)
  where is_active = true;

insert into public.newbuild_lead_operational_policies (
  id, status, is_active, timezone, working_schedule,
  first_action_minutes_working, first_action_minutes_off_hours,
  routing_policy, contact_attempt_policy, closure_reasons, notes
) values (
  'recommended_default_v1',
  'draft',
  false,
  'Europe/Moscow',
  '{"status":"requires_owner_decision","days":[],"windows":[]}'::jsonb,
  10,
  720,
  '{"mode":"single_queue_then_route","dimensions":["residential_complex_id","lead_type","qualification_status","current_load"],"status":"recommended_not_active"}'::jsonb,
  '{"status":"recommended_not_active","attempts":[{"number":1,"offset_minutes":0},{"number":2,"offset_minutes":120},{"number":3,"offset_minutes":1440}],"channels":["phone","messenger_if_available"]}'::jsonb,
  '["duplicate","invalid_or_spam","do_not_contact","no_answer_after_policy","not_interested","postponed","no_suitable_option","financing_not_available","other_with_comment"]'::jsonb,
  'Технически подготовленная, но не активированная политика. Требует решений владельца по ролям, графику, SLA и попыткам связи.'
)
on conflict (id) do update set
  updated_at = now(),
  timezone = excluded.timezone,
  working_schedule = excluded.working_schedule,
  first_action_minutes_working = excluded.first_action_minutes_working,
  first_action_minutes_off_hours = excluded.first_action_minutes_off_hours,
  routing_policy = excluded.routing_policy,
  contact_attempt_policy = excluded.contact_attempt_policy,
  closure_reasons = excluded.closure_reasons,
  notes = excluded.notes;

alter table public.newbuild_lead_operational_policies enable row level security;
alter table public.newbuild_lead_operational_policies force row level security;
revoke all on table public.newbuild_lead_operational_policies from anon, authenticated;
grant select, insert, update, delete on table public.newbuild_lead_operational_policies to service_role;

create or replace function public.set_newbuild_lead_policy_updated_at()
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

drop trigger if exists trg_newbuild_lead_policy_updated_at on public.newbuild_lead_operational_policies;
create trigger trg_newbuild_lead_policy_updated_at
before update on public.newbuild_lead_operational_policies
for each row execute function public.set_newbuild_lead_policy_updated_at();

create or replace function public.newbuild_lead_events_append_only()
returns trigger
language plpgsql
security invoker
set search_path = public
as $$
begin
  raise exception 'newbuild_lead_events is append-only';
end;
$$;

drop trigger if exists trg_newbuild_lead_events_append_only on public.newbuild_lead_events;
create trigger trg_newbuild_lead_events_append_only
before update or delete on public.newbuild_lead_events
for each row execute function public.newbuild_lead_events_append_only();

create or replace function public.newbuild_touch_lead_from_event()
returns trigger
language plpgsql
security invoker
set search_path = public
as $$
begin
  update public.newbuild_leads
  set last_event_at = new.created_at
  where id = new.lead_id;
  return new;
end;
$$;

drop trigger if exists trg_newbuild_touch_lead_from_event on public.newbuild_lead_events;
create trigger trg_newbuild_touch_lead_from_event
after insert on public.newbuild_lead_events
for each row execute function public.newbuild_touch_lead_from_event();

create or replace function public.newbuild_lead_transition(
  p_lead_id uuid,
  p_to_state text,
  p_actor_role text,
  p_contact_outcome text default null,
  p_next_action text default null,
  p_next_action_at timestamptz default null,
  p_reason_code text default null,
  p_event_comment text default null,
  p_source_check_required boolean default null,
  p_assigned_role text default null,
  p_lead_owner_ref text default null,
  p_backup_owner_ref text default null,
  p_first_action_due_at timestamptz default null,
  p_channel text default null
)
returns jsonb
language plpgsql
security invoker
set search_path = public
as $$
declare
  v_lead public.newbuild_leads%rowtype;
  v_from_state text;
  v_allowed boolean := false;
  v_now timestamptz := now();
begin
  select * into v_lead
  from public.newbuild_leads
  where id = p_lead_id
  for update;

  if not found then
    raise exception 'lead_not_found';
  end if;

  v_from_state := v_lead.operational_status;

  v_allowed := case v_from_state
    when 'received' then p_to_state in ('triage_ready','duplicate','invalid_or_spam')
    when 'triage_ready' then p_to_state in ('contact_pending','duplicate','invalid_or_spam')
    when 'contact_pending' then p_to_state in ('contact_attempted','duplicate','invalid_or_spam','do_not_contact')
    when 'contact_attempted' then p_to_state in ('contacted_qualified','follow_up_scheduled','duplicate','invalid_or_spam','do_not_contact')
    when 'contacted_qualified' then p_to_state in ('source_check_pending','consultation_active','follow_up_scheduled','closed_no_action')
    when 'source_check_pending' then p_to_state in ('consultation_active','follow_up_scheduled','closed_no_action')
    when 'consultation_active' then p_to_state in ('follow_up_scheduled','closed_no_action')
    when 'follow_up_scheduled' then p_to_state in ('contact_pending','closed_no_action')
    else false
  end;

  if not v_allowed then
    raise exception 'invalid_transition:%->%', v_from_state, p_to_state;
  end if;

  if p_to_state = 'contact_pending' and (
    coalesce(p_lead_owner_ref, v_lead.lead_owner_ref) is null
    or coalesce(p_assigned_role, v_lead.assigned_role) is null
    or coalesce(p_first_action_due_at, v_lead.first_action_due_at) is null
  ) then
    raise exception 'assignment_fields_required';
  end if;

  if p_to_state = 'contact_attempted' and (p_contact_outcome is null or p_channel is null) then
    raise exception 'contact_attempt_fields_required';
  end if;

  if p_to_state = 'follow_up_scheduled' and (p_next_action is null or p_next_action_at is null) then
    raise exception 'follow_up_fields_required';
  end if;

  if p_to_state = 'source_check_pending' and coalesce(p_source_check_required, true) is not true then
    raise exception 'source_check_required';
  end if;

  if p_to_state in ('duplicate','invalid_or_spam','do_not_contact') and p_contact_outcome is null then
    raise exception 'terminal_contact_outcome_required';
  end if;

  if p_to_state = 'closed_no_action' and p_reason_code is null then
    raise exception 'close_reason_required';
  end if;

  update public.newbuild_leads
  set operational_status = p_to_state,
      assigned_role = coalesce(p_assigned_role, assigned_role),
      lead_owner_ref = coalesce(p_lead_owner_ref, lead_owner_ref),
      backup_owner_ref = coalesce(p_backup_owner_ref, backup_owner_ref),
      assigned_at = case
        when p_to_state = 'contact_pending' and assigned_at is null then v_now
        else assigned_at
      end,
      first_action_due_at = coalesce(p_first_action_due_at, first_action_due_at),
      first_action_at = case
        when p_to_state = 'contact_attempted' and first_action_at is null then v_now
        else first_action_at
      end,
      first_action_channel = coalesce(p_channel, first_action_channel),
      contact_outcome = coalesce(p_contact_outcome, contact_outcome),
      contact_attempt_count = contact_attempt_count + case when p_to_state = 'contact_attempted' then 1 else 0 end,
      last_contact_attempt_at = case when p_to_state = 'contact_attempted' then v_now else last_contact_attempt_at end,
      contacted_at = case when p_to_state = 'contacted_qualified' and contacted_at is null then v_now else contacted_at end,
      qualified_at = case when p_to_state = 'contacted_qualified' and qualified_at is null then v_now else qualified_at end,
      source_check_required = coalesce(p_source_check_required, source_check_required),
      next_action = case
        when p_to_state in ('duplicate','invalid_or_spam','do_not_contact','closed_no_action') then 'close_no_action'
        else coalesce(p_next_action, next_action)
      end,
      next_action_at = case
        when p_to_state in ('duplicate','invalid_or_spam','do_not_contact','closed_no_action') then null
        else coalesce(p_next_action_at, next_action_at)
      end,
      result_status = case
        when p_to_state in ('duplicate','invalid_or_spam','do_not_contact','closed_no_action') then p_to_state
        else result_status
      end,
      close_reason = case
        when p_to_state = 'closed_no_action' then p_reason_code
        when p_to_state in ('duplicate','invalid_or_spam','do_not_contact') then p_contact_outcome
        else close_reason
      end,
      closed_at = case
        when p_to_state in ('duplicate','invalid_or_spam','do_not_contact','closed_no_action') then v_now
        else closed_at
      end,
      last_event_at = v_now
  where id = p_lead_id;

  insert into public.newbuild_lead_events (
    lead_id, event_type, event_title, event_comment,
    from_state, to_state, actor_role, source_system,
    contact_outcome, next_action, next_action_at, reason_code,
    payload_version, payload
  ) values (
    p_lead_id,
    'state_transition',
    'Изменён операционный статус обращения',
    p_event_comment,
    v_from_state,
    p_to_state,
    p_actor_role,
    'supabase:newbuild_leads',
    p_contact_outcome,
    p_next_action,
    p_next_action_at,
    p_reason_code,
    '2.0',
    jsonb_build_object(
      'assigned_role', p_assigned_role,
      'source_check_required', p_source_check_required,
      'channel', p_channel
    )
  );

  return jsonb_build_object(
    'success', true,
    'lead_id', p_lead_id,
    'from_state', v_from_state,
    'to_state', p_to_state,
    'next_action', (select next_action from public.newbuild_leads where id = p_lead_id),
    'next_action_at', (select next_action_at from public.newbuild_leads where id = p_lead_id),
    'contact_attempt_count', (select contact_attempt_count from public.newbuild_leads where id = p_lead_id)
  );
end;
$$;

create or replace function public.newbuild_lead_health()
returns jsonb
language sql
security invoker
set search_path = public
as $$
  select jsonb_build_object(
    'status', case
      when to_regclass('public.newbuild_leads') is not null
       and to_regclass('public.newbuild_lead_events') is not null
       and to_regclass('public.newbuild_lead_rate_limits') is not null
       and to_regclass('public.newbuild_lead_operational_policies') is not null
      then 'ok' else 'degraded' end,
    'schema_version', '2.0',
    'system_of_record', 'supabase:newbuild_leads',
    'storage_ready', to_regclass('public.newbuild_leads') is not null,
    'event_log_ready', to_regclass('public.newbuild_lead_events') is not null,
    'rate_limit_ready', to_regclass('public.newbuild_lead_rate_limits') is not null,
    'operations_policy_ready', to_regclass('public.newbuild_lead_operational_policies') is not null,
    'active_policy_exists', exists (
      select 1 from public.newbuild_lead_operational_policies where is_active = true and status = 'active'
    ),
    'operational_activation', exists (
      select 1 from public.newbuild_lead_operational_policies where is_active = true and status = 'active'
    ),
    'checked_at', now()
  );
$$;

create or replace view public.newbuild_lead_operations_dashboard_v1
with (security_invoker = true)
as
select
  count(*) as total_leads,
  count(*) filter (where operational_status in ('received','triage_ready')) as unassigned_queue,
  count(*) filter (where operational_status = 'contact_pending') as contact_pending,
  count(*) filter (where operational_status = 'follow_up_scheduled') as follow_up_scheduled,
  count(*) filter (where first_action_due_at is not null and first_action_at is null and first_action_due_at < now()) as first_action_overdue,
  count(*) filter (where next_action_at is not null and next_action_at < now() and operational_status not in ('duplicate','invalid_or_spam','do_not_contact','closed_no_action')) as next_action_overdue,
  count(*) filter (where qualification->>'status' = 'hot') as hot_leads,
  count(*) filter (where qualification->>'status' = 'warm') as warm_leads,
  count(*) filter (where qualification->>'status' = 'cold') as cold_leads,
  max(created_at) as latest_lead_at,
  max(last_event_at) as latest_event_at
from public.newbuild_leads;

create or replace view public.newbuild_lead_operations_queue_v1
with (security_invoker = true)
as
select
  id,
  created_at as received_at,
  client_fixation_id,
  lead_type,
  lead_class,
  form_id,
  residential_complex,
  residential_complex_id,
  name,
  phone,
  phone_normalized,
  interest,
  room_type,
  budget,
  purchase_method,
  mortgage_program,
  timeline,
  question_type,
  comment,
  question,
  qualification,
  lead_source,
  placement,
  operational_status,
  assigned_role,
  lead_owner_ref,
  backup_owner_ref,
  assigned_at,
  first_action_due_at,
  first_action_at,
  contact_outcome,
  contact_attempt_count,
  last_contact_attempt_at,
  source_check_required,
  next_action,
  next_action_at,
  result_status,
  close_reason,
  closed_at,
  source_system,
  record_locator,
  last_event_at
from public.newbuild_leads;

revoke all on public.newbuild_lead_operations_dashboard_v1 from anon, authenticated;
revoke all on public.newbuild_lead_operations_queue_v1 from anon, authenticated;
grant select on public.newbuild_lead_operations_dashboard_v1 to service_role;
grant select on public.newbuild_lead_operations_queue_v1 to service_role;

revoke all on function public.set_newbuild_lead_policy_updated_at() from public, anon, authenticated;
revoke all on function public.newbuild_lead_events_append_only() from public, anon, authenticated;
revoke all on function public.newbuild_touch_lead_from_event() from public, anon, authenticated;
revoke all on function public.newbuild_lead_transition(uuid,text,text,text,text,timestamptz,text,text,boolean,text,text,text,timestamptz,text) from public, anon, authenticated;
revoke all on function public.newbuild_lead_health() from public, anon, authenticated;
grant execute on function public.newbuild_lead_transition(uuid,text,text,text,text,timestamptz,text,text,boolean,text,text,text,timestamptz,text) to service_role;
grant execute on function public.newbuild_lead_health() to service_role;

revoke update, delete, truncate on public.newbuild_lead_events from service_role;
grant select, insert on public.newbuild_lead_events to service_role;