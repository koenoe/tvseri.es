import { regionName } from '@tvseri.es/utils';
import { plural } from '@/lib/format/text';
import { loadPlexStatus } from '../_data/plex';
import { getSettingsSession, getSettingsViewer } from '../_data/session';
import { plexStateOf } from '../_lib/plexState';
import type { SettingsSectionId } from '../_lib/sections';
import { importedEpisodes } from '../import/_lib/lastImport';
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
  return 'Netflix, Prime Video or any CSV';
}

async function PlexLine() {
  const { accessToken } = await getSettingsViewer();
  const status = await loadPlexStatus(accessToken);
  if (!status) {
    return 'Plex';
  }
  const state = plexStateOf(status);
  if (state === 'on' && status.connected && status.lastReceivedAt !== null) {
    return (
      <LocalMoment at={status.lastReceivedAt} prefix="Plex receiving · " />
    );
  }
  return {
    broken: 'Plex not working',
    none: 'Plex not connected',
    on: 'Plex receiving',
    paused: 'Plex paused',
    wait: 'Plex waiting',
  }[state];
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
    case 'plex':
      return <PlexLine />;
    case 'data':
      return 'Export or delete';
  }
}
