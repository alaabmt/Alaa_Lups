-- NA7N Q-SLAQ development pilot: SYNTHETIC RESPONSES ONLY.
-- Existing authentication project: ap-south-1, India. Not a patient health-data store.
-- Do not place real patient symptoms, diagnoses or identifiers in this table.
-- All payload fields are enumerated numeric choices; free text is forbidden.
begin;
create or replace function public.na7n_qslaq_demo_valid(a jsonb)
returns boolean language sql immutable set search_path = pg_catalog as $$
 select case when jsonb_typeof(a) is distinct from 'object' then false else
   (select count(*) from jsonb_object_keys(a))=19
   and a ?& array['weight','fatigue','fever','nodes','alopecia','breath','chest','abdomen',
     'forget','depress','headache','muscleWeak','musclePain','jointPain','jointSwelling',
     'malar','sun','sores','global']::text[]
   and (select coalesce(bool_and(jsonb_typeof(a->k)='number' and (a->>k) ~ '^[0-3]$'),false)
     from unnest(array['weight','fatigue','fever','nodes','alopecia','breath','chest',
      'abdomen','forget','depress','headache','muscleWeak','musclePain','jointPain','jointSwelling']::text[]) as k)
   and (select coalesce(bool_and(jsonb_typeof(a->k)='number' and (a->>k) ~ '^[0-1]$'),false)
     from unnest(array['malar','sun','sores']::text[]) as k)
   and jsonb_typeof(a->'global')='number'
   and (a->>'global') ~ '^(10|[0-9])$'
   end;
$$;
create or replace function public.na7n_qslaq_demo_severity(a jsonb)
returns integer language sql immutable set search_path = pg_catalog as $$
 select (a->>'weight')::int+(a->>'fatigue')::int+(a->>'fever')::int+(a->>'nodes')::int
   + case when greatest((a->>'malar')::int,(a->>'sun')::int,(a->>'sores')::int)>0 then 1 else 0 end
   +(a->>'alopecia')::int
   +greatest((a->>'breath')::int,(a->>'chest')::int)
   +(a->>'abdomen')::int
   +greatest((a->>'forget')::int,(a->>'depress')::int)
   +(a->>'headache')::int
   +case when (a->>'muscleWeak')::int>0 then (a->>'muscleWeak')::int else (a->>'musclePain')::int end
   +case when (a->>'jointSwelling')::int>0 then (a->>'jointSwelling')::int else (a->>'jointPain')::int end;
$$;
create or replace function public.na7n_qslaq_demo_symptoms(a jsonb)
returns integer language sql immutable set search_path = pg_catalog as $$
 select (select count(*)::integer from unnest(array['weight','fatigue','fever','nodes',
 'alopecia','breath','chest','abdomen','forget','depress','headache','muscleWeak',
 'musclePain','jointPain','jointSwelling','malar','sun','sores']::text[]) as k
 where (a->>k)::integer>0);
$$;
create table if not exists public.na7n_qslaq_demo_results (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  answers jsonb not null,
  is_demo boolean not null default true check (is_demo is true),
  synthetic_attested boolean not null check (synthetic_attested is true),
  completed_at timestamptz not null default now(),
  severity_score smallint generated always as (public.na7n_qslaq_demo_severity(answers)) stored,
  symptom_score smallint generated always as (public.na7n_qslaq_demo_symptoms(answers)) stored,
  global_score smallint generated always as ((answers->>'global')::integer) stored,
  constraint na7n_qslaq_demo_exact_numeric_answers check (public.na7n_qslaq_demo_valid(answers)),
  constraint na7n_qslaq_demo_severity_bounds check (severity_score between 0 and 34),
  constraint na7n_qslaq_demo_count_bounds check (symptom_score between 0 and 18),
  constraint na7n_qslaq_demo_global_bounds check (global_score between 0 and 10),
  constraint na7n_qslaq_demo_recent_date check (completed_at between '2026-01-01'::timestamptz and '2036-01-01'::timestamptz)
);
create index if not exists na7n_qslaq_demo_by_owner_date
  on public.na7n_qslaq_demo_results(user_id,completed_at desc);
alter table public.na7n_qslaq_demo_results enable row level security;
alter table public.na7n_qslaq_demo_results force row level security;
revoke all on public.na7n_qslaq_demo_results from public,anon,authenticated;
grant select,insert,delete on public.na7n_qslaq_demo_results to authenticated;
drop policy if exists na7n_qslaq_demo_select_self on public.na7n_qslaq_demo_results;
create policy na7n_qslaq_demo_select_self on public.na7n_qslaq_demo_results
  for select to authenticated using (user_id=(select auth.uid()));
drop policy if exists na7n_qslaq_demo_insert_self on public.na7n_qslaq_demo_results;
create policy na7n_qslaq_demo_insert_self on public.na7n_qslaq_demo_results
  for insert to authenticated with check (user_id=(select auth.uid())
    and is_demo is true and synthetic_attested is true);
drop policy if exists na7n_qslaq_demo_delete_self on public.na7n_qslaq_demo_results;
create policy na7n_qslaq_demo_delete_self on public.na7n_qslaq_demo_results
  for delete to authenticated using (user_id=(select auth.uid()));
comment on table public.na7n_qslaq_demo_results is
  'QA ONLY. Synthetic/fictitious Q-SLAQ numeric samples, not real patient data. Must be purged or migrated to an approved UAE environment BEFORE opening to real patients.';
commit;
-- Phase gate: never reuse this schema as a production health-information store.
-- Operational purge before patient launch:
-- delete from public.na7n_qslaq_demo_results; -- only after authorized confirmation.
