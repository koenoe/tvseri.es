import { PULSE } from '@/components/ui/ghost/ghosts';
import { GHOST_FILL } from '@/components/ui/row/RowGhosts';
import ServiceIcon, {
  type ServiceIconLayout,
} from '@/components/ui/service/ServiceIcon';
import cn from '@/lib/cn';
import { loadWatchProviders } from '@/lib/series/loaders';

import { loadContentRating } from '../../_data/loaders';
import { orFallback } from '../../_data/orFallback';
import { getViewerRegion } from '../../_data/region';
import { pickWhere } from './pickWhere';

/**
 * The end of the hero's meta row: the age rating in the viewer's region as
 * an outlined 28px box, then the service's 28px logo, 40px after the facts
 * (24px here plus the meta row's 16px gap). Desktop only (the phone row is
 * the facts alone). The logo says where to watch and is not a link (there
 * is no page for a service).
 * Nothing for what is missing.
 */
export default async function RatingAndProvider({
  seriesId,
}: Readonly<{ seriesId: number }>) {
  const found = await orFallback(
    getViewerRegion().then(async ({ region, services }) => {
      const [rating, stream] = await Promise.all([
        loadContentRating(seriesId, region),
        loadWatchProviders(seriesId, region),
      ]);
      return { rating, where: pickWhere({ stream }, services) };
    }),
    null,
    'age rating and where to watch',
  );
  if (!found || (!found.rating && !found.where)) {
    return null;
  }
  const { rating, where } = found;
  // rented or bought: dimmed
  const layout =
    where?.kind === 'rent' || where?.kind === 'buy' ? DIMMED : OWNED;
  const ratedTitle = `Rated ${rating}`;
  return (
    <span className="ml-6 flex gap-2 max-md:hidden" data-slot="rating-provider">
      {rating ? (
        <span
          className="flex size-7 min-w-7 w-auto items-center justify-center rounded-6 border border-white/60 px-1.5 text-[12px] leading-5 opacity-60"
          title={ratedTitle}
        >
          <span className="sr-only">Rated </span>
          {rating}
        </span>
      ) : null}
      {where ? (
        <ServiceIcon
          alt={where.text}
          layout={layout}
          logo={where.logo}
          title={where.text}
        />
      ) : null}
    </span>
  );
}

/** Each place keeps its own look on purpose; don't unify them. */
const OWNED: ServiceIconLayout = {
  className: 'block size-7 rounded-4',
  size: 28,
};
const DIMMED: ServiceIconLayout = {
  className: 'block size-7 rounded-4 opacity-55 grayscale-60',
  size: 28,
};

const RATING_PROVIDER_GHOST = cn('ml-6 flex gap-2 max-md:hidden', PULSE);
const RATING_GHOST = cn('h-7 w-[54px] rounded-6', GHOST_FILL);
const PROVIDER_GHOST = cn('size-7 rounded-4', GHOST_FILL);

/**
 * The rating and provider's space while they load: the box and the logo
 * where most shows have both. It is the last item of the row, so a show
 * without either leaves nothing to close up.
 */
export function RatingAndProviderSkeleton() {
  return (
    <span
      aria-hidden="true"
      className={RATING_PROVIDER_GHOST}
      data-placeholder="rating-provider"
    >
      <span className={RATING_GHOST} />
      <span className={PROVIDER_GHOST} />
    </span>
  );
}
