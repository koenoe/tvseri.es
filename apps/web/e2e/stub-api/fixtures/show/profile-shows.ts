import {
  catalogueShow as profileShowById,
  progressOf,
  seasonSizes,
  seededWatchedCount,
} from '../user-profile/pages-library.ts';
import { PEOPLE, type PersonName } from '../user-profile/people.ts';
import {
  addDays,
  findShow,
  type StubShow,
  syntheticShow,
  TODAY,
} from './catalog.ts';
import { setSeriesSeeder, toWatchedItem, VIEWERS } from './store.ts';

const DAY = 86_400_000;

/**
 * The profile fixtures' shows (Library, overview) as markable shows, so N on
 * a tile or a row marks through the same routes as the show page: one
 * episode a week, the aired ones (the Library's `progress.aired`) ending
 * before today and the rest after it. The show fixture's own shows win.
 */
export const profileStubShow = (id: number): StubShow | undefined => {
  const show = findShow(id) ? undefined : profileShowById(id);
  if (!show) {
    return undefined;
  }
  const { aired } = progressOf(show);
  return syntheticShow({
    id,
    originalTitle: show.title,
    poster: show.poster.split('/').pop() ?? '',
    ratingValue: 8,
    ratingVotes: 1000,
    sizes: seasonSizes(show),
    slug: show.slug || `show-${id}`,
    // episode `aired` (0-based) airs 3 days from today, the one before 4 days ago
    startDate: addDays(TODAY, 3 - aired * 7),
    status: show.status,
    title: show.title,
  });
};

const isPerson = (name: string): name is PersonName => name in PEOPLE;

// The profile's people start each of their Library's shows where the Library
// says they are (`seededWatchedCount`): N marks the episode after the tile's,
// and the Library, the overview and the marking routes agree.
setSeriesSeeder((owner, seriesId) => {
  const show = profileStubShow(seriesId);
  if (!show || !isPerson(owner)) {
    return [];
  }
  const { id: userId } = VIEWERS[owner];
  return show.episodes
    .slice(0, seededWatchedCount(owner, seriesId))
    .map((episode) =>
      toWatchedItem(
        show,
        episode,
        userId,
        { watchedAt: Date.parse(`${episode.airDate}T21:00:00.000Z`) + DAY },
        null,
      ),
    );
});
