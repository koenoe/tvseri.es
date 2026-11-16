import type { UpNextItem } from '@tvseri.es/schemas';
import UpNextFacts from '@/components/up-next/UpNextFacts';
import UpNextItemCard, {
  type UpNextArt,
} from '@/components/up-next/UpNextItemCard';
import { ownerFacts } from '@/components/up-next/upNextCopy';
import showPath from '@/lib/routing/showPath';

import RowRemote from '../../blocks/RowRemote';

/** Your own Up next: the shared card with the ⋯ Remote; it opens the show */
export default function OwnerHero({
  item,
  now,
  series,
}: Readonly<{ item: UpNextItem; now: number; series: UpNextArt | null }>) {
  const facts = <UpNextFacts facts={ownerFacts(item, now)} />;
  const action = (
    <RowRemote
      season={item.season}
      seriesId={item.seriesId}
      slug={item.slug}
      title={item.title}
    />
  );
  const href = showPath(item.seriesId, item.slug);
  return (
    <UpNextItemCard
      actions={action}
      art={series}
      facts={facts}
      href={href}
      item={item}
      loading="eager"
      now={now}
    />
  );
}
