import type { Child } from 'hono/jsx';

/**
 * A rendered page as the issuer expects it: a full `Response`. Never cached
 * (each page belongs to one browser's sign-in); the CSP and the other
 * security headers are added for every HTML response in `app.ts`.
 */
export const htmlPage = (jsx: Child, status = 200): Response =>
  new Response(`<!doctype html>${String(jsx)}`, {
    headers: {
      'Cache-Control': 'no-store',
      'Content-Type': 'text/html; charset=utf-8',
    },
    status,
  });
