import episodePath from '@/lib/routing/episodePath';
import showPath from '@/lib/routing/showPath';

/** An episode's own page: the show with its episode sheet open (`?season=N&episode=M`) */
export const episodeHref = (
  show: Readonly<{ seriesId: number; slug: string }>,
  season: number,
  episode: number,
) => episodePath(showPath(show.seriesId, show.slug), season, episode);
