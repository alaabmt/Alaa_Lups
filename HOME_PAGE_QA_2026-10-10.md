# NA7N Home Page — Implementation and QA Checklist

**Date:** 2026-10-10  
**Files:** `index.html`, `index-en.html`  
**Homepage redesign commit:** `c0897d4fb2b61ac87b7f5c4ff78e173754113033`  
**Welcome cover restored:** `a0d8b3376b11cccfae14294849fda730400860ca`  
**Scope:** Arabic and English home pages only. No changes to article-level medical guidance, patient accounts, database structures, or research consent.

## Implemented — verified in the GitHub source

- [x] Restore the original full-screen bilingual welcome cover as the first screen, retaining its logo, visual design, language switcher and Enter button.
- [x] Specify lupus as the starting focus in the Arabic and English welcome introductions.
- [x] Keep the revised patient-first homepage accessible below the cover using the original Enter link.
- [x] Use a lupus-specific, patient-centred opening headline and clear benefit statement in both languages.
- [x] Keep NA7N branding, the language switcher, and primary navigation.
- [x] Retain six clearly labelled patient pathways with shorter copy and real destinations.
- [x] Put an explicit new/worsening-symptoms safety message immediately after the pathways, without automated triage or diagnosis.
- [x] Offer three actionable, currently available resources: appointment preparation, observation template, medicines/tests organisation.
- [x] Consolidate everyday life priorities; remove the prominently displayed 'coming soon' card.
- [x] Link Arabic fatigue guidance to the existing interactive `fatigue.html`; do not imply the same English interactive flow exists.
- [x] Display editorial/review transparency near the top. No unsupported assertion of completed clinical review.
- [x] Explain the role of patient perspectives without claiming an active peer community or automatic research enrolment.
- [x] Preserve appointment planning, supported self-management steps, and the patient-reported health tracking entry point.
- [x] Explain that browsing educational materials does not require an account; distinguish account-saved health check-ins.
- [x] Add a back-to-top control with scroll threshold, keyboard button semantics, and reduced-motion support.
- [x] Keep localised canonical URLs, hreflang links, and Open Graph/Twitter image metadata.
- [x] Add scoped CSS for narrow phones, medium screens, and desktops; maintain readable font sizes and focus outlines.
- [x] Verify local asset paths, navigation URLs, and links to section anchors in the resource pages.

## Automated static QA

- [x] Re-fetched and verified both updated files in the repository.
- [x] Checked one primary `h1` and one `main` in each page.
- [x] Checked the welcome cover is the first screen, its Enter button targets `#site-content`, and the patient-first hero, trust, needs, safety, tools, daily life and patient voice appear below.
- [x] Checked six patient pathways and three practical tool cards per language.
- [x] Checked mobile navigation listener and back-to-top script wiring.
- [x] Checked 12 link/asset/layout/safety assertions after resolving legitimate stylesheet query strings.
- [x] Verified all locally referenced files exist in the GitHub repository, including real section IDs where used.

## Manual / live checks — not yet verified

- [ ] Verify the new pages have deployed and returned HTTP 200 on the public domain.
- [ ] Check at a real mobile viewport (360px/390px) and at desktop widths (1280px+), including text wrapping and tap targets.
- [ ] Tap the mobile hamburger to open/close, then navigate with the new Home/About links.
- [ ] Scroll down/up and test the back-to-top button visually.
- [ ] Test keyboard Tab, Enter, Escape and screen reader headings/landmarks.
- [ ] Test common patient tasks with real users: newly diagnosed, changes in symptoms, appointment preparation.
- [ ] Check social-sharing preview after the platform recrawls updated metadata.

**Important:** Static QA confirms GitHub source structure, not live browser appearance, web reachability, clinical review status, or usability outcomes. Live URL inspection was not available from the current inspection environment.
