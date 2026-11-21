import type { TvSeries, UpNextItem } from '@tvseri.es/schemas';
import type { MouseEventHandler, ReactNode } from 'react';

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
  backdropClassName,
  episodeEnd,
  facts,
  href,
  item,
  loading,
  now,
  onClick,
  onIntent,
  slide,
  tag,
}: Readonly<{
  actions?: ReactNode;
  /** null when the show's read failed: the card without pictures */
  art: UpNextArt | null;
  /** A tone on the backdrop (`UpNextCard`) */
  backdropClassName?: string;
  /** A control at the end of the bar's episode line */
  episodeEnd?: ReactNode;
  facts: ReactNode;
  href: string;
  item: UpNextItem;
  loading?: 'eager' | 'lazy';
  now: number;
  onClick?: MouseEventHandler<HTMLAnchorElement>;
  onIntent?: () => void;
  /** The line slides as the viewer marks (a hero's line) */
  slide?: boolean;
  /** The place's tag, above the pill */
  tag?: ReactNode;
}>) {
  const last = lastWatchedLabel(item, now);
  const pill = last ? { glyph: historyGlyph, text: last } : null;
  const episodeTitle = item.episodeTitle ?? item.title;
  const label = itemLabel(item);
  const bar = (
    <UpNextBar code={item.code} end={episodeEnd} title={episodeTitle}>
      <UpNextProgress item={item} slide={slide} />
    </UpNextBar>
  );
  return (
    <UpNextCard
      actions={actions}
      backdrop={art?.backdropImage}
      backdropClassName={backdropClassName}
      bar={bar}
      facts={facts}
      href={href}
      label={label}
      loading={loading}
      logo={art?.titleTreatmentImage}
      onClick={onClick}
      onIntent={onIntent}
      pill={pill}
      tag={tag}
      title={item.title}
    />
  );
}
