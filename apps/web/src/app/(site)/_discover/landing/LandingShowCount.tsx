import 'server-only';

import type { LandingType } from '@tvseri.es/constants';

import { seasonGlyph } from '@/components/ui/icon/glyphs';
import MetaItem from '@/components/ui/meta/MetaItem';
import { GHOST_LOOK } from '@/components/ui/row/RowGhosts';
import { isUnavailable } from '@/lib/cache/unavailable';
import cn from '@/lib/cn';

import { getLandingCount } from '../data/landingCount';
import { formatShows } from './format';
import type { PlaceholderLook } from './skeletons';

type Props = Readonly<{
  className?: string;
  slug: string;
  type: LandingType;
}>;

/**
 * "41,800 shows": a landing's count as a meta item, from its facts (cached,
 * so it is in the prerendered shell; a dashed outline of its size while
 * the API can't answer). Put it in `<Suspense fallback={<LandingShowCountSkeleton />}>`
 * inside the hero's `MetaRow`.
 */
export default async function LandingShowCount({
  className,
  slug,
  type,
}: Props) {
  const count = await getLandingCount(type, slug);
  if (isUnavailable(count)) {
    return <LandingShowCountSkeleton className={className} look="failed" />;
  }
  return count === null ? null : (
    <MetaItem className={className} icon={seasonGlyph}>
      {formatShows(count)}
    </MetaItem>
  );
}

/** The count's place: a bar of a five-digit count's width ("41,800 shows") */
export function LandingShowCountSkeleton({
  className,
  look = 'loading',
}: Readonly<{ className?: string; look?: PlaceholderLook }>) {
  const classes = cn(
    'block h-5 w-26 shrink-0 rounded-8',
    GHOST_LOOK[look],
    className,
  );
  return <span aria-hidden className={classes} />;
}
