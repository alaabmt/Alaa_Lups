# NA7N Community — controlled pilot (2026-11-24)

## Scope and current status
- Publicly browsable Arabic and English landing pages: `community.html` and `community-en.html`.
- Six **staff-written** starter prompts (not patient submissions).
- Category filters, keyword search, deep reading panel, and navigation/homepage links.
- Authenticated posting, commenting, helpful reactions, abuse reporting, and moderation are **pilot-only** and require an explicit record in `public.na7n_community_staff`.
- **No real patient posts or health information.** The existing Supabase project is in India (`ap-south-1`).
- **Ask NA7N (Ask Ella-style assistant) is intentionally disabled.** The button cannot submit, call a model, or capture any input. The DB flag `ask_ella_enabled=false` is not an AI backend.

## Data structures
- `na7n_community_features`: `pilot_mode=true`, `patient_posting_enabled=false`, `ask_ella_enabled=false`.
- `na7n_community_prompts`: public fictional/editorial starter topics.
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
- Six community tables have RLS with eleven policies.
