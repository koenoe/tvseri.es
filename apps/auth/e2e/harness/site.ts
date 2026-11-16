import { Hono } from 'hono';

import { fakeGoogleKey } from '../../src/testing/fakeGoogle';
import { authorizeUrl, createTestApp } from '../../src/testing/testApp';
import { htmlPage } from '../../src/ui/page';
import { StartPage } from '../../src/ui/start';

/**
 * The e2e harness: the real auth app (pages, issuer, patched code provider)
 * on a local port with stand-ins for everything outside it:
 * - a mailbox instead of SES (`/__test/mail`), `down@…` addresses fail;
 * - a Google at `/fake-google` (discovery, JWKS, a chooser that posts an
 *   id_token, an unverified one, or a cancel back);
 * - the site's callback at `/api/auth/callback`, doing what the real one
 *   does with `access_denied` (restart with `?notice=`), else showing what
 *   it got;
 * - `/start` to begin a sign-in like the site's login route.
 * Never deployed: built and served by `serve.ts`.
 */
export function createHarness(origin: string) {
  const googleIssuer = `${origin}/fake-google`;
  const test = createTestApp({
    failFor: (email) => email.startsWith('down@'),
    googleIssuer,
    issuer: origin,
    site: `${origin}/site`,
  });

  const { idToken, jwk } = fakeGoogleKey(googleIssuer);

  return (
    new Hono()
      .get('/start', (c) => {
        const notice = c.req.query('notice');
        return c.redirect(authorizeUrl(origin, notice ? { notice } : {}));
      })
      .get('/api/auth/callback', (c) => {
        const error = c.req.query('error');
        if (error === 'access_denied') {
          const unverified = c.req
            .query('error_description')
            ?.includes('verified');
          return c.redirect(
            `/start?notice=${unverified ? 'google_unverified' : 'google_cancelled'}`,
          );
        }
        return c.html(
          `<!doctype html><title>Site callback</title><h1>Site callback</h1><pre id="query">${JSON.stringify(c.req.queries())}</pre>`,
        );
      })
      // The start page with four providers: the
      // layout follows the issuer's list, so render it with a longer one
      .get('/__test/start-4', () =>
        htmlPage(
          StartPage({
            providers: {
              apple: 'apple',
              code: 'code',
              discord: 'discord',
              github: 'github',
              google: 'google',
            },
            site: `${origin}/site`,
          }),
        ),
      )
      .get('/site', (c) =>
        c.html('<!doctype html><title>Site</title><h1>Site home</h1>'),
      )
      .get('/fake-google/.well-known/openid-configuration', (c) =>
        c.json({
          authorization_endpoint: `${googleIssuer}/authorize`,
          issuer: googleIssuer,
          jwks_uri: `${googleIssuer}/jwks`,
        }),
      )
      .get('/fake-google/jwks', (c) => c.json({ keys: [jwk] }))
      .get('/fake-google/authorize', (c) => {
        const redirect = c.req.query('redirect_uri') ?? '';
        const nonce = c.req.query('nonce') ?? '';
        const state = c.req.query('state') ?? '';
        const form = (
          label: string,
          fields: Readonly<Record<string, string>>,
        ) =>
          `<form method="post" action="${redirect}">${Object.entries(fields)
            .map(([k, v]) => `<input type="hidden" name="${k}" value="${v}">`)
            .join('')}<button>${label}</button></form>`;
        return c.html(
          `<!doctype html><title>Fake Google</title><h1>Choose an account</h1>${form(
            'Continue as Ana',
            {
              id_token: idToken({
                email: 'ana@example.com',
                email_verified: true,
                name: 'Ana',
                nonce,
              }),
              state,
            },
          )}${form('Unverified account', {
            id_token: idToken({
              email: 'ben@example.com',
              email_verified: false,
              nonce,
            }),
            state,
          })}${form('Cancel', { error: 'access_denied', state })}`,
        );
      })
      .get('/__test/mail', (c) => {
        const to = c.req.query('to') ?? '';
        const last = test.mail.filter((m) => m.recipient === to).at(-1);
        return last ? c.json(last) : c.json({ error: 'none' }, 404);
      })
      .get('/__test/mail.html', (c) => {
        const to = c.req.query('to') ?? '';
        const last = test.mail.filter((m) => m.recipient === to).at(-1);
        return last ? c.html(last.html) : c.text('none', 404);
      })
      .mount('/', test.app.fetch)
  );
}
