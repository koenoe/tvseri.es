import { type MouseEvent, type ReactNode, use } from 'react';

import TileLink from '@/components/ui/tile/TileLink';
import type { SearchCell } from '@/lib/search/sections';

import { optionId } from './optionStyles';
import { WholeResult } from './wholeResult';

export type OptionProps = Readonly<{
  cell: SearchCell;
  marked: boolean;
  onChoose: (cell: SearchCell, event: MouseEvent<HTMLAnchorElement>) => void;
}>;

/**
 * A result's link as the listbox's option: its id (the input's
 * `aria-activedescendant`), selected while marked, out of the tab order
 * (the arrows move the mark). Each option draws its own inside. Its page
 * opens whole only once an arrow rests on it (`WholeResult`), never on a
 * hover: search counts its arrows alone.
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
  const id = optionId(cell.key);
  const opensWhole = marked && use(WholeResult) === cell.key;
  return (
    <TileLink
      aria-selected={marked}
      className={className}
      href={cell.href}
      id={id}
      onClick={choose}
      opensWhole={opensWhole}
      // results never prefetch in view (they change per keystroke); intent does
      prefetchOn="intent"
      role="option"
      tabIndex={-1}
    >
      {children}
    </TileLink>
  );
}
