'use client';

import { useSearchParams } from 'next/navigation';
import { useLayoutEffect } from 'react';

import { useShow } from '../../_lib/ShowProvider';
import { seasonFromQuery } from './panelRows';
import { chooseFromUrl } from './seasonChoice';

/**
 * Reads `?season=N` (Suspense-wrapped, so the shell stays static) and hands
 * it to the section. While the history sheet is open its `&season` is the
 * sheet's, and a URL without `season` keeps the last choice. On a hard load
 * the server's wall already shows it (`ViewerWall`), so this changes nothing
 * there; it follows the query the page writes afterwards.
 */
export default function SeasonParam() {
  const params = useSearchParams();
  const show = useShow();
  const valid = seasonFromQuery(show.seasons, {
    history: params.has('history'),
    season: params.get('season'),
  });
  useLayoutEffect(() => {
    if (valid !== null) {
      chooseFromUrl(show.id, valid);
    }
  }, [show.id, valid]);
  return null;
}
