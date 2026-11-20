import LocalMoment from '../../_components/LocalMoment';
import type { PlexState } from '../../_lib/plexState';
import { STATE_DOT } from '../_lib/appState';
import { STATUS_TEXT } from '../_lib/plexCopy';
import AppStatus from './AppStatus';
import Swap from './motion/Swap';

/**
 * "Receiving · last scrobble today at 21:14" and its three siblings; a new
 * state's line cross-fades in over the old one.
 */
export default function PlexStatusLine({
  lastReceivedAt,
  state,
}: Readonly<{ lastReceivedAt: number | null; state: PlexState }>) {
  const receiving = state === 'on';
  return (
    <Swap stacked swapKey={state}>
      <AppStatus dot={STATE_DOT[state]} strong={receiving}>
        {STATUS_TEXT[state]}
        {receiving && lastReceivedAt !== null ? (
          <LocalMoment at={lastReceivedAt} style="at" />
        ) : null}
      </AppStatus>
    </Swap>
  );
}
