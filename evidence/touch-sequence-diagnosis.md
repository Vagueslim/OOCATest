# Touch sequence: diagnosis and application fix

## Cause and reproduction

The exact fast raw-touch sequence reproduced missing clicks both in the app and on isolated native HTML `<details>` with no React or app handlers. Pointerdown/up and touchstart/end arrived, but no compatibility click was generated. Three native raw-input runs failed: [captured events](touch-diagnosis.json). This establishes the missing browser click beneath React; the precise Chromium internal cause is not established.

A stationary pause before release avoided the omission. Browser-generated gestures also let taps work, but a stricter probe found they did not reliably produce actual native vertical scrolling in this runtime. Therefore the final regression **uses raw touch again, releases while moving with no dwell, and measures scroll change from before the gesture**. Centered coordinates keep the whole gesture inside the viewport. Earlier positive scrollY assertions could be satisfied by programmatic positioning and have been replaced.

## Application fix

`src/TouchControls.tsx` provides native button/summary wrappers. A primary touch ending inside the same control with no movement over 12px activates it through `.click()`. A trusted compatibility click arriving afterward is suppressed to prevent double activation. Drag, cancellation, secondary touch and release outside do not activate. New mouse input and keyboard input retain normal click behavior. This is an application fix for the missing-click symptom, not a claim that Chromium itself was repaired.

App and history buttons and the quote-details summary use these wrappers. Storage schema, catalog text, selection and saving rules are unchanged. The details control remains outside the card's swipe surface.

## Regression coverage

The original fast sequence runs in one page: left/right → short drag → vertical scroll → drag details → tap details open/close, repeated three times, then tap Select and End. No dwell, forced DOM toggle, second compensating tap, reload or replacement page is used. The test verifies actual scroll delta, unchanged quote for vertical/control gestures, and no implicit save.

Additional checks cover no duplicate detail toggle after delayed compatibility events, dragging on Select without activation, Enter keyboard activation, both swipe directions, deck seam, old history, and A01–A12.

Native diagnostic reproduction: `node tests/diagnostics/touch-input.mjs`. It intentionally retains the raw native control failure; the application regression is `npm test`.

## Limitations

All touch evidence uses Chromium emulation on Windows. No physical iOS/Android or Safari verification. Raw native controls without the application wrappers can still reproduce the omitted-click behavior; do not call that browser behavior fixed. The application must pass the fast sequence after deployment before live success is claimed.

## Final post-deployment verification

- Live URL: https://vagueslim.github.io/OOCATest/
- Deployed application commit: `633e0714382105e947495c641ba7b09ddff2d4a1`
- [Successful deployment](https://github.com/Vagueslim/OOCATest/actions/runs/42218405864)
- Checked after deployment: 2026-11-06T12:34:52.883Z
- Local build and all **24 tests passed** (42.0s), including A01–A12.
- Live touch suite: **18/18 passed**, no skips or unexpected failures. Six cases repeated three times. The fast combined-sequence case itself performs three loops per run: **nine consecutive-sequence loops total**, with normal taps afterward, not a separate fresh page for the tap.
- Live raw gestures release while moving, without the stationary dwell that avoided the earlier native failure. Vertical scroll must increase from the pre-gesture scroll position; programmatic positioning does not count as scrolling success.
- The 53-card smoke check passed: catalog content/draft labels, end before selecting, skip everything after selecting, hug/end, save/update/reload/history/delete with synthetic legacy v1 records, and end after failed save without false success. No runtime/network errors.
- [Latest mobile screenshot](swipe-mobile.png).

No remaining failure in the tested application sequences. Physical device/Safari behavior remains unverified; this is not a claim of device testing or repair of native Chromium controls outside this app.
