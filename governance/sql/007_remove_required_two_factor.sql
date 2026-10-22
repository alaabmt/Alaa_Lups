-- Owner instruction: all NA7N workspaces use email/password sign-in, with no MFA gate.
-- Existing roles, ownership, reviewer activation, version checks and publication rules remain.
create or replace function public.na7n_medical_staff_ok(p_role text default null)
returns boolean language sql stable security definer set search_path=''
as $$
 select (select auth.uid()) is not null and exists (
  select 1 from public.na7n_medical_review_staff s
  where s.user_id=(select auth.uid()) and s.is_active
   and s.role in ('coordinator','publisher') and (p_role is null or s.role=p_role)
 );
$$;

create or replace function na7n_private.medical_name_consent()
returns boolean language plpgsql security definer set search_path=''
as $$ begin
 if (select auth.uid()) is null then raise exception 'Reviewer sign-in required'; end if;
 update public.na7n_medical_reviewers set consent_to_publish_name=true
 where user_id=auth.uid() and is_active and nomination_approved_at is not null;
 if not found then raise exception 'Active staff-approved reviewer required'; end if;
 return true;
end; $$;

alter policy medical_assignment_read on public.na7n_medical_review_assignments
using (reviewer_id=(select auth.uid()) or (select public.na7n_medical_staff_ok(null)));

alter policy medical_comments_read on public.na7n_medical_review_comments
using (exists (
 select 1 from public.na7n_medical_review_assignments a
 where a.id=assignment_id and (a.reviewer_id=(select auth.uid())
  or (select public.na7n_medical_staff_ok(null)))
));

alter policy medical_decision_read on public.na7n_medical_review_decisions
using (exists (
 select 1 from public.na7n_medical_review_assignments a
 where a.id=assignment_id and (a.reviewer_id=(select auth.uid())
  or (select public.na7n_medical_staff_ok(null)))
));

alter policy medical_comments_insert on public.na7n_medical_review_comments
with check (exists (
 select 1 from public.na7n_medical_review_assignments a
 where a.id=assignment_id and a.reviewer_id=(select auth.uid()) and a.is_active
  and not exists(select 1 from public.na7n_medical_review_decisions d where d.assignment_id=a.id)
));

alter policy medical_decision_insert on public.na7n_medical_review_decisions
with check (exists (
 select 1 from public.na7n_medical_review_assignments a
 join public.na7n_medical_reviewers r on r.user_id=a.reviewer_id
 where a.id=assignment_id and a.is_active and a.reviewer_id=(select auth.uid())
  and r.is_active and r.nomination_approved_at is not null
  and (decision<>'approved' or r.consent_to_publish_name)
));

alter policy na7n_story_staff_self_mfa on public.na7n_story_staff
using (user_id=(select auth.uid()) and is_active);
alter policy na7n_story_staff_self_mfa on public.na7n_story_staff rename to na7n_story_staff_self;
