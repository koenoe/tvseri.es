import { describe, expect, it } from 'vitest';

import { formatGrouped, plural } from './count';

describe('formatGrouped', () => {
  it('groups thousands with a comma', () => {
    expect(formatGrouped(10_927)).toBe('10,927');
    expect(formatGrouped(999)).toBe('999');
  });
});

describe('plural', () => {
  it('says one or many', () => {
    expect(plural(1, 'episode')).toBe('1 episode');
    expect(plural(62, 'episode')).toBe('62 episodes');
    expect(plural(2, 'child', 'children')).toBe('2 children');
  });

  it('groups a large count', () => {
    expect(plural(4812, 'episode')).toBe('4,812 episodes');
  });
});
