import { Ghost, PULSE, TextLine } from '@/components/ui/ghost/ghosts';
import SectionHead from '@/components/ui/section/SectionHead';
import PosterLink, {
  type PosterLinkLook,
} from '@/components/ui/tile/PosterLink';
import cn from '@/lib/cn';
import showPath from '@/lib/routing/showPath';
import {
  getPopular,
  getWatchedSeries,
  isUnavailable,
} from '@/lib/stats/loaders';
import StatsUnavailable from '../../../_components/StatsUnavailable';
import type { SectionProps } from '../types';
import AddToWatchlist from './AddToWatchlist';
import { POPULAR_SLOTS, popularMeta, unwatchedPopular } from './model';

const SIZES = '(min-width: 768px) 170px, 30vw';

// Each place keeps its own look on purpose; don't unify them.
/** The poster's link: no hover of its own (10px corners from the tile) */
const POPULAR_POSTER: PosterLinkLook = { link: 'block' };

/**
 * "Popular unwatched": the year's popular shows
 * the profile owner didn't watch. Everything is cached for every visitor;
 * only the `+` reads the viewer, on the client.
 */
export default async function PopularUnwatched({ user, year }: SectionProps) {
  const [popular, watched] = await Promise.all([
    getPopular(year),
    getWatchedSeries(user.id, year),
  ]);
  if (isUnavailable(popular) || isUnavailable(watched)) {
    return (
      <StatsUnavailable
        placeholder={<PopularUnwatchedSkeleton />}
        title={'Popular unwatched'}
      />
    );
  }
  const items = unwatchedPopular(
    popular,
    watched.map((series) => series.id),
  );
  if (items.length === 0) {
    return null;
  }
  return (
    <section
      aria-labelledby="stats-popular-title"
      className="flex flex-col gap-6"
    >
      <SectionHead id="stats-popular-title" title="Popular unwatched" />
      <div className="grid grid-cols-3 gap-3 md:grid-cols-5 md:gap-4">
        {items.map((series) => {
          const href = showPath(series.id, series.slug);
          return (
            <div
              className="relative flex min-w-0 flex-col gap-2.5 [--tile-radius:10px]"
              key={series.id}
            >
              <PosterLink
                href={href}
                label={series.title}
                look={POPULAR_POSTER}
                poster={series.posterImage}
                sizes={SIZES}
                title={series.title}
              />
              <AddToWatchlist seriesId={series.id} title={series.title} />
              <span className="flex min-w-0 flex-col gap-2">
                <span
                  className="truncate font-semibold text-body-sm"
                  title={series.title}
                >
                  {series.title}
                </span>
                <span className="text-[13px] text-white/60 leading-5 md:truncate">
                  {popularMeta(series)}
                </span>
              </span>
            </div>
          );
        })}
      </div>
    </section>
  );
}

export function PopularUnwatchedSkeleton() {
  const slots = Array.from({ length: POPULAR_SLOTS }, (_, index) => index);
  const frameClass = cn('flex flex-col gap-6', PULSE);
  return (
    <div aria-hidden className={frameClass}>
      <SectionHead id="stats-popular-skeleton" title="Popular unwatched" />
      <div className="grid grid-cols-3 gap-3 md:grid-cols-5 md:gap-4">
        {slots.map((slot) => (
          <div className="flex flex-col gap-2.5" key={slot}>
            <Ghost className="aspect-2/3 rounded-10" />
            <span className="flex h-[52px] flex-col">
              <TextLine className="text-body-sm" width="w-3/4" />
              <TextLine className="text-caption" width="w-1/2" />
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}
