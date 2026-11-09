# Mooca artwork and Cogito release — 2026-11-09

## Scope

- Add catalog-v1:ooca-107: Cogito, ergo sum / ฉันคิด ฉันจึงมีอยู่, status 1. Thai pronunciation is labelled draft.
- Preserve all 106 previously published catalog records exactly.
- Replace 18 Mooca poses with owner-supplied standalone PNGs, preserving pose names, card mappings and original image bytes. Remove preview- filename prefix.
- Heart Hug, Back View and Playful Tilt retain the original sheet artwork because separate files were not supplied.
- No changes to app behavior, Calendar configuration or storage schema.

## Verification before deployment

Clean release checkout based on 4a9fca0cc1d1b9956a82ca810df4a27e279984dd; existing remote config and ignore rules retained.

- npm ci: passed, audit reported 0 vulnerabilities.
- npm run build: passed (TypeScript and Vite).
- Full Playwright regression: 114 passed, 0 failed, 0 skipped (10.7 minutes), November 9 2026.
- Covers all 107 visible cards and matched artwork, expanded reading, swipe/tap, skip/finish, saved history, failure handling, mobile and desktop layout and welcome screen.
- Artwork source and destination checksums match; see src/assets/mooca/replacement-manifest.json.

Browser tests use Chromium emulation, not a physical mobile device. Google Calendar service tests are mocks; real Calendar event creation remains unconfigured. Public deployment and post-deploy checks are separate from the pre-deploy results above.
