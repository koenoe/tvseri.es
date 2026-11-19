import { getText, readFailure } from '@/lib/connections/http';

/**
 * UAS wants a client key beside the cookies: a public key every BBC page that
 * records activity ships in its bundle; it names the site, not the viewer.
 * Read from the live bundle rather than kept here, so a rotated key is picked
 * up on its own.
 */

/** A public page whose bundle holds the activity client's key map */
const KEY_PAGE = 'https://www.bbc.co.uk/food';

/** Nothing else is fetched */
const BUNDLE_URL =
  /https:\/\/static\.files\.bbci\.co\.uk\/core\/[\w./-]+?\.js/g;

/** Bundles read before giving up (the page lists about 30) */
const MAX_BUNDLES = 12;

const KEY_TTL_MS = 12 * 60 * 60 * 1000;

/** `live: "<key>"`, with or without quotes on the name, any quote on the value */
const LIVE_PROP =
  /(?:^|[{,\s])(["']?)live\1\s*:\s*(["'`])([A-Za-z0-9_-]{8,64})\2/g;
const TEST_PROP = /(?:^|[{,\s])(["']?)test\1\s*:\s*(["'`])[^"'`]+\2/;

/** How far past the map the client that uses it is looked for */
const USE_WINDOW = 600;
const USE_MARKS = ['activityType', 'apiKey'];

/** The object literal around `at`: from its `{` to its `}`, nothing nested */
const objectAround = (bundle: string, at: number): string | null => {
  const open = bundle.lastIndexOf('{', at);
  const close = bundle.indexOf('}', at);
  if (open === -1 || close === -1) {
    return null;
  }
  const inside = bundle.slice(open + 1, close);
  return inside.includes('{') || inside.includes('}') ? null : inside;
};

/**
 * Finds the `{test, live}` map by its own keys: minified names change between
 * builds, the map's keys don't. With several maps, the one the client uses;
 * null rather than a guess.
 */
export const extractClientKey = (bundle: string): string | null => {
  const candidates: Array<Readonly<{ key: string; used: boolean }>> = [];
  for (const match of bundle.matchAll(LIVE_PROP)) {
    const key = match[3];
    const object = objectAround(bundle, match.index);
    if (!key || object === null || !TEST_PROP.test(object)) {
      continue;
    }
    const after = bundle.slice(match.index, match.index + USE_WINDOW);
    candidates.push({
      key,
      used: USE_MARKS.some((mark) => after.includes(mark)),
    });
  }
  const distinct = (list: ReadonlyArray<{ key: string }>) => [
    ...new Set(list.map(({ key }) => key)),
  ];
  const all = distinct(candidates);
  if (all.length === 1) {
    return all[0] ?? null;
  }
  const used = distinct(candidates.filter((candidate) => candidate.used));
  return used.length === 1 ? (used[0] ?? null) : null;
};

/** The page's own bundles, the website bundle first (it holds the map today) */
const bundlesOf = (page: string): ReadonlyArray<string> => {
  const urls = [...new Set(page.match(BUNDLE_URL) ?? [])];
  return [
    ...urls.filter((url) => url.includes('/bundle-website.')),
    ...urls.filter((url) => !url.includes('/bundle-website.')),
  ].slice(0, MAX_BUNDLES);
};

/** Redirects within the BBC's own site are followed; anywhere else fails */
const bbcOnly = (location: URL) =>
  location.protocol === 'https:' && location.hostname.endsWith('.bbc.co.uk')
    ? ('follow' as const)
    : readFailure('changed');

const discover = async (): Promise<string | null> => {
  const page = await getText(KEY_PAGE, {}, { redirect: bbcOnly });
  if (!page.ok) {
    return null;
  }
  for (const url of bundlesOf(page.text)) {
    const bundle = await getText(url, {}, { redirect: bbcOnly });
    // The BBC's static host down: the rest would only time out in turn
    if (!bundle.ok && bundle.reason === 'unavailable') {
      return null;
    }
    const key = bundle.ok ? extractClientKey(bundle.text) : null;
    if (key) {
      return key;
    }
  }
  return null;
};

let cached: Readonly<{ at: number; key: Promise<string | null> }> | null = null;

/** Kept 12 hours per instance; a failed look isn't kept, so the next call looks again */
export const clientKey = (): Promise<string | null> => {
  const now = Date.now();
  if (cached && now - cached.at < KEY_TTL_MS) {
    return cached.key;
  }
  const look = discover().catch(() => null);
  const entry = { at: now, key: look };
  cached = entry;
  void look.then((key) => {
    if (key === null && cached === entry) {
      cached = null;
    }
  });
  return look;
};

/** After the service refused the key */
export const dropClientKey = () => {
  cached = null;
};
