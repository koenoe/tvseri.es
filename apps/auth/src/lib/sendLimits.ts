/**
 * The ceiling on sign-in code emails across all addresses, per UTC day.
 * Hitting it pauses email codes (Google still works), so nobody can have
 * SES mail any number of addresses on our behalf, which could get sending
 * suspended for everyone. Assumption to confirm in the SES console: the
 * account is out of the SES sandbox (production quotas start in the tens
 * of thousands a day), so 500 sits far below the quota and well above
 * what our sign-ins need.
 */
export const DAILY_SENDS = 500;

/**
 * Where a code request comes from, for the per-network send cap: the
 * viewer's IP address as CloudFront states it (`CloudFront-Viewer-Address`,
 * `ip:port`, forwarded by the auth router's origin request policy). An IPv6
 * address counts by its /64, the block one connection usually gets.
 * Without the header (local runs) only the daily ceiling applies.
 */
export function sendSource(req: Request): string | undefined {
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
