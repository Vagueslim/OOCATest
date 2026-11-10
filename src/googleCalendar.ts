/** Browser-only Calendar integration. No authorization or network work at import time. */
export type CalendarEventDraft = {
  summary: string;
  description: string;
  start: { dateTime: string; timeZone: string };
  end: { dateTime: string; timeZone: string };
};
export type CalendarCreateResult = { id: string; htmlLink?: string };
export type CalendarClient = {
  configured: boolean;
  /** Load GIS when the review opens; does not request access or read calendar data. */
  prepare(): Promise<void>;
  createEvent(draft: CalendarEventDraft): Promise<CalendarCreateResult>;
};
export type CalendarErrorCode =
  | 'setup_required'
  | 'not_ready'
  | 'popup_closed'
  | 'popup_blocked'
  | 'access_denied'
  | 'scope_denied'
  | 'token_expired'
  | 'unauthorized'
  | 'rate_limited'
  | 'network_error'
  | 'api_error'
  | 'uncertain'
  | 'in_flight'
  | 'invalid_draft';
export class CalendarError extends Error {
  readonly code: CalendarErrorCode;
  constructor(code: CalendarErrorCode) {
    // Never incorporate provider errors, payloads, tokens, or event content.
    super(`Calendar operation: ${code}`);
    this.name = 'CalendarError';
    this.code = code;
  }
}
export const CALENDAR_SCOPE =
  'https://www.googleapis.com/auth/calendar.events.owned';
export type GoogleTokenResponse = {
  access_token?: string;
  expires_in?: number | string;
  scope?: string;
  error?: string;
};
export type GoogleIdentity = {
  initTokenClient(config: {
    client_id: string;
    scope: string;
    include_granted_scopes: boolean;
    callback(response: GoogleTokenResponse): void;
    error_callback(error: { type?: string }): void;
  }): { requestAccessToken(options: { prompt: string }): void };
};
export type GoogleCalendarOptions = {
  clientId?: string;
  loadIdentity?: () => Promise<GoogleIdentity>;
  fetch?: typeof globalThis.fetch;
  now?: () => number;
  createEventId?: () => string;
  authorizationTimeoutMs?: number;
  requestTimeoutMs?: number;
};
type GoogleWindow = Window & {
  google?: { accounts?: { oauth2?: GoogleIdentity } };
};
let identityLoad: Promise<GoogleIdentity> | undefined;
function loadGoogleIdentity(): Promise<GoogleIdentity> {
  const current = (window as GoogleWindow).google?.accounts?.oauth2;
  if (current) return Promise.resolve(current);
  if (identityLoad) return identityLoad;
  identityLoad = new Promise<GoogleIdentity>((resolve, reject) => {
    const script = document.createElement('script');
    let finished = false;
    const finish = (identity?: GoogleIdentity) => {
      if (finished) return;
      finished = true;
      clearTimeout(timer);
      script.onload = null;
      script.onerror = null;
      if (identity) resolve(identity);
      else {
        script.remove();
        reject(new CalendarError('network_error'));
      }
    };
    const timer = setTimeout(() => finish(), 15000);
    script.src = 'https://accounts.google.com/gsi/client';
    script.async = true;
    script.defer = true;
    script.onload = () =>
      finish((window as GoogleWindow).google?.accounts?.oauth2);
    script.onerror = () => finish();
    document.head.appendChild(script);
  }).catch((error) => {
    identityLoad = undefined;
    throw error;
  });
  return identityLoad;
}

export function createGoogleCalendarClient(
  options: GoogleCalendarOptions = {},
): CalendarClient {
  const clientId = options.clientId?.trim() ?? '';
  const now = options.now ?? Date.now;
  let identity: GoogleIdentity | undefined;
  let preparing: Promise<void> | undefined;
  let busy = false;
  // After an ambiguous write, block further writes for this client lifetime.
  // Reloading does not resolve ambiguity: UI must tell users to check Calendar first.
  // Never silently retry with a fresh ID. No event content is persisted.
  let uncertain = false;
  const prepare = (): Promise<void> => {
    if (!clientId) return Promise.reject(new CalendarError('setup_required'));
    if (identity) return Promise.resolve();
    if (!preparing)
      preparing = (options.loadIdentity ?? loadGoogleIdentity)()
        .then((value) => {
          identity = value;
        })
        .catch(() => {
          throw new CalendarError('network_error');
        })
        .finally(() => {
          preparing = undefined;
        });
    return preparing;
  };
  // Called before the first await in createEvent, preserving the confirm-click gesture.
  const authorize = (): Promise<{ token: string; expiresAt: number }> =>
    new Promise((resolve, reject) => {
      let settled = false;
      const finish = (
        error?: CalendarError,
        token?: { token: string; expiresAt: number },
      ) => {
        if (settled) return;
        settled = true;
        clearTimeout(timer);
        if (error) reject(error);
        else resolve(token!);
      };
      const timer = setTimeout(
        () => finish(new CalendarError('network_error')),
        options.authorizationTimeoutMs ?? 120000,
      );
      try {
        const tokenClient = identity!.initTokenClient({
          client_id: clientId,
          scope: CALENDAR_SCOPE,
          include_granted_scopes: false,
          callback: (response) => {
            if (response.error) {
              finish(new CalendarError('access_denied'));
              return;
            }
            if (!response.scope?.split(/\s+/).includes(CALENDAR_SCOPE)) {
              finish(new CalendarError('scope_denied'));
              return;
            }
            const lifetime = Number(response.expires_in);
            if (
              !response.access_token ||
              !Number.isFinite(lifetime) ||
              lifetime <= 0
            ) {
              finish(new CalendarError('token_expired'));
              return;
            }
            finish(undefined, {
              token: response.access_token,
              expiresAt: now() + lifetime * 1000,
            });
          },
          error_callback: (error) =>
            finish(
              new CalendarError(
                error.type === 'popup_closed'
                  ? 'popup_closed'
                  : error.type === 'popup_failed_to_open'
                    ? 'popup_blocked'
                    : 'network_error',
              ),
            ),
        });
        tokenClient.requestAccessToken({ prompt: 'select_account' });
      } catch {
        finish(new CalendarError('popup_blocked'));
      }
    });
  return {
    configured: Boolean(clientId),
    prepare,
    async createEvent(draft) {
      if (!clientId) throw new CalendarError('setup_required');
      if (uncertain) throw new CalendarError('uncertain');
      if (busy) throw new CalendarError('in_flight');
      if (!identity) throw new CalendarError('not_ready');
      if (
        !draft.summary.trim() ||
        !draft.start.timeZone ||
        !draft.end.timeZone ||
        !Number.isFinite(Date.parse(draft.start.dateTime)) ||
        !Number.isFinite(Date.parse(draft.end.dateTime)) ||
        Date.parse(draft.end.dateTime) <= Date.parse(draft.start.dateTime)
      ) {
        throw new CalendarError('invalid_draft');
      }
      // Snapshot only approved fields before authorization, so caller mutation cannot alter the write.
      const event = {
        summary: draft.summary,
        description: draft.description,
        start: {
          dateTime: draft.start.dateTime,
          timeZone: draft.start.timeZone,
        },
        end: { dateTime: draft.end.dateTime, timeZone: draft.end.timeZone },
        visibility: 'private',
        transparency: 'transparent',
        reminders: {
          useDefault: false,
          overrides: [{ method: 'popup', minutes: 0 }],
        },
      };
      busy = true;
      let token = '';
      try {
        const authorized = await authorize();
        token = authorized.token;
        authorized.token = '';
        if (now() >= authorized.expiresAt)
          throw new CalendarError('token_expired');
        let id: string;
        try {
          id = (
            options.createEventId ??
            (() => globalThis.crypto.randomUUID().replace(/-/g, ''))
          )();
        } catch {
          throw new CalendarError('api_error');
        }
        if (!/^[0-9a-v]{5,1024}$/.test(id))
          throw new CalendarError('api_error');
        const controller = new AbortController();
        const timer = setTimeout(
          () => controller.abort(),
          options.requestTimeoutMs ?? 20000,
        );
        try {
          let response: Response;
          try {
            response = await (options.fetch ?? globalThis.fetch)(
              'https://www.googleapis.com/calendar/v3/calendars/primary/events',
              {
                method: 'POST',
                headers: {
                  Authorization: `Bearer ${token}`,
                  'Content-Type': 'application/json',
                },
                body: JSON.stringify({ ...event, id }),
                signal: controller.signal,
                credentials: 'omit',
                referrerPolicy: 'no-referrer',
                redirect: 'error',
              },
            );
          } catch {
            uncertain = true;
            throw new CalendarError('uncertain');
          }
          if (!response.ok) {
            if (response.status === 401)
              throw new CalendarError('unauthorized');
            if (response.status === 429)
              throw new CalendarError('rate_limited');
            if (response.status === 403) {
              // Read only a known error reason. Never surface Google's raw error body.
              const body = await response.json().catch(() => null);
              const reasons: unknown = body?.error?.errors;
              const rate =
                Array.isArray(reasons) &&
                reasons.some((item: { reason?: string } | null) =>
                  [
                    'rateLimitExceeded',
                    'userRateLimitExceeded',
                    'quotaExceeded',
                  ].includes(item?.reason ?? ''),
                );
              throw new CalendarError(rate ? 'rate_limited' : 'access_denied');
            }
            if (
              response.status >= 500 ||
              response.status === 408 ||
              response.status === 409
            ) {
              uncertain = true;
              throw new CalendarError('uncertain');
            }
            throw new CalendarError('api_error');
          }
          let result: { id?: unknown; htmlLink?: unknown };
          try {
            result = await response.json();
          } catch {
            uncertain = true;
            throw new CalendarError('uncertain');
          }
          if (!result || typeof result.id !== 'string' || result.id !== id) {
            uncertain = true;
            throw new CalendarError('uncertain');
          }
          // Only expose a verified Google Calendar link, never arbitrary provider-returned URLs.
          let htmlLink: string | undefined;
          if (typeof result.htmlLink === 'string') {
            try {
              const url = new URL(result.htmlLink);
              if (
                url.protocol === 'https:' &&
                ['calendar.google.com', 'www.google.com'].includes(
                  url.hostname,
                ) &&
                /^\/calendar\/event\/?$/.test(url.pathname) &&
                !url.port &&
                !url.username &&
                !url.password
              )
                htmlLink = url.href;
            } catch {
              /* A link is optional; confirmed creation still succeeds. */
            }
          }
          return { id: result.id, ...(htmlLink ? { htmlLink } : {}) };
        } finally {
          clearTimeout(timer);
        }
      } finally {
        token = '';
        busy = false;
      }
    },
  };
}

const env = (
  import.meta as ImportMeta & { env?: { VITE_GOOGLE_CLIENT_ID?: string } }
).env;
export const googleCalendarClient = createGoogleCalendarClient({
  clientId: env?.VITE_GOOGLE_CLIENT_ID,
});
