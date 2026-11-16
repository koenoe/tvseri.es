// @vitest-environment jsdom
import { renderToString } from 'react-dom/server';
import { afterEach, describe, expect, it } from 'vitest';

import { USER_DISPLAY_COOKIE_NAME as COOKIE } from '@/auth/cookies';

import Header from './Header';

const signIn = (username: string) => {
  // biome-ignore lint/suspicious/noDocumentCookie: jsdom has no Cookie Store API; the hook reads document.cookie
  document.cookie = `${COOKIE}=${encodeURIComponent(username)}; path=/`;
};

afterEach(() => {
  // biome-ignore lint/suspicious/noDocumentCookie: as above
  document.cookie = `${COOKIE}=; path=/; max-age=0`;
});

describe('Header (static shell)', () => {
  it('renders the same HTML signed in and signed out', () => {
    const signedOut = renderToString(<Header />);
    signIn('margaux');
    const signedIn = renderToString(<Header />);

    expect(document.cookie).toContain('margaux');
    expect(signedIn).toBe(signedOut);
    expect(signedIn).not.toContain('margaux');
  });

  it('holds both Sign in and the username slot until hydration (the pre-paint scripts pick one)', () => {
    const html = renderToString(<Header />);

    expect(html).toContain('data-viewer-pending');
    expect(html).toMatch(/<a[^>]*data-signed-out-only=""[^>]*>Sign in<\/a>/);
    expect(html).toMatch(
      /<span[^>]*before:content-\(--viewer-handle\)[^>]*data-signed-in-only=""/,
    );
  });

  it('has the 20px (phone) and 24px (desktop) logo, linking home', () => {
    const html = renderToString(<Header />);

    expect(html).toContain('aria-label="tvseri.es home"');
    expect(html).toContain('h-[20px] w-[103.4px]');
    expect(html).toContain('h-[24px] w-[124.1px]');
  });

  it('starts as the static bar with search and the menu button', () => {
    const html = renderToString(<Header />);

    expect(html).toContain('data-header-mode="static"');
    expect(html).toContain('aria-label="Search"');
    expect(html).toContain('aria-label="Menu"');
    expect(html).toContain('d="M 4 8 L 20 8"');
    expect(html).toContain('d="M 8 16 L 20 16"');
  });
});
