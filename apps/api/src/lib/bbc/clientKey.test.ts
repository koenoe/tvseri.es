import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { clientKey, dropClientKey, extractClientKey } from './clientKey';

vi.mock('@tvseri.es/utils', async (original) => ({
  ...(await original<typeof import('@tvseri.es/utils')>()),
  sleep: async () => {},
}));

const FAKE_KEY = 'FakeKey123abc';

/** The shape the BBC Food bundle has: a per-environment map, minified */
const BUNDLE = `var a=1;const i={test:"TestKey456def",live:"${FAKE_KEY}"},r=e=>{let t=e.env,s=e.activityType,r=void 0===s?"reads":s;const p="live"===t?t:"test",l=(0,o.A)({apiKey:i[p],environment:p,activityType:r})};`;

describe('extractClientKey', () => {
  it('reads the live key from the environment map', () => {
    expect(extractClientKey(BUNDLE)).toBe(FAKE_KEY);
  });

  it('takes the map in any order, with any names and quotes around it', () => {
    expect(
      extractClientKey(
        `const Zq={'live':'${FAKE_KEY}', "test": "TestKey456def", stage:"StageKey789"};x(Zq[n],{activityType:t})`,
      ),
    ).toBe(FAKE_KEY);
  });

  it('picks the map the activity client uses when there are others', () => {
    const other = `const m={test:"OtherTest1234",live:"OtherLive1234"};`;
    expect(extractClientKey(`${other}${'x'.repeat(2000)}${BUNDLE}`)).toBe(
      FAKE_KEY,
    );
  });

  it('finds nothing rather than guess between unrelated maps', () => {
    expect(
      extractClientKey(
        'const a={test:"OtherTest1234",live:"OtherLive1234"},b={test:"MoreTest12345",live:"MoreLive12345"};',
      ),
    ).toBeNull();
  });

  it('finds nothing in a bundle without the map', () => {
    expect(extractClientKey('const live="no";const x={live:true};')).toBeNull();
    // A live key without its test sibling is no environment map
    expect(extractClientKey(`const x={live:"${FAKE_KEY}"};`)).toBeNull();
  });
});

describe('clientKey', () => {
  const PAGE = `<html><script src="https://static.files.bbci.co.uk/core/bundle-gel.abc123.js"></script><script src="https://static.files.bbci.co.uk/core/bundle-website.def456.js"></script><script src="https://elsewhere.example/core/bundle-website.evil.js"></script></html>`;

  const fetchMock = vi.fn(async (url: string) => {
    if (url === 'https://www.bbc.co.uk/food') {
      return new Response(PAGE);
    }
    if (url.endsWith('bundle-website.def456.js')) {
      return new Response(BUNDLE);
    }
    if (url.endsWith('bundle-gel.abc123.js')) {
      return new Response('var gel=1;');
    }
    return new Response(null, { status: 404 });
  });

  beforeEach(() => {
    dropClientKey();
    fetchMock.mockClear();
    vi.stubGlobal('fetch', fetchMock);
    vi.useFakeTimers({ now: 1_763_500_000_000, toFake: ['Date'] });
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.unstubAllGlobals();
  });

  const urls = () => fetchMock.mock.calls.map(([url]) => url);

  it('reads the website bundle first, and only the BBC’s own', async () => {
    expect(await clientKey()).toBe(FAKE_KEY);
    expect(urls()).toEqual([
      'https://www.bbc.co.uk/food',
      'https://static.files.bbci.co.uk/core/bundle-website.def456.js',
    ]);
  });

  it('looks once per instance while the key is fresh', async () => {
    await Promise.all([clientKey(), clientKey()]);
    await clientKey();
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });

  it('looks again after twelve hours', async () => {
    await clientKey();
    vi.setSystemTime(Date.now() + 12 * 60 * 60 * 1000 + 1);
    await clientKey();
    expect(fetchMock).toHaveBeenCalledTimes(4);
  });

  it('looks again once a key is dropped (the service refused it)', async () => {
    await clientKey();
    dropClientKey();
    await clientKey();
    expect(fetchMock).toHaveBeenCalledTimes(4);
  });

  it('scans the other bundles when the website one has no key', async () => {
    fetchMock.mockImplementation(async (url: string) => {
      if (url === 'https://www.bbc.co.uk/food') {
        return new Response(PAGE);
      }
      return new Response(
        url.endsWith('bundle-gel.abc123.js') ? BUNDLE : 'var nothing;',
      );
    });
    expect(await clientKey()).toBe(FAKE_KEY);
  });

  it('is null when the page fails, and looks again on the next call', async () => {
    // Asked twice: the shared retry absorbs one 503
    const busy = async () => new Response(null, { status: 503 });
    fetchMock.mockImplementationOnce(busy).mockImplementationOnce(busy);
    expect(await clientKey()).toBeNull();
    expect(await clientKey()).toBe(FAKE_KEY);
  });

  it('stops at the first bundle the BBC’s static host can’t serve', async () => {
    fetchMock.mockImplementation(async (url: string) =>
      url === 'https://www.bbc.co.uk/food'
        ? new Response(PAGE)
        : new Response(null, { status: 504 }),
    );
    expect(await clientKey()).toBeNull();
    // The page, then one bundle asked twice: not every bundle in turn
    expect(fetchMock).toHaveBeenCalledTimes(3);
  });

  it('is null when no bundle holds the key', async () => {
    fetchMock.mockImplementation(async (url: string) =>
      url === 'https://www.bbc.co.uk/food'
        ? new Response(PAGE)
        : new Response('var nothing;'),
    );
    expect(await clientKey()).toBeNull();
  });
});
