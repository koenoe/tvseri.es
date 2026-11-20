import type { SeriesFacts, SeriesSummary } from '@tvseri.es/schemas';
import { isOver } from '@tvseri.es/utils';

/** What a meta line on a list of shows needs, from the show's facts */
export const toSeriesSummary = (facts: SeriesFacts): SeriesSummary => ({
  genreIds: facts.genreIds,
  id: facts.id,
  lastAirYear: facts.lastAirDate ? Number(facts.lastAirDate.slice(0, 4)) : null,
  networks: facts.networks,
  numberOfEpisodes: facts.numberOfEpisodes,
  numberOfSeasons: facts.seasons.length,
  over: isOver(facts),
  status: facts.status,
  totalMinutes: facts.totalRuntime,
  year: facts.firstAirDate ? Number(facts.firstAirDate.slice(0, 4)) : null,
});
