import type { TvSeries, UpNextItem } from '@tvseri.es/schemas';
import UpNextFacts from '@/components/up-next/UpNextFacts';
import UpNextItemCard from '@/components/up-next/UpNextItemCard';
import showPath from '@/lib/routing/showPath';

import NewToYouTag from '../../blocks/NewToYouTag';
import WatchlistAdd from '../../blocks/WatchlistAdd';
import { visitorFacts } from './heroCopy';

/**
 * Watching now: the same card, but the facts line says what the show is
 * ("4 seasons · Ended · 36h"), a green tag when the show is new to you, and
 * the ⋯ is a + to your own watchlist. It opens the show as your own does,
 * handing its art and logo over.
 */
export default function VisitorHero({
  isNew,
  item,
  now,
  series,
}: Readonly<{
  isNew: boolean;
  item: UpNextItem;
  now: number;
  series: TvSeries | null;
}>) {
  const facts = series ? (
    <UpNextFacts facts={visitorFacts(series, item.runtime)} />
  ) : null;
  const actions = (
    <WatchlistAdd
      className="bg-[rgb(15_20_20/0.35)]"
      seriesId={item.seriesId}
      title={item.title}
    />
  );
  // top left, above "Last watched …"
  const tag = isNew ? <NewToYouTag /> : null;
  const href = showPath(item.seriesId, item.slug);
  return (
    <UpNextItemCard
      actions={actions}
      art={series}
      facts={facts}
      href={href}
      item={item}
      loading="eager"
      morph
      now={now}
      tag={tag}
    />
  );
}
