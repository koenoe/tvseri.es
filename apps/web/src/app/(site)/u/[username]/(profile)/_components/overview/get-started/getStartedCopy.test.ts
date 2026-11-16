import type { WatchProvider } from '@tvseri.es/schemas';
import { describe, expect, it } from 'vitest';

import { doneCount, progressText, toggleProvider } from './getStartedCopy';

const provider = (id: number): WatchProvider => ({
  id,
  logo: '',
  logoPath: '',
  name: `P${id}`,
});

describe('Get started copy', () => {
  it('counts and words the steps', () => {
    const steps = { alreadySeen: false, history: false, services: true };
    expect(doneCount(steps)).toBe(1);
    expect(progressText(0)).toBe('0 of 3 done');
    expect(progressText(1)).toBe('1 of 3 done');
    expect(progressText(3)).toBe('All set');
  });

  it('switches one provider and keeps the others', () => {
    const list = [provider(1), provider(2)];
    expect(toggleProvider(list, provider(3), true).map((p) => p.id)).toEqual([
      1, 2, 3,
    ]);
    expect(toggleProvider(list, provider(1), false).map((p) => p.id)).toEqual([
      2,
    ]);
    expect(toggleProvider(list, provider(2), true)).toHaveLength(2);
  });
});
