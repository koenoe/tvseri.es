import { Children, isValidElement, type ReactNode } from 'react';

import RowArrows from './RowArrows';
import RowFrame from './RowFrame';
import RowHeader, { type RowHeading } from './RowHeader';
import RowScrollRestore from './RowScrollRestore';
import type { RowInset, RowLook, RowTiles } from './rowLayout';

type Props = RowHeading &
  Readonly<{
    /** the tiles; each is wrapped in its own `li` */
    children: ReactNode;
    /** unique on the page: the DOM ids and the Back restore key derive from it */
    id: string;
    inset?: RowInset;
    /** a board's own tokens on the shared row (`ROW_LOOKS`) */
    look?: RowLook;
    /** the parity checks' name for this row (`data-slot`, `RowFrame`) */
    name?: string;
    /** desktop: after the subtitle (`RowHeader`) */
    note?: ReactNode;
    /**
     * A row switch: beside the title on desktop; on a phone its
     * own swipe line between the title and the cards. Rendered in
     * both places (one is display:none), so it must keep its state outside
     * itself (a context or the URL).
     */
    switcher?: ReactNode;
    tiles?: RowTiles;
  }>;

/**
 * The one horizontal row: a title-2 header with two round
 * arrows at its end, and a native scroll-snap rail with a peek at the right
 * edge and no scroll bar. A server component: touch and trackpads scroll
 * without JS; the arrows and the Back restore are two small islands.
 *
 * @example
 * <Row id="top-picks" title="Top Picks for November">
 *   {shows.map((show) => <PosterTile key={show.id} {...} />)}
 * </Row>
 */
/**
 * The rail: it clips its scroll box, so the tile hover's grow (`tileHover`)
 * needs room around the tiles: 24px above, 24 below, the gutters at the
 * ends. A row whose tiles start at its column's edge (`inset="column"`)
 * moves the clip out by `--row-bleed` and pads it back, so the first tile
 * stays where it was and its grow isn't cut.
 */
export const ROW_RAIL =
  'relative -ml-(--row-bleed,0px) flex snap-x snap-mandatory scroll-pr-(--row-end) scroll-pl-[calc(var(--row-start)+var(--row-bleed,0px))] items-start gap-(--row-gap) overflow-x-auto overscroll-x-contain scrollbar-none pt-[var(--row-rail-pt,24px)] pr-(--row-end) pb-6 pl-[calc(var(--row-start)+var(--row-bleed,0px))]';

/** A tile is the row's width, unless it sets its own (`data-own-width`: a numbered row's two-digit tiles) */
const ITEM =
  'w-(--row-tile) shrink-0 snap-start has-[>[data-own-width]]:w-auto';

export default function Row({
  children,
  id,
  inset = 'page',
  look,
  name,
  note,
  switcher,
  tiles = 'poster',
  ...heading
}: Props) {
  const titleId = `${id}-title`;
  const railId = `${id}-rail`;
  const items = Children.toArray(children).filter(isValidElement);
  // a numbered row is an ordered list: its rank is in each tile's name too
  const List = tiles === 'ranked' ? 'ol' : 'ul';
  return (
    <RowFrame
      inset={inset}
      look={look}
      name={name}
      tiles={tiles}
      titleId={titleId}
    >
      <RowHeader {...heading} note={note} switcher={switcher} titleId={titleId}>
        <RowArrows railId={railId} title={heading.title} />
      </RowHeader>
      {switcher ? (
        // title → switch 24, switch → cards 16 (the rail's 24 − 8)
        <div className="-mb-2 flex overflow-x-auto scrollbar-none pt-6 pr-(--row-end) pl-(--row-start) md:hidden">
          {switcher}
        </div>
      ) : null}
      <List className={ROW_RAIL} id={railId} role="list">
        {items.map((item) => (
          <li className={ITEM} key={item.key}>
            {item}
          </li>
        ))}
      </List>
      <RowScrollRestore railId={railId} restoreKey={id} />
    </RowFrame>
  );
}
