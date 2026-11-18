import { describe, expect, it } from 'vitest';

import { languageName } from './languageName';

describe('languageName', () => {
  it('names the page in its own script (日本語)', () => {
    expect(languageName('ja')).toEqual({
      code: 'ja',
      english: 'Japanese',
      native: '日本語',
    });
    expect(languageName('ko')?.native).toBe('한국어');
  });

  it('capitalises a native name in a script with capitals', () => {
    expect(languageName('es')).toEqual({
      code: 'es',
      english: 'Spanish',
      native: 'Español',
    });
    expect(languageName('nl')?.native).toBe('Nederlands');
  });

  it('names TMDB’s own codes the runtime doesn’t know', () => {
    expect(languageName('cn')).toEqual({
      code: 'cn',
      english: 'Cantonese',
      native: '廣東話',
    });
  });

  it('is null for a code that isn’t a language landing', () => {
    expect(languageName('zz')).toBeNull();
    expect(languageName('JA')).toBeNull();
  });
});
