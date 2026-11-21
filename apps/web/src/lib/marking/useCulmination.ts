'use client';

import { useCallback, useState } from 'react';

import { type Culmination, isComplete } from './culmination';
import { useMarkingStore } from './MarkingProvider';
import type { MarkingStore } from './store';

const selectCulmination = (state: MarkingStore) => state.culmination;

const completes = (
  culmination: Culmination,
  seriesId: number,
  scope: 'show' | number,
) =>
  culmination.seriesId === seriesId &&
  (scope === 'show'
    ? culmination.finished
    : culmination.seasons.includes(scope));

/**
 * The key of the moment the viewer's own mark completed `scope` (the whole
 * show, or a season by number), or null: use it as the React key of what
 * plays, so it plays once. Only a completion that happens while this
 * component shows that scope counts: one from before it mounted (a finish
 * on a tile's Remote, then the show opened) or before it switched to the
 * scope (back to a season finished earlier) never plays. Once the scope is
 * no longer complete (Undo, a failed write) the moment is over: completing
 * it again without a new one (Undo of that, Try again) plays nothing.
 *
 * @example
 * const play = useCulmination(seriesId, 'show');
 * {play === null ? null : <Sheen key={play} />}
 */
export default function useCulmination(
  seriesId: number,
  scope: 'show' | number,
): number | null {
  const culmination = useMarkingStore(selectCulmination);
  const complete = useMarkingStore(
    useCallback(
      (state: MarkingStore) => isComplete(state.series[seriesId]?.view, scope),
      [scope, seriesId],
    ),
  );
  const latest = culmination?.key ?? 0;
  const at = `${seriesId}:${scope}`;
  // what was already there when this scope came on screen (state adjusted
  // while rendering, React's pattern for it, so no effect)
  const [seen, setSeen] = useState({ at, key: latest });
  const fresh =
    culmination !== null &&
    seen.at === at &&
    culmination.key !== seen.key &&
    completes(culmination, seriesId, scope);
  if (seen.at !== at || (fresh && !complete)) {
    // a new scope starts from what is there; an undone moment is used up
    setSeen({ at, key: latest });
  }
  return fresh && complete ? latest : null;
}
