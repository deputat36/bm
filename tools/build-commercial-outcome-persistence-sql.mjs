import fs from "node:fs";
import path from "node:path";

const ROOT = process.cwd();
const PERSISTENCE_PATH = "data/operations/commercial-outcome-persistence.json";
const EVENTS_PATH = "data/operations/commercial-outcome-events.json";

function readJson(relativePath) {
  return JSON.parse(fs.readFileSync(path.join(ROOT, relativePath), "utf8"));
}

function sqlLiteral(value) {
  return `'${String(value).replaceAll("'", "''")}'`;
}

const persistence = readJson(PERSISTENCE_PATH);
const events = readJson(EVENTS_PATH);

if (persistence.deployment?.sql_preview_only !== true
  || persistence.deployment?.migration_file_created !== false
  || persistence.deployment?.production_ddl_applied !== false
  || persistence.deployment?.write_api_deployed !== false
  || persistence.deployment?.event_write_enabled !== false) {
  throw new Error("Commercial persistence SQL can only be generated from design-only state");
}

const table = `${persistence.store.schema}.${persistence.store.table}`;
const eventIds = (events.events || []).map((event) => event.id);
const eventList = eventIds.map(sqlLiteral).join(", ");
const appendFunction = "public.newbuild_commercial_events_append_only";
const writeFunction = persistence.write_api_design.function;

const requiredByEvent = Object.fromEntries(
  (events.events || []).map((event) => [event.id, event.required_non_null_fields || []])
);

const requiredChecks = [];
for (const [eventId, fields] of Object.entries(requiredByEvent)) {
  const checks = [];
  for (const field of fields) {
    const param = `p_${field}`;
    checks.push(`${param} is null`);
  }
  if (checks.length) {
    requiredChecks.push(`  if p_event_type = ${sqlLiteral(eventId)} and (${checks.join(" or ")}) then\n    raise exception 'commercial_event_required_fields:${eventId}';\n  end if;`);
  }
}

const sql = `-- PREVIEW ONLY - NOT DEPLOYED
-- Generated from ${PERSISTENCE_PATH} and ${EVENTS_PATH}.
-- Do not execute or copy into supabase/migrations until owner operations decisions,
-- closure-reason policy and an explicit migration/security review are complete.

create table if not exists ${table} (
  event_id uuid primary key default gen_random_uuid(),
  lead_id uuid not null references public.newbuild_leads(id) on delete restrict,
  event_type text not null,
  occurred_at timestamptz not null default now(),
  actor_ref text not null,
  source_system text not null,
  object_id text,
  scheduled_for timestamptz,
  reason_code text,
  next_action text,
  next_action_at timestamptz,
  evidence_ref text,
  protected_note text,
  idempotency_key text not null,
  created_at timestamptz not null default now(),
  constraint newbuild_commercial_events_type_check check (event_type in (${eventList})),
  constraint newbuild_commercial_events_actor_ref_check check (length(trim(actor_ref)) > 0),
  constraint newbuild_commercial_events_source_system_check check (length(trim(source_system)) > 0),
  constraint newbuild_commercial_events_idempotency_key_check check (length(trim(idempotency_key)) > 0),
  constraint newbuild_commercial_events_lead_idempotency_key unique (lead_id, idempotency_key)
);

alter table ${table} enable row level security;
alter table ${table} force row level security;
revoke all on table ${table} from public, anon, authenticated;
grant select, insert on table ${table} to service_role;

create index if not exists newbuild_commercial_events_lead_time_idx
  on ${table} (lead_id, occurred_at desc);
create index if not exists newbuild_commercial_events_type_time_idx
  on ${table} (event_type, occurred_at desc);
create index if not exists newbuild_commercial_events_object_time_idx
  on ${table} (object_id, occurred_at desc)
  where object_id is not null;

create or replace function ${appendFunction}()
returns trigger
language plpgsql
security invoker
set search_path = public
as $$
begin
  raise exception 'newbuild_commercial_events is append-only';
end;
$$;

revoke all on function ${appendFunction}() from public, anon, authenticated;
grant execute on function ${appendFunction}() to service_role;

drop trigger if exists trg_newbuild_commercial_events_append_only on ${table};
create trigger trg_newbuild_commercial_events_append_only
before update or delete on ${table}
for each row execute function ${appendFunction}();

create or replace function ${writeFunction}(
  p_lead_id uuid,
  p_event_type text,
  p_actor_ref text,
  p_source_system text,
  p_idempotency_key text,
  p_object_id text default null,
  p_scheduled_for timestamptz default null,
  p_reason_code text default null,
  p_next_action text default null,
  p_next_action_at timestamptz default null,
  p_evidence_ref text default null,
  p_protected_note text default null
)
returns jsonb
language plpgsql
security invoker
set search_path = public
as $$
declare
  v_event ${table}%rowtype;
begin
  if p_event_type not in (${eventList}) then
    raise exception 'commercial_event_type_invalid';
  end if;
  if p_actor_ref is null or length(trim(p_actor_ref)) = 0 then
    raise exception 'commercial_event_actor_ref_required';
  end if;
  if p_source_system is null or length(trim(p_source_system)) = 0 then
    raise exception 'commercial_event_source_system_required';
  end if;
  if p_idempotency_key is null or length(trim(p_idempotency_key)) = 0 then
    raise exception 'commercial_event_idempotency_key_required';
  end if;

${requiredChecks.join("\n\n")}

  if p_event_type = 'closed_lost' then
    raise exception 'commercial_closed_lost_owner_policy_not_activated';
  end if;

  insert into ${table} (
    lead_id, event_type, actor_ref, source_system, object_id,
    scheduled_for, reason_code, next_action, next_action_at,
    evidence_ref, protected_note, idempotency_key
  ) values (
    p_lead_id, p_event_type, p_actor_ref, p_source_system, p_object_id,
    p_scheduled_for, p_reason_code, p_next_action, p_next_action_at,
    p_evidence_ref, p_protected_note, p_idempotency_key
  )
  on conflict (lead_id, idempotency_key) do nothing
  returning * into v_event;

  if v_event.event_id is null then
    select * into v_event
    from ${table}
    where lead_id = p_lead_id and idempotency_key = p_idempotency_key;

    if v_event.event_type <> p_event_type then
      raise exception 'commercial_event_idempotency_conflict';
    end if;
  end if;

  return jsonb_build_object(
    'event_id', v_event.event_id,
    'lead_id', v_event.lead_id,
    'event_type', v_event.event_type,
    'occurred_at', v_event.occurred_at,
    'object_id', v_event.object_id,
    'scheduled_for', v_event.scheduled_for,
    'reason_code', v_event.reason_code,
    'next_action', v_event.next_action,
    'next_action_at', v_event.next_action_at,
    'evidence_ref', v_event.evidence_ref
  );
end;
$$;

revoke all on function ${writeFunction}(
  uuid, text, text, text, text, text, timestamptz, text, text, timestamptz, text, text
) from public, anon, authenticated;
grant execute on function ${writeFunction}(
  uuid, text, text, text, text, text, timestamptz, text, text, timestamptz, text, text
) to service_role;

-- PREVIEW ONLY - NOT DEPLOYED
`;

process.stdout.write(sql);
