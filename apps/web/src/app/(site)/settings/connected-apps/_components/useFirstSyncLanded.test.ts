// @vitest-environment jsdom
import { renderHook } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import useFirstSyncLanded from './useFirstSyncLanded';

type Props = Readonly<{ lastSyncedAt: number | null; linked: boolean }>;

function setup(initial: Props) {
  return renderHook(
    ({ lastSyncedAt, linked }: Props) =>
      useFirstSyncLanded(lastSyncedAt, linked),
    { initialProps: initial },
  );
}

describe('useFirstSyncLanded: the first sync of a link ends on this page', () => {
  it('lands when a linked service’s first sync time arrives', () => {
    const { rerender, result } = setup({ lastSyncedAt: null, linked: true });
    expect(result.current).toBe(0);
    rerender({ lastSyncedAt: 1000, linked: true });
    expect(result.current).not.toBe(0);
  });

  it('never on arrival, on a later sync, or for a link that comes with its history', () => {
    const synced = setup({ lastSyncedAt: 1000, linked: true });
    expect(synced.result.current).toBe(0);
    synced.rerender({ lastSyncedAt: 2000, linked: true });
    expect(synced.result.current).toBe(0);

    const relinked = setup({ lastSyncedAt: null, linked: false });
    relinked.rerender({ lastSyncedAt: 1000, linked: true });
    expect(relinked.result.current).toBe(0);
  });

  it('keeps its key while the page refreshes after the landing', () => {
    const { rerender, result } = setup({ lastSyncedAt: null, linked: true });
    rerender({ lastSyncedAt: 1000, linked: true });
    const landed = result.current;
    rerender({ lastSyncedAt: 1000, linked: true });
    rerender({ lastSyncedAt: 3000, linked: true });
    expect(result.current).toBe(landed);
  });
});
