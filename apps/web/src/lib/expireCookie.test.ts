// @vitest-environment jsdom
import { afterEach, describe, expect, it } from 'vitest';

import { expireCookie } from './expireCookie';

afterEach(() => {
  // biome-ignore lint/suspicious/noDocumentCookie: test setup
  document.cookie = 'kept=; Max-Age=0; Path=/';
});

describe('expireCookie', () => {
  it('deletes the named cookie and keeps the others', () => {
    // biome-ignore lint/suspicious/noDocumentCookie: test setup
    document.cookie = '__tvseries_welcome=1; Path=/';
    // biome-ignore lint/suspicious/noDocumentCookie: test setup
    document.cookie = 'kept=yes; Path=/';

    expireCookie('__tvseries_welcome');

    expect(document.cookie).toBe('kept=yes');
  });
});
