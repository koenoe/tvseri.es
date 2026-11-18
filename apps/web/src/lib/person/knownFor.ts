import type { Movie, PersonShow, TvSeries } from '@tvseri.es/schemas';
import { plural } from '@tvseri.es/utils';
import showPath from '@/lib/routing/showPath';

import { crewWork } from './shows';

/**
 * Known for: five posters, his most widely seen work.
 * TMDB's known-for titles and his shows (guest spots aside) are ranked
 * together by reach: TMDB's vote count weighed by his part in it, then his
 * episodes, popularity and id. Votes keep a soap with thousands of episodes
 * below the drama everyone saw; the weight keeps a two-episode part on a
 * giant below the role he is known for. Films stay in at full weight (shown,
 * never linked). A show tile says the character and the
 * episodes, a film "Film" and its year.
 */
const KNOWN_FOR_SIZE = 5;

/** A miniseries' run: from this many episodes his part counts in full */
const FULL_PART_EPISODES = 6;

/**
 * His part in a show, 0–1, squared so a part of one or two episodes counts
 * for little; a show TMDB lists without his credit counts in full.
 */
const partWeight = (episodes: number | undefined) =>
  episodes === undefined ? 1 : Math.min(1, episodes / FULL_PART_EPISODES) ** 2;

export type KnownForTile = Readonly<{
  id: number;
  title: string;
  poster: string;
  /** Shows only: films are not clickable */
  href?: string;
  line1: string;
  line2: string;
  aria: string;
}>;

const isShow = (item: TvSeries | Movie): item is TvSeries =>
  'firstAirDate' in item;

type Ranked = Readonly<{
  tile: KnownForTile;
  /** Votes weighed by his part */
  reach: number;
  /** His episodes (a film: none) */
  episodes: number;
  popularity: number;
}>;

/** The most reach first, then the bigger part, the more popular, the lower id (stable) */
const byReach = (a: Ranked, b: Ranked) =>
  b.reach - a.reach ||
  b.episodes - a.episodes ||
  b.popularity - a.popularity ||
  a.tile.id - b.tile.id;

const showRank = (
  tile: KnownForTile,
  votes: number,
  popularity: number,
  credit: PersonShow | undefined,
): Ranked => ({
  episodes: credit?.episodeCount ?? 0,
  popularity,
  reach: votes * partWeight(credit?.episodeCount),
  tile,
});

export function buildKnownFor(
  items: ReadonlyArray<TvSeries | Movie>,
  shows: ReadonlyArray<PersonShow>,
  size = KNOWN_FOR_SIZE,
): ReadonlyArray<KnownForTile> {
  const byId = new Map(shows.map((show) => [show.id, show]));
  const showTile = (
    id: number,
    title: string,
    slug: string,
    poster: string,
  ): KnownForTile => {
    const credit = byId.get(id);
    // behind the camera only: the Shows list's words ("Executive producer")
    const crewOnly = credit && !credit.isCast && credit.isCrew;
    const line1 = crewOnly
      ? crewWork(credit.crewJobs, credit.jobs)
      : credit?.characters.join(' / ') || credit?.role || '';
    const line2 = credit?.episodeCount
      ? plural(credit.episodeCount, 'episode')
      : credit?.year
        ? String(credit.year)
        : '';
    return {
      aria: [title, line1, line2].filter(Boolean).join(', '),
      href: showPath(id, slug),
      id,
      line1,
      line2,
      poster,
      title,
    };
  };

  const ranked: Ranked[] = [];
  for (const item of items) {
    if (!item.posterImage) continue;
    if (isShow(item)) {
      const credit = byId.get(item.id);
      ranked.push(
        showRank(
          showTile(item.id, item.title, item.slug, item.posterImage),
          Math.max(item.voteCount ?? 0, credit?.voteCount ?? 0),
          Math.max(item.popularity ?? 0, credit?.popularity ?? 0),
          credit,
        ),
      );
    } else {
      const year = item.releaseDate?.slice(0, 4) ?? '';
      ranked.push({
        episodes: 0,
        popularity: item.popularity ?? 0,
        reach: item.voteCount ?? 0,
        tile: {
          aria: [item.title, 'Film', year].filter(Boolean).join(', '),
          id: item.id,
          line1: 'Film',
          line2: year,
          poster: item.posterImage,
          title: item.title,
        },
      });
    }
  }

  const taken = new Set(
    ranked.filter((entry) => entry.tile.href).map((entry) => entry.tile.id),
  );
  for (const show of shows) {
    if (!show.posterImage || taken.has(show.id) || show.isGuest) continue;
    ranked.push(
      showRank(
        showTile(show.id, show.name, show.slug, show.posterImage),
        show.voteCount ?? 0,
        show.popularity ?? 0,
        show,
      ),
    );
  }

  return ranked
    .sort(byReach)
    .slice(0, size)
    .map((entry) => entry.tile);
}
