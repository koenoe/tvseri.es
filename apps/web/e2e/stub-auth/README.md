# Stub auth

A tiny OpenAuth-compatible issuer for **local runs only**: it lets the web render signed in against the stub API (`../stub-api`) without secrets or `sst dev`.

```bash
# from apps/web
SECRET_KEY=local-stub-only STUB_AUTH_PORT=4216 STUB_IMG_DIR=<local image folder> \
  node --conditions=react-server e2e/stub-auth/server.ts      # = pnpm stub-auth
```

- `SECRET_KEY` must be the same value the web runs with. It is a made-up test value: never use a real secret here, never commit one.
- `--conditions=react-server` lets Node load the web's `src/auth/crypto.ts` (it imports `server-only`), so the session cookie is encrypted by the web's own code.
- `GET /.well-known/oauth-authorization-server` and `/.well-known/jwks.json`: what the web's `verify` reads (ES256 key generated at start, so restart = new key; sessions issued before are rejected, sign in again).
- `POST /token` (`grant_type=refresh_token`): issues new tokens. The refresh token is `stub-refresh.<alex|nina|sam>`.
- `GET /__session?user=alex`: the session cookie value (`&format=json` for `{ name, userId, value }`). `GET /__token?user=alex`: a raw access token.
- `GET /img/<name>`: files from `STUB_IMG_DIR` (not committed). Fixtures use `STUB_ASSETS_URL/img/<name>`; set `STUB_ASSETS_URL` on the stub API to this server's URL.
- Access tokens last ten years, so a session never refreshes unless a test forces it.
- Rotating sessions for the refresh tests (`rotation.ts`): `GET /__session?user=alex&ns=<ns>&rotate=1&access=<s>&reuse=<s>&after=<s>` starts a session whose refresh tokens rotate like the real issuer's (single use, same successor within the reuse window, `invalid_grant` after it). `access`: seconds left on the first access token (0 = expired); `reuse`: the issuer's reuse window (default 300, as deployed; 0 = none); `after`: lifetime of refreshed access tokens (default 600). Controls per namespace: `GET /__rotation?ns=` (counters: calls, issued, rejected), `POST /__rotation/lapse` (used tokens pass their reuse window), `/spend` (the first token is refreshed elsewhere; the browser never sees the answer), `/revoke`, `/fault?failWith=503&delayMs=…`.

Playwright: `e2e/helpers/session.ts` (`signInAs(context, 'alex')`, `signInRotating(…)`) adds the cookies; `playwright.config.ts` starts this server beside the stub API.
