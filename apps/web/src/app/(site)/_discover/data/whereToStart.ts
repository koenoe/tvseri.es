import 'server-only';

import type { WhereToStart, WhereToStartPick } from '@tvseri.es/schemas';
import { cacheTag } from 'next/cache';

import { apiFetch } from '@/lib/api/client';
import { tags } from '@/lib/cache/tags';
import {
  cacheLifeFor,
  isUnavailable,
  tryApi,
  type Unavailable,
} from '@/lib/cache/unavailable';

/** One Where to start card (genre, theme, country) */
export type StartPick = Readonly<{
  kind: WhereToStartPick['kind'];
  /** The numeric line from the API ("4 episodes, 4h 8m in all") */
  why: string;
  id: number;
  slug: string;
  title: string;
  poster: string | null;
  year: number | null;
  episodes: number;
  seasons: number;
  totalMinutes: number | null;
  /** The network TMDB lists first (Country's meta line), null when none */
  network: string | null;
  /** The next best for its slot, for a page that shows the pick above (`fillStartSlots`) */
  backup: boolean;
}>;

/** Which landing the picks are for: a genre or theme slug, or an ISO country */
export type StartFor = 'country' | 'genre' | 'theme';

/**
 * A landing's Where to start picks (`GET /duration/where-to-start`):
 * a night, a weekend and the long haul (a country's first is its favourite),
 * any of them left out when nothing fits, then the backups (`backup`, the
 * next best per slot). Draw them through `fillStartSlots`. Computed from
 * TMDB on a cold call, so only ever called here (cached `medium`, like the
 * API).
 */
export async function getWhereToStart(
  by: StartFor,
  value: string,
): Promise<ReadonlyArray<StartPick> | Unavailable> {
  'use cache';
  cacheTag(tags.whereToStart(by, value));

  const response = await tryApi(() =>
    apiFetch<WhereToStart>('/duration/where-to-start', {
      query: { [by]: value },
    }),
  );
  cacheLifeFor('medium', response);
  if (isUnavailable(response)) {
    return response;
  }
  // A show is picked once (an older API answer could name one twice)
  const seen = new Set<number>();
  const candidates = [
    ...response.picks.map((pick) => ({ ...pick, backup: false })),
    ...(response.backups ?? []).map((pick) => ({ ...pick, backup: true })),
  ].filter(({ show }) => !seen.has(show.id) && seen.add(show.id));
  return candidates.map(({ backup, kind, show, why }) => ({
    backup,
    episodes: show.numberOfEpisodes,
    id: show.id,
    kind,
    network: show.network?.name ?? null,
    poster: show.posterImage || null,
    seasons: show.numberOfSeasons,
    slug: show.slug,
    title: show.title,
    totalMinutes: show.totalMinutes,
    why,
    year: show.year,
  }));
}
