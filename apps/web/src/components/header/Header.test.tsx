// @vitest-environment jsdom
import { renderToString } from 'react-dom/server';
import { afterEach, describe, expect, it } from 'vitest';

import { USER_DISPLAY_COOKIE_NAME as COOKIE } from '@/auth/cookies';
import { setCookie } from '@/test/setCookie';
import Header from './Header';

const signIn = (username: string) => {
  setCookie(`${COOKIE}=${encodeURIComponent(username)}; path=/`);
};

afterEach(() => {
  setCookie(`${COOKIE}=; path=/; max-age=0`);
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
    expect(html).toMatch(/<[^>]*data-signed-in-only=""/);
  });

  it('has the logo, linking home', () => {
    const html = renderToString(<Header />);

    expect(html).toMatch(
      /<a(?=[^>]*href="\/")(?=[^>]*aria-label="tvseri.es home")/,
    );
  });

  it('starts as the static bar with search and the menu button', () => {
    const html = renderToString(<Header />);

    expect(html).toContain('data-header-mode="static"');
    expect(html).toContain('aria-label="Search"');
    expect(html).toContain('aria-label="Menu"');
  });
});
