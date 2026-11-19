/**
 * The extension runs only in Chromium on a computer; phones and tablets
 * can't run it, even in Chrome. Decided on the server from the request's
 * headers, so the card's first paint is already right.
 */

export type BrowserSupport = 'supported' | 'unsupported';

export type BrowserFacts = Readonly<{
  userAgent: string;
  /** `Sec-CH-UA-Mobile`, where Chromium sends client hints */
  mobile?: boolean;
  /** `Sec-CH-UA` names Chromium: proof of it even under a reduced user agent */
  chromium?: boolean;
}>;

// An iPad asking for the desktop site sends Safari's Mac user agent: Safari
// is turned down anyway, so it needs no rule of its own
const HANDHELD =
  /Android|iPhone|iPad|iPod|Mobile|CriOS|FxiOS|EdgiOS|Silk|Kindle/;
const NOT_CHROMIUM = /Firefox\/|SamsungBrowser\//;
const CHROMIUM = /Chrome\/|Chromium\//;

export function browserSupport(facts: BrowserFacts): BrowserSupport {
  const { chromium, mobile, userAgent } = facts;
  if (mobile || HANDHELD.test(userAgent) || NOT_CHROMIUM.test(userAgent)) {
    return 'unsupported';
  }
  // The hint only ever adds proof: an odd brand list never turns Chrome down
  return chromium || CHROMIUM.test(userAgent) ? 'supported' : 'unsupported';
}

type HeaderReader = Readonly<{ get: (name: string) => string | null }>;

export function browserFactsFrom(headers: HeaderReader): BrowserFacts {
  const mobile = headers.get('sec-ch-ua-mobile');
  const brands = headers.get('sec-ch-ua');
  return {
    chromium: brands !== null && /"Chromium"/.test(brands),
    mobile: mobile === null ? undefined : mobile.trim() === '?1',
    userAgent: headers.get('user-agent') ?? '',
  };
}
