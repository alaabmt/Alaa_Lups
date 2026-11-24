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

## Discussion-reading UX update (2026-11-24)
- Intro copy no longer describes internal rollout stages. Patient-facing text focuses on exchanging everyday ideas, asking questions and learning together.
- Clicking a starter-topic or approved/staff-visible discussion card opens a **dedicated URL** (`community-topic.html?kind=prompt&id=...` or `?kind=post&id=...`; matching English page `community-topic-en.html`). The entire card is a native anchor; it no longer triggers an in-page scroll.
- Each detail reader has a visible **Back to discussions** link, and clicking it after arriving from the community list uses browser history to retain the list's scroll, current search and selected category. Externally shared deep links use an ordinary fallback link to the community list.
- List filtering values are held in the current history entry rather than query parameters or persistent storage.
- Topic content, post status, replies and reactions are fetched **only after permanent-member authentication**. Anonymous visitors see a sign-in gate; sign-in URLs carry an allowlisted same-origin return target including the topic query parameters.
- Introductory prompts deliberately show no patient replies. Posting and replying remain restricted to authorized pilot staff; Ask NA7N remains switched off.
- New member-only topic pages are marked `noindex,nofollow` and never embed content in public HTML.

## Patient-facing copy and compact mobile layout (2026-11-24)
- Removed the internal rollout sentence from the Arabic and English community introduction. Shortened the hero and replaced the large technical pilot notice with a concise, truthful note that member posting and replies are not open.
- Reduced mobile hero padding, type size and warning space, so members reach the topic list with less scrolling.

## Member-facing community UX wording (2026-11-24)
- The primary **Start a discussion / ابدأ نقاشًا** button is positioned in the hero at the top of the community page, above filtering and discussion lists.
- Patient-facing Arabic and English pages, topic pages, prompts, empty states, labels and homepage invitations no longer display the words "pilot", "test" or "تجريبي". The interface now uses ordinary community copy. Internal QA status continues to be documented here.
- The visible CTA remains clickable, but if the signed-in account is not authorized to submit yet it shows an honest inline message: "إضافة نقاشات جديدة غير متاحة حاليًا. يمكنك تصفّح الموضوعات." Authorized staff members still use the same moderated submission form; every post enters `pending`.
- The real production submission policy is **unchanged**: `patient_posting_enabled=false`, staff allowlist enforcement, RLS and privacy restrictions remain. Do not enable patient data collection on the current non-UAE region.
- Ask NA7N is still disabled.

## Team discussion activation (2026-11-24)
- The **Start a discussion** CTA was previously correctly rendered but opening its form was blocked for every account, because `na7n_community_staff` contained zero authorized accounts.
- Based on the project restriction that current registered accounts are staff accounts for non-patient testing, the seven existing **email-confirmed, non-anonymous accounts created before 2026-11-24** were allowlisted once via an explicit database migration. Six are `contributor`; the sole existing active medical-review `coordinator` is assigned the `moderator` role.
- **New accounts do not get permission automatically.** Any future allowance requires verification by an authorized administrator. This is not a patient-community release.
- A SQL test with the role and JWT claims of an existing contributor successfully inserted a fictional post with `status='pending'` and `author_id = auth.uid()`; the transaction was rolled back, leaving no test content.
- `patient_posting_enabled=false` and `ask_ella_enabled=false` remain unchanged. No real patient data may be entered on the current India-hosted project.
- A second transaction-only SQL test verified that the designated moderator can change a pending discussion to `approved` and that the moderation timestamp is populated. That transaction was also rolled back.

## PatientsLikeMe moderation research and simplified composer (2026-11-24)
- Official PatientsLikeMe [User Agreement](https://www.patientslikeme.com/about/user_agreement) states that some forums are monitored periodically and that the platform has **no obligation to prescreen** user posts. Its [Home-page guide](https://support.patientslikeme.com/hc/en-us/articles/1260803677229-The-Home-page-on-PatientsLikeMe) says pressing Post shares directly, and [Community Guidelines](https://support.patientslikeme.com/hc/en-us/articles/360050199913-Community-Guidelines) describe post-publication removal/reporting. General model: **post-moderation, not mandatory prior human approval of every comment**. This should not be represented as a guarantee that no automated/special moderation or exceptions exist.
- **No change to NA7N publication status yet.** On current non-UAE hosting, new staff-test discussion posts and replies still go to `pending`, and only the designated moderator may approve them. Patient posting remains disabled.
- Replaced nested category-select modal with `community-create.html` and `community-create-en.html`, separate full-screen responsive forms launched from **Start a discussion**.
- New composer fields are title, discussion body, and **optional tags** (0–5, comma-delimited, 2–32 characters each). No required category field. New conversations use internal `category='general'`; existing categorized posts are preserved. The main community filter has a General option and its keyword search also matches tags.
- Database constraint allows `general` and a bounded `tags text[]` column; policies and membership guards are unchanged. A fictional insert for an authorized contributor, with tags and pending status, succeeded in a rollback-only transaction.
- Approved topic readers display tags in Arabic/English, and the account login flow has an allowlisted same-origin return to the composer.
- When ready to move to approved UAE patient hosting, publish-directly with robust reporting/moderation procedures, rate limiting, privacy controls, escalation for unsafe medical advice, and risk-based detection. Explicitly approve such release; do not flip the flag in the current project.
