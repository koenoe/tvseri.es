import { describe, expect, it } from 'vitest';

import { createAllowClient } from './allowClient';

const CHALLENGE = 'Fh0NsGvxFsI8Iqsco-Cq6oalKBUdLTp_g9yH6nmXl0g';

/** An /authorize request as the clients send it, with overrides */
const authorize = (
  clientID: string,
  redirectURI: string,
  params: Readonly<Record<string, string | null>> = {},
) => {
  const url = new URL('https://auth.example.com/authorize');
  const all: Record<string, string | null> = {
    client_id: clientID,
    code_challenge: CHALLENGE,
    code_challenge_method: 'S256',
    redirect_uri: redirectURI,
    response_type: 'code',
    ...params,
  };
  for (const [key, value] of Object.entries(all)) {
    if (value !== null) {
      url.searchParams.set(key, value);
    }
  }
  return [{ clientID, redirectURI }, new Request(url)] as const;
};

const production = createAllowClient({
  domain: 'example.com',
  production: true,
});
const preview = createAllowClient({
  domain: 'pr-1.dev.example.com',
  production: false,
});

const WEBSITE = 'https://www.example.com/api/auth/callback';
const DASHBOARD = 'https://dashboard.example.com/';

describe('createAllowClient', () => {
  it.each([
    ['the website callback', 'website', WEBSITE],
    ['the dashboard', 'dashboard', DASHBOARD],
  ])('allows %s', async (_, client, uri) => {
    expect(await production(...authorize(client, uri))).toBe(true);
  });

  it.each([
    ['a foreign host', 'website', 'https://www.example.org/api/auth/callback'],
    [
      'a look-alike host',
      'website',
      'https://www.example.com.evil.example/api/auth/callback',
    ],
    [
      'http on the own host',
      'website',
      'http://www.example.com/api/auth/callback',
    ],
    ['another path', 'website', 'https://www.example.com/api/auth/callback/x'],
    ['a query', 'website', `${WEBSITE}?next=/x`],
    ['a hash', 'website', `${WEBSITE}#x`],
    ['userinfo', 'website', 'https://user@www.example.com/api/auth/callback'],
    ['a port', 'website', 'https://www.example.com:8443/api/auth/callback'],
    ['the other client’s URI', 'dashboard', WEBSITE],
    ['an unknown client', 'mobile', WEBSITE],
    ['an inherited property as client', 'toString', WEBSITE],
    ['not a URL', 'website', 'not a url'],
    [
      'localhost in production',
      'website',
      'http://localhost:3000/api/auth/callback',
    ],
  ])('refuses %s', async (_, client, uri) => {
    expect(await production(...authorize(client, uri))).toBe(false);
  });

  it('allows a local callback outside production only', async () => {
    const local = 'http://localhost:3000/api/auth/callback';
    expect(await preview(...authorize('website', local))).toBe(true);
    expect(
      await preview(
        ...authorize('website', 'http://127.0.0.1:3000/api/auth/callback'),
      ),
    ).toBe(true);
    expect(
      await preview(
        ...authorize(
          'website',
          'https://www.pr-1.dev.example.com/api/auth/callback',
        ),
      ),
    ).toBe(true);
    // The stage's own domain only
    expect(await preview(...authorize('website', WEBSITE))).toBe(false);
  });

  it.each([
    ['no PKCE', { code_challenge: null, code_challenge_method: null }],
    ['plain PKCE', { code_challenge_method: 'plain' }],
    ['an empty challenge', { code_challenge: '' }],
    ['the implicit flow', { response_type: 'token' }],
  ])('refuses %s', async (_, params) => {
    expect(await production(...authorize('website', WEBSITE, params))).toBe(
      false,
    );
  });
});
