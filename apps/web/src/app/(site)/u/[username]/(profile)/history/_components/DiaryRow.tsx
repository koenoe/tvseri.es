'use client';

import * as m from 'motion/react-m';
import { memo, type ReactNode, useCallback, useId, useState } from 'react';
import CodeBadge from '@/components/ui/button/CodeBadge';
import { clockGlyph } from '@/components/ui/icon/glyphs';
import MetaItem from '@/components/ui/meta/MetaItem';
import MetaRow from '@/components/ui/meta/MetaRow';
import TileLink from '@/components/ui/tile/TileLink';
import cn from '@/lib/cn';
import { formatRuntime } from '@/lib/format/duration';
import type { DiaryRow as Row } from '../_lib/diary';
import BulkBadge from './BulkBadge';
import CountToggle from './CountToggle';
import DiaryEpisodes from './DiaryEpisodes';
import DiaryPoster from './DiaryPoster';
import { useDiaryLayout, useDiaryLayoutBump } from './diaryMotion';
import {
  DIARY_ROW,
  DIARY_ROW_ACTION_CELL,
  DIARY_ROW_END_CELL,
  DIARY_ROW_GRID,
  DIARY_ROW_META_CELL,
  DIARY_ROW_TEXT,
  DIARY_ROW_TITLE_CELL,
} from './diaryStyles';
import { episodeHref } from './episodeHref';

/**
 * One show on one day: poster, show,
 * the code or run with the episode's title or the total runtime, and on the
 * right the runtime or "N episodes ▾", which opens each episode (code,
 * title, runtime). A one-episode row opens that episode. The page passes
 * the ⋯ (`action`, shown on hover; not on a phone, where its space goes to
 * the title) and a visitor's tag.
 */
function DiaryRow({
  action,
  actionAlways = false,
  row,
  tag,
}: Readonly<{
  action?: ReactNode;
  /** The visitor's +: always shown (the owner's ⋯ shows on hover, desktop only) */
  actionAlways?: boolean;
  row: Row;
  tag?: ReactNode;
}>) {
  const [open, setOpen] = useState(false);
  const bump = useDiaryLayoutBump();
  const layout = useDiaryLayout();
  const listId = useId();
  const toggle = useCallback(() => {
    bump();
    setOpen((current) => !current);
  }, [bump]);
  const single = row.episodes.length === 1;
  const only = single ? row.episodes[0] : undefined;
  const href = only ? episodeHref(row, only.season, only.episode) : null;
  const runtime = formatRuntime(row.runtime);
  const classes = cn(DIARY_ROW, open && 'bg-white/7');
  const actionClasses = cn(
    'relative z-10 flex',
    DIARY_ROW_ACTION_CELL,
    !actionAlways &&
      'opacity-0 transition-opacity duration-160 group-hover/row:opacity-100 focus-within:opacity-100 has-[[aria-expanded=true]]:opacity-100 max-md:hidden',
  );
  const titleClasses = cn(
    'flex min-w-0 items-center gap-2.5 text-[15px] font-semibold leading-5 max-md:text-[14px]',
    DIARY_ROW_TITLE_CELL,
  );
  const metaClasses = cn('h-[22px] gap-3.5', DIARY_ROW_META_CELL);
  // a run's facts (total runtime, "Marked in one go") drop whole where the
  // line is short; one episode's title truncates instead (it is the point)
  const metaFit = single ? 'overflow' : 'drop';
  const endClasses = cn(
    'text-caption tabular-nums text-white/60',
    DIARY_ROW_END_CELL,
  );
  const gridClasses = cn(
    DIARY_ROW_GRID,
    // no transition: a background fading under a scrolling pointer repaints
    // every frame (the hover is instant too)
    !single && 'rounded-12 hover:bg-white/3',
  );

  return (
    <m.div className={classes} data-diary-row {...layout}>
      <div className={gridClasses}>
        <DiaryPoster src={row.poster} />
        <span className={DIARY_ROW_TEXT}>
          <span className={titleClasses}>
            {href ? (
              <TileLink
                className="truncate after:absolute after:inset-0 after:rounded-12"
                href={href}
                prefetchOn="intent"
              >
                {row.show}
              </TileLink>
            ) : (
              <span className="truncate">{row.show}</span>
            )}
            {tag ? <span className="relative z-10 shrink-0">{tag}</span> : null}
          </span>
          <MetaRow className={metaClasses} fit={metaFit}>
            <CodeBadge code={row.range} size="meta" />
            {row.title ? (
              <span className="truncate text-white/80">{row.title}</span>
            ) : null}
            {single ? null : (
              <MetaItem className="max-md:hidden" icon={clockGlyph}>
                {runtime}
              </MetaItem>
            )}
            {row.bulk ? <BulkBadge /> : null}
          </MetaRow>
        </span>
        <span className="flex items-center gap-2.5 max-md:contents">
          {single ? (
            runtime ? (
              <span className={endClasses}>{runtime}</span>
            ) : null
          ) : (
            <span className={DIARY_ROW_END_CELL}>
              <CountToggle
                controls={listId}
                count={row.episodes.length}
                onToggle={toggle}
                open={open}
                show={row.show}
              />
            </span>
          )}
          {action ? <span className={actionClasses}>{action}</span> : null}
        </span>
      </div>
      {open ? <DiaryEpisodes id={listId} row={row} /> : null}
    </m.div>
  );
}

const MemoDiaryRow = memo(DiaryRow);
MemoDiaryRow.displayName = 'DiaryRow';

export default MemoDiaryRow;
