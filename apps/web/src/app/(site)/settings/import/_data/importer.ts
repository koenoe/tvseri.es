import 'server-only';

import type { ListItem } from '@tvseri.es/schemas';

import { apiFetch } from '@/lib/api/client';
import { resolveRegion } from '@/lib/geo';

import { getSettingsSession, getSettingsViewer } from '../../_data/session';
import { loadRegionProviders } from '../../_data/watchProviders';
import { type UndoableImport, undoableImport } from '../_lib/lastImport';

/** A service the importer knows: the Service column's name and logo. */
export type ImportProvider = Readonly<{ name: string; logo: string }>;

/** Only what the importer's client code reads (props stay small). */
export type ImporterData = Readonly<{
  username: string;
  /** The region's services, in TMDB's order */
  providers: ReadonlyArray<ImportProvider>;
  /** The viewer's own shows for the wall behind the drop zone (≤ 12) */
  posters: ReadonlyArray<string>;
  /** The last import, when it can still be undone ("Your last import") */
  lastImport: UndoableImport | null;
}>;

const WALL = 12;

type Page = Readonly<{ items: ReadonlyArray<ListItem> }>;

const listPosters = async (
  userId: string,
  list: 'watched' | 'in_progress',
  accessToken: string,
): Promise<ReadonlyArray<string>> => {
  try {
    const page = await apiFetch<Page>('/user/:id/list/:list', {
      accessToken,
      params: { id: userId, list },
      query: { limit: WALL },
    });
    return page.items.map((item) => item.posterImage).filter(Boolean);
  } catch {
    // The wall is decoration: without it the drop zone stays neutral
    return [];
  }
};

const loadProviders = async (
  region: string,
): Promise<ReadonlyArray<ImportProvider>> => {
  try {
    const providers = await loadRegionProviders(region);
    return providers.map(({ logo, name }) => ({ logo, name }));
  } catch {
    return [];
  }
};

/**
 * What the importer needs from the server, read inside the section's hole:
 * the username (View history, Go to your profile), the region's services
 * (the Service column and "Same for all rows") and the viewer's own posters
 * (the wall behind the drop zone: finished shows first, then the ones in
 * progress), and the last import while it can still be undone. Per user,
 * so never in a shared cache.
 */
export async function loadImporter(): Promise<ImporterData> {
  // the posters need only the verified viewer: they start beside the
  // account read (`GET /me`), which the region waits for
  const { accessToken, id } = await getSettingsViewer();
  const lists = Promise.all([
    listPosters(id, 'watched', accessToken),
    listPosters(id, 'in_progress', accessToken),
  ]);
  const { user } = await getSettingsSession();
  const region = await resolveRegion(user);
  const [providers, [watched, inProgress]] = await Promise.all([
    loadProviders(region),
    lists,
  ]);
  const posters = [...new Set([...watched, ...inProgress])].slice(0, WALL);
  return {
    lastImport: undoableImport(user.lastImport),
    posters,
    providers,
    username: user.username,
  };
}
