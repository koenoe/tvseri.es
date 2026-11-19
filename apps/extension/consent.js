// Consent, shared by the popup and the worker: no session is sent until
// Continue on the service's consent screen, however the code came in.

import { SERVICES } from './services.js';

// chrome.storage.local: what each service was agreed to
// (`consent[service] = { version, agreedAt }`)
export const CONSENT_KEY = 'consent';
// chrome.storage.session: the site's request waiting for the popup. It holds
// a live code, so never on disk
export const PENDING_KEY = 'pending';
// chrome.storage.session: the code of a request the viewer cancelled in the
// popup, so the site, asking after it, hears it was declined
export const DECLINED_KEY = 'declined';

// Bump with any change to the wording below. A stored agreement never skips
// the screen: it carries the code to compare
export const CONSENT_VERSION = 1;

/** What Continue agrees to */
export const disclosure = (service) =>
  `Sends your ${SERVICES[service].shortName} sign-in to tvseri.es once, encrypted, to read your viewing history. Disconnect deletes it.`;

export const isCode = (code) =>
  typeof code === 'string' && /^\d{4}$/.test(code);

// The site's codes live five minutes
export const PENDING_TTL_MS = 5 * 60_000;

export const livePending = (pending, now = Date.now()) =>
  pending &&
  Object.hasOwn(SERVICES, pending.service) &&
  now - pending.at < PENDING_TTL_MS
    ? pending
    : null;

// Under a lock, so two open popups (one per window) never drop each
// other's change
export const recordConsent = (service) =>
  navigator.locks.request(CONSENT_KEY, async () => {
    const { [CONSENT_KEY]: consent = {} } =
      await chrome.storage.local.get(CONSENT_KEY);
    await chrome.storage.local.set({
      [CONSENT_KEY]: {
        ...consent,
        [service]: { agreedAt: Date.now(), version: CONSENT_VERSION },
      },
    });
  });
