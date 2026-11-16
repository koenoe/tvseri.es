import { createHash } from 'node:crypto';
import { describe, expect, it, vi } from 'vitest';

import { SCRIPT_HEADER } from './app';
import { browser, ORIGIN } from './testing/browser';
import { authorizeUrl, createTestApp } from './testing/testApp';
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

  // An email refusal (a failed send or the hourly cap, then the per-address
  // cap) leads with Google: the note says email codes are unavailable and
  // the Google button, already first, takes the focus
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

  it('stops sending codes to anyone once the hourly cap is reached, and sends again the next hour', async () => {
    vi.useFakeTimers({ now: Date.UTC(2026, 10, 13, 10, 5), toFake: ['Date'] });
    const error = vi.spyOn(console, 'error').mockImplementation(() => {});
    const test = createTestApp({ maxCodesPerHour: 2 });
    const b = browser(test.app);
    await b.get(authorizeUrl(ORIGIN));

    await requestCode(b, 'ana@example.com');
    await requestCode(b, 'ben@example.com');
    const third = await (await requestCode(b, 'cy@example.com')).text();

    expect(test.mail.map((m) => m.recipient)).toEqual([
      'ana@example.com',
      'ben@example.com',
    ]);
    expect(third).toContain('Email codes are unavailable right now.');
    expect(third).toMatch(GOOGLE_FOCUSED);
    expect(third).toContain('value="cy@example.com"');
    expect(error).toHaveBeenCalledWith(expect.stringContaining('[CAP]'));

    vi.setSystemTime(Date.UTC(2026, 10, 13, 11, 0));
    await requestCode(b, 'cy@example.com');
    expect(test.mail.map((m) => m.recipient)).toContain('cy@example.com');
    error.mockRestore();
    vi.useRealTimers();
  });

  it('sends 400 code emails an hour by default (the patch), not one more', async () => {
    vi.useFakeTimers({ now: Date.UTC(2026, 10, 13, 10, 5), toFake: ['Date'] });
    const error = vi.spyOn(console, 'error').mockImplementation(() => {});
    const test = createTestApp();
    const b = browser(test.app);
    await b.get(authorizeUrl(ORIGIN));

    for (let i = 0; i < 400; i++) {
      await requestCode(b, `p${i}@example.com`);
    }
    expect(test.mail).toHaveLength(400);

    const refused = await (await requestCode(b, 'last@example.com')).text();
    expect(test.mail).toHaveLength(400);
    expect(refused).toContain('Email codes are unavailable right now.');
    expect(error).toHaveBeenCalledWith(
      expect.stringContaining('reached 400 this hour'),
    );
    error.mockRestore();
    vi.useRealTimers();
  }, 20_000); // 401 sign-in requests in a row: give a loaded machine room

  it('never spends the hourly cap on honeypot posts or invalid addresses', async () => {
    const test = createTestApp({ maxCodesPerHour: 1 });
    const b = browser(test.app);
    await b.get(authorizeUrl(ORIGIN));
    for (let i = 0; i < 3; i++) {
      await b.post('/code/authorize', {
        action: 'request',
        email: `bot${i}@example.com`,
        verify_email: 'x',
      });
      await requestCode(b, `not-an-address-${i}`);
    }

    await requestCode(b, 'ana@example.com');

    expect(test.mail.map((m) => m.recipient)).toEqual(['ana@example.com']);
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
