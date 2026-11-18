import { describe, expect, it } from 'vitest';

import { fallbackRuntime, runtimeTotal, weightOf } from './marks';
import { season } from './testData';

const items = (runtimes: ReadonlyArray<number>) =>
  season(1, runtimes.length, runtimes).map((episode) => ({ episode }));

describe('episode runtimes', () => {
  it('sums the runtimes, an unknown one counted as the fallback', () => {
    expect(runtimeTotal(items([30, 0, 45]), 40)).toBe(115);
  });

  it('falls back to the mean of the known runtimes, never an invented one', () => {
    expect(
      fallbackRuntime([{ runtime: 30 }, { runtime: 0 }, { runtime: 45 }]),
    ).toBe(38);
    expect(fallbackRuntime([{ runtime: 0 }])).toBe(0);
  });

  it('weighs an episode by its runtime, equal when none is known', () => {
    expect(weightOf({ runtime: 0 }, 30)).toBe(30);
    expect(weightOf({ runtime: 0 }, 0)).toBe(1);
  });
});
