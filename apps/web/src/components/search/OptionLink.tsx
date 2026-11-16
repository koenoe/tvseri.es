import type { MouseEvent, ReactNode } from 'react';

import TileLink from '@/components/ui/tile/TileLink';
import type { SearchCell } from '@/lib/search/sections';

import { optionId } from './optionStyles';

export type OptionProps = Readonly<{
  cell: SearchCell;
  marked: boolean;
  onChoose: (cell: SearchCell, event: MouseEvent<HTMLAnchorElement>) => void;
}>;

/**
 * A result's link as the listbox's option: its id (the input's
 * `aria-activedescendant`), selected while marked, out of the tab order
 * (the arrows move the mark). Each option draws its own inside.
 */
export default function OptionLink({
  cell,
  children,
  className,
  marked,
  onChoose,
}: OptionProps & Readonly<{ children: ReactNode; className: string }>) {
  const choose = (event: MouseEvent<HTMLAnchorElement>) =>
    onChoose(cell, event);
  return (
    <TileLink
      aria-selected={marked}
      className={className}
      href={cell.href}
      id={optionId(cell.key)}
      onClick={choose}
      // results never prefetch in view (they change per keystroke); intent does
      prefetchOn="intent"
      role="option"
      tabIndex={-1}
    >
      {children}
    </TileLink>
  );
}
