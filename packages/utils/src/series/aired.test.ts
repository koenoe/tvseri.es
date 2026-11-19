import { describe, expect, it } from 'vitest';

import { hasAiredAt } from './aired';

describe('hasAiredAt: an episode counts as aired from the start of its UTC air day', () => {
  const day = '2026-11-19';
  const midnight = Date.parse('2026-11-19T00:00:00Z');

  it('is aired from midnight UTC of its air date', () => {
    expect(hasAiredAt(day, midnight)).toBe(true);
    expect(hasAiredAt(day, midnight + 60_000)).toBe(true);
  });

  it('is not aired the moment before', () => {
    expect(hasAiredAt(day, midnight - 1)).toBe(false);
  });

  it('reads the API’s ISO air dates by their day', () => {
    expect(hasAiredAt('2026-11-19T00:00:00.000Z', midnight)).toBe(true);
    expect(hasAiredAt('2026-11-19T00:00:00.000Z', midnight - 1)).toBe(false);
  });

  it('never counts an episode without a date', () => {
    expect(hasAiredAt('', midnight)).toBe(false);
    expect(hasAiredAt(null, midnight)).toBe(false);
    expect(hasAiredAt(undefined, midnight)).toBe(false);
    expect(hasAiredAt('not a date', midnight)).toBe(false);
  });
});
