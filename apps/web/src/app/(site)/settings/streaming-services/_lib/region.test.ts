import { describe, expect, it } from 'vitest';

import { hasMismatch, regionLine } from './region';

describe('region copy', () => {
  it('says detected when the region is where the visitor is', () => {
    expect(regionLine('GB', 'GB')).toBe(
      'Detected from your location · decides which services and release dates you see',
    );
  });

  it('says chosen when it differs or nothing was detected', () => {
    expect(regionLine('GB', 'NL')).toMatch(/^Chosen by you · /);
    expect(regionLine('GB', null)).toMatch(/^Chosen by you · /);
  });

  it('offers "Use …" only when a detected country differs', () => {
    expect(hasMismatch('GB', 'NL')).toBe(true);
    expect(hasMismatch('GB', 'GB')).toBe(false);
    expect(hasMismatch('GB', null)).toBe(false);
  });
});
