import LocalMoment from '../../_components/LocalMoment';
import type { PlexState } from '../../_lib/plexState';
import { STATUS_TEXT } from '../_lib/plexCopy';
import AppStatus, { type StatusDot } from './AppStatus';

const DOT: Readonly<Record<PlexState, StatusDot>> = {
  broken: 'none',
  none: 'none',
  on: 'receiving',
  paused: 'paused',
  wait: 'wait',
};

/** "Receiving · last scrobble today at 21:14" and its three siblings. */
export default function PlexStatusLine({
  lastReceivedAt,
  state,
}: Readonly<{ lastReceivedAt: number | null; state: PlexState }>) {
  return (
    <AppStatus dot={DOT[state]} strong={state === 'on'}>
      {STATUS_TEXT[state]}
      {state === 'on' && lastReceivedAt !== null ? (
        <LocalMoment at={lastReceivedAt} style="at" />
      ) : null}
    </AppStatus>
  );
}
