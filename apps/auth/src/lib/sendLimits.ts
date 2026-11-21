import { timingSafeEqual } from 'node:crypto';
import { AUTH_EDGE_KEY_HEADER } from '@tvseri.es/constants';

/**
 * The ceiling on sign-in code emails across all addresses, per UTC day: a
 * spam limit, so nobody can have us mail any number of addresses. It's
 * well above what sign-ins need, so reaching it (which pauses email codes
 * for everyone until the next day; Google still works) takes a sustained
 * effort from many networks. The SES account has production access, with
 * a quota of 50,000 a day, far above it.
 */
export const DAILY_SENDS = 2000;

/**
 * The one source for every request whose viewer address can't be trusted:
 * all of them share its send cap (the patch: 10 an hour per source).
 */
export const UNTRUSTED = 'untrusted';

/**
 * Where a code request comes from, for the per-network send cap: the
 * viewer's IP address as CloudFront states it (`ip:port`, forwarded by the
 * router's origin request policy), but only on a request carrying the edge
 * key (`AUTH_EDGE_KEY_HEADER`). An IPv6 address counts by its /64, the block one connection usually
 * gets. Anything else (no key, a wrong one, no usable address) is
 * `UNTRUSTED`.
 */
export function sendSourceFor(edgeKey: string) {
  const expected = Buffer.from(edgeKey);
  const fromEdge = (req: Request) => {
    const given = Buffer.from(req.headers.get(AUTH_EDGE_KEY_HEADER) ?? '');
    return (
      expected.length > 0 &&
      given.length === expected.length &&
      timingSafeEqual(given, expected)
    );
  };
  return (req: Request): string =>
    (fromEdge(req) ? viewerNetwork(req) : undefined) ?? UNTRUSTED;
}

function viewerNetwork(req: Request): string | undefined {
  const header = req.headers.get('cloudfront-viewer-address')?.trim();
  const port = header?.lastIndexOf(':') ?? -1;
  if (!header || port <= 0) {
    return undefined;
  }
  const ip = header.slice(0, port).toLowerCase();
  return ip.includes(':') ? ipv6Prefix(ip) : ip;
}

/** The first four groups of an IPv6 address, written out in full */
function ipv6Prefix(ip: string): string | undefined {
  const [head = '', tail, extra] = ip.split('::');
  if (extra !== undefined) {
    return undefined;
  }
  const left = head ? head.split(':') : [];
  const right = tail ? tail.split(':') : [];
  const missing = 8 - left.length - right.length;
  if (missing < 0 || (tail === undefined && missing !== 0)) {
    return undefined;
  }
  const groups = [...left, ...Array<string>(missing).fill('0'), ...right];
  return groups
    .slice(0, 4)
    .map((group) => group.padStart(4, '0'))
    .join(':');
}
