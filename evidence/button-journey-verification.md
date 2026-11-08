# Button journey and Calendar API verification

Date: 2026-11-08
Project: OOCA / Pick a word!
Local preview: http://127.0.0.1:5183/
Remote baseline inspected: 09614c3451f72a12d24ea36ef1321f455a76c06e

## Implemented journey

- Browse: previous/next arrows, expandable card, one selection action and quiet skip.
- Selection: full card/source, optional focus, then Next.
- Writing: compact card, optional temporary writing, calendar review and prominent Finish. Explicit quote/focus saving remains in a collapsed section.
- Finish: character card, requested closing caption, new-word action and history access.
- Skip: clears the current round and opens the sky/Heart Hug ending, requested caption and single Home action.
- Backtracking preserves the current selection. Choosing a different quote resets its temporary state. Finish/skip clear temporary writing; writing is never stored.
- Added empty-catalog and one-visible-card UI guards for the status0/1 integration. These guards build successfully; combined catalog regression follows the final catalog import.

## Confirmed Calendar API behavior

The title is the selected card's complete headword + ` · ` + complete text field. It does not include private writing or the optional focus. Exact title, generic description, local date/time, destination and sharing warning are shown before consent.

The event is seven local calendar days ahead at 13:00–13:15. Calendar-day arithmetic preserves 13:00 across DST. An open preview refreshes on day/time-zone changes and clears consent if the approved data changes.

After an explicit checkbox and create action, Google asks the user to choose an account and grant the owned-events scope. The API writes to that account's primary calendar using an HTTPS POST body, never a personal-data template URL. Events request private visibility and an event-time popup reminder, whose delivery still depends on Calendar/device settings.

Tokens are held only in memory, not localStorage/sessionStorage. The app does not log event content or raw provider errors. Navigation and editing are locked while creation is pending. Confirmed/uncertain outcomes remain in the current round during backtracking. Success requires HTTP success and a matching event ID. Ambiguous writes block retries; no automatic resubmission occurs.

## Verification completed

- Production TypeScript/Vite build passed.
- Calendar/date/service/mock UI checks: 60/60 passed.
- Full API + journey regression before catalog changes: 108/108 passed in 3.2 minutes.
- Exact full title matches preview and request body; private draft/focus are excluded.
- Tested Bangkok and Los Angeles, spring/fall DST, midnight refresh, month/year/leap-day rollover, permission denial, popup cancellation, token expiry, duplicate actions, HTTP failures and ambiguous outcomes.
- Reviewed mocked UI screenshots at 320/390/1440px and the longest title at 320px. No horizontal overflow, clipping or truncation.
- Manually checked the real local missing-configuration state: the selected card title is correct and creation is disabled with a truthful setup message.
- Independent source review found no actionable issues.

No real OAuth authorization, calendar events or credentials were created. API behavior was verified with injected mocks, not a real calendar account. Safari/iOS/Android physical-device behavior and live Google consent are not yet verified.

The 108-test baseline is archived in calendar-api-108-pass-before-catalog/. Current standard report paths are test-results.json and report/index.html. Screenshots for API behavior are named journey-calendar-api-mock-*.png; these are simulated provider states, not proof of real calendar creation.

An earlier generic-calendar full run had one intermittent touch-focus assertion failure; the exact test subsequently passed 3/3 and in later full runs unchanged. Its trace is preserved in calendar-first-regression/.

## Activation blocker

No VITE_GOOGLE_CLIENT_ID is configured. The owner must approve/select the Google Cloud project, enable Calendar API, configure consent and a Web OAuth client, authorize the production origin and complete required publishing/verification steps. The app currently displays setup required and cannot create a real event.

See google-calendar-setup.md for precise setup and privacy limitations. .env.example contains only an empty public client-ID variable, never a secret.

## Scope and deployment

Journey application files: src/App.tsx, src/QuoteCard.tsx, src/journey.css, src/main.tsx, src/CalendarReminder.tsx, src/calendar.ts and src/googleCalendar.ts. The status/catalog import is coordinated separately in src/catalog.json and src/quotes.ts and must preserve the supplied card content.

Original assets, storage schema and existing saved data remain unchanged. No commit, push or deployment was performed. All changes are local in react-demo, not the release Git checkout. Final combined regression should be recorded after the status/catalog import completes.
