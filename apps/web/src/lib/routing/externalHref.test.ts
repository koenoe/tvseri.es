import { describe, expect, it } from 'vitest';

import externalHref from './externalHref';

describe('externalHref', () => {
  it('keeps absolute http(s) URLs as written', () => {
    expect(externalHref('https://www.hbo.com/the-wire')).toBe(
      'https://www.hbo.com/the-wire',
    );
    expect(externalHref('http://example.com')).toBe('http://example.com');
  });

  it('drops other schemes, relative paths and nothing', () => {
    expect(externalHref('javascript:alert(1)')).toBeNull();
    expect(externalHref('JavaScript:alert(1)')).toBeNull();
    expect(externalHref('data:text/html,hi')).toBeNull();
    expect(externalHref('//evil.example')).toBeNull();
    expect(externalHref('/123/the-bear')).toBeNull();
    expect(externalHref('')).toBeNull();
    expect(externalHref(undefined)).toBeNull();
  });
});
