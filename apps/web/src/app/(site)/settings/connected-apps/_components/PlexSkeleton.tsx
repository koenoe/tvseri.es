import type { ReactNode } from 'react';

import { PLEX_BRAND } from '../../_lib/plexBrand';
import AppHeaderGhost, { APP_CARD_GHOST_CLASS } from './AppHeaderGhost';
import PlexStatusLine from './PlexStatusLine';

/** Which shape shows: `data-plex` on <html> (pre-paint, `lib/viewer/htmlHints.ts`). */
const SHOWN = {
  // not connected, also the default when no hint is on this browser
  none: 'block [html[data-plex=wait]_&]:hidden [html[data-plex=on]_&]:hidden [html[data-plex=paused]_&]:hidden',
  on: 'hidden [html[data-plex=on]_&]:block [html[data-plex=paused]_&]:block',
  wait: 'hidden [html[data-plex=wait]_&]:block',
} as const;

/** The closed Plex card's header: the three pills, Open */
function HeaderGhost({
  state,
  status,
}: Readonly<{ state: string; status?: ReactNode }>) {
  const pills = [state, ...PLEX_BRAND.facts];
  return (
    <div className={APP_CARD_GHOST_CLASS}>
      <AppHeaderGhost name="Plex" pills={pills} status={status} />
    </div>
  );
}

const NONE_STATUS = <PlexStatusLine lastReceivedAt={null} state="none" />;
const WAIT_STATUS = <PlexStatusLine lastReceivedAt={null} state="wait" />;

/**
 * The Plex card while its status loads: its header only, since it starts
 * closed (it opens on a press). The words are the state this browser last
 * saw (`data-plex` on <html>, picked by CSS before the first paint); not
 * connected without a hint. Inert.
 */
export default function PlexSkeleton() {
  return (
    <div aria-hidden="true" inert>
      <div className={SHOWN.none}>
        <HeaderGhost state="Available" status={NONE_STATUS} />
      </div>
      <div className={SHOWN.wait}>
        <HeaderGhost state="Available" status={WAIT_STATUS} />
      </div>
      <div className={SHOWN.on}>
        <HeaderGhost state="Connected" />
      </div>
    </div>
  );
}
