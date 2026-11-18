import { describe, expect, it } from 'vitest';

import { displayLink } from './shareCard';

describe('displayLink', () => {
  it('shows the link without www', () => {
    expect(displayLink('www.tvseri.es', '/u/nina/stats/2025')).toBe(
      'tvseri.es/u/nina/stats/2025',
    );
    expect(displayLink('pr-12.dev.tvseri.es', '/u/nina/stats/2025')).toBe(
      'pr-12.dev.tvseri.es/u/nina/stats/2025',
    );
  });
});
