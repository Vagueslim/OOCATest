# Catalog deployment verification

- Live: https://vagueslim.github.io/OOCATest/
- Deployed app commit: `ea1e43dbe509ad81e5a3c144d75febec9d428ab6`
- [Successful GitHub Pages workflow](https://github.com/Vagueslim/OOCATest/actions/runs/42212229659)
- Checked: 2026-11-06T11:43:25.979Z
- Browser: Chromium, 360×800 viewport, fresh isolated context with synthetic legacy v1 data. No real user browser records were accessed.
- Local build and GitHub build passed. Local acceptance: 18 tests passed, A01–A12 (A01 now 53 cards). Live checks below all passed.

- PASS: 53 live catalog cards match local data, draft labels, word and Japanese sentence, mobile width
- PASS: End before selection preserves old entry
- PASS: Select, skip all optional actions, end
- PASS: No selection, hug, end
- PASS: Old v1 snapshot + new save/update, private draft excluded, reload, history and delete preserve legacy
- PASS: Failed save permits end, no false saved message, old entry unchanged
- PASS: Prompt loaded; no runtime or failed network requests

Screenshots: [word](catalog-live/mobile-word.png), [Japanese sentence](catalog-live/mobile-sentence.png), [reflect](catalog-live/mobile-reflect.png), [done](catalog-live/mobile-done.png).

Limitations: translations, creative Thai copy, readings and thematic tags remain drafts. No language approval or recorded audio. The main Thai text is creative copy, with closer translation/original in expandable details. No physical-phone, Safari/iOS, Android or screen-reader verification. Long cards scroll vertically. Legacy compatibility was verified against synthetic v1 records on the live origin; it does not recover records lost by clearing browser storage.
