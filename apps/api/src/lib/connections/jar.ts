import {
  type ConnectionCookie,
  ConnectionCookieSchema,
} from '@tvseri.es/schemas';
import * as v from 'valibot';

/** A stored session is the browser's cookie jar for the service, sealed as JSON (./crypto) */

/** Whether the cookie belongs to `site` (`bbc.co.uk`) or one of its subdomains */
const isOn = (cookie: ConnectionCookie, site: string) => {
  const domain = cookie.domain.toLowerCase().replace(/^\./, '');
  return domain === site || domain.endsWith(`.${site}`);
};

export const jarHeader = (
  cookies: ReadonlyArray<ConnectionCookie>,
  site: string,
): string =>
  cookies
    .filter((cookie) => isOn(cookie, site))
    .map((cookie) => `${cookie.name}=${cookie.value}`)
    .join('; ');

export const secretFromCookies = (
  cookies: ReadonlyArray<ConnectionCookie>,
): string => JSON.stringify(cookies);

export const cookiesFromSecret = (
  secret: string,
): ReadonlyArray<ConnectionCookie> | null => {
  try {
    const parsed = v.safeParse(
      v.array(ConnectionCookieSchema),
      JSON.parse(secret),
    );
    return parsed.success ? parsed.output : null;
  } catch {
    return null;
  }
};

const parseSetCookie = (
  line: string,
  defaultDomain: string,
  now: number,
): (ConnectionCookie & Readonly<{ expired: boolean }>) | null => {
  const [pair = '', ...attributes] = line.split(';');
  const equals = pair.indexOf('=');
  if (equals <= 0) {
    return null;
  }
  const cookie = {
    domain: defaultDomain,
    expired: false,
    expiresDate: null as number | null,
    httpOnly: false,
    name: pair.slice(0, equals).trim(),
    path: '/',
    sameSite: null as string | null,
    secure: false,
    value: pair.slice(equals + 1).trim(),
  };
  for (const attribute of attributes) {
    const [rawKey = '', ...rest] = attribute.split('=');
    const key = rawKey.trim().toLowerCase();
    const value = rest.join('=').trim();
    if (key === 'domain' && value) {
      cookie.domain = value.startsWith('.') ? value : `.${value}`;
    } else if (key === 'path' && value) {
      cookie.path = value;
    } else if (key === 'httponly') {
      cookie.httpOnly = true;
    } else if (key === 'secure') {
      cookie.secure = true;
    } else if (key === 'samesite') {
      cookie.sameSite = value.toLowerCase() || null;
    } else if (key === 'max-age' && /^-?\d+$/.test(value)) {
      const seconds = Number(value);
      cookie.expired = seconds <= 0;
      cookie.expiresDate = Math.floor(now / 1000) + seconds;
    } else if (key === 'expires' && cookie.expiresDate === null) {
      const at = Date.parse(value);
      if (!Number.isNaN(at)) {
        cookie.expired = at <= now;
        cookie.expiresDate = Math.floor(at / 1000);
      }
    }
  }
  return cookie;
};

/**
 * Services renew their sign-in through `Set-Cookie` (Netflix on opening,
 * Prime Video on every read), so the stored jar must follow or it ages out.
 */
export const mergeSetCookies = (
  cookies: ReadonlyArray<ConnectionCookie>,
  lines: ReadonlyArray<string>,
  defaultDomain: string,
  now = Date.now(),
): ReadonlyArray<ConnectionCookie> => {
  const jar = new Map(cookies.map((cookie) => [cookie.name, cookie]));
  for (const line of lines) {
    const parsed = parseSetCookie(line, defaultDomain, now);
    if (!parsed) {
      continue;
    }
    const { expired, ...cookie } = parsed;
    if (expired) {
      jar.delete(cookie.name);
    } else {
      jar.set(cookie.name, cookie);
    }
  }
  return [...jar.values()];
};

/** A session's jar during a read: each answer's `Set-Cookie` lines renew it for the next request */
export type CookieJar = Readonly<{
  cookies: () => ReadonlyArray<ConnectionCookie>;
  header: () => string;
  renew: (lines: ReadonlyArray<string>) => void;
  renewed: () => boolean;
}>;

export const cookieJar = (
  start: ReadonlyArray<ConnectionCookie>,
  site: string,
): CookieJar => {
  let cookies = start;
  let renewed = false;
  return {
    cookies: () => cookies,
    header: () => jarHeader(cookies, site),
    renew: (lines) => {
      if (lines.length > 0) {
        cookies = mergeSetCookies(cookies, lines, `.${site}`);
        renewed = true;
      }
    },
    renewed: () => renewed,
  };
};

export const openJar = (secret: string, site: string): CookieJar | null => {
  const cookies = cookiesFromSecret(secret);
  return cookies ? cookieJar(cookies, site) : null;
};

/** The renewed jar, or the stored secret unchanged when nothing was renewed */
export const jarSecret = (jar: CookieJar, stored: string): string =>
  jar.renewed() ? secretFromCookies(jar.cookies()) : stored;
