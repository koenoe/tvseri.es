import type { EpisodePerson } from '@tvseri.es/schemas';
import slugify from 'slugify';
import { failedJson, notFoundJson, publicJson } from '@/app/api/cacheHeaders';
import { isSeriesId } from '@/app/api/handlers';
import { isUnavailable } from '@/lib/cache/unavailable';
import { toEpisodeModalCredits } from '@/lib/series/episodeCredits';
import {
  loadEpisodeWithCredits,
  loadSeriesCredits,
} from '@/lib/series/loaders';

const SEASON = /^\d{1,3}$/;
const EPISODE = /^\d{1,4}$/;

/**
 * A guest star or crew member with the person page's slug, made by the API's
 * own rule (`normalizePersons`): the modal links straight to the canonical
 * URL. Here, not in the modal's module, so slugify stays out of the browser.
 */
const withSlug = (person: EpisodePerson) => ({
  ...person,
  slug: slugify(person.name, { lower: true, strict: true }),
});

type Params = Readonly<{ id: string; season: string; episode: string }>;

/**
 * An episode's guest stars and crew plus the show's regulars, for the
 * episode modal: public, CDN-cached like the API's `short` profile, trimmed
 * to `EpisodeModalCredits`. The regulars are best effort: without them the
 * modal still has the episode's own credits.
 */
export async function GET(
  _req: Request,
  { params }: Readonly<{ params: Promise<Params> }>,
) {
  const { episode, id, season } = await params;
  if (!isSeriesId(id) || !SEASON.test(season) || !EPISODE.test(episode)) {
    return notFoundJson();
  }
  const seriesId = Number(id);
  try {
    const [details, regulars] = await Promise.all([
      loadEpisodeWithCredits(seriesId, Number(season), Number(episode)),
      loadSeriesCredits(seriesId).catch(() => null),
    ]);
    const credits = isUnavailable(regulars) ? null : regulars;
    if (!details) {
      return notFoundJson('short');
    }
    const episodeCredits = {
      credits: {
        crew: details.credits.crew.map(withSlug),
        guestStars: details.credits.guestStars.map(withSlug),
      },
    };
    return publicJson(
      toEpisodeModalCredits(episodeCredits, credits?.cast ?? []),
      {
        life: credits ? 'short' : 'no-store',
      },
    );
  } catch {
    return failedJson();
  }
}
