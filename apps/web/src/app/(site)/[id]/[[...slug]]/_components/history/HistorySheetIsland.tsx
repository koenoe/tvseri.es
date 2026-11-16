'use client';

import { useSearchParams } from 'next/navigation';

import { createLoader } from '@/lib/lazy/createLoader';
import { useLoader } from '@/lib/lazy/useLoader';

import { closeHistory, toNumberParam } from '../../_lib/urlState';
import useOpenedOnce from '../../_lib/useOpenedOnce';

/**
 * Client only, like the episode modal (a plain loader, not `next/dynamic`: a
 * chunk that failed to load is tried again on the next opening): the sheet reads the viewer's marks,
 * which the page's holes seed as they stream in, so a server render of it
 * (`?history` on a hard load) drew 0% where the browser, hydrating after the
 * holes, drew the real progress (a hydration mismatch).
 */
const sheet = createLoader(() =>
  import('./HistorySheet').then((module) => module.default),
);

/**
 * Starts loading the sheet's chunk (the progress line's hover, focus or first
 * touch), so its first opening slides in at once instead of waiting for it.
 */
export function preloadHistorySheet() {
  sheet.preload();
}

/**
 * The watch-history sheet's URL island (`?history`, `&season=N`; `/track/…`
 * redirects here). The sheet's code loads only once it first opens (in the
 * browser), then stays mounted so closing plays its exit.
 */
export default function HistorySheetIsland() {
  const params = useSearchParams();
  const open = params.has('history');
  const season = toNumberParam(params.get('season'));
  const opened = useOpenedOnce(open);
  // a failed chunk leaves it closed; the next opening loads it again
  const [HistorySheet] = useLoader(sheet, open);
  if (!opened || !HistorySheet) {
    return null;
  }
  return <HistorySheet onClose={closeHistory} open={open} season={season} />;
}
