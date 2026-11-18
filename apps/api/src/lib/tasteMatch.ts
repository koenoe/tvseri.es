import type {
  LibraryIds,
  SeriesFacts,
  SharedShow,
  TasteLevel,
  TasteShow,
} from '@tvseri.es/schemas';
import { buildPosterImageUrl } from '@tvseri.es/utils';

/** Under this many shared shows there is no level yet */
const MIN_SHARED = 5;

type SharedRelation = SharedShow['relation'];

/** A shared show's weight: both favourited > both finished > anything else shared (both watching) */
const WEIGHTS: Readonly<Record<SharedRelation, number>> = {
  'both-favourite': 3,
  'both-finished': 2,
  'both-watching': 1,
};

/** The product's six fixed thresholds: the score a level starts at, and its ring fill */
const LEVELS: ReadonlyArray<
  Readonly<{ level: TasteLevel; from: number; arc: number }>
> = [
  { arc: 92, from: 80, level: 'super' },
  { arc: 78, from: 55, level: 'very-high' },
  { arc: 64, from: 35, level: 'high' },
  { arc: 48, from: 20, level: 'medium' },
  { arc: 30, from: 10, level: 'low' },
  { arc: 14, from: 0, level: 'very-low' },
];

type Taste = Readonly<{
  level: TasteLevel | null;
  arc: number;
  score: number;
  sharedCount: number;
  /** Strongest first, then by id: the same for both sides of the pair */
  sharedShowIds: ReadonlyArray<number>;
  /** The same shows with what the two have in common */
  sharedShows: ReadonlyArray<
    Readonly<{ id: number; relation: SharedRelation }>
  >;
}>;

const inLibrary = (ids: LibraryIds) =>
  new Set([...ids.watched, ...ids.inProgress, ...ids.favorites]);

/**
 * How much two libraries overlap. Symmetric: `taste(a, b)` equals
 * `taste(b, a)`. Weighs favourites and finished shows, not volume alone.
 */
export const computeTaste = (a: LibraryIds, b: LibraryIds): Taste => {
  const libraryB = inLibrary(b);
  const favoritesA = new Set(a.favorites);
  const favoritesB = new Set(b.favorites);
  const finishedA = new Set(a.watched);
  const finishedB = new Set(b.watched);

  const shared = [...inLibrary(a)]
    .filter((id) => libraryB.has(id))
    .map((id) => {
      const relation: SharedRelation =
        favoritesA.has(id) && favoritesB.has(id)
          ? 'both-favourite'
          : finishedA.has(id) && finishedB.has(id)
            ? 'both-finished'
            : 'both-watching';
      return { id, relation, weight: WEIGHTS[relation] };
    })
    .sort((x, y) => y.weight - x.weight || x.id - y.id);

  const score = shared.reduce((sum, show) => sum + show.weight, 0);
  const level =
    shared.length < MIN_SHARED
      ? null
      : (LEVELS.find((candidate) => score >= candidate.from) ?? null);

  return {
    arc: level?.arc ?? 0,
    level: level?.level ?? null,
    score,
    sharedCount: shared.length,
    sharedShowIds: shared.map((show) => show.id),
    sharedShows: shared.map(({ id, relation }) => ({ id, relation })),
  };
};

type NewToViewerPick = Readonly<{
  id: number;
  reason: NonNullable<TasteShow['reason']>;
}>;

/**
 * Shows in the owner's library that are in none of the viewer's lists (the
 * watchlist included), with why the owner has them: favourites first, then
 * finished, then the ones the owner is watching.
 */
export const newToViewerPicks = (
  viewer: LibraryIds,
  owner: LibraryIds,
): NewToViewerPick[] => {
  const seen = new Set([
    ...viewer.watched,
    ...viewer.inProgress,
    ...viewer.favorites,
    ...viewer.watchlist,
  ]);
  const picks: NewToViewerPick[] = [];
  const add = (
    ids: ReadonlyArray<number>,
    reason: NewToViewerPick['reason'],
  ) => {
    for (const id of ids) {
      if (!seen.has(id)) {
        seen.add(id);
        picks.push({ id, reason });
      }
    }
  };
  add(owner.favorites, 'favourite');
  add(owner.watched, 'finished');
  add(owner.inProgress, 'watching');
  return picks;
};

/** Shows `owner` favourited or finished that are in none of the viewer's lists */
export const newToViewer = (viewer: LibraryIds, owner: LibraryIds) =>
  newToViewerPicks(viewer, owner)
    .filter((pick) => pick.reason !== 'watching')
    .map((pick) => pick.id);

/**
 * A shared show's own facts for its You both watch row (first air year,
 * season count, first genre), from the facts the match already holds;
 * each left out when unknown.
 */
export const sharedShowLine = (
  facts: SeriesFacts,
): Pick<SharedShow, 'genreId' | 'seasonCount' | 'year'> => {
  const year = Number.parseInt(facts.firstAirDate.slice(0, 4), 10);
  const [genreId] = facts.genreIds;
  return {
    ...(genreId === undefined ? {} : { genreId }),
    ...(facts.seasons.length > 0 ? { seasonCount: facts.seasons.length } : {}),
    ...(Number.isNaN(year) ? {} : { year }),
  };
};

/** A show as the match card, the picks and the circle name it; null when TMDB doesn't know it */
export const toTasteShow = (
  id: number,
  facts: SeriesFacts | undefined,
): TasteShow | null =>
  facts
    ? {
        id,
        posterImage: facts.posterPath
          ? buildPosterImageUrl(facts.posterPath)
          : '',
        slug: facts.slug,
        title: facts.title,
      }
    : null;
