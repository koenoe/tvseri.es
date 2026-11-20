import {
  type ConnectionStatus,
  canSyncNow,
  type RecentScrobble,
} from '@tvseri.es/schemas';
import {
  type BrowserFacts,
  type BrowserSupport,
  browserSupport,
} from '@/lib/extension/browserSupport';
import { isLive } from './appState';
import { serviceLook, serviceStateFrom } from './serviceState';

/**
 * What a service card's client panel draws: the status's scalars only.
 * The live activity (`recent`, `week`) is rendered on the server and never
 * crosses to the client as data.
 */
export type ServiceCardStatus = Readonly<
  Pick<
    ConnectionStatus,
    | 'connected'
    | 'lastSyncedAt'
    | 'latest'
    | 'profileName'
    | 'resumeFrom'
    | 'status'
    | 'sync'
    | 'total'
    | 'unresolvedCount'
  >
>;

export type ServiceReviewPlan = Readonly<{
  /** The server's open entries */
  count: number;
  /** Entries the last sync couldn't keep (the list was full): told, never listed */
  overflow: number;
  /** Whether the first page is worth reading */
  readPage: boolean;
}>;

export type ServiceCardPlan = Readonly<{
  browser: BrowserSupport;
  /** The review list, when there is anything to say */
  review: ServiceReviewPlan | null;
  /** The live card's spotlight: the newest episode the sync wrote */
  spotlight: RecentScrobble | null;
  status: ServiceCardStatus;
  /** Whether Sync now shows (canSyncNow: the first sync, or an admin) */
  syncNow: boolean;
}>;

/** Key by key, so nothing else in the status is serialised to the client */
export const toCardStatus = (status: ConnectionStatus): ServiceCardStatus => ({
  connected: status.connected,
  lastSyncedAt: status.lastSyncedAt,
  latest: status.latest,
  profileName: status.profileName,
  resumeFrom: status.resumeFrom,
  status: status.status,
  sync: status.sync,
  total: status.total,
  unresolvedCount: status.unresolvedCount,
});

/**
 * A service card's server decisions, pure so they're tested without the
 * async card. The spotlight is the newest synced episode, never the link's
 * newest entry (which may be a film).
 */
export function serviceCardPlan(
  status: ConnectionStatus,
  role: string | undefined,
  facts: BrowserFacts,
): ServiceCardPlan {
  // Linked states don't depend on the extension: any answer will do
  const live = isLive(serviceLook(serviceStateFrom(status, false, 'present')));
  const overflow = status.sync?.unresolvedOverflow ?? 0;
  const count = status.unresolvedCount;
  const review =
    status.connected && (count > 0 || overflow > 0)
      ? { count, overflow, readPage: count > 0 }
      : null;
  return {
    browser: browserSupport(facts),
    review,
    spotlight: live ? (status.recent[0] ?? null) : null,
    status: toCardStatus(status),
    syncNow: status.connected && canSyncNow(role, status.lastSyncedAt),
  };
}
