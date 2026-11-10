import type { ReactNode } from 'react';

import { CalendarOutlineIcon } from '@/components/Icons/CalendarOutlineIcon';
import { LayersIcon } from '@/components/Icons/LayersIcon';
import MetaItem from '@/components/MetaRow/MetaItem';
import MetaRow from '@/components/MetaRow/MetaRow';
import formatPlural from '@/utils/formatPlural';

/**
 * A show's line: year → seasons → genre(s). The genre slot is `children` (a
 * `GenreMetaItem`): last, because it's the only item of variable length, so
 * it's the one that truncates and year and seasons line up across cards.
 * 0 seasons is skipped.
 */
export default function ShowMeta({
  children,
  className,
  numberOfSeasons,
  releaseYear,
}: Readonly<{
  children?: ReactNode;
  className?: string;
  numberOfSeasons: number;
  releaseYear: string;
}>) {
  const seasons =
    numberOfSeasons > 0 ? formatPlural(numberOfSeasons, 'season') : null;

  return (
    <MetaRow className={className}>
      <MetaItem icon={CalendarOutlineIcon}>{releaseYear}</MetaItem>
      <MetaItem icon={LayersIcon}>{seasons}</MetaItem>
      {children}
    </MetaRow>
  );
}
