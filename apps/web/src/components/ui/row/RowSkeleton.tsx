import type { ReactNode } from 'react';

import type { Glyph } from '@/components/ui/icon/types';

import RowFrame from './RowFrame';
import RowGhosts, { type GhostCaption, TitleGhost } from './RowGhosts';
import RowHeader from './RowHeader';
import type { RowLook, RowTiles } from './rowLayout';

type Props = Readonly<{
  /** the lines under each tile, where the loaded tile has them (`RowGhosts`) */
  caption?: GhostCaption;
  /** the same id as the Row it stands in for */
  id: string;
  look?: RowLook;
  /** the parity checks' name for this row (`data-placeholder`) */
  name?: string;
  /** the row's subtitle, when it is static copy (desktop only, as `RowHeader` draws it) */
  subtitle?: string;
  subtitleGlyph?: Glyph;
  /** a placeholder for the row's switch, so the loaded row takes no more space */
  switcher?: ReactNode;
  tiles?: RowTiles;
  /** a tile's own ghost for each slot (`RowGhosts`), where the tile has structure (a card) */
  tileGhost?: ReactNode;
  /** known up front, so it shows straight away and doesn't change on load */
  title: string;
  /** the title's own ghost where it has structure (a logo beside the words) */
  titleContent?: ReactNode;
  /** the title comes with the data ("Because you watched Severance"): a bar the width of a typical one, in the title's line */
  titleGhost?: boolean;
}>;

/**
 * A row's loading fallback: the real header (no arrows yet: neither has the
 * loaded row before it's measured) over blank cards of the row's exact size.
 *
 * @example
 * <Suspense fallback={<RowSkeleton id="top-picks" title="Top Picks for November" />}>
 */
export default function RowSkeleton({
  caption,
  id,
  look,
  name,
  subtitle,
  subtitleGlyph,
  switcher,
  tiles = 'poster',
  tileGhost,
  title,
  titleContent,
  titleGhost,
}: Props) {
  const titleId = `${id}-title`;
  return (
    <RowFrame
      aria-busy
      inset="page"
      look={look}
      name={name}
      tiles={tiles}
      titleId={titleId}
    >
      <RowHeader
        subtitle={subtitle}
        subtitleGlyph={subtitleGlyph}
        switcher={switcher}
        title={title}
        titleContent={titleGhost ? <TitleGhost /> : titleContent}
        titleId={titleId}
      />
      {switcher ? (
        <div className="-mb-2 flex overflow-hidden pt-6 pr-(--row-end) pl-(--row-start) md:hidden">
          {switcher}
        </div>
      ) : null}
      <div className="pt-[var(--row-rail-pt,24px)] pb-6">
        <RowGhosts caption={caption} look="loading" tile={tileGhost} />
      </div>
    </RowFrame>
  );
}
