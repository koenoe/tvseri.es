import type { LibraryShelf } from '@tvseri.es/schemas';
import { FLAT } from '@/components/ui/ghost/ghosts';
import {
  checkGlyph,
  chevronDownGlyph,
  heartGlyph,
  searchGlyph,
  sortGlyph,
  sparkleGlyph,
} from '@/components/ui/icon/glyphs';
import Icon from '@/components/ui/icon/Icon';
import OwnerVisitor from '@/components/ui/viewer/OwnerVisitor';
import cn from '@/lib/cn';

import { SHELVES, sortLabel, sortsOf } from '../_lib/shelves';
import { FIRST_PAGE } from './gridStyles';
import TileGhosts from './TileGhosts';
import { CHIP, FIELD, PILL } from './toolbarStyles';

/** A control still to come: a flat shape its unseen label sizes */
const flat = (className: string) => cn(className, FLAT);

const CHIP_GHOST = flat(CHIP);
const PILL_GHOST = flat(PILL);
const SEARCH_GHOST = flat(cn(PILL, 'px-2.5 md:hidden'));
const FIELD_GHOST = flat(cn(FIELD, 'max-md:hidden'));

/** A visitor's filter chip: a flat pill as wide as the chip with a short count */
function ChipGhost({ fresh }: Readonly<{ fresh: boolean }>) {
  return (
    <span className={CHIP_GHOST}>
      <Icon glyph={fresh ? sparkleGlyph : heartGlyph} size={13} />
      {fresh ? 'New to you' : 'You both'}
      <span className="w-4" />
    </span>
  );
}

/**
 * The toolbar before the page streams (no real-looking
 * controls in a skeleton): each control as a flat pill in its own box, sized
 * by its default label, unseen
 */
function ToolbarGhost({
  owner,
  shelf,
}: Readonly<{ owner: boolean; shelf: LibraryShelf }>) {
  const meta = SHELVES[shelf];
  const sort = sortsOf(shelf)[0] ?? 'az';
  const find = `Find in ${meta.label}`;
  return (
    <div
      className="flex flex-wrap items-center gap-2.5 animate-ghost"
      data-placeholder="library-toolbar"
    >
      <span className={PILL_GHOST}>
        <Icon glyph={sortGlyph} size={16} />
        {sortLabel(shelf, sort)}
        <Icon glyph={chevronDownGlyph} size={16} />
      </span>
      <span className={FIELD_GHOST}>
        <Icon glyph={searchGlyph} size={16} />
        {find}
      </span>
      {owner ? null : (
        <>
          <ChipGhost fresh />
          <ChipGhost fresh={false} />
        </>
      )}
      <span className="flex-1" />
      <span className={SEARCH_GHOST}>
        <Icon glyph={searchGlyph} size={16} />
      </span>
      {owner && meta.action ? (
        <span className={PILL_GHOST}>
          <Icon className="max-md:hidden" glyph={checkGlyph} size={16} />
          Select
        </span>
      ) : null}
    </div>
  );
}

/**
 * A shelf before the session's read lands: the toolbar
 * at its default label (yours with Select, someone else's with the filter
 * chips, chosen before paint) and 24 ghost tiles in the real grid.
 */
export default function ShelfSkeleton({
  shelf,
}: Readonly<{ shelf: LibraryShelf }>) {
  return (
    <div
      aria-hidden="true"
      className="flex flex-col gap-5 md:gap-7"
      data-placeholder="library-shelf"
      inert
    >
      <OwnerVisitor
        owner={<ToolbarGhost owner shelf={shelf} />}
        visitor={<ToolbarGhost owner={false} shelf={shelf} />}
      />
      <TileGhosts count={FIRST_PAGE} placeholder="library-grid" shelf={shelf} />
    </div>
  );
}
