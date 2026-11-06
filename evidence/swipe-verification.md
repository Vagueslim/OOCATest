# Swipe release — verified results and remaining limitation

Live: https://vagueslim.github.io/OOCATest/

App commit: `841974bd135eaac6226b6041914d452564a54a86`
[Successful deployment](https://github.com/Vagueslim/OOCATest/actions/runs/42215124238)
Checked live: 2026-11-06 12:08 UTC.

## Passed

- Local and GitHub production builds.
- Local 22 tests: A01–A12, catalog/legacy storage, 4 independent swipe/tap cases.
- Visual lint: 7 snapshots, no findings; screenshot inspected.
- Live 4 independent gesture/control tests: left next; right previous; first-card boundary; prior/next replay; deck seam; short drag ignored; vertical native scroll without changing the quote; swipe on details does not browse; native details tap and select tap in a fresh case; keyboard buttons; no save caused by browsing.
- Live catalog/flow smoke: all 53 entries match local catalog, draft labels, word/Japanese rendering, end before selection, select then skip all actions, no-selection/hug/end, save/update/reload/history/delete, failed save permits end without false success, synthetic legacy v1 data preserved, no runtime/network errors.

[Mobile screenshot](swipe-mobile.png)

## Unresolved combined touch sequence — do not treat as passed

The earlier combined sequence (short drag → vertical scroll → horizontal drag on native details → tap details) intermittently failed to toggle details in Chromium emulation. Event tracing showed pointer/touch events but no synthesized click. Increasing delay and changing emulation settings did not consistently resolve it. A fresh native-tap case passes. Details now live outside the swipe surface, but the combined sequence also failed locally after that isolation.

The final 22 local tests and 4 live tests deliberately test gestures and native taps as independent cases. They do **not** establish that the combined sequence is fixed. Root cause is not confirmed; do not claim it is only an emulator issue. Physical mobile browsers, Safari/iOS and Android remain untested. This limitation needs device validation before claiming complete touch QA.

## Behavior / data

Swipe navigates only. Selection and saving require explicit buttons. Left draws the next unseen item or replays a visited item; right moves back through the current round. First item has no predecessor; the previous button is disabled. Round history is temporary. Existing saved-text schema and key are unchanged. Catalog translations/readings remain labeled drafts; no recorded audio was added.
