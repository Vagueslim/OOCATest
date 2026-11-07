# Peek a word! — Swiper cards verification

Date: 2026-11-07

## Implemented
- Swiper React 14.4.0 with EffectCards, one front reading card and two offset previews on the right.
- Touch swipe, desktop drag, Next/Previous buttons, and reduced-motion support.
- Application name, page title, package metadata, README, and workflow label updated to Peek a word!. Repository and public URL are unchanged.
- Selection, saving, catalog content, and existing v1 stored snapshots are unchanged.

The supplied .gif-named attachment is actually a single PNG frame. The implementation follows its stacked-card layout; the reference did not establish a specific motion sequence.

## Local verification
- Production build (TypeScript + Vite): passed.
- Full Playwright suite: 28/28 passed, no skipped tests.
- Rapid left/right reversal case: 6/6 consecutive runs passed without added waits between swipes.
- Desktop mouse drag and 320/360/390 px mobile layouts checked; screenshots inspected.
- Verified active-slide accessibility, source-details expansion, selection during animation, new-round reset, nonrepeating 53-card seam, legacy storage/save/update/delete, keyboard controls, vertical native scrolling, and the repeated fast touch/details/select sequence.
- Reduced motion disables transitions; normal mode retains a positive card transition duration after React effects.

## Animation race fixed
Swiper's container ResizeObserver treated animated autoHeight changes as resizes, re-snapping the active slide during a following gesture. The deck now uses window resize/orientation handling for Swiper and a separate card ResizeObserver for content height. Height measurement does not pass a zero transition speed that would cancel card motion.

Long catalog/seam tests have a larger timeout budget because they now include real animations rather than immediate content swaps. Assertions and fast gesture sequences remain in place.

## Publication
Public URL: https://vagueslim.github.io/OOCATest/
Live verification: pending the deployment containing this report.

## Limits
Touch verification is Chromium emulation on Windows. Physical iOS/Android devices and Safari have not been tested. No claim is made that the still reference proves an exact GIF animation.

