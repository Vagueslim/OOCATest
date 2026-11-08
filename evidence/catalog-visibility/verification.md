# Catalog visibility verification

Local change dated 2026-11-08. No deployment was performed.

## Status contract

- `status: 0`: excluded from every newly shuffled browsing deck.
- `status: 1`: included in browsing decks.
- An omitted status is treated as 1 for backwards compatibility.
- Unexpected values, including strings, null and booleans, fail closed as hidden. Catalog authors should use numeric 0 or 1 only.
- This is a visibility flag, not editorial approval. Existing draft/review labels remain unchanged.

The complete `quotes` lookup keeps every stable ID. `visibleQuotes` and `shuffled()` use the visible subset. Empty catalogs show a recoverable empty state; one visible card disables navigation and does not create undefined IDs.

## Preserving the user's edits

The attached catalog and the local catalog before modification were byte-identical: 53,996 bytes; SHA-256 `15cc43a60f414adfcff43e0c43ca55758f92029669d3f4dc58645ff301d19429`.

The exact original is saved as `user-catalog-before-status.json`. The status-only change added numeric 1 to all 53 existing records, preserving every other field, record ID and ordering. The automated preservation check compares the original records by ID, excluding only the new status field.

## Storage compatibility

The localStorage key remains `ooca-demo:saved-quotes:v1`, with version 1 and the same fields. No migration, clearing or user-storage write happens as a result of this change. History renders its saved `quoteText` snapshot even when that source card later has status 0. Hiding is not deletion of previously saved history.

## Verification

TypeScript build check passed. Six focused Playwright tests passed in Chromium on 2026-11-08:

1. Numeric status validation, unique IDs and exact preservation of the original user edits.
2. Hidden and invalid values excluded; missing status shown; complete ID lookup retained.
3. Hidden IDs never appear in the rendered deck, including replenished rounds.
4. All-hidden catalog returns an empty shuffle and a working empty-state Home action.
5. One visible card returns one valid ID and disables both navigation arrows.
6. Save a card, hide it, reload, retain the original history snapshot, save another card and delete the hidden card's saved entry normally.

Visibility fixtures intercept the local Vite catalog module in isolated test browser contexts. They do not edit the production catalog or the user's actual browser history. Production/Safari/real-device behavior was not tested by these fixture checks.

## Lot2 import

The final local catalog contains 106 records: all 106 shown (status 1), 0 hidden. The 55 source images yielded 53 new records and two complete duplicates of existing IDs 001 and 005. New stable IDs run from catalog-v1:ooca-054 through catalog-v1:ooca-106.

All 53 new records match the reviewed additions file exactly. All old records retain their exact user-edited content. All old character mappings retain their original source prefix; 53 new semantic draft mappings use 17 of the existing poses, with a per-card rationale. No blanket fallback was added.

The complete source file hashes, original transcriptions, generated-reading provenance, duplicate handling and review flags are in lot2-source-manifest.json. The mappings are in lot2-mooca-mappings.json; the Thai human review files are lot2-all-entries-th.txt and lot2-review-notes-th.txt.

Review flags intentionally remain shown with status 1:
- 058 soul: the source literally ends at existin...; no missing wording was invented.
- 091: the Japanese sentence is malformed in the source. The original was preserved exactly, its pronunciation is null, and Thai translation explicitly follows the English line.
- 103 Genuine: the source pronunciation diacritic was transcribed approximately and requires visual review.
- 081 and 098: character pose choices have lower confidence, with rationale recorded rather than being presented as source-approved matches.

All new translations, creative Thai texts and generated readings remain visibly labeled drafts requiring language review. Parts of speech are only populated where printed in the source. The status field does not approve the content.

The final combined TypeScript and Vite build passed. Full combined Playwright regression passed **114/114**, with **0 failed and 0 skipped**, including all six visibility fixtures (4.9 minutes). Exact 106-card ID coverage, source and displayed content, every character mapping, saved history, full visible calendar title at 320px and private-field exclusion passed. Reports: ../test-results.json and ../report/index.html. These were local Chromium and mocked Google API tests; no real calendar events or deployment were performed.
