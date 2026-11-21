import { createHash } from 'node:crypto';
import { AUTH_EDGE_KEY_HEADER as EDGE_KEY_HEADER } from '@tvseri.es/constants';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { SCRIPT_HEADER } from './app';
import { CODE_TTL, formatCodeLifetime } from './lib/codeLifetime';
import { browser, ORIGIN } from './testing/browser';
import { authorizeUrl, createTestApp, TEST_EDGE_KEY } from './testing/testApp';
import { FONT } from './ui/assets';

const startSignIn = async (extra: Readonly<Record<string, string>> = {}) => {
  const test = createTestApp({
    failFor: (email) => email.startsWith('down@'),
  });
  const b = browser(test.app);
  const res = await b.get(authorizeUrl(ORIGIN, extra));
  return { ...test, b, res };
};

const requestCode = (
  b: ReturnType<typeof browser>,
  email = 'ana@example.com',
) => b.post('/code/authorize', { action: 'request', email, verify_email: '' });

const hashOf = (html: string, tag: 'script' | 'style') => {
  const body =
    html.match(new RegExp(`<${tag}>([\\s\\S]*?)</${tag}>`))?.[1] ?? '';
  return `'sha256-${createHash('sha256').update(body).digest('base64')}'`;
};

describe('start page', () => {
  it('tells browsers to use https only (HSTS)', async () => {
    const { res } = await startSignIn();
    expect(res.headers.get('strict-transport-security')).toBe(
      'max-age=31536000',
    );
  });

  it('shows Google and the email form, with a CSP that allows only its own inline blocks', async () => {
    const { res } = await startSignIn();
    const html = await res.text();

    expect(res.status).toBe(200);
    expect(html.startsWith('<!doctype html>')).toBe(true);
    expect(html).toContain('<title>Sign in · tvseri.es</title>');
    expect(html).toContain('Continue with Google');
    expect(html).toContain('href="/google/authorize"');
    expect(html).toContain('action="/code/authorize"');
    expect(html).toContain('New here? Signing in creates your account.');
    // No third-party requests: no external stylesheet, font or script
    expect(html).not.toMatch(/(?:src|href)="https?:\/\/(?!www\.example\.com)/);
    expect(html).not.toContain('googleapis');
    expect(html).not.toContain('unpkg');

    const csp = res.headers.get('content-security-policy') ?? '';
    expect(csp).toContain("default-src 'none'");
    const directive = (name: string) =>
      csp.split('; ').find((d) => d.startsWith(`${name} `)) ?? '';
    expect(directive('script-src')).toBe(
      `script-src ${hashOf(html, 'script')}`,
    );
    expect(directive('style-src').split(' ')).toContain(hashOf(html, 'style'));
    expect(directive('style-src')).not.toContain('unsafe-inline');
    expect(csp).toContain("frame-ancestors 'none'");
    expect(res.headers.get('cache-control')).toBe('no-store');
  });

  it('shows an allow-listed notice and ignores anything else in ?notice=', async () => {
    const cancelled = await (
      await startSignIn({ notice: 'google_cancelled' })
    ).res.text();
    expect(cancelled).toContain('Google sign-in was cancelled.');

    const unverified = await (
      await startSignIn({ notice: 'google_unverified' })
    ).res.text();
    expect(unverified).toContain('Your Google account has no verified email.');
    expect(unverified).toMatch(/<input[^>]*autofocus[^>]*id="em"/);

    const crafted = await (
      await startSignIn({ notice: '<b>Your account is locked</b>' })
    ).res.text();
    expect(crafted).not.toContain('locked');
    expect(crafted).not.toContain('class="a-note');
  });
});

describe('email code flow', () => {
  it('request → code page → wrong code → resend → right code → the site callback', async () => {
    const { b, lastCode, mail } = await startSignIn();

    const codePage = await (await requestCode(b)).text();
    expect(codePage).toContain('<title>Check your email · tvseri.es</title>');
    expect(codePage).toContain(
      'Enter the code we sent to <b class="t-white t-600">ana@example.com</b>',
    );
    expect(codePage).toContain('autocomplete="one-time-code"');
    expect(codePage).toContain('inputmode="numeric"');
    expect(codePage).toContain('data-fresh=""');
    expect(mail).toHaveLength(1);

    const first = lastCode('ana@example.com') ?? '';
    const wrong = first === '000000' ? '111111' : '000000';
    const wrongPage = await (
      await b.post('/code/authorize', { action: 'verify', code: wrong })
    ).text();
    expect(wrongPage).toContain(
      '<title>Error: Check your email · tvseri.es</title>',
    );
    expect(wrongPage).toContain('That code isn’t right.');
    expect(wrongPage).toContain(`value="${wrong}"`);
    expect(wrongPage).toContain('class="a-otp bad shake"');
    expect(wrongPage).not.toContain('data-fresh=""');

    const resent = await (
      await b.post('/code/authorize', {
        action: 'resend',
        email: 'ana@example.com',
        verify_email: '',
      })
    ).text();
    expect(resent).toContain('New code sent.');
    expect(resent).toContain('data-fresh=""');
    expect(mail).toHaveLength(2);

    // A pasted code with a space and a dash still works (the patch strips them)
    const code = lastCode('ana@example.com') ?? '';
    const done = await b.post('/code/authorize', {
      action: 'verify',
      code: `${code.slice(0, 3)} -${code.slice(3)}`,
    });
    expect(done.status).toBe(302);
    const location = new URL(done.headers.get('location') ?? '');
    expect(location.pathname).toBe('/api/auth/callback');
    expect(location.searchParams.get('code')).toBeTruthy();
    expect(location.searchParams.get('state')).toBe('state-1');
    expect(b.jar.has('authorization')).toBe(false);
  });

  it('“Change” goes back to the start page with the address in the field, and a new address still works', async () => {
    const { b, lastCode, mail } = await startSignIn();
    const codePage = await (await requestCode(b, 'ana@exmaple.com')).text();
    // A post, so the address never sits in a URL
    expect(codePage).toContain('<button class="a-link" form="ch"');
    expect(codePage).not.toContain('href="/code/authorize"');

    const start = await (
      await b.post('/code/authorize', {
        action: 'change',
        email: 'ana@exmaple.com',
      })
    ).text();
    expect(start).toContain('<h1 class="t-title-1">Sign in</h1>');
    expect(start).toMatch(/<input[^>]*autofocus[^>]*value="ana@exmaple.com"/);
    expect(mail).toHaveLength(1);

    // The corrected address gets its own code and signs in
    await requestCode(b, 'ana@example.com');
    const done = await b.post('/code/authorize', {
      action: 'verify',
      code: lastCode('ana@example.com') ?? '',
    });
    expect(done.status).toBe(302);
  });

  it('“Change” without a sign-in in this browser is the lost state', async () => {
    const { app } = createTestApp();
    const res = await app.request(`${ORIGIN}/code/authorize`, {
      body: new URLSearchParams({ action: 'change', email: 'ana@example.com' }),
      method: 'POST',
    });
    expect(await res.text()).toContain('Sign-in expired');
  });

  it('answers the code page script with the redirect as data, and clears the sign-in cookies', async () => {
    const { b, lastCode } = await startSignIn();
    await requestCode(b);
    const res = await b.post(
      '/code/authorize',
      { action: 'verify', code: lastCode('ana@example.com') ?? '' },
      { [SCRIPT_HEADER]: '1' },
    );

    expect(res.status).toBe(200);
    const body = (await res.json()) as { next: string };
    expect(new URL(body.next).searchParams.get('state')).toBe('state-1');
    expect(b.jar.has('authorization')).toBe(false);
    expect(b.jar.has('provider')).toBe(false);
  });

  it('puts the address back with a note under the field when it is not an email', async () => {
    const { b, mail } = await startSignIn();
    const html = await (await requestCode(b, 'ana@example')).text();

    expect(html).toContain('<title>Error: Sign in · tvseri.es</title>');
    expect(html).toContain('value="ana@example"');
    expect(html).toContain('class="a-in bad"');
    expect(html).toContain('That doesn’t look like an email address.');
    expect(mail).toHaveLength(0);
  });

  // An email refusal (a failed send, then the per-address cap) leads with
  // Google: the note says email codes are unavailable and the Google
  // button, already first, takes the focus
  const GOOGLE_FOCUSED =
    /<a autofocus="" class="a-btn w"[^>]*href="\/google\/authorize"/;

  it('offers Google first on the start page when the email could not be sent', async () => {
    const { b } = await startSignIn();
    const html = await (await requestCode(b, 'down@example.com')).text();

    expect(html).toContain('Email codes are unavailable right now.');
    expect(html).toContain(
      'Continue with Google to sign in now, or try email again later.',
    );
    expect(html).toMatch(GOOGLE_FOCUSED);
    expect(html).not.toMatch(/id="em"[^>]*autofocus|autofocus[^>]*id="em"/);
    expect(html).toContain('value="down@example.com"');
  });

  it('keeps the address out of the log when the email could not be sent', async () => {
    const log = vi.spyOn(console, 'error').mockImplementation(() => undefined);
    const { b } = await startSignIn();
    await requestCode(b, 'down@example.com');

    expect(log).toHaveBeenCalled();
    const logged = log.mock.calls
      .flat()
      .map((arg) =>
        arg instanceof Error ? `${arg.name} ${arg.message}` : String(arg),
      )
      .join(' ');
    expect(logged).not.toContain('down@example.com');
    log.mockRestore();
  });

  it('focuses nothing but the field on the other start-page errors', async () => {
    const { b } = await startSignIn();
    const html = await (await requestCode(b, 'ana@example')).text();
    expect(html).not.toMatch(GOOGLE_FOCUSED);
  });

  it('stops at 5 codes per address: on the start page, and on the code page for a resend', async () => {
    const { b } = await startSignIn();
    for (let i = 0; i < 4; i++) await requestCode(b);
    // 5th send, from the code page
    await b.post('/code/authorize', {
      action: 'resend',
      email: 'ana@example.com',
      verify_email: '',
    });

    const resend = await (
      await b.post('/code/authorize', {
        action: 'resend',
        email: 'ana@example.com',
        verify_email: '',
      })
    ).text();
    expect(resend).toContain('That’s 5 codes in 15 minutes.');
    expect(resend).toContain('id="cf"');
    expect(resend).not.toContain('data-fresh=""');

    const start = await (await requestCode(b)).text();
    expect(start).toContain(
      'Email codes for this address are paused for 15 minutes.',
    );
    expect(start).toContain('Continue with Google to sign in now.');
    expect(start).toMatch(GOOGLE_FOCUSED);
  });

  it('says “That code isn’t right” for tries 1–4 and turns into “Send a new code” on the 5th', async () => {
    const { b, lastCode } = await startSignIn();
    await requestCode(b);
    const right = lastCode('ana@example.com') ?? '';
    const wrong = right === '000000' ? '111111' : '000000';
    const verify = async (code: string) =>
      (await b.post('/code/authorize', { action: 'verify', code })).text();

    for (let i = 1; i <= 4; i++) {
      const html = await verify(wrong);
      expect(html, `try ${i}`).toContain('That code isn’t right.');
      expect(html, `try ${i}`).toContain('id="cf"');
    }
    // The 5th wrong try used the code up: say so now, not on a 6th
    const fifth = await verify(wrong);
    expect(fifth).toContain('This code has expired.');
    expect(fifth).toContain('Send a new code');
    expect(fifth).not.toContain('id="cf"');
    expect(fifth).not.toContain('That code isn’t right.');

    // ...and even the right code can't bring it back
    expect(await verify(right)).toContain('This code has expired.');
  });

  it('still takes the right code as the 5th try', async () => {
    const { b, lastCode } = await startSignIn();
    await requestCode(b);
    const right = lastCode('ana@example.com') ?? '';
    const wrong = right === '000000' ? '111111' : '000000';
    for (let i = 0; i < 4; i++) {
      await b.post('/code/authorize', { action: 'verify', code: wrong });
    }
    const res = await b.post('/code/authorize', {
      action: 'verify',
      code: right,
    });
    expect(res.status).toBe(302);
    expect(res.headers.get('location')).toContain('/api/auth/callback?code=');
  });

  describe('the code lifetime', () => {
    afterEach(() => {
      vi.useRealTimers();
    });

    const signInAfter = async (seconds: number) => {
      vi.useFakeTimers({ now: Date.now(), toFake: ['Date'] });
      const { b, lastCode } = await startSignIn();
      await requestCode(b);
      vi.setSystemTime(Date.now() + seconds * 1000);
      return b.post('/code/authorize', {
        action: 'verify',
        code: lastCode('ana@example.com') ?? '',
      });
    };

    it('takes the right code until the lifetime the email states', async () => {
      expect((await signInAfter(CODE_TTL - 1)).status).toBe(302);
    });

    it('refuses the right code once that lifetime is over', async () => {
      const res = await signInAfter(CODE_TTL);
      expect(res.status).not.toBe(302);
      // The page states the lifetime the provider enforces
      expect(await res.text()).toContain(
        `This code has expired. Codes work for ${formatCodeLifetime(CODE_TTL)}`,
      );
    });
  });

  it('turns a filled honeypot away without sending anything', async () => {
    const { b, mail } = await startSignIn();
    const res = await b.post('/code/authorize', {
      action: 'request',
      email: 'bot@example.com',
      verify_email: 'bot@example.com',
    });
    expect(res.status).toBe(302);
    expect(mail).toHaveLength(0);
  });
});

describe('limits beyond one code', () => {
  afterEach(() => {
    vi.useRealTimers();
  });

  const DAY = 24 * 60 * 60 * 1000;
  // The start of a UTC day, so a test never crosses midnight by accident
  const midday = () => Math.floor(Date.now() / DAY) * DAY + DAY / 2;

  /** What the auth router adds: the edge key and the viewer's address */
  const viaEdge = (address: string) => ({
    'cloudfront-viewer-address': address,
    [EDGE_KEY_HEADER]: TEST_EDGE_KEY,
  });

  /** A sign-in in its own browser, through the edge from `address` */
  const visitor = async (
    test: ReturnType<typeof createTestApp>,
    address?: string,
  ) => {
    const b = browser(test.app);
    await b.get(authorizeUrl(ORIGIN));
    const headers: Record<string, string> = address ? viaEdge(address) : {};
    return {
      request: async (email: string) =>
        (
          await b.post(
            '/code/authorize',
            { action: 'request', email, verify_email: '' },
            headers,
          )
        ).text(),
      verify: async (code: string) =>
        (
          await b.post('/code/authorize', { action: 'verify', code }, headers)
        ).text(),
    };
  };

  const wrongFor = (code: string | undefined) =>
    code === '000000' ? '111111' : '000000';

  describe('wrong codes per address in a day', () => {
    it('stops email sign-in for the address on the 20th wrong code, until the next day', async () => {
      vi.useFakeTimers({ now: midday(), toFake: ['Date'] });
      const test = createTestApp();
      const ana = await visitor(test);
      const tries = async (count: number) => {
        let html = '';
        for (let i = 0; i < count; i++) {
          html = await ana.verify(wrongFor(test.lastCode('ana@example.com')));
        }
        return html;
      };

      // Four codes, 19 wrong tries: still the ordinary messages
      for (const count of [5, 5, 5, 4]) {
        await ana.request('ana@example.com');
        const html = await tries(count);
        expect(html).not.toContain('Too many tries.');
      }
      // The 20th wrong try says so at once, and offers Google instead
      const locked = await tries(1);
      expect(locked).toContain('Too many tries.');
      expect(locked).toContain(
        'Try again tomorrow, or continue with Google to sign in now.',
      );
      expect(locked).toMatch(
        /<a autofocus="" class="a-btn w"[^>]*href="\/google\/authorize"/,
      );
      expect(locked).not.toContain('Send a new code');

      // No new code for the address today, from any browser
      const sent = test.mail.length;
      const again = await (await visitor(test)).request('ana@example.com');
      expect(again).toContain('Too many tries.');
      expect(test.mail).toHaveLength(sent);

      // Another address is unaffected
      expect(await (await visitor(test)).request('ben@example.com')).toContain(
        'Check your email',
      );

      // The next day the address can sign in again
      vi.setSystemTime(Date.now() + DAY);
      const tomorrow = await visitor(test);
      await tomorrow.request('ana@example.com');
      const res = await tomorrow.verify(test.lastCode('ana@example.com') ?? '');
      expect(res).not.toContain('Too many tries.');
    });

    it('counts tries for the address, not the browser or the code', async () => {
      vi.useFakeTimers({ now: midday(), toFake: ['Date'] });
      const test = createTestApp();
      // 19 wrong tries spread over two browsers
      for (const count of [5, 5, 5, 4]) {
        const v = await visitor(test);
        await v.request('Ana@Example.com');
        for (let i = 0; i < count; i++) {
          await v.verify(wrongFor(test.lastCode('Ana@Example.com')));
        }
      }
      // The 20th, from a third browser, stops the address
      const last = await visitor(test);
      await last.request('ana@example.com');
      await last.verify(wrongFor(test.lastCode('ana@example.com')));
      expect(await (await visitor(test)).request('ana@example.com')).toContain(
        'Too many tries.',
      );
    });
  });

  describe('codes sent from one network', () => {
    it('sends 10 codes an hour from one IP address, then asks it to wait', async () => {
      vi.useFakeTimers({ now: midday(), toFake: ['Date'] });
      const test = createTestApp();
      const ip = '198.51.100.10:46532';
      for (let i = 0; i < 10; i++) {
        const html = await (await visitor(test, ip)).request(
          `user${i}@example.com`,
        );
        expect(html, `send ${i + 1}`).toContain('Check your email');
      }

      // Another port is the same address
      const refused = await (await visitor(test, '198.51.100.10:1')).request(
        'new@example.com',
      );
      expect(refused).toContain('Email codes are paused for now.');
      expect(refused).toContain(
        'Continue with Google to sign in now, or try email again later.',
      );
      // The address is put back, and nothing says whether it has an account
      expect(refused).toContain('value="new@example.com"');
      expect(test.mail).toHaveLength(10);

      // Another IP address still gets its code
      expect(
        await (await visitor(test, '203.0.113.7:443')).request(
          'new@example.com',
        ),
      ).toContain('Check your email');

      // An hour later the first one may send again
      vi.setSystemTime(Date.now() + 60 * 60 * 1000);
      expect(
        await (await visitor(test, ip)).request('later@example.com'),
      ).toContain('Check your email');
    });

    it('counts an IPv6 /64 as one network', async () => {
      vi.useFakeTimers({ now: midday(), toFake: ['Date'] });
      const test = createTestApp();
      for (let i = 0; i < 10; i++) {
        await (await visitor(test, `2001:db8:85a3:1::${i + 1}:443`)).request(
          `user${i}@example.com`,
        );
      }
      const refused = await (
        await visitor(test, '2001:0db8:85a3:0001:ffff::1:443')
      ).request('new@example.com');
      expect(refused).toContain('Email codes are paused for now.');
      expect(
        await (await visitor(test, '2001:db8:85a3:2::1:443')).request(
          'new@example.com',
        ),
      ).toContain('Check your email');
    });

    it('says so on the code page when a resend is refused', async () => {
      vi.useFakeTimers({ now: midday(), toFake: ['Date'] });
      const test = createTestApp();
      const ip = '198.51.100.10:46532';
      const b = browser(test.app);
      await b.get(authorizeUrl(ORIGIN));
      const headers = viaEdge(ip);
      await b.post(
        '/code/authorize',
        { action: 'request', email: 'ana@example.com', verify_email: '' },
        headers,
      );
      for (let i = 0; i < 9; i++) {
        await (await visitor(test, ip)).request(`user${i}@example.com`);
      }
      const resend = await (
        await b.post(
          '/code/authorize',
          { action: 'resend', email: 'ana@example.com', verify_email: '' },
          headers,
        )
      ).text();
      expect(resend).toContain('We can’t send more codes right now.');
      expect(resend).toContain('Use the newest one, or try again later.');
      expect(resend).toContain('id="cf"');
    });

    it('without the edge key, counts by the connection, not by the stated address', async () => {
      vi.useFakeTimers({ now: midday(), toFake: ['Date'] });
      const test = createTestApp();
      // The Lambda adapter's env: who opened the connection
      const from = (ip: string) => ({
        requestContext: { http: { sourceIp: ip } },
      });
      const send = async (ip: string, email: string, stated: string) => {
        const b = browser(test.app, from(ip));
        await b.get(authorizeUrl(ORIGIN));
        return (
          await b.post(
            '/code/authorize',
            { action: 'request', email, verify_email: '' },
            // A stated address (and a stated connection) isn't believed
            {
              'cloudfront-viewer-address': stated,
              'x-tvs-connection-ip': stated,
            },
          )
        ).text();
      };
      for (let i = 0; i < 10; i++) {
        await send('203.0.113.9', `user${i}@example.com`, `198.51.100.${i}`);
      }
      expect(test.mail).toHaveLength(10);
      expect(
        await send('203.0.113.9', 'new@example.com', '198.51.100.99'),
      ).toContain('Email codes are paused for now.');
      // Another connection (CloudFront has many) still sends
      expect(
        await send('203.0.113.10', 'new@example.com', '198.51.100.99'),
      ).toContain('Check your email');
    });

    it('without the edge key or a known connection, has no per-network cap', async () => {
      vi.useFakeTimers({ now: midday(), toFake: ['Date'] });
      const test = createTestApp();
      for (let i = 0; i < 12; i++) {
        expect(
          await (await visitor(test)).request(`user${i}@example.com`),
        ).toContain('Check your email');
      }
    });

    it('doesn’t count requests that send nothing (honeypot, not an address)', async () => {
      vi.useFakeTimers({ now: midday(), toFake: ['Date'] });
      const test = createTestApp();
      const ip = '198.51.100.10:46532';
      for (let i = 0; i < 10; i++) {
        await (await visitor(test, ip)).request('not-an-address');
      }
      expect(
        await (await visitor(test, ip)).request('ana@example.com'),
      ).toContain('Check your email');
    });
  });

  describe('codes sent in a day', () => {
    it('stops all code emails at the daily ceiling, until the next day', async () => {
      vi.useFakeTimers({ now: midday(), toFake: ['Date'] });
      const test = createTestApp({ dailySends: 3 });
      for (let i = 0; i < 3; i++) {
        await (await visitor(test, `198.51.100.${i}:1`)).request(
          `user${i}@example.com`,
        );
      }
      const refused = await (await visitor(test, '203.0.113.7:1')).request(
        'new@example.com',
      );
      expect(refused).toContain('Email codes are paused for now.');
      // Requests from outside the edge meet the same ceiling
      expect(await (await visitor(test)).request('new@example.com')).toContain(
        'Email codes are paused for now.',
      );
      expect(test.mail).toHaveLength(3);

      vi.setSystemTime(Date.now() + DAY);
      expect(await (await visitor(test)).request('new@example.com')).toContain(
        'Check your email',
      );
    });
  });
});

describe('the router’s edge key', () => {
  it('says once in the log when CloudFront’s headers arrive without it, on any page', async () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => undefined);
    const test = createTestApp();
    const page = () =>
      test.app.request(authorizeUrl(ORIGIN), {
        headers: { 'cloudfront-viewer-address': '198.51.100.10:443' },
      });
    expect((await page()).status).toBe(200);
    await page();
    expect(warn).toHaveBeenCalledTimes(1);
    expect(String(warn.mock.calls[0]?.[0])).toContain('AUTH EDGE KEY MISSING');
    warn.mockRestore();
  });
});

describe('cross-site posts to the code form', () => {
  it('takes a post from the auth pages by Origin, or by Sec-Fetch-Site without one', async () => {
    const { b, mail } = await startSignIn();
    await requestCode(b, 'ana@example.com');
    const noOrigin = await b.post(
      '/code/authorize',
      { action: 'request', email: 'ben@example.com', verify_email: '' },
      { origin: '', 'sec-fetch-site': 'same-origin' },
    );

    expect(noOrigin.status).toBe(200);
    expect(mail.map((m) => m.recipient)).toEqual([
      'ana@example.com',
      'ben@example.com',
    ]);
  });

  it('refuses a post from another site, or with neither header, and sends nothing', async () => {
    const { b, mail } = await startSignIn();
    const fields = {
      action: 'request',
      email: 'ana@example.com',
      verify_email: '',
    };
    const fromSite = await b.post('/code/authorize', fields, {
      origin: 'https://www.example.com',
      'sec-fetch-site': 'same-site',
    });
    const fromElsewhere = await b.post('/code/authorize', fields, {
      origin: 'https://attacker.example',
      'sec-fetch-site': 'cross-site',
    });
    const bare = await b.post('/code/authorize', fields, { origin: '' });

    expect([fromSite.status, fromElsewhere.status, bare.status]).toEqual([
      403, 403, 403,
    ]);
    expect(mail).toHaveLength(0);
  });

  it('leaves the token endpoint to servers (no Origin)', async () => {
    const { app } = createTestApp();
    const res = await app.request(`${ORIGIN}/token`, {
      body: new URLSearchParams({ grant_type: 'authorization_code' }),
      method: 'POST',
    });
    expect(res.status).not.toBe(403);
  });
});

describe('lost state', () => {
  it('shows the S04E00 page when the email form is used without a sign-in in this browser', async () => {
    const { app, mail } = createTestApp();
    const res = await app.request(`${ORIGIN}/code/authorize`, {
      body: new URLSearchParams({
        action: 'request',
        email: 'ana@example.com',
      }),
      method: 'POST',
    });
    const html = await res.text();

    expect(res.status).toBe(400);
    expect(html).toContain('S04E00');
    expect(html).toContain('Start your sign-in again.');
    expect(html).toContain('href="https://www.example.com/api/auth/login"');
    expect(res.headers.get('content-security-policy')).toContain(
      "default-src 'none'",
    );
    expect(mail).toHaveLength(0);
  });

  it('shows it for Google opened directly, before going to Google', async () => {
    const { app } = createTestApp();
    const res = await app.request(`${ORIGIN}/google/authorize`);
    expect(res.status).toBe(400);
    expect(await res.text()).toContain('Sign-in expired');
  });
});

describe('font', () => {
  it('serves the self-hosted Inter under a hashed path, cached for a year', async () => {
    const { app } = createTestApp();
    const res = await app.request(`${ORIGIN}${FONT.path}`);

    expect(res.status).toBe(200);
    expect(res.headers.get('content-type')).toBe('font/woff2');
    expect(res.headers.get('cache-control')).toBe(
      'public, max-age=31536000, immutable',
    );
    expect((await res.arrayBuffer()).byteLength).toBe(FONT.body.byteLength);
    expect(FONT.path).toMatch(/^\/assets\/inter-[0-9a-f]{10}\.woff2$/);
  });
});
