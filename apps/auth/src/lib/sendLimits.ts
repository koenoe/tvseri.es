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
 * The address that opened the connection to the Lambda (the function URL
 * event's `requestContext.http.sourceIp`), which a caller can't state
 * themselves. `app.ts` sets this header on every request it hands the
 * issuer, replacing any copy that came in.
 */
export const CONNECTION_IP_HEADER = 'x-tvs-connection-ip';

const matcherFor = (edgeKey: string) => {
  const expected = Buffer.from(edgeKey);
  return (req: Request) => {
    const given = Buffer.from(req.headers.get(AUTH_EDGE_KEY_HEADER) ?? '');
    return (
      expected.length > 0 &&
      given.length === expected.length &&
      timingSafeEqual(given, expected)
    );
  };
};

/**
 * Where a code request comes from, for the per-network send cap (10 an
 * hour per source, in the patch):
 * - with the edge key (`AUTH_EDGE_KEY_HEADER`, so it came through the auth
 *   router): the viewer's IP address as CloudFront states it
 *   (`CloudFront-Viewer-Address`, `ip:port`, forwarded by the router's
 *   origin request policy);
 * - otherwise, or without a usable viewer address: the connection's own
 *   address. Behind CloudFront that's one of its many egress addresses, so
 *   a missing key loosens the cap instead of locking anyone out;
 * - with neither (local runs): no source, so no per-network cap. The
 *   address's own limits and the daily ceiling still apply.
 * An IPv6 address counts by its /64, the block one connection usually gets.
 */
export function sendSourceFor(edgeKey: string) {
  const fromEdge = matcherFor(edgeKey);
  return (req: Request): string | undefined => {
    const viewer = fromEdge(req) ? viewerNetwork(req) : undefined;
    if (viewer) {
      return viewer;
    }
    const connection = networkOf(req.headers.get(CONNECTION_IP_HEADER) ?? '');
    return connection ? `connection:${connection}` : undefined;
  };
}

/**
 * Logs once per container when a request carries CloudFront's viewer
 * address but not the right edge key: the router isn't adding it (or the
 * issuer has another value), so code sends only count by connection. Says
 * nothing about the key or the address.
 */
export function edgeKeyCheck(edgeKey: string) {
  const fromEdge = matcherFor(edgeKey);
  let warned = false;
  return (req: Request) => {
    if (
      warned ||
      !req.headers.has('cloudfront-viewer-address') ||
      fromEdge(req)
    ) {
      return;
    }
    warned = true;
    console.warn(
      'AUTH EDGE KEY MISSING: a request came through CloudFront without the edge key; code sends count by connection only',
    );
  };
}

function viewerNetwork(req: Request): string | undefined {
  const header = req.headers.get('cloudfront-viewer-address')?.trim();
  const port = header?.lastIndexOf(':') ?? -1;
  return header && port > 0 ? networkOf(header.slice(0, port)) : undefined;
}

/** An IPv4 address as it is, an IPv6 one by its /64 */
function networkOf(address: string): string | undefined {
  const ip = address.trim().toLowerCase();
  if (!ip) {
    return undefined;
  }
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
