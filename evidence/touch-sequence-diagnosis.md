# Touch sequence diagnosis

The failure was reproduced on an isolated native HTML `<details>` control with no React, app code or event cancellation. A short raw-CDP touch drag was sufficient: the next tap delivered pointer/touch events but no click. Three raw-input runs failed; three runs using Chromium-generated touch gestures passed. Evidence: [event log](touch-diagnosis.json).

This identifies the **raw input injection path used by the old test harness** as the source of the observed false failure. It does not identify the exact internal Chromium defect. Waiting longer, a separate/same CDP session and mobile mode did not reliably fix the raw path. Replacing the gesture generator changed the outcome with app code held unchanged, including on native controls.

The fix is in `tests/swipe.spec.ts`: use `Input.synthesizeScrollGesture` with `gestureSourceType: touch` and `preventFling: true`, then use normal Playwright taps. The generator delivers real touch/pointer events, verified by actual next/previous card changes and native vertical scroll. No DOM state is forced and no click fallback is added to the app.

Regression now runs in **one page/session**: left/right browsing → short drag → vertical scroll → drag on details → tap details open/closed, repeated three times, then tap Select and End. It verifies unchanged quote during vertical/details gestures and no implicit save. This restores the previously omitted combined sequence instead of treating isolated tests as proof for it.

Reproduction of the native comparison:

```powershell
node tests/diagnostics/touch-input.mjs
```

The diagnostic intentionally records failures in the raw injection case; those are not claimed fixed inside Chromium. The browser-generated path must pass. Raw fixture has no handlers capable of suppressing clicks.

Limitations: Chromium emulation only. Physical iOS/Android and Safari remain untested. This diagnosis supersedes the earlier unresolved-emulation explanation in `swipe-verification.md`; it does not establish device-level behavior.

Local verification: build passed; 23/23 tests passed, including A01–A12 and the combined sequence (40.2s).
