import type { TvSeries } from '@tvseri.es/schemas';
import { formatRuntime, plural } from '@tvseri.es/utils';

import type { UpNextFact } from '@/components/up-next/upNextCopy';
import { seriesSeasons, statusLabel } from '@/lib/format/status';

/**
 * The profile's own Up next words: what a show is on someone else's
 * profile, and why an empty Up next borrows a pick. Your own next episode
 * speaks the shared card's words (`components/up-next/upNextCopy.ts`).
 */

/** What a seasons count reads like: "4 seasons", "3 seasons, complete" */
export function seasonsLabel(seasons: number, ended: boolean): string {
  const base = plural(seasons, 'season');
  return ended ? `${base}, complete` : base;
}

/** The visitor's facts line: what the show is, "4 seasons · Ended · 36h" */
export function visitorFacts(
  show: Pick<
    TvSeries,
    'numberOfEpisodes' | 'numberOfSeasons' | 'seasons' | 'status'
  >,
  runtimeMinutes: number | null,
): UpNextFact[] {
  const { airedSeasons, renewedSeason } = seriesSeasons(show);
  const total =
    runtimeMinutes && show.numberOfEpisodes > 0
      ? formatRuntime(runtimeMinutes * show.numberOfEpisodes)
      : null;
  const facts: Array<UpNextFact | null> = [
    airedSeasons > 0
      ? { kind: 'seasons', text: plural(airedSeasons, 'season') }
      : null,
    show.status
      ? {
          kind: 'status',
          text: statusLabel({ renewedSeason, status: show.status }),
        }
      : null,
    total ? { kind: 'total', text: total } : null,
  ];
  return facts.filter((fact): fact is UpNextFact => fact !== null);
}

/** "Finished by 3 people you follow" / "A favourite of 1 person you follow" */
export function circleLine(
  kind: 'favourite' | 'finished',
  people: number,
): string {
  const who = `${plural(people, 'person', 'people')} you follow`;
  return kind === 'favourite' ? `A favourite of ${who}` : `Finished by ${who}`;
}
