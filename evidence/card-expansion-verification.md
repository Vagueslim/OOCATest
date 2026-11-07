# Card expansion verification

Date: 2026-11-07

## Interaction
- Tap, click, Enter, or Space on the front card opens a reversible, near-full-screen reading view.
- The panel grows from the exact rendered card rectangle (480 ms) and collapses to it on Back or Escape (320 ms).
- Selecting a quote remains explicit. Previewing never selects or saves.
- The same card, deck position, source disclosure state, page scroll, and keyboard focus are restored on dismissal.
- Native dialog semantics, a keyboard focus loop, an inert background, scrollable long content, persistent select/back controls, and reduced-motion support are included.
- Mouse and touch movement are separated from taps, including short drags and cancelled gestures.

## Reference and visual checks
The user's still references show the stacked-card and expanded-detail states. The existing local montage also shows returning from detail to the stack. This implementation follows that reversible transition without copying the music-specific content.
Intermediate-frame inspection confirmed the animated panel begins at the source card rectangle. A 390 px sample grew from x=24, y=317.2, width=324, height=469.9 to nearly 390 x 844 by 400 ms.
Mobile and desktop expanded views were visually inspected. Narrow 320 px, 390 px, and 1440 px layouts remain within the viewport.

## Verification
Production TypeScript/Vite build: passed. Full local Playwright suite: 35/35 passed, no skipped or failed tests (2026-11-07). Publication and live checks are verified separately before delivery.
Focused expansion and Swiper regressions passed after correcting Swiper's focusable-element handling over the card's keyboard-accessible tap target.

## Limits
Touch testing uses Chromium emulation on Windows. Physical iOS/Android devices and Safari have not been tested.
The back arrow closes the preview without adding browser history entries. Browser-level navigation keeps its existing site behavior.
