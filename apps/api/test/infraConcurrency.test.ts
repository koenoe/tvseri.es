import { describe, expect, it } from 'vitest';

import { productionReserved } from '../../../infra/concurrency';
import { infraSources } from './infraFiles';

describe('reserved concurrency', () => {
  it('is reserved in production only', () => {
    expect(productionReserved('production', 50)).toBe(50);
    expect(productionReserved('pr-12', 50)).toBeUndefined();
    expect(productionReserved('koen', 50)).toBeUndefined();
  });

  // Every stage reserving its own share would fill a dev account's quota
  // after a few stages, and the next stage's deploy fails
  it('is never set to a bare number in infra/', () => {
    const bare = infraSources()
      .filter(({ source }) => /\breserved:\s*\d/.test(source))
      .map(({ path }) => path);
    expect(bare).toEqual([]);
  });
});
