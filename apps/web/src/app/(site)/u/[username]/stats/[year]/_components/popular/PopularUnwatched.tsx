import Link from 'next/link';
import { Ghost, PULSE, TextLine } from '@/components/ui/ghost/ghosts';
import { chevronRightGlyph } from '@/components/ui/icon/glyphs';
import Icon from '@/components/ui/icon/Icon';
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
} from '../../_data/loaders';
import type { SectionProps } from '../types';
import StatsUnavailable from '../ui/StatsUnavailable';
import AddToWatchlist from './AddToWatchlist';
import {
  decadePath,
  POPULAR_SLOTS,
  popularMeta,
  unwatchedPopular,
} from './model';

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
        id="stats-popular"
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
  const more = (
    <Link
      className="hidden items-center gap-1 whitespace-nowrap font-medium text-body-sm text-white/60 md:flex"
      href={decadePath(year)}
    >
      More
      <Icon glyph={chevronRightGlyph} size={14} />
    </Link>
  );
  return (
    <section
      aria-labelledby="stats-popular-title"
      className="flex flex-col gap-6"
    >
      <SectionHead
        id="stats-popular-title"
        link={more}
        title="Popular unwatched"
      />
      <div className="grid grid-cols-3 gap-3 md:grid-cols-5 md:gap-4">
        {items.map((series) => (
          <div
            className="relative flex min-w-0 flex-col gap-2.5 [--tile-radius:10px]"
            key={series.id}
          >
            <PosterLink
              href={showPath(series.id, series.slug)}
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
        ))}
      </div>
    </section>
  );
}

export function PopularUnwatchedSkeleton() {
  const slots = Array.from({ length: POPULAR_SLOTS }, (_, index) => index);
  return (
    <div aria-hidden className={cn('flex flex-col gap-6', PULSE)}>
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
