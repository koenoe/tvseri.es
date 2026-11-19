import LocalMoment from '../../_components/LocalMoment';
import { STATE_DOT } from '../_lib/appState';
import {
  type ServiceState,
  serviceLook,
  serviceStatusText,
} from '../_lib/serviceState';
import AppStatus from './AppStatus';
import { useConnectedService } from './ServiceContext';
import { STATUS_GHOST } from './StatusGhost';

/** "Syncing · Koen · last sync today at 03:12" and its siblings. */
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
  // Until the browser is known, a line: "Not connected" could turn out to be
  // "Not available in this browser"
  if (state === 'checking') {
    return STATUS_GHOST;
  }
  const syncing = state === 'on';
  const dot = STATE_DOT[serviceLook(state)];
  return (
    <AppStatus brand={service.id} dot={dot} strong={syncing}>
      {serviceStatusText(service, state, profile)}
      {syncing && lastSyncedAt !== null ? (
        <LocalMoment at={lastSyncedAt} style="at" />
      ) : null}
    </AppStatus>
  );
}
