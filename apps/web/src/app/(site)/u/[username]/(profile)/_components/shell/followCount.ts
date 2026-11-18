'use client';

import { useState } from 'react';
import { create } from 'zustand';

/**
 * Follows made on this page, per followed user: the followers line counts
 * them at once, while the API's counter (kept by the follow stream) catches
 * up a moment later.
 */
type Change = Readonly<{ delta: number; id: number }>;

const useFollowChanges = create<
  Readonly<{
    byUser: ReadonlyMap<string, Change>;
    /** Every follow made here together: the viewer's own following count */
    total: Change | undefined;
    lastId: number;
  }>
>()(() => ({ byUser: new Map(), lastId: 0, total: undefined }));

/** A follow (+1) or unfollow (-1) of `userId` the API confirmed */
export function recordFollow(userId: string, delta: 1 | -1): void {
  useFollowChanges.setState(({ byUser, lastId, total }) => {
    const id = lastId + 1;
    return {
      byUser: new Map(byUser).set(userId, {
        delta: (byUser.get(userId)?.delta ?? 0) + delta,
        id,
      }),
      lastId: id,
      total: { delta: (total?.delta ?? 0) + delta, id },
    };
  });
}

/**
 * A count to show: `count` from the server, plus the change made here
 * since, until the server's count moves (then it already holds it).
 */
function useShown(change: Change | undefined, count: number): number {
  const [seen, setSeen] = useState<Readonly<{
    base: number;
    id: number;
  }> | null>(null);
  if (change && seen?.id !== change.id) {
    // The count shown when this follow happened: the base it adds to
    setSeen({ base: seen?.base ?? count, id: change.id });
  }
  const base = change && seen?.id === change.id ? seen.base : null;
  return change && base === count ? count + change.delta : count;
}

/** The followers of `userId` to show: the server's count plus the follows made here */
export function useFollowersShown(userId: string, count: number): number {
  const change = useFollowChanges((state) => state.byUser.get(userId));
  return useShown(change, count);
}

/**
 * The viewer's own following count to show (the Circle's header): the
 * server's count plus every follow and unfollow made here
 */
export function useFollowingShown(count: number): number {
  const change = useFollowChanges((state) => state.total);
  return useShown(change, count);
}
