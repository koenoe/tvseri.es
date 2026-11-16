import type { PersonCollaborator } from '@tvseri.es/schemas';
import { buildProfileImageUrl } from '@tvseri.es/utils';
import slugify from 'slugify';

type AggregateEntry = Readonly<{
  id: number;
  name?: string;
  profile_path?: string | null;
  total_episode_count?: number;
  roles?: ReadonlyArray<
    Readonly<{ character?: string; episode_count?: number }>
  >;
  jobs?: ReadonlyArray<Readonly<{ job?: string; episode_count?: number }>>;
}>;

/** TMDB `/tv/:id/aggregate_credits` */
export type TmdbAggregateCredits = Readonly<{
  cast?: ReadonlyArray<AggregateEntry>;
  crew?: ReadonlyArray<AggregateEntry>;
}>;

// Replaced (not edited) as counts change; the maps are filled while tallying
type Tally = Readonly<{
  name: string;
  profilePath?: string | null;
  shows: Map<number, number>;
  castShows: number;
  characters: Map<string, number>;
  jobs: Map<string, Readonly<{ shows: number; episodes: number }>>;
}>;

/** As in the Shows list's "Self" split (`person/shows.ts`) */
const SELF_CHARACTER = /\b(self|himself|herself|themselves)\b/i;

/** How many people the route returns: the board shows 4-6 */
const MAX_COLLABORATORS = 12;

const bestJob = (jobs: Tally['jobs']) =>
  [...jobs].sort(
    ([, a], [, b]) => b.shows - a.shows || b.episodes - a.episodes,
  )[0]?.[0];

/**
 * People who are in 2+ of the given shows (cast or crew), most shows first.
 * `personId` himself is left out.
 */
export const findCollaborators = (
  personId: number,
  shows: ReadonlyArray<Readonly<{ id: number; credits: TmdbAggregateCredits }>>,
): PersonCollaborator[] => {
  const tallies = new Map<number, Tally>();

  /** The person's tally, with this credit's photo and `castShow` (0 or 1) added */
  const tallyFor = (entry: AggregateEntry, castShow: 0 | 1 = 0) => {
    const current: Tally = tallies.get(entry.id) ?? {
      castShows: 0,
      characters: new Map(),
      jobs: new Map(),
      name: entry.name ?? '',
      shows: new Map(),
    };
    const tally: Tally = {
      ...current,
      castShows: current.castShows + castShow,
      profilePath: current.profilePath ?? entry.profile_path,
    };
    tallies.set(entry.id, tally);
    return tally;
  };

  for (const { credits, id: showId } of shows) {
    const seenInCast = new Set<number>();
    const seenJobs = new Set<string>();

    for (const entry of credits.cast ?? []) {
      if (entry.id === personId) continue;
      const tally = tallyFor(entry, seenInCast.has(entry.id) ? 0 : 1);
      seenInCast.add(entry.id);
      for (const { character, episode_count = 0 } of entry.roles ?? []) {
        const name = character?.trim();
        // "Himself" on a talk show says nothing about them: skip self roles
        if (!name || SELF_CHARACTER.test(name)) continue;
        tally.characters.set(
          name,
          (tally.characters.get(name) ?? 0) + episode_count,
        );
      }
      tally.shows.set(
        showId,
        Math.max(tally.shows.get(showId) ?? 0, entry.total_episode_count ?? 0),
      );
    }

    for (const entry of credits.crew ?? []) {
      if (entry.id === personId) continue;
      const tally = tallyFor(entry);
      tally.shows.set(
        showId,
        Math.max(tally.shows.get(showId) ?? 0, entry.total_episode_count ?? 0),
      );
      for (const { episode_count = 0, job } of entry.jobs ?? []) {
        if (!job) continue;
        const key = `${entry.id}:${showId}:${job}`;
        const stat = tally.jobs.get(job) ?? { episodes: 0, shows: 0 };
        tally.jobs.set(job, {
          episodes: stat.episodes + episode_count,
          shows: stat.shows + (seenJobs.has(key) ? 0 : 1),
        });
        seenJobs.add(key);
      }
    }
  }

  return [...tallies]
    .filter(([, tally]) => tally.shows.size >= 2)
    .map(([id, tally]) => {
      const crewShows = Math.max(
        0,
        ...[...tally.jobs.values()].map((stat) => stat.shows),
      );
      const asCast = tally.castShows >= crewShows;
      // Their character with the most episodes across his shared shows, for
      // the face's caption ("Lois")
      const character = asCast
        ? [...tally.characters].sort(([, a], [, b]) => b - a)[0]?.[0]
        : undefined;
      return {
        ...(character && { character }),
        count: tally.shows.size,
        episodeCount: [...tally.shows.values()].reduce((a, b) => a + b, 0),
        id,
        image: tally.profilePath
          ? buildProfileImageUrl(tally.profilePath, 'w138_and_h175_face')
          : '',
        name: tally.name,
        role: asCast ? 'Actor' : (bestJob(tally.jobs) ?? 'Actor'),
        showIds: [...tally.shows.keys()],
        slug: slugify(tally.name, { lower: true, strict: true }),
      };
    })
    .sort(
      (a, b) =>
        b.count - a.count ||
        b.episodeCount - a.episodeCount ||
        a.name.localeCompare(b.name),
    )
    .slice(0, MAX_COLLABORATORS);
};
