-- PHASE 2 ONLY: Do not execute in the current Mumbai (ap-south-1) NA7N database.
-- Apply ONLY to an approved, contractually reviewed health-data environment, with
-- separately verified MFA-enabled staff identities and a migrated staff role table.
-- No public/anonymous data inserts: a separate audited secure intake will be required.
begin;
create table public.na7n_story_cases (
 id uuid primary key default gen_random_uuid(),
 title text not null check (char_length(title) between 3 and 160),
 redacted_story text not null check (char_length(redacted_story) between 20 and 15000),
 edited_story text,
 status text not null default 'new' check
  (status in ('new','privacy_review','assigned','educational_review','awaiting_author_consent','approved','published','rejected','withdrawn')),
 assigned_reviewer uuid references public.na7n_story_staff(user_id),
 clinical_review_required boolean not null default false,
 privacy_cleared_at timestamptz,
 approved_at timestamptz,
 approved_by uuid references public.na7n_story_staff(user_id),
 created_at timestamptz not null default now(),
 updated_at timestamptz not null default now()
);
create table public.na7n_story_private (
 case_id uuid primary key references public.na7n_story_cases(id) on delete cascade,
 author_contact text not null,
 original_story text not null,
 created_at timestamptz not null default now()
);
create table public.na7n_story_reviews (
 id uuid primary key default gen_random_uuid(),
 case_id uuid not null references public.na7n_story_cases(id) on delete cascade,
 reviewer_id uuid not null references public.na7n_story_staff(user_id),
 review_type text not null check (review_type in ('educational_safety','editorial_note')),
 comment text not null check (char_length(comment) between 5 and 4000),
 created_at timestamptz not null default now()
);
create table public.na7n_story_consents (
 id uuid primary key default gen_random_uuid(),
 case_id uuid not null references public.na7n_story_cases(id) on delete cascade,
 consent_type text not null check (consent_type in ('final_publication','real_name','image','translation','social_repost')),
 final_text_sha256 text not null check (final_text_sha256 ~ '^[0-9a-f]{64}$'),
 evidence_reference text not null check (char_length(evidence_reference) between 8 and 500),
 recorded_by uuid not null references public.na7n_story_staff(user_id),
 received_at timestamptz not null,
 revoked_at timestamptz,
 created_at timestamptz not null default now()
);
create table public.na7n_story_audit (
 id bigint generated always as identity primary key,
 case_id uuid not null,
 actor_id uuid,
 action text not null,
 occurred_at timestamptz not null default now()
);
create index on public.na7n_story_cases (assigned_reviewer,status);
create index on public.na7n_story_reviews (case_id,created_at);
create index on public.na7n_story_consents (case_id,consent_type);
-- Only a verified and MFA-authenticated owner may see private contact details.
create or replace function public.na7n_is_story_owner()
returns boolean language sql stable security invoker set search_path=public,pg_temp as $$
 select exists (select 1 from public.na7n_story_staff
  where user_id=(select auth.uid()) and is_active and role='privacy_owner')
  and (select auth.jwt()->>'aal')='aal2';
$$;
create or replace function public.na7n_is_assigned_reviewer(p_case uuid)
returns boolean language sql stable security invoker set search_path=public,pg_temp as $$
 select exists(select 1 from public.na7n_story_cases c
  join public.na7n_story_staff s on s.user_id=c.assigned_reviewer
  where c.id=p_case and s.user_id=(select auth.uid())
  and s.role='educational_reviewer' and s.is_active)
  and (select auth.jwt()->>'aal')='aal2';
$$;
-- Owner may see all cases; reviewer only assigned de-identified cases.
-- Contact/original story remain in a separate owner-only table.
alter table public.na7n_story_cases enable row level security;
alter table public.na7n_story_private enable row level security;
alter table public.na7n_story_reviews enable row level security;
alter table public.na7n_story_consents enable row level security;
alter table public.na7n_story_audit enable row level security;
alter table public.na7n_story_cases force row level security;
alter table public.na7n_story_private force row level security;
alter table public.na7n_story_reviews force row level security;
alter table public.na7n_story_consents force row level security;
alter table public.na7n_story_audit force row level security;
revoke all on public.na7n_story_cases, public.na7n_story_private,
 public.na7n_story_reviews, public.na7n_story_consents, public.na7n_story_audit
 from public,anon,authenticated;
grant select,insert,update on public.na7n_story_cases to authenticated;
grant select on public.na7n_story_private to authenticated;
grant select,insert on public.na7n_story_reviews to authenticated;
grant select,insert on public.na7n_story_consents to authenticated;
grant select on public.na7n_story_audit to authenticated;
create policy story_case_read on public.na7n_story_cases for select to authenticated
 using (public.na7n_is_story_owner()
   or (assigned_reviewer=(select auth.uid()) and (select auth.jwt()->>'aal')='aal2'
      and exists(select 1 from public.na7n_story_staff s where s.user_id=(select auth.uid()) and s.role='educational_reviewer' and s.is_active)));
create policy story_case_owner_insert on public.na7n_story_cases for insert to authenticated with check(public.na7n_is_story_owner());
create policy story_case_owner_update on public.na7n_story_cases for update to authenticated using(public.na7n_is_story_owner()) with check(public.na7n_is_story_owner());
create policy story_private_owner_read on public.na7n_story_private for select to authenticated using(public.na7n_is_story_owner());
create policy story_reviews_read on public.na7n_story_reviews for select to authenticated
 using(public.na7n_is_story_owner() or (reviewer_id=(select auth.uid()) and public.na7n_is_assigned_reviewer(case_id)));
create policy story_reviews_insert on public.na7n_story_reviews for insert to authenticated
 with check(reviewer_id=(select auth.uid()) and (public.na7n_is_story_owner() or public.na7n_is_assigned_reviewer(case_id)));
create policy story_consents_owner_read on public.na7n_story_consents for select to authenticated using(public.na7n_is_story_owner());
create policy story_consents_owner_insert on public.na7n_story_consents for insert to authenticated
 with check(public.na7n_is_story_owner() and recorded_by=(select auth.uid()));
create policy story_audit_owner_read on public.na7n_story_audit for select to authenticated using(public.na7n_is_story_owner());
-- Do not allow unreviewed or non-consented cases to be approved/published.
create or replace function public.na7n_validate_story_case()
returns trigger language plpgsql set search_path=public,pg_temp as $$
begin
 new.updated_at=now();
 if new.assigned_reviewer is not null and not exists (
  select 1 from public.na7n_story_staff s where s.user_id=new.assigned_reviewer and s.role='educational_reviewer' and s.is_active
 ) then raise exception 'reviewer_not_authorized'; end if;
 if new.status in ('approved','published') then
  if new.privacy_cleared_at is null or nullif(btrim(new.edited_story),'') is null
  then raise exception 'privacy_review_and_final_text_required'; end if;
  if new.clinical_review_required and not exists (
    select 1 from public.na7n_story_reviews r where r.case_id=new.id
      and r.reviewer_id=new.assigned_reviewer and r.review_type='educational_safety'
  ) then raise exception 'assigned_review_required'; end if;
  if not exists(
   select 1 from public.na7n_story_consents co where co.case_id=new.id
   and co.consent_type='final_publication' and co.revoked_at is null
   and co.final_text_sha256=encode(sha256(convert_to(new.edited_story,'UTF8')),'hex')
  ) then raise exception 'final_text_version_consent_required'; end if;
  if new.approved_by is distinct from auth.uid() or new.approved_at is null
  then raise exception 'owner_approval_required'; end if;
 end if;
 if new.status='published' and old.status is distinct from 'approved' and old.status is distinct from 'published'
 then raise exception 'approve_before_publishing'; end if;
 return new;
end;
$$;
create trigger na7n_case_guard before insert or update on public.na7n_story_cases
 for each row execute function public.na7n_validate_story_case();
-- Append-only audit: client has NO write permission to audit table.
create or replace function public.na7n_story_audit_trigger()
returns trigger language plpgsql security definer set search_path=public,pg_temp as $$
begin
 insert into public.na7n_story_audit(case_id,actor_id,action) values
  (coalesce(new.case_id,new.id),auth.uid(),TG_TABLE_NAME||':'||TG_OP);
 return new;
end;
$$;
-- Separate case and child triggers: only call row fields that exist.
create or replace function public.na7n_story_case_audit()
returns trigger language plpgsql security definer set search_path=public,pg_temp as $$
begin
 insert into public.na7n_story_audit(case_id,actor_id,action)
 values(new.id,auth.uid(),'case:'||TG_OP||':'||new.status);
 return new;
end;
$$;
create trigger na7n_case_audit after insert or update on public.na7n_story_cases
 for each row execute function public.na7n_story_case_audit();
create trigger na7n_review_audit after insert on public.na7n_story_reviews
 for each row execute function public.na7n_story_audit_trigger();
create trigger na7n_consent_audit after insert on public.na7n_story_consents
 for each row execute function public.na7n_story_audit_trigger();
-- The owner alone may list active reviewers; no staff member can grant roles.
create or replace function public.na7n_story_reviewers_for_owner()
returns table(user_id uuid, display_name text) language sql stable security definer
 set search_path=public,pg_temp as $$
 select s.user_id,s.display_name from public.na7n_story_staff s
 where s.is_active and s.role='educational_reviewer'
 and exists(select 1 from public.na7n_story_staff o
   where o.user_id=auth.uid() and o.role='privacy_owner' and o.is_active)
 and (auth.jwt()->>'aal')='aal2';
$$;
revoke execute on function public.na7n_story_reviewers_for_owner() from public,anon;
grant execute on function public.na7n_story_reviewers_for_owner() to authenticated;
commit;
-- No anon INSERT policy; secure patient intake must be built and tested separately.
-- Evidence reference must point to a verified, access-controlled consent record;
-- do not claim that a checkbox or unverified email alone proves consent.
