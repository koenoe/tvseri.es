import type { PersonShows, SeriesFacts } from '@tvseri.es/schemas';
import { todayUtc } from '@tvseri.es/utils';
import { readThroughStale } from '@/lib/db/cache/readThroughStale';
import { getSeriesFactsReport } from '@/lib/seriesFacts';
import { fetchPersonCredits, fetchTvSeriesAggregateCredits } from '@/lib/tmdb';
import { TMDB_CONCURRENCY } from '@/lib/upstream/budget';
import { UpstreamUnavailableError } from '@/lib/upstream/errors';
import { mapSettled } from '@/utils/limit';
import { buildCareer, type CareerShowDetails, careerSeries } from './career';
import { findCollaborators } from './collaborators';
import {
  PERSON_FRESH,
  PERSON_KEEP,
  REFRESH_CLAIM_SECONDS,
  UNKNOWN_PERSON_FRESH,
} from './lifetime';
import {
  findUndatedOrFuture,
  mergePersonShows,
  type PersonTvCredits,
  type ShowDetails,
} from './shows';

/**
 * The person page's TMDB reads, built from data other pages share:
 *
 * - the person's TV credits are stored once per person
 *   (`person-credits:v3:<id>`, with their undated shows' status)
 *   and read by Shows, Career, Collaborators and the signed-in Watched line,
 *   which each run in their own Lambda;
 * - what a show's `/tv/:id` tells (status, air dates, seasons) comes from
 *   the shared series facts, which every profile, Library and landing read
 *   keeps warm, instead of one `/tv/:id` per show per person;
 * - only Collaborators' 15 `aggregate_credits` stay per person, stored with
 *   their result (PERSON_FRESH, lifetime.ts).
 *
 * With the shows' facts warm, a cold page of a prolific person costs the
 * credits, the person, the external ids, Known for's
 * search and the 15 aggregate credits.
 */

// At most this many undated or future shows are looked up for their status
const MAX_UPCOMING_LOOKUPS = 40;
// Career bars: a prolific host could otherwise mean hundreds of lookups; the
// biggest shows get their bars
const MAX_CAREER_LOOKUPS = 80;
// Collaborators are looked for in the person's biggest shows only (one call each)
const COLLABORATOR_SHOWS = 15;
// Above this share of shows without facts (TMDB failing), the answer is not
// built: a partial career would be stored as fresh (mapSettled's rule)
const MAX_FAILURE_RATIO = 0.1;

/** Shows' facts by id; throws when too many could not be had */
const factsOf = async (ids: ReadonlyArray<number>) => {
  const { facts, failed } = await getSeriesFactsReport(ids);
  if (failed.size > ids.length * MAX_FAILURE_RATIO) {
    // TMDB couldn't answer for them: "unavailable" (a 503 the web retries
    // in 30 s), not a bug (a 500)
    throw new UpstreamUnavailableError(
      'tmdb',
      10,
      `no facts for ${failed.size}/${ids.length} shows`,
    );
  }
  return facts;
};

/** What the merged credits read from a show's `/tv/:id` */
const toShowDetails = (facts: SeriesFacts): ShowDetails => ({
  first_air_date: facts.firstAirDate || null,
  status: facts.status,
});

/** What the career chart reads from a show's `/tv/:id` */
const toCareerDetails = (facts: SeriesFacts): CareerShowDetails => ({
  first_air_date: facts.firstAirDate || null,
  last_air_date: facts.lastAirDate || null,
  seasons: facts.seasons.map((season) => ({
    air_date: season.airDate || null,
    episode_count: season.episodeCount,
    season_number: season.seasonNumber,
  })),
  status: facts.status,
});

const mapValues = <T>(
  facts: ReadonlyMap<number, SeriesFacts>,
  to: (entry: SeriesFacts) => T,
) => new Map([...facts].map(([id, entry]) => [id, to(entry)] as const));

/** A person's credits and what `/tv/:id` said of their undated shows */
type StoredCredits = Readonly<{
  credits: PersonTvCredits;
  details: ReadonlyArray<readonly [number, ShowDetails]>;
}>;

/**
 * The person's TV credits with the status of their undated or upcoming
 * shows (from series facts), stored once per person and shared by Shows,
 * Career, Collaborators and the signed-in Watched line
 */
const personCredits = (id: number) =>
  readThroughStale<StoredCredits | null>(
    `person-credits:v3:${id}`,
    (stored) => (stored ? PERSON_FRESH : UNKNOWN_PERSON_FRESH),
    PERSON_KEEP,
    async () => {
      const credits = await fetchPersonCredits(id);
      if (!credits) {
        return null;
      }
      const undated = findUndatedOrFuture(credits, todayUtc()).slice(
        0,
        MAX_UPCOMING_LOOKUPS,
      );
      const facts = await factsOf(undated);
      return { credits, details: [...mapValues(facts, toShowDetails)] };
    },
    { singleFlightSeconds: REFRESH_CLAIM_SECONDS },
  );

/**
 * Cast and crew merged per show, "Self" appearances split out, no genre
 * drops (unlike `fetchPersonTvCredits`, which Home and Discover read).
 * Undefined for a person TMDB doesn't know.
 */
export const fetchPersonShows = async (
  id: number,
): Promise<PersonShows | undefined> => {
  const stored = await personCredits(id);
  return stored
    ? mergePersonShows(stored.credits, new Map(stored.details), todayUtc())
    : undefined;
};

/**
 * The Career chart: per series the first and last air year and the seasons'
 * years, from the shows' facts; stored in the Cache table (PERSON_FRESH).
 */
export const fetchPersonCareer = (id: number) =>
  readThroughStale(
    `person-career:v3:${id}`,
    PERSON_FRESH,
    PERSON_KEEP,
    async () => {
      const shows = await fetchPersonShows(id);
      if (!shows) {
        return undefined;
      }
      const series = [...careerSeries(shows)]
        .sort((a, b) => b.episodeCount - a.episodeCount)
        .slice(0, MAX_CAREER_LOOKUPS);
      const facts = await factsOf(series.map((show) => show.id));
      return buildCareer(
        shows,
        mapValues(facts, toCareerDetails),
        new Date().getUTCFullYear(),
      );
    },
    { singleFlightSeconds: REFRESH_CLAIM_SECONDS },
  );

/**
 * People in 2+ of the person's 15 biggest shows (intersected `aggregate_credits`),
 * stored in the Cache table (PERSON_FRESH).
 */
export const fetchPersonCollaborators = (id: number) =>
  readThroughStale(
    `person-collaborators:v3:${id}`,
    PERSON_FRESH,
    PERSON_KEEP,
    async () => {
      const shows = await fetchPersonShows(id);
      if (!shows) {
        return undefined;
      }
      const biggest = [...shows.shows]
        .sort((a, b) => b.episodeCount - a.episodeCount)
        .slice(0, COLLABORATOR_SHOWS);
      const credits = await mapSettled(
        biggest,
        async (show) => {
          const aggregate = await fetchTvSeriesAggregateCredits(show.id);
          return aggregate && { credits: aggregate, id: show.id };
        },
        TMDB_CONCURRENCY,
      );
      return { collaborators: findCollaborators(Number(id), credits) };
    },
    { singleFlightSeconds: REFRESH_CLAIM_SECONDS },
  );
