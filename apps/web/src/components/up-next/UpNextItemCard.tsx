import type { TvSeries, UpNextItem } from '@tvseri.es/schemas';
import type { ReactNode } from 'react';

import { historyGlyph } from '@/components/ui/icon/glyphs';

import UpNextBar from './UpNextBar';
import UpNextCard from './UpNextCard';
import UpNextProgress from './UpNextProgress';
import { itemLabel, lastWatchedLabel } from './upNextCopy';

/** What the card draws of the show itself (the rest is the item's) */
export type UpNextArt = Readonly<
  Pick<TvSeries, 'backdropImage' | 'titleTreatmentImage'>
>;

/**
 * The card of a show in progress, yours or someone else's: "Last watched …"
 * in the pill, the next episode in the glass bar with how far through the
 * season it is. The facts line, the controls and the link are the place's.
 */
export default function UpNextItemCard({
  actions,
  art,
  episodeEnd,
  facts,
  href,
  item,
  loading,
  now,
  tag,
}: Readonly<{
  actions?: ReactNode;
  /** null when the show's read failed: the card without pictures */
  art: UpNextArt | null;
  /** A control at the end of the bar's episode line */
  episodeEnd?: ReactNode;
  facts: ReactNode;
  href: string;
  item: UpNextItem;
  loading?: 'eager' | 'lazy';
  now: number;
  /** The place's tag, above the pill */
  tag?: ReactNode;
}>) {
  const last = lastWatchedLabel(item, now);
  const pill = last ? { glyph: historyGlyph, text: last } : null;
  const episodeTitle = item.episodeTitle ?? item.title;
  const label = itemLabel(item);
  const bar = (
    <UpNextBar code={item.code} end={episodeEnd} title={episodeTitle}>
      <UpNextProgress item={item} />
    </UpNextBar>
  );
  return (
    <UpNextCard
      actions={actions}
      backdrop={art?.backdropImage}
      bar={bar}
      facts={facts}
      href={href}
      label={label}
      loading={loading}
      logo={art?.titleTreatmentImage}
      pill={pill}
      tag={tag}
      title={item.title}
    />
  );
}
