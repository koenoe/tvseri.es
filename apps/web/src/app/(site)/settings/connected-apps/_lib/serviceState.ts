import type { ConnectionStatus } from '@tvseri.es/schemas';
import type { ExtensionCheck } from '@/lib/extension/extension';
import type { ConnectedService } from '../../_lib/services/types';
import type { AppState } from './appState';

/**
 * Plex's states plus `pairing` (a link code waits for the extension),
 * `checking` (is the extension here?), `unavailable` (it can't run; only
 * before linking, since a link syncs on the server from any browser) and
 * `signed-out` (the service refused the stored session). A link stays
 * `wait` until its first sync.
 */
export type ServiceState =
  | Extract<AppState, 'none' | 'on' | 'wait' | 'unavailable'>
  | 'checking'
  | 'pairing'
  | 'signed-out';

/** What the state reads of a status: the link, the service's answer, the first sync */
type LinkFacts = Readonly<
  Pick<ConnectionStatus, 'connected' | 'lastSyncedAt' | 'status'>
>;

export function serviceStateFrom(
  status: LinkFacts | null,
  pairing: boolean,
  extension: ExtensionCheck,
): ServiceState {
  if (pairing) {
    return 'pairing';
  }
  if (status?.connected) {
    if (status.status === 'signed-out') {
      return 'signed-out';
    }
    return status.lastSyncedAt === null ? 'wait' : 'on';
  }
  if (extension === 'checking') {
    return 'checking';
  }
  return extension === 'unsupported' ? 'unavailable' : 'none';
}

const LOOK: Readonly<Record<ServiceState, AppState>> = {
  checking: 'none',
  none: 'none',
  on: 'on',
  // drawn like waiting: dashed, neutral
  pairing: 'wait',
  // nothing can arrive until it's linked again, as with Plex's refused URL
  'signed-out': 'broken',
  unavailable: 'unavailable',
  wait: 'wait',
};

/** The card's look in the shared app states */
export const serviceLook = (state: ServiceState): AppState => LOOK[state];

/**
 * The status line under the service's name; `on` ends with the last sync's
 * moment. `checking` has no words: the line is a placeholder until the
 * browser is known.
 */
export function serviceStatusText(
  service: ConnectedService,
  state: ServiceState,
  profile: string | null,
): string {
  const named = (text: string) => (profile ? `${text} · ${profile}` : text);
  switch (state) {
    case 'checking':
      return '';
    case 'none':
      return 'Not connected';
    case 'unavailable':
      return 'Not available in this browser';
    case 'pairing':
      return 'Waiting for the extension';
    case 'signed-out':
      return service.copy.signedOutStatus;
    case 'wait':
      return named('Waiting for the first sync');
    case 'on':
      return `${named('Syncing')} · last sync `;
  }
}
