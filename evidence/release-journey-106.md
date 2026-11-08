# Journey and 106-card release verification

Release prepared on 2026-11-08 for owner-requested publication through the existing main-branch GitHub Pages workflow.

## Included

- Browse, optional focus, optional private writing, finish, and the one-action Heart Hug skip ending.
- 106 catalog records, all numeric status 1. Status 0 is excluded from new decks without deleting saved history snapshots.
- Original 53 user-edited catalog records preserved exactly except for adding status 1. New stable IDs 054-106.
- Explicit Calendar review/consent UI with full headword and text, local date seven days later at 13:00, and no private writing/focus in event data.
- Calendar has no configured OAuth client. The actual UI shows setup required and disables creation. No real Google authorization or events were created.

## Validation before publication

- Fresh TypeScript/Vite production build passed.
- Latest direct-local-preview regression: 108 passed, 1 failed, 5 intentionally skipped fixture tests.
- The failure was the touch-selection heading-focus assertion in expansion.spec.ts:136. Navigation reached the correct screen. The unchanged isolated test subsequently passed 3/3. Treat this as an unresolved intermittent focus issue, not a clean full-suite pass.
- All six catalog visibility checks passed separately, including exact preservation of old records, hidden/invalid flags, empty/one-card catalogs, and retained history.
- Real unmocked local Calendar setup-state browser check passed with no page errors and disabled creation.
- Catalog source SHA-256: 31DEFD636462598E51B787D43A7370B4A789855AF4C586988FE31150BBDDC8EC.
- Earlier implementation reports record a separate 114/114 pass; the results above are the newer release-readiness rerun and supersede any claim that the latest run was fully green.

## Content and platform caveats

Translations, creative Thai text and generated readings remain drafts. Source 058 is truncated, 091 is malformed Japanese with no invented reading, and 103 requires pronunciation-mark review. Character assignments 081 and 098 have lower confidence. Status 1 is visibility, not language approval.

Tests use Chromium desktop/mobile emulation. Physical iOS/Android and live Google OAuth are not verified. Saved history stays under ooca-demo:saved-quotes:v1 on its original browser origin.

Deployment completion must be confirmed from the exact commit's GitHub Actions result and the live site; this preparation note alone is not proof of live deployment.
