# GitHub Pages verification

- Live URL: https://vagueslim.github.io/OOCATest/
- Checked: 2026-11-06 10:38:40 UTC
- Deployment commit: `791facb31736ad2560cc36905e0e7dea1d188a31`
- Successful workflow: https://github.com/Vagueslim/OOCATest/actions/runs/42204137374
- Browser: Chromium, 360 × 800 viewport, isolated test context.

Live checks passed:

1. HTTPS page returned 200; JavaScript, CSS, Prompt Regular and SemiBold returned 200 under `/OOCATest/`.
2. End immediately before choosing a quote; no record created.
3. Select a quote, skip all optional actions, then end; no record created.
4. Save with a focus, enter a private draft, end, read history and reload. Saved quote remained; draft was absent from storage.
5. Choose no selection, receive a hug, then end.
6. Simulate a failed localStorage write, then end. Earlier saved data remained; no false success message appeared.
7. No page runtime errors, failed network requests or horizontal overflow. URL remains at the repository path through screen changes and reload.

Reproduce with `node tests/pages-smoke.mjs https://vagueslim.github.io/OOCATest/` after installing dependencies and the Playwright Chromium browser. JSON output and mobile screenshots are generated in ignored `evidence/live/`.

Limits: this was a live-site browser test with a mobile viewport, not physical iPhone/Android or screen-reader testing. Repository visibility remains public. Storage is local to the browser origin; localhost data does not transfer to the live site.
