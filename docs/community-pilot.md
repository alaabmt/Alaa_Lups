# NA7N Community — controlled pilot (2026-11-24)

## Scope and current status
- Arabic and English community pages (`community.html` and `community-en.html`) now require an existing, permanent signed-in account for reading. Unauthenticated visitors see only an invitation to sign in/register.
- Six **staff-written** starter prompts (not patient submissions), visible only to signed-in members.
- Category filters, keyword search, deep reading panel, and navigation/homepage links.
- Authenticated posting, commenting, helpful reactions, abuse reporting, and moderation are **pilot-only** and require an explicit record in `public.na7n_community_staff`.
- **No real patient posts or health information.** The existing Supabase project is in India (`ap-south-1`).
- **Ask NA7N (Ask Ella-style assistant) is intentionally disabled.** The button cannot submit, call a model, or capture any input. The DB flag `ask_ella_enabled=false` is not an AI backend.

## Data structures
- `na7n_community_features`: `pilot_mode=true`, `patient_posting_enabled=false`, `ask_ella_enabled=false`; visible only to signed-in members.
- `na7n_community_prompts`: fictional/editorial starter topics readable only by authenticated permanent members.
- `na7n_community_staff`: privileged pilot tester/moderator allowlist, initially empty. **Do not create entries for patients**.
- `na7n_community_posts`: parent-null discussions and parented comments; moderation status defaults to `pending`.
- `na7n_community_helpful`: helpful markers by pilot users.
- `na7n_community_reports`: reports for moderators.

All six tables have RLS. Anonymous users can only read approved/promoted public data. Posting requires an active pilot tester. A moderator may change only the status of a post (enforced by trigger). No public form can grant staff privileges. New Supabase Data API tables have explicit grants (per 2026 changes).

## Adding staff test accounts
Identify the *verified* team member's existing Supabase Auth user UUID from trusted administration. Through a privileged Supabase admin query only:

```sql
insert into public.na7n_community_staff (user_id, role, is_active)
values ('REPLACE-WITH-VERIFIED-STAFF-AUTH-UUID', 'contributor', true);
-- For one designated reviewer, use role='moderator'.
```

Never expose an admin or service-role key in GitHub Pages or the browser. Pilot testers must use imaginary, non-medical posts and comments. Test that ordinary accounts cannot insert; that posts begin as pending; that anonymous visitors cannot see pending posts; and that only moderators can approve. Verify search, language switch, registration and session states.

## Before opening member posting
1. Complete UAE healthcare/data protection/legal review and move all intended patient-related data to approved UAE-hosted infrastructure. Do not migrate test content as real patient posts.
2. Approve community rules, privacy/consent wording, moderation playbook, escalation, abuse reporting, incident response and retention/deletion.
3. Confirm clinicians review *editorial health guidance* only; personal experiences are not stamped medically verified.
4. Introduce verified member roles, stronger content-review controls and audit logs, then re-authorize participation policies in the new production environment.
5. Add rate limits and server-side moderation and abuse prevention; prevent direct patient identifiers and any medical-record uploads.
6. Test Arabic/English UX, accessibility and privacy safeguards end to end. Only then enable patient access after a formal release decision.

**Do not switch `patient_posting_enabled` to true on the current India project.** Current RLS is staff-only regardless of that flag.

## Ask NA7N activation gate
The current UI remains disabled **regardless of the feature flag**. The assistant must be deliberately implemented and independently tested before activation:
- approved knowledge base of physician-reviewed articles with citations and expiry/review metadata;
- UAE-appropriate privacy arrangements, service agreements, storage/transfer and non-training guarantees;
- medical safety rules (no diagnosis or individualized dosing; escalate urgent symptoms), human feedback channels, language testing;
- audited model backend with explicit server-side consent, rate limiting, output checks and incident monitoring;
- opt-in and a well-defined kill switch, then update the UI code to enable the widget.

This is a *prepared placeholder*, not an operating AI tool. No patient data is sent to a model.

## QA state at creation
- Six curated topics inserted; zero test posts and zero testers.
- `pilot_mode=true`, `patient_posting_enabled=false`, `ask_ella_enabled=false`.
- Six community tables have RLS with twelve policies.

## Post-deployment privilege validation
The pilot was hardened to revoke default grants from `anon` and `authenticated`, then restore only required CRUD privileges. The anonymous reader has no INSERT privilege on any community table; it can select the six prompts and zero approved posts. Anonymous and authenticated RLS policies for posts are separate so public access does not reference private staff tables. A simulated anonymous SQL read completed successfully.

## Members-only access update (2026-11-24)
- **Read:** All community tables now deny SQL SELECT to the Supabase `anon` role. RLS policies for editorial prompts, posts, reactions and flags grant read only to `authenticated` users with `is_anonymous=false` (not temporary anonymous Auth sign-ins).
- **Interface:** The public HTML shell displays a sign-in/create-account gate. The actual discussion UI is hidden until `supabase.auth.getUser()` confirms a non-anonymous account. No community data queries run before authentication. Sign-out hides and clears rendered data.
- **Return journey:** The existing account page now accepts an allowlisted `return=community.html` or `community-en.html` parameter and returns users after successful sign-in/signup with a valid session.
- **Publish:** Even signed-in members cannot submit posts yet, unless independently allowlisted as staff testers; patient data and AI interactions remain prohibited.
- **Verified SQL:** A standard authenticated-role read returned six editorial prompts, whereas a simulated temporary anonymous Auth token returned zero prompts. The `anon` role has no SELECT privilege for prompts or posts, and `ask_ella_enabled` is still false.
- **Hosting limitation:** On GitHub Pages, a static HTML shell and JavaScript can always be downloaded. The sensitive forum content is protected by database permissions/RLS, **not** by claiming the HTML itself is inaccessible over HTTP. Future private files and uploads require authenticated server/storage delivery.
