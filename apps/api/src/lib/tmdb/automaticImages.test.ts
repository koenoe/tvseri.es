import { describe, expect, it } from 'vitest';

import { pickAutomaticImages } from './helpers';

describe('pickAutomaticImages', () => {
  it('takes the first English PNG or SVG logo', () => {
    expect(
      pickAutomaticImages({
        logos: [
          { file_path: '/ja.png', iso_639_1: 'ja' },
          { file_path: '/en.png', iso_639_1: 'en' },
        ],
      }).titleTreatmentPath,
    ).toBe('/en.png');
  });

  it('falls back to a logo without a language, never to one in another language (a Japanese logo as the only title)', () => {
    expect(
      pickAutomaticImages({
        logos: [
          { file_path: '/ja.png', iso_639_1: 'ja' },
          { file_path: '/plain.svg', iso_639_1: null },
        ],
      }).titleTreatmentPath,
    ).toBe('/plain.svg');
    expect(
      pickAutomaticImages({
        logos: [{ file_path: '/ja.png', iso_639_1: 'ja' }],
      }).titleTreatmentPath,
    ).toBeNull();
  });
});
