import type { ConnectionUnresolved } from '@tvseri.es/schemas';
import { describe, expect, it } from 'vitest';

import { focusTargetAfter, withNewEntries } from './serviceReview';

const entry = (key: string): ConnectionUnresolved => ({
  key,
  kind: 'series-not-found',
  row: { episode: '', season: '', title: key },
  watchedAt: 1,
});

describe('focusTargetAfter', () => {
  it('moves on to the next item, or back to the one before the last', () => {
    expect(focusTargetAfter(['a', 'b', 'c'], 'a')).toBe('b');
    expect(focusTargetAfter(['a', 'b', 'c'], 'b')).toBe('c');
    expect(focusTargetAfter(['a', 'b', 'c'], 'c')).toBe('b');
  });

  it('has nowhere to go when it was the only item', () => {
    expect(focusTargetAfter(['a'], 'a')).toBeNull();
    expect(focusTargetAfter([], 'a')).toBeNull();
  });
});

describe('withNewEntries', () => {
  it('appends what a sync added, so loaded items keep their places', () => {
    const loaded = [entry('1'), entry('2')];
    expect(
      withNewEntries(loaded, [entry('3'), entry('1')]).map(({ key }) => key),
    ).toEqual(['1', '2', '3']);
  });

  it('keeps the same list when nothing is new', () => {
    const loaded = [entry('1'), entry('2')];
    expect(withNewEntries(loaded, [entry('2')])).toBe(loaded);
  });
});
