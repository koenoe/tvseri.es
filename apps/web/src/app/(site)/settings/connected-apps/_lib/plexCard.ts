import type {
  RecentScrobble,
  ScrobbleAccount,
  WebhookStatus,
} from '@tvseri.es/schemas';

/** The Plex card's client panel props the status decides */
export type PlexPanelStatus = Readonly<{
  /** The account "Only …" names: the saved one, else the last scrobble's */
  account: ScrobbleAccount | null;
  connected: boolean;
  /** A webhook URL exists (its token stays on the server until Show or Copy) */
  hasUrl: boolean;
  lastReceivedAt: number | null;
  onlyAccountId: number | null;
  paused: boolean;
  /** How many plays the Recent list shows */
  recentCount: number;
  /** False when the edge refuses the URL */
  urlWorks: boolean;
}>;

type PlexCardPlan = Readonly<{
  panel: PlexPanelStatus;
  /** The Last scrobble card's show: the newest scrobble */
  spotlight: RecentScrobble | null;
}>;

const NOT_CONNECTED: PlexCardPlan = {
  panel: {
    account: null,
    connected: false,
    hasUrl: false,
    lastReceivedAt: null,
    onlyAccountId: null,
    paused: false,
    recentCount: 0,
    urlWorks: true,
  },
  spotlight: null,
};

/**
 * The Plex card's server decisions, pure so they are tested without
 * rendering the async card. Key by key, so nothing else in the status (and
 * never the webhook token: Show and Copy fetch it) reaches the client.
 */
export function plexCardPlan(status: WebhookStatus): PlexCardPlan {
  if (!status.connected) {
    return NOT_CONNECTED;
  }
  return {
    panel: {
      account: status.onlyAccount ?? status.lastAccount,
      connected: true,
      hasUrl: true,
      lastReceivedAt: status.lastReceivedAt,
      onlyAccountId: status.onlyAccount?.id ?? null,
      paused: status.paused,
      recentCount: status.recent.length,
      urlWorks: status.urlWorks,
    },
    spotlight: status.recent[0] ?? null,
  };
}
