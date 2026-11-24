# NA7N Community — pseudonym and avatar privacy specification
Date: 2026-11-24

## Approved user experience
The community uses a **nickname / اسم مستعار** in place of real names, emails or phone numbers. Those private account fields continue to be stored separately in `na7n_profiles` and Supabase Auth and are **never fetched by community discussion or reply screens**.

- Arabic and English registration forms now ask: «بماذا تحب أن يناديك أعضاء المجتمع؟» / “What would you like other members to call you?”
- A visitor can select from 12 illustrated-symbol avatar options: leaves, flower, moon, sun, wave, butterfly, tree, star, bird, rainbow, book and heart.
- Existing members can configure or change the nickname, select an avatar, or upload a custom image from the **My Account / حسابي** profile editor.
- Discussion cards, article authors and comment authors display only the public nickname and avatar. Older posts without a saved nickname safely display «عضو مجتمع» / “Community member”, never the real account name.
- Signed-in members missing a nickname see a setup reminder. A nickname is required before an authorized member can create or reply to discussions.

## Storage and identity boundaries
- `public.na7n_community_identities`: `user_id`, `nickname`, `avatar_style`, `avatar_path`. Unique nickname index, validation, and RLS: signed-in members may read the public profile fields; only the authenticated owner may add/change their row.
- The confidential `na7n_profiles.full_name` and `phone` have their existing owner-only RLS; community screens do not retrieve these columns.
- `storage.buckets.id='na7n-community-avatars'` is **private**, 1 MiB maximum, WebP only. Members must be logged in to download referenced avatar images. No public image URLs or long-lived signed URLs.
- Uploaded original JPG/PNG/WebP files (up to 4 MiB) are re-encoded in-browser onto a 256×256 WebP canvas before upload; this discards the original filename and image metadata. The preview is circular.
- During the current **non-UAE-hosted staff-only pilot**, only active pre-authorized staff accounts can upload an image to their own `<user-id>/avatar.webp`; other registered accounts may choose preset icons but cannot upload. This restriction is enforced with Supabase Storage RLS, not just a disabled browser input.
- Do **not** accept patient photographs or other real patient identity data until hosting, UAE compliance, privacy notices, security and moderation are approved for live patient use.
- Members are warned that a face image, real nickname, birthday, school, location or other obvious clues can identify them despite an alias. The service cannot guarantee anonymity if someone voluntarily reveals their identity.
- User-submitted avatar photos need content moderation and abuse reporting before open patient rollout. Current QA is staff-only.

## Signup and existing member behavior
- Newly registered users choose nickname and preset avatar in signup. The selected values are carried in auth signup metadata until a verified session exists. The first successful login saves a separate public community identity row, applying validation and uniqueness checks; it never copies the account's real name to the community.
- Existing members keep their historical account without losing data; they must visit **My Account → My community name and avatar** to select a nickname before posting.
- Aliases are unique case-insensitively; the user gets a clear message if one is taken.
- Custom image selection is offered in My Account. File upload can be used by authorized test staff immediately; on later UAE hosting, policies can be revised for eligible patient accounts after privacy and moderation reviews.
- The current **direct discussion/comment publishing + post-moderation** decision is unchanged.
- Ask NA7N remains disabled.

## Validation performed
- Tested an Arabic nickname insert and English nickname update under a signed-in test account, rolled back the test transaction.
- Verified a different test user cannot modify another account's nickname (0 rows updated), also rolled back.
- Confirmed anonymous role cannot SELECT the identity table. Storage bucket is private, max 1 MiB, with 4 access policies.
- Verified all community and account JS files parse and the expected UI components and script imports exist (28 static integration checks).
- Live browser visual testing and signed-in file upload verification remain to be completed. Do not claim those checks passed without executing them.

## Potential next improvements
- Server-side rate limits for nickname/avatar changes, explicit abuse reporting for offensive impersonation-oriented aliases, and staff review for uploaded images.
- Better illustrations may replace emoji presets without changing user identity keys.
- Full data export and deletion policy linked to existing data governance and the approved UAE production environment.
