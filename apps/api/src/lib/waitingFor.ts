import type {
  ListItem,
  SeriesFacts,
  WaitingFor,
  WaitingForItem,
} from '@tvseri.es/schemas';
import {
  DAY_MS,
  firstSeasonAfter,
  isOver,
  startOfDayUtc,
} from '@tvseri.es/utils';
import { getAllListItems } from '@/lib/db/list';
import { episodeKindOf } from '@/lib/episodeKind';
import { getSeriesFacts } from '@/lib/seriesFacts';

/** The season that is coming: an announced unaired one, else the one after the last aired */
const nextSeasonOf = (facts: SeriesFacts) => {
  const lastSeason = facts.lastEpisodeToAir?.seasonNumber ?? 0;
  return (
    firstSeasonAfter(
      facts.seasons.map((season) => season.seasonNumber),
      lastSeason,
    ) ?? lastSeason + 1
  );
};

/**
 * What each finished show is waiting for, from TMDB's current state: a dated
 * next episode (countdown), or renewed without a date. Ended and cancelled
 * shows are only counted. No history: "renewed" is just "returning, no date".
 */
const buildWaitingFor = (
  finished: ReadonlyArray<ListItem>,
  resumingSoon: ReadonlySet<number>,
  facts: ReadonlyMap<number, SeriesFacts>,
  now: number,
): WaitingFor => {
  const today = startOfDayUtc(now);
  const items: WaitingForItem[] = [];
  let endedCount = 0;

  for (const show of finished) {
    const showFacts = facts.get(show.id);
    if (!showFacts) continue;
    if (isOver(showFacts.status)) {
      endedCount++;
      continue;
    }

    const next = showFacts.nextEpisodeToAir;
    const base = {
      ...(show.createdAt && { finishedAt: show.createdAt }),
      posterImage: show.posterImage ?? '',
      resumingSoon: resumingSoon.has(show.id),
      seriesId: show.id,
      slug: show.slug,
      title: show.title,
    };

    items.push(
      next?.airDate
        ? {
            ...base,
            daysToGo: Math.max(
              0,
              Math.round((Date.parse(next.airDate) - today) / DAY_MS),
            ),
            nextDate: next.airDate,
            nextEpisode: next.episodeNumber,
            nextKind: episodeKindOf(next, showFacts.seasons),
            nextSeason: next.seasonNumber,
            state: 'dated',
          }
        : { ...base, nextSeason: nextSeasonOf(showFacts), state: 'renewed' },
    );
  }

  items.sort((a, b) =>
    a.state !== b.state
      ? a.state === 'dated'
        ? -1
        : 1
      : a.state === 'dated'
        ? (a.nextDate ?? '').localeCompare(b.nextDate ?? '')
        : (b.finishedAt ?? 0) - (a.finishedAt ?? 0),
  );

  return { endedCount, items };
};

// Finished shows looked at, most recently finished first (facts cost a TMDB
// call each on a cold cache); RESUMING_SOON shows are always included
const MAX_FINISHED = 150;

/** The viewer's "Waiting for" block */
export const getWaitingFor = async (userId: string) => {
  const [watched, resuming] = await Promise.all([
    getAllListItems({ listId: 'WATCHED', sortDirection: 'desc', userId }),
    getAllListItems({ listId: 'RESUMING_SOON', userId }),
  ]);

  const resumingIds = new Set(resuming.map((item) => item.id));
  const finished = [
    ...resuming,
    ...watched.filter((item) => !resumingIds.has(item.id)),
  ]
    .filter(
      (item, index, all) => all.findIndex((x) => x.id === item.id) === index,
    )
    .slice(0, Math.max(MAX_FINISHED, resuming.length));
  const byId = new Map(watched.map((item) => [item.id, item]));

  const facts = await getSeriesFacts(finished.map((item) => item.id));

  return buildWaitingFor(
    finished.map((item) => byId.get(item.id) ?? item),
    resumingIds,
    facts,
    Date.now(),
  );
};
