-- NA7N: staff identity/authorization only. No patient or health data.
-- Safe to deploy to the existing auth project; patient story content is NOT allowed here.
begin;
create table if not exists public.na7n_story_staff (
  user_id uuid primary key references auth.users(id) on delete cascade,
  role text not null check (role in ('privacy_owner','educational_reviewer')),
  display_name text not null check (char_length(display_name) between 2 and 120),
  is_active boolean not null default true,
  appointed_at timestamptz not null default now(),
  appointed_by uuid null references auth.users(id)
);
create unique index if not exists na7n_story_single_active_owner
  on public.na7n_story_staff (role) where role='privacy_owner' and is_active;
alter table public.na7n_story_staff enable row level security;
alter table public.na7n_story_staff force row level security;
revoke all on public.na7n_story_staff from public, anon, authenticated;
grant select on public.na7n_story_staff to authenticated;
drop policy if exists na7n_story_staff_self_mfa on public.na7n_story_staff;
create policy na7n_story_staff_self_mfa on public.na7n_story_staff
  for select to authenticated
  using (user_id = (select auth.uid())
    and is_active
    and (select auth.jwt()->>'aal') = 'aal2');
comment on table public.na7n_story_staff is
  'Non-health staff role registry. Provision only by a verified Supabase administrator; never allow client writes. No patient story content on this project.';
commit;
-- ONBOARDING: After confirming each person's exact Auth user UUID, provision manually
-- in a privileged dashboard/SQL editor. Never trust client-controlled user_metadata
-- or an unverified email address to assign these roles.
