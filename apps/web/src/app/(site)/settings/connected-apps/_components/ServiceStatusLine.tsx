import LocalMoment from '../../_components/LocalMoment';
import { STATE_DOT } from '../_lib/appState';
import {
  type ServiceState,
  serviceLook,
  serviceStatusText,
} from '../_lib/serviceState';
import AppStatus from './AppStatus';
import Swap from './motion/Swap';
import { useConnectedService } from './ServiceContext';
import { STATUS_GHOST } from './StatusGhost';

/**
 * "Syncing · Koen · last sync today at 03:12" and its siblings; a new state's
 * line cross-fades in over the old one.
 */
export default function ServiceStatusLine({
  lastSyncedAt,
  profile,
  state,
}: Readonly<{
  lastSyncedAt: number | null;
  profile: string | null;
  state: ServiceState;
}>) {
  const service = useConnectedService();
  const syncing = state === 'on';
  const dot = STATE_DOT[serviceLook(state)];
  // Until the browser is known, a line: "Not connected" could turn out to be
  // "Not available in this browser"
  const line =
    state === 'checking' ? (
      STATUS_GHOST
    ) : (
      <AppStatus brand={service.id} dot={dot} strong={syncing}>
        {serviceStatusText(service, state, profile)}
        {syncing && lastSyncedAt !== null ? (
          <LocalMoment at={lastSyncedAt} style="at" />
        ) : null}
      </AppStatus>
    );
  return (
    <Swap stacked swapKey={state}>
      {line}
    </Swap>
  );
}
