import { beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';

/**
 * The extension's service worker (apps/extension/background.js), run as
 * the extension runs it against a fake `chrome`: which site it answers,
 * and that a session only ever leaves for that site.
 */

type Listener = (
  message: unknown,
  sender: Readonly<Record<string, unknown>>,
  sendResponse: (reply: unknown) => void,
) => boolean;

const listeners: { external: Array<Listener>; internal: Array<Listener> } = {
  external: [],
  internal: [],
};

const area = () => ({
  get: vi.fn(async () => ({})),
  remove: vi.fn(async () => undefined),
  set: vi.fn(async () => undefined),
});
const ignore = { addListener: () => undefined };

const NETFLIX_ID = {
  domain: '.netflix.com',
  httpOnly: true,
  name: 'NetflixId',
  path: '/',
  sameSite: 'lax',
  secure: true,
  value: 'session-value',
};

const chrome = {
  action: {
    openPopup: vi.fn(async () => undefined),
    setIcon: vi.fn(async () => undefined),
    setTitle: vi.fn(async () => undefined),
  },
  cookies: { getAll: vi.fn(async (): Promise<unknown[]> => []) },
  runtime: {
    getManifest: () => ({ version: '0.1.0' }),
    id: 'self',
    onInstalled: ignore,
    onMessage: {
      addListener: (listener: Listener) => listeners.internal.push(listener),
    },
    onMessageExternal: {
      addListener: (listener: Listener) => listeners.external.push(listener),
    },
    onStartup: ignore,
  },
  storage: { local: area(), onChanged: ignore, session: area() },
};

const fetchMock = vi.fn();

beforeAll(async () => {
  vi.stubGlobal('chrome', chrome);
  vi.stubGlobal('navigator', {
    locks: { request: (_name: string, run: () => unknown) => run() },
    userAgent: 'Test Browser',
  });
  await import(
    new URL('../../../../extension/background.js', import.meta.url).href
  );
});

beforeEach(() => {
  vi.stubGlobal('chrome', chrome);
  vi.stubGlobal('fetch', fetchMock);
  fetchMock.mockReset();
  chrome.cookies.getAll.mockReset();
  chrome.cookies.getAll.mockResolvedValue([]);
  chrome.storage.session.set.mockClear();
  chrome.storage.local.set.mockClear();
});

/** Lets the worker's async replies settle */
const settle = () => new Promise((resolve) => setTimeout(resolve, 0));

const fromSite = (origin: string, message: unknown) => {
  const sendResponse = vi.fn();
  const [listener] = listeners.external;
  const async = listener?.(message, { origin }, sendResponse);
  return { async, sendResponse };
};

/** A message from the extension's own popup */
const fromPopup = async (message: unknown) => {
  const sendResponse = vi.fn();
  const async = listeners.internal[0]?.(message, { id: 'self' }, sendResponse);
  await settle();
  return { async, sendResponse };
};

describe('the worker and the sites', () => {
  it('answers www.tvseri.es’s ping at once', () => {
    const { async, sendResponse } = fromSite('https://www.tvseri.es', {
      type: 'ping',
    });
    expect(async).toBe(false);
    expect(sendResponse).toHaveBeenCalledWith(
      expect.objectContaining({ installed: true }),
    );
  });

  it('never answers localhost, nor keeps a request from it', async () => {
    const ping = fromSite('http://localhost:3000', { type: 'ping' });
    const link = fromSite('http://localhost:3000', {
      code: '4829',
      service: 'netflix',
      type: 'link',
    });
    await settle();
    expect(ping.async).toBe(false);
    expect(ping.sendResponse).not.toHaveBeenCalled();
    expect(link.sendResponse).not.toHaveBeenCalled();
    expect(chrome.storage.session.set).not.toHaveBeenCalled();
  });

  it('never answers any other site', () => {
    const { async, sendResponse } = fromSite('https://evil.example', {
      type: 'ping',
    });
    expect(async).toBe(false);
    expect(sendResponse).not.toHaveBeenCalled();
  });

  it('sends the session at Continue to its own site, whatever the message names', async () => {
    chrome.cookies.getAll.mockResolvedValue([NETFLIX_ID]);
    fetchMock.mockResolvedValue(Response.json({ ok: true, profile: 'Koen' }));
    const { sendResponse } = await fromPopup({
      code: '4829',
      origin: 'http://localhost:3000',
      service: 'netflix',
      type: 'link',
    });
    expect(fetchMock).toHaveBeenCalledWith(
      'https://www.tvseri.es/api/connections/netflix/link',
      expect.objectContaining({ method: 'POST' }),
    );
    expect(sendResponse).toHaveBeenCalledWith({ ok: true, profile: 'Koen' });
  });
});

describe('the consent screen’s check', () => {
  const CHECK = { code: '4829', service: 'netflix', type: 'check' };

  it('asks the site whose account the code links to, sending no session', async () => {
    fetchMock.mockResolvedValue(
      Response.json({ ok: true, username: 'jemoeder' }),
    );
    const { async, sendResponse } = await fromPopup(CHECK);
    expect(async).toBe(true);
    expect(fetchMock).toHaveBeenCalledWith(
      'https://www.tvseri.es/api/connections/netflix/link/check',
      expect.objectContaining({
        body: JSON.stringify({ code: '4829' }),
        method: 'POST',
      }),
    );
    expect(chrome.cookies.getAll).not.toHaveBeenCalled();
    expect(chrome.storage.local.set).not.toHaveBeenCalled();
    expect(sendResponse).toHaveBeenCalledWith({
      ok: true,
      username: 'jemoeder',
    });
  });

  it.each([
    [
      Response.json({ ok: false, reason: 'bad-code' }, { status: 404 }),
      'bad-code',
    ],
    [
      Response.json({ ok: false, reason: 'rate-limited' }, { status: 429 }),
      'rate-limited',
    ],
    [new Response('<html>', { status: 502 }), 'unavailable'],
    // An account the site can't name is no answer
    [Response.json({ ok: true, username: 7 }), 'unavailable'],
  ])('says why it can’t name the account: %#', async (answer, reason) => {
    fetchMock.mockResolvedValue(answer);
    const { sendResponse } = await fromPopup(CHECK);
    expect(sendResponse).toHaveBeenCalledWith({ ok: false, reason });
  });

  it('says unavailable when the site can’t be reached', async () => {
    fetchMock.mockRejectedValue(new TypeError('Failed to fetch'));
    const { sendResponse } = await fromPopup(CHECK);
    expect(sendResponse).toHaveBeenCalledWith({
      ok: false,
      reason: 'unavailable',
    });
  });

  it('checks nothing for a malformed code, an unknown service or another sender', async () => {
    for (const [message, sender] of [
      [{ ...CHECK, code: '48' }, { id: 'self' }],
      [{ ...CHECK, service: 'hulu' }, { id: 'self' }],
      [CHECK, { id: 'someone-else' }],
    ] as const) {
      const sendResponse = vi.fn();
      expect(listeners.internal[0]?.(message, sender, sendResponse)).toBe(
        false,
      );
    }
    await settle();
    expect(fetchMock).not.toHaveBeenCalled();
  });
});
