import { formatGrouped } from '@tvseri.es/utils';

import { libraryPath } from '@/lib/routing/profilePath';
import HeadLink from '../../blocks/HeadLink';

const EMPTY =
  'shrink-0 whitespace-nowrap text-body-sm font-medium text-white/60';

/**
 * Pick one's way to the owner's watchlist shelf, where the
 * sidebar's Watchlist row was: "Watchlist ›", the count in its name only
 * (beside the title and the rule, a visible count doesn't fit the 300px
 * sidebar). An empty list is the word without a link (nothing to open);
 * a count that didn't load (`null`) leaves the name at "Watchlist".
 */
export default function WatchlistLink({
  count,
  username,
}: Readonly<{ count: number | null; username: string }>) {
  if (count === 0) {
    return <span className={EMPTY}>Watchlist</span>;
  }
  const href = libraryPath(username, 'watchlist');
  const label =
    count === null ? undefined : `Watchlist, ${formatGrouped(count)} series`;
  return (
    <HeadLink href={href} label={label}>
      Watchlist
    </HeadLink>
  );
}
