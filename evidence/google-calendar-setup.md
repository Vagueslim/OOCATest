# Google Calendar API setup

This app can create a single event after the app user reviews its exact title/date, checks consent, chooses a Google account and authorizes the requested scope. No credentials or Google Cloud resources have been created as part of this implementation. The default build has no client ID and shows a setup-required state.

## Required owner decisions and configuration

1. Choose the Google Cloud project and its owner. Enable Google Calendar API in that project.
2. Configure Google Auth Platform branding, audience and consent. For an external test app, add only the intended test users. For public distribution, complete the verification Google requires for the requested scope and provide the required app-domain/privacy-policy information. Do not assume a test configuration is production-ready.
3. Create a Web application OAuth client. The production Authorized JavaScript origin is https://vagueslim.github.io (no /OOCATest/ path). For local testing, authorize only the exact localhost origin/port actually used, such as http://127.0.0.1:5183. These changes require the project owner's approval.
4. Put the public OAuth client ID in VITE_GOOGLE_CLIENT_ID in the local build environment, then rebuild. A client ID is a public identifier; never put a client secret, access token or refresh token in frontend code, Git, .env.example, localStorage or sessionStorage.
5. Test with an approved test account and a deliberate test event only after authorization. This implementation was tested with mocks, not a real user calendar.

An API key is not required by this implementation: it uses Google Identity Services and direct authorized REST requests, not the discovery-client example. A backend is not required for this user-driven, browser-only flow. Background/long-lived access is out of scope.

## Confirmed content contract

The event title is the selected card record's complete headword, followed by ` · ` and its complete text field. Both fields are previewed without truncation. Private writing and the optional focus selection are never included in the event title, description or URL. The description contains only a generic invitation and the public app link.

## Permission and destination

Requested scope: https://www.googleapis.com/auth/calendar.events.owned

This Google permission is broader than creating one event: it permits managing events in calendars the user owns. The interface says what Google will ask for. This app only inserts the single event the user confirms; it does not read calendar lists or existing events, add attendees, create calendars or request offline access.

The destination is the primary calendar of the account the user chooses in Google's account dialog. Google can request account selection, sign-in and consent; access-token expiry means a one-click experience cannot be guaranteed on every visit.

## Privacy and failure behavior

- Event content is previewed before consent and is sent only in an HTTPS POST body, never in a Calendar template query URL.
- No calendar data or access token is saved to browser storage. No event content/provider error bodies are logged.
- Events request private visibility, transparent availability and one popup reminder at the event time. Calendar permissions, device notifications and sharing can still expose event titles, so the app warns the user before sending.
- No success claim is shown until a successful API response echoes the generated event ID.
- Repeated clicks are blocked while pending. The in-memory result is retained during same-round backtracking.
- An ambiguous network/server outcome blocks further creation for that client session. The user must inspect Google Calendar first, including before retrying after a reload. There is no automatic retry or silent duplicate creation.
- The app does not update/delete events after creation. Ending the reflection clears only local temporary state; it does not cancel an event already saved in Calendar.

## Official setup references

- https://developers.google.com/identity/oauth2/web/guides/get-google-api-clientid
- https://developers.google.com/identity/oauth2/web/guides/use-token-model
- https://developers.google.com/workspace/calendar/api/quickstart/js
- https://developers.google.com/workspace/calendar/api/v3/reference/events/insert
