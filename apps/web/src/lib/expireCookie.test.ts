// @vitest-environment jsdom
import { afterEach, describe, expect, it } from 'vitest';
import { setCookie } from '@/test/setCookie';
import { expireCookie } from './expireCookie';

afterEach(() => {
  setCookie('kept=; Max-Age=0; Path=/');
});

describe('expireCookie', () => {
  it('deletes the named cookie and keeps the others', () => {
    setCookie('__tvseries_welcome=1; Path=/');
    setCookie('kept=yes; Path=/');

    expireCookie('__tvseries_welcome');

    expect(document.cookie).toBe('kept=yes');
  });
});
