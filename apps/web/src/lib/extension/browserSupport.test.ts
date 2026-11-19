import { describe, expect, it } from 'vitest';

import { browserFactsFrom, browserSupport } from './browserSupport';

const UA = {
  android:
    'Mozilla/5.0 (Linux; Android 14; Pixel 8) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Mobile Safari/537.36',
  androidTablet:
    'Mozilla/5.0 (Linux; Android 13; SM-X710) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36',
  chrome:
    'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36',
  chromeOs:
    'Mozilla/5.0 (X11; CrOS x86_64 14541.0.0) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36',
  criOs:
    'Mozilla/5.0 (iPhone; CPU iPhone OS 17_5 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) CriOS/131.0.6778.73 Mobile/15E148 Safari/604.1',
  edge: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36 Edg/131.0.0.0',
  firefox:
    'Mozilla/5.0 (Macintosh; Intel Mac OS X 14.5; rv:132.0) Gecko/20100101 Firefox/132.0',
  ipad: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.5 Safari/605.1.15',
  opera:
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36 OPR/115.0.0.0',
  safari:
    'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.1 Safari/605.1.15',
  samsung:
    'Mozilla/5.0 (Linux; Android 14; SM-S918B) AppleWebKit/537.36 (KHTML, like Gecko) SamsungBrowser/26.0 Chrome/122.0.0.0 Mobile Safari/537.36',
} as const;

const desktop = (userAgent: string) => browserSupport({ userAgent });

/** The request's headers, as `headers()` hands them over */
const request = (entries: Record<string, string>) =>
  browserSupport(browserFactsFrom(new Headers(entries)));

describe('browserSupport', () => {
  it('supports Chromium on a computer: Chrome, Edge, Opera, ChromeOS', () => {
    expect(desktop(UA.chrome)).toBe('supported');
    expect(desktop(UA.edge)).toBe('supported');
    expect(desktop(UA.opera)).toBe('supported');
    expect(desktop(UA.chromeOs)).toBe('supported');
  });

  it('turns down Safari and Firefox', () => {
    expect(desktop(UA.safari)).toBe('unsupported');
    expect(desktop(UA.firefox)).toBe('unsupported');
  });

  it('turns down an iPad that says it is a Mac (it is Safari)', () => {
    expect(desktop(UA.ipad)).toBe('unsupported');
  });

  it('turns down phones and tablets, Chrome on them included', () => {
    expect(desktop(UA.android)).toBe('unsupported');
    expect(desktop(UA.androidTablet)).toBe('unsupported');
    expect(desktop(UA.criOs)).toBe('unsupported');
    expect(desktop(UA.samsung)).toBe('unsupported');
  });

  it('believes the client hints when they say mobile', () => {
    expect(browserSupport({ mobile: true, userAgent: UA.chrome })).toBe(
      'unsupported',
    );
  });
});

describe('browserFactsFrom', () => {
  it('supports desktop Chromium from its request headers', () => {
    expect(request({ 'user-agent': UA.chrome })).toBe('supported');
    expect(
      request({
        'sec-ch-ua':
          '"Chromium";v="131", "Brave";v="131", "Not_A Brand";v="24"',
        'sec-ch-ua-mobile': '?0',
        'user-agent': UA.chrome,
      }),
    ).toBe('supported');
  });

  it('believes Sec-CH-UA-Mobile over a desktop user agent', () => {
    expect(request({ 'sec-ch-ua-mobile': '?1', 'user-agent': UA.chrome })).toBe(
      'unsupported',
    );
  });

  it('takes the client hints as proof of Chromium, never as a veto', () => {
    expect(
      request({
        'sec-ch-ua': '"Not_A Brand";v="24", "Other";v="1"',
        'user-agent': UA.chrome,
      }),
    ).toBe('supported');
    expect(
      request({
        'sec-ch-ua': '"Chromium";v="131", "Not_A Brand";v="24"',
        'user-agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)',
      }),
    ).toBe('supported');
  });

  it('turns down Safari, Firefox and phones, and a request with no user agent', () => {
    expect(request({ 'user-agent': UA.safari })).toBe('unsupported');
    expect(request({ 'user-agent': UA.firefox })).toBe('unsupported');
    expect(request({ 'user-agent': UA.android })).toBe('unsupported');
    expect(request({})).toBe('unsupported');
  });
});
