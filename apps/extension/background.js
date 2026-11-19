// The service worker: hands a streaming service's browser session to
// tvseri.es once, against a code the site minted, and only after Continue
// on the popup's consent screen. Sync then runs on the server.

import { DECLINED_KEY, isCode, livePending, PENDING_KEY } from './consent.js';
import {
  allowedOrigin,
  RESULTS_KEY,
  SITE_ORIGIN,
  updateResults,
} from './origins.js';
import { checkPath, linkPath, SERVICE_IDS, SERVICES } from './services.js';

/** The cookie fields the API's link schema accepts */
const cookieForApi = (cookie) => ({
  domain: cookie.domain,
  expiresDate: cookie.expiresDate ?? null,
  httpOnly: cookie.httpOnly,
  name: cookie.name,
  path: cookie.path,
  sameSite: cookie.sameSite === 'unspecified' ? null : cookie.sameSite,
  secure: cookie.secure,
  value: cookie.value,
});

// The API gives up after 15s; a fetch answering after 30s may outlive this
// worker, so the link stops waiting in between
const LINK_TIMEOUT_MS = 25_000;

// The route is public (the extension can't hold the site's API key): the
// code is the proof
async function link({ code, service }) {
  const config = SERVICES[service];
  if (!config) {
    return { ok: false, reason: 'unavailable' };
  }
  const cookies = await chrome.cookies.getAll({
    domain: config.cookieDomain,
  });
  if (!cookies.some((cookie) => cookie.name === config.sessionCookie)) {
    return { ok: false, reason: 'signed-out' };
  }
  const response = await fetch(`${SITE_ORIGIN}${linkPath(service)}`, {
    body: JSON.stringify({
      code,
      cookies: cookies.map(cookieForApi),
      // The session belongs to this browser: tvseri.es reads as it
      userAgent: navigator.userAgent,
    }),
    headers: { 'Content-Type': 'application/json' },
    method: 'POST',
    signal: AbortSignal.timeout(LINK_TIMEOUT_MS),
  });
  const answer = await response.json().catch(() => null);
  if (response.ok && answer?.ok) {
    return { ok: true, profile: answer.profile ?? null };
  }
  return { ok: false, reason: answer?.reason || 'unavailable' };
}

// Per site and per service, so linking a second service never overwrites
// the first
const storeResult = (service, result) =>
  updateResults((results) => ({
    ...results,
    [SITE_ORIGIN]: { ...results[SITE_ORIGIN], [service]: result },
  }));

/** The one link flow, only ever from the popup's Continue */
const linkAndStore = async (message) => {
  try {
    const result = await link(message);
    await storeResult(message.service, result);
    return result;
  } catch {
    // Network failure, or an answer that isn't JSON
    return { ok: false, reason: 'unavailable' };
  }
};

// The check answers well within the popup's patience: it only reads
const CHECK_TIMEOUT_MS = 10_000;

/**
 * Whose tvseri.es account a code links to, shown before Continue. Sends the
 * code only; the site doesn't spend it here, but a wrong one counts against
 * the link's limit.
 */
const check = async ({ code, service }) => {
  try {
    const response = await fetch(`${SITE_ORIGIN}${checkPath(service)}`, {
      body: JSON.stringify({ code }),
      headers: { 'Content-Type': 'application/json' },
      method: 'POST',
      signal: AbortSignal.timeout(CHECK_TIMEOUT_MS),
    });
    const answer = await response.json().catch(() => null);
    if (response.ok && answer?.ok && typeof answer.username === 'string') {
      return { ok: true, username: answer.username };
    }
    return {
      ok: false,
      reason:
        answer?.reason === 'bad-code' || answer?.reason === 'rate-limited'
          ? answer.reason
          : 'unavailable',
    };
  } catch {
    return { ok: false, reason: 'unavailable' };
  }
};

// Only our own popup may ask
const ANSWER = { check, link: linkAndStore };

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  const answer = Object.hasOwn(ANSWER, message?.type)
    ? ANSWER[message.type]
    : null;
  if (
    !answer ||
    sender.id !== chrome.runtime.id ||
    !isCode(message.code) ||
    !Object.hasOwn(SERVICES, message.service)
  ) {
    return false;
  }
  (async () => {
    sendResponse(await answer(message));
  })();
  return true; // the reply is async
});

// The site's messages (`externally_connectable`). A code from the site never
// links by itself: it waits as a pending request for Continue in the popup.
// The site hears `pending-consent` at once and polls its own status, as a
// reply held until the viewer decides would die with this worker (it sleeps
// after ~30s idle) or the site's timeout.
const answerSite = (message, sender, sendResponse) => {
  if (message?.type === 'ping') {
    sendResponse({
      installed: true,
      services: SERVICE_IDS,
      version: chrome.runtime.getManifest().version,
    });
    return false;
  }
  // The site's Cancel: its request is dropped, unless a newer one took
  // its place
  if (message?.type === 'cancel' && isCode(message.code)) {
    (async () => {
      const { [PENDING_KEY]: pending } =
        await chrome.storage.session.get(PENDING_KEY);
      if (pending?.code === message.code) {
        await chrome.storage.session.remove(PENDING_KEY);
      }
      sendResponse({ ok: true });
    })();
    return true; // the reply is async
  }
  // `gone` covers linked, expired and replaced: the card's own status poll
  // tells them apart
  if (message?.type === 'request-state' && isCode(message.code)) {
    (async () => {
      const stored = await chrome.storage.session.get([
        PENDING_KEY,
        DECLINED_KEY,
      ]);
      const pending = livePending(stored[PENDING_KEY]);
      const state =
        pending?.code === message.code
          ? 'waiting'
          : stored[DECLINED_KEY]?.code === message.code
            ? 'declined'
            : 'gone';
      sendResponse({ state });
    })();
    return true; // the reply is async
  }
  if (
    message?.type === 'link' &&
    isCode(message.code) &&
    Object.hasOwn(SERVICES, message.service)
  ) {
    (async () => {
      // A newer request replaces any older one
      await chrome.storage.session.set({
        [PENDING_KEY]: {
          at: Date.now(),
          code: message.code,
          service: message.service,
        },
      });
      sendResponse({ ok: false, reason: 'pending-consent' });
      try {
        // Chrome 127+, here without a user gesture. If it fails (no focused
        // window, an older Chrome), the popup shows the request when next
        // opened
        await chrome.action.openPopup(
          sender.tab ? { windowId: sender.tab.windowId } : undefined,
        );
      } catch {}
    })();
    return true; // the reply is async
  }
  return false;
};

chrome.runtime.onMessageExternal.addListener((message, sender, sendResponse) =>
  allowedOrigin(sender.origin)
    ? answerSite(message, sender, sendResponse)
    : false,
);

// The toolbar dot is this browser's own record of a link, not live status:
// the extension has no tvseri.es session to ask, so a disconnect on the
// site doesn't unlight it
const ICON_SIZES = [16, 32, 48, 128];
const iconSet = (variant) =>
  Object.fromEntries(
    ICON_SIZES.map((size) => [size, `icons/${variant}-${size}.png`]),
  );

const paintIcon = async () => {
  const stored = await chrome.storage.local.get(RESULTS_KEY);
  const linked = Object.entries(stored[RESULTS_KEY]?.[SITE_ORIGIN] ?? {})
    .filter(([service, result]) => SERVICES[service] && result?.ok === true)
    .map(([service]) => SERVICES[service].name);
  const connected = linked.length > 0;
  await chrome.action.setIcon({ path: iconSet(connected ? 'active' : 'idle') });
  await chrome.action.setTitle({
    title: connected ? `tvseri.es · ${linked.join(', ')} linked` : 'tvseri.es',
  });
};

chrome.runtime.onInstalled.addListener(paintIcon);
chrome.runtime.onStartup.addListener(paintIcon);
chrome.storage.onChanged.addListener((changes, area) => {
  if (area === 'local' && RESULTS_KEY in changes) {
    paintIcon();
  }
});
