import { describe, expect, it } from 'vitest';

import {
  contentSecurityPolicy,
  localStubOrigins,
  securityHeaders,
} from './headers';

/**
 * The invariants only: what must never change without a
 * decision. Whether real pages load under the policy is the e2e's job
 * (`e2e/security-headers.spec.ts`).
 */

const PRODUCTION = { dev: false, vercelPreview: false };

/** `script-src 'self' x` → { 'script-src': ["'self'", 'x'] } */
function directives(policy: string): Record<string, string[]> {
  return Object.fromEntries(
    policy.split(';').map((part) => {
      const [name = '', ...sources] = part.trim().split(/\s+/);
      return [name, sources];
    }),
  );
}

const imgSrc = (env: Parameters<typeof contentSecurityPolicy>[0]) =>
  directives(contentSecurityPolicy(env))['img-src'];

describe('contentSecurityPolicy invariants', () => {
  const csp = directives(contentSecurityPolicy(PRODUCTION));

  it('never allows eval in a production build', () => {
    expect(csp['script-src']).not.toContain("'unsafe-eval'");
    expect(
      directives(contentSecurityPolicy({ dev: true, vercelPreview: false }))[
        'script-src'
      ],
    ).toContain("'unsafe-eval'");
  });

  it('is never framed and loads no plugins', () => {
    expect(csp['frame-ancestors']).toEqual(["'none'"]);
    expect(csp['object-src']).toEqual(["'none'"]);
  });

  it('lets the Vercel toolbar in on preview builds only', () => {
    const preview = Object.values(
      directives(contentSecurityPolicy({ dev: false, vercelPreview: true })),
    ).flat();
    expect(preview).toContain('https://vercel.live');
    expect(Object.values(csp).flat()).not.toContain('https://vercel.live');
  });
});

describe('the local stub API images', () => {
  it('leaves the production policy unchanged', () => {
    expect(imgSrc(PRODUCTION)).toEqual([
      "'self'",
      'data:',
      'blob:',
      'https://image.tmdb.org',
    ]);
    expect(imgSrc({ ...PRODUCTION, localImages: [] })).toEqual(
      imgSrc(PRODUCTION),
    );
  });

  it('allows the stub origins only when given', () => {
    expect(
      imgSrc({ ...PRODUCTION, localImages: ['http://localhost:3190'] }),
    ).toContain('http://localhost:3190');
  });

  it('takes only local http origins, never on Vercel', () => {
    expect(
      localStubOrigins(
        ['http://localhost:3190', 'http://127.0.0.1:4216/', undefined],
        false,
      ),
    ).toEqual(['http://localhost:3190', 'http://127.0.0.1:4216']);
    expect(localStubOrigins(['http://localhost:3190'], true)).toEqual([]);
    expect(
      localStubOrigins(
        [
          'https://api.example.com',
          'http://localhost.example.com',
          'https://localhost:3190',
          'not a url',
        ],
        false,
      ),
    ).toEqual([]);
  });
});

describe('securityHeaders invariants', () => {
  it('sends every header of the static set', () => {
    const keys = securityHeaders(PRODUCTION).map(({ key }) => key);
    expect(keys).toEqual(
      expect.arrayContaining([
        'Content-Security-Policy',
        'Cross-Origin-Opener-Policy',
        'Permissions-Policy',
        'Referrer-Policy',
        'Strict-Transport-Security',
        'X-Content-Type-Options',
        'X-Frame-Options',
      ]),
    );
  });
});
