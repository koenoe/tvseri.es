import type { UpNextItem } from '@tvseri.es/schemas';
import RowRemote from '@/components/remote/RowRemote';
import UpNextFacts from '@/components/up-next/UpNextFacts';
import UpNextItemCard, {
  type UpNextArt,
} from '@/components/up-next/UpNextItemCard';
import { ownerFacts } from '@/components/up-next/upNextCopy';
import {
  drawnComplete,
  FINISHED_ART,
} from '@/components/up-next/useFinishHold';
import showPath from '@/lib/routing/showPath';

/**
 * Your own Up next: the shared card with the ⋯ Remote; it opens the show.
 * Its line slides as you mark; `finishing` (your mark finished the show)
 * draws it complete and dims its art, before the next show takes its place.
 */
export default function OwnerHero({
  finishing = false,
  item: live,
  now,
  series,
}: Readonly<{
  finishing?: boolean;
  item: UpNextItem;
  now: number;
  series: UpNextArt | null;
}>) {
  const item = finishing ? drawnComplete(live) : live;
  const artTone = finishing ? FINISHED_ART : undefined;
  const factLines = ownerFacts(item, now);
  const facts = <UpNextFacts facts={factLines} />;
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
      backdropClassName={artTone}
      facts={facts}
      href={href}
      item={item}
      loading="eager"
      now={now}
      slide
    />
  );
}
