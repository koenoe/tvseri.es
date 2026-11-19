import { plural, regionName } from '@tvseri.es/utils';

import { importedEpisodes } from '@/lib/import/lastImport';

import { loadConnectionStatuses } from '../_data/connections';
import { loadPlexStatus } from '../_data/plex';
import { getSettingsSession, getSettingsViewer } from '../_data/session';
import {
  connectedAppsSummary,
  connectedAppsText,
} from '../_lib/connectedAppsLine';
import { plexStateOf } from '../_lib/plexState';
import type { SettingsSectionId } from '../_lib/sections';
import LocalMoment from './LocalMoment';

const DAY = 24 * 60 * 60 * 1000;

async function ProfileLine() {
  const { user } = await getSettingsSession();
  return user.name ? `@${user.username} · ${user.name}` : `@${user.username}`;
}

async function ServicesLine() {
  const { user } = await getSettingsSession();
  const count = plural(user.watchProviders?.length ?? 0, 'service');
  return user.country ? `${count} · ${regionName(user.country)}` : count;
}

async function ImportLine() {
  const { user } = await getSettingsSession();
  const last = user.lastImport;
  // "Imported 1,834 episodes today" for a fresh import that wasn't undone;
  // the server can't know the viewer's day, so "today" means the last 24h.
  if (
    last &&
    !last.undoneAt &&
    !last.undoRequestedAt &&
    last.written > 0 &&
    Date.now() - last.createdAt < DAY
  ) {
    return `Imported ${plural(importedEpisodes(last), 'episode')} today`;
  }
  return 'Upload your CSV file';
}

async function ConnectedAppsLine() {
  const { accessToken } = await getSettingsViewer();
  const [plex, services] = await Promise.all([
    loadPlexStatus(accessToken),
    loadConnectionStatuses(accessToken),
  ]);
  const summary = connectedAppsSummary(plex, services);
  // Plex alone, receiving: when the last play arrived
  if (
    summary.kind === 'one' &&
    plex?.connected &&
    plexStateOf(plex) === 'on' &&
    plex.lastReceivedAt !== null
  ) {
    return <LocalMoment at={plex.lastReceivedAt} prefix="Plex receiving · " />;
  }
  return connectedAppsText(summary);
}

/** A row's state line, read inside its hole. */
export default function NavStateLine({
  id,
}: Readonly<{ id: SettingsSectionId }>) {
  switch (id) {
    case 'profile':
      return <ProfileLine />;
    case 'services':
      return <ServicesLine />;
    case 'import':
      return <ImportLine />;
    case 'connected-apps':
      return <ConnectedAppsLine />;
    case 'data':
      return 'Export or delete';
  }
}
