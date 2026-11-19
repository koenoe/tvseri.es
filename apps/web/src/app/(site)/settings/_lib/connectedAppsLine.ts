import {
  CONNECTION_SERVICES,
  type ConnectionService,
  type ConnectionStatus,
  type WebhookStatus,
} from '@tvseri.es/schemas';
import { type PlexState, plexStateOf } from './plexState';
import { connectedService } from './services';

const PLEX_WORD: Readonly<Record<Exclude<PlexState, 'none'>, string>> = {
  broken: 'not working',
  on: 'receiving',
  paused: 'paused',
  wait: 'waiting',
};

/** The words for one app, the same in the Settings menu and the header */
export const plexWord = (state: PlexState): string =>
  state === 'none' ? 'not connected' : PLEX_WORD[state];

/** One connected app in the summary: its words, and whether it needs the viewer */
type AppLine = Readonly<{ broken: boolean; words: string }>;

function serviceLine(name: string, status: ConnectionStatus): AppLine {
  if (status.status === 'signed-out') {
    return { broken: true, words: `${name} signed out` };
  }
  return {
    broken: false,
    words: `${name} ${status.lastSyncedAt === null ? 'waiting' : 'syncing'}`,
  };
}

/** Each service's status; a service that didn't answer is null or absent */
export type ServiceStatuses = Readonly<
  Partial<Record<ConnectionService, ConnectionStatus | null>>
>;

/** Plex first, then the services in their own order */
function appLines(
  plex: WebhookStatus | null,
  services: ServiceStatuses,
): ReadonlyArray<AppLine> {
  const lines: AppLine[] = [];
  if (plex?.connected) {
    const state = plexStateOf(plex);
    lines.push({
      broken: state === 'broken',
      words: `Plex ${plexWord(state)}`,
    });
  }
  for (const id of CONNECTION_SERVICES) {
    const status = services[id];
    if (status?.connected) {
      lines.push(serviceLine(connectedService(id).name, status));
    }
  }
  return lines;
}

/**
 * The Connected apps summary for the Settings menu and header. `broken`
 * outranks the count: what needs the viewer comes first.
 */
export type ConnectedAppsSummary =
  | Readonly<{ kind: 'none' }>
  | Readonly<{ kind: 'one'; words: string }>
  | Readonly<{ count: number; kind: 'count' }>
  | Readonly<{ kind: 'broken'; more: number; words: string }>;

export function connectedAppsSummary(
  plex: WebhookStatus | null,
  services: ServiceStatuses,
): ConnectedAppsSummary {
  const lines = appLines(plex, services);
  const broken = lines.filter((line) => line.broken);
  const [first] = broken;
  if (first) {
    return { kind: 'broken', more: broken.length - 1, words: first.words };
  }
  const [only] = lines;
  if (lines.length === 1 && only) {
    return { kind: 'one', words: only.words };
  }
  return lines.length === 0
    ? { kind: 'none' }
    : { count: lines.length, kind: 'count' };
}

/** The summary in words; `none` invites ("Plex, Netflix and more") */
export function connectedAppsText(summary: ConnectedAppsSummary): string {
  switch (summary.kind) {
    case 'none':
      return connectableAppsLine();
    case 'one':
      return summary.words;
    case 'count':
      return `${summary.count} apps connected`;
    case 'broken':
      return summary.more > 0
        ? `${summary.words} · +${summary.more} more`
        : summary.words;
  }
}

/** "Plex, Netflix and more" past two names */
export function connectableAppsLine(): string {
  const names = [
    'Plex',
    ...CONNECTION_SERVICES.map((id) => connectedService(id).name),
  ];
  return names.length > 2
    ? `${names.slice(0, 2).join(', ')} and more`
    : new Intl.ListFormat('en-GB', { type: 'disjunction' }).format(names);
}
