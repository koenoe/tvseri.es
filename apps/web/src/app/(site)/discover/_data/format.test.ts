import { describe, expect, it } from 'vitest';

import { updatedLine } from './format';

describe('updatedLine', () => {
  it('reads naturally', () => {
    expect(updatedLine('2026-11-10')).toBe('Updated Nov 10');
    expect(updatedLine('2026-01-02')).toBe('Updated Jan 2');
  });
});
