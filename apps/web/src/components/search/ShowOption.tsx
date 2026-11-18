import Image from 'next/image';
import { calendarGlyph } from '@/components/ui/icon/glyphs';
import MetaItem from '@/components/ui/meta/MetaItem';
import MetaRow from '@/components/ui/meta/MetaRow';
import WatchedOverlay from '@/components/ui/tile/WatchedOverlay';
import cn from '@/lib/cn';

import EnterChip from './EnterChip';
import OptionLink, { type OptionProps } from './OptionLink';
import { HOVER_RING, MARKED_RING, OPTION_PRESS } from './optionStyles';
import { SHOW } from './resultLayout';

const POSTER_SIZES = '(min-width: 768px) 144px, 33vw';

/** A show: the clean poster, its title and year (the poster grid). */
export default function ShowOption({ cell, marked, onChoose }: OptionProps) {
  const classes = cn('group', SHOW.tile, OPTION_PRESS);
  const posterClasses = cn(
    SHOW.poster,
    'bg-black/5 transition-shadow duration-120',
    marked ? MARKED_RING : HOVER_RING,
  );
  const titleClasses = cn(SHOW.title, 'truncate font-semibold text-rk-text');
  const yearClasses = cn(SHOW.year, 'text-rk-w64');

  return (
    <OptionLink
      cell={cell}
      className={classes}
      marked={marked}
      onChoose={onChoose}
    >
      <span className={posterClasses}>
        <Image
          alt=""
          className="rounded-8 object-cover"
          fill
          loading="eager"
          sizes={POSTER_SIZES}
          src={cell.image}
        />
        {/* the viewer's Watched label: from the library ids after hydration, so a result stays the same for everyone */}
        <span className="absolute top-1.5 left-1.5 z-2">
          {cell.kind === 'show' ? <WatchedOverlay id={cell.id} /> : null}
        </span>
        {marked ? (
          <EnterChip className="absolute top-1.5 right-1.5" overImage />
        ) : null}
      </span>
      <span className={titleClasses} title={cell.name}>
        {cell.name}
      </span>
      <MetaRow className={yearClasses} numbers="tabular">
        <MetaItem icon={calendarGlyph}>{cell.year}</MetaItem>
      </MetaRow>
    </OptionLink>
  );
}
