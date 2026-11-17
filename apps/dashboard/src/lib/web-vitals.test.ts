import { describe, expect, it } from 'vitest';

import { getMetricStatus } from './web-vitals';

describe('getMetricStatus', () => {
  it('rates RES of exactly 90 as needs improvement, above it as great', () => {
    expect(getMetricStatus('res', 90)).toBe('needsImprovement');
    expect(getMetricStatus('res', 91)).toBe('great');
    expect(getMetricStatus('res', 50)).toBe('needsImprovement');
    expect(getMetricStatus('res', 49)).toBe('poor');
  });
});
