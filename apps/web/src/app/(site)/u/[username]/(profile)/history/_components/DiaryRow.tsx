'use client';

import * as m from 'motion/react-m';
import { memo, type ReactNode, useCallback, useId, useState } from 'react';
import CodeBadge from '@/components/ui/button/CodeBadge';
import MetaRow from '@/components/ui/meta/MetaRow';
import TileLink from '@/components/ui/tile/TileLink';
import cn from '@/lib/cn';
import { formatRuntime } from '@/lib/format/duration';
import type { DiaryRow as Row } from '../_lib/diary';
import BulkBadge from './BulkBadge';
import CountToggle, { RunChevron } from './CountToggle';
import DiaryEpisodes from './DiaryEpisodes';
import DiaryPoster, { DiaryGlow } from './DiaryPoster';
import { useDiaryLayout, useDiaryLayoutBump } from './diaryMotion';
import {
  DIARY_ROW,
  DIARY_ROW_ACTION_CELL,
  DIARY_ROW_END_CELL,
  DIARY_ROW_GRID,
  DIARY_ROW_GRID_PLUS,
  DIARY_ROW_META_CELL,
  DIARY_ROW_TEXT,
  DIARY_ROW_TITLE_CELL,
} from './diaryStyles';
import { episodeHref } from './episodeHref';

const TITLE = cn(
  'flex h-7 min-w-0 items-center gap-2.5 text-[20px] font-semibold leading-7 tracking-[-0.005em] max-md:h-6 max-md:text-[16px] max-md:leading-6 max-md:tracking-normal',
  DIARY_ROW_TITLE_CELL,
);

/** The code line: static, so a run's toggle covers the whole row */
const META = cn(
  'static h-6 gap-2 text-[14px] leading-5 text-white/85 max-md:text-[13px] max-md:leading-[18px]',
  DIARY_ROW_META_CELL,
);

/**
 * A run's range (`S01E10–S02E03`) gives way first where the code line is
 * short (a 360px phone): it ends in an ellipsis, the toggle stays whole
 */
const RANGE = 'block min-w-0 shrink truncate text-center leading-[22px]';

/** The runtime, a 22px figure (15px on a phone) */
const RUNTIME = cn(
  'whitespace-nowrap text-[22px] font-semibold leading-7 tabular-nums max-md:text-[15px] max-md:leading-6',
  DIARY_ROW_END_CELL,
);

/** The owner's ⋯ shows on hover (desktop only); a visitor's + always */
const HOVER_ACTION =
  'opacity-0 transition-opacity duration-160 group-hover/row:opacity-100 focus-within:opacity-100 has-[[aria-expanded=true]]:opacity-100 max-md:hidden';

/**
 * One show on one day, lit by its poster: poster, the show,
 * the code with the episode's title or "N episodes", the runtime and a 32px
 * slot. A one-episode row opens that episode; a run's "N episodes" opens
 * each episode (code, title, runtime) and its chevron fills the slot. The
 * page passes the ⋯ (`action`, shown on hover; not on a phone, where its
 * space goes to the title) and a visitor's tag. The ⋯ sits in the slot, or
 * on a run, where the chevron has it, before the runtime.
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
  const plus = Boolean(action) && actionAlways;
  const gridClasses = cn(DIARY_ROW_GRID, plus && DIARY_ROW_GRID_PLUS);
  const actionClasses = cn(
    'relative z-10 flex',
    DIARY_ROW_ACTION_CELL,
    !actionAlways && HOVER_ACTION,
  );
  const actionCell = action ? (
    <span className={actionClasses}>{action}</span>
  ) : null;
  // the slot: a single's ⋯, or a run's chevron (its ⋯ then before the runtime)
  const slot = single ? actionCell : <RunChevron open={open} />;
  const runAction = single ? null : actionCell;

  return (
    <m.div className={DIARY_ROW} data-diary-row {...layout}>
      <div className={gridClasses}>
        <DiaryPoster src={row.poster} />
        <span className={DIARY_ROW_TEXT}>
          <span className={TITLE}>
            {href ? (
              <TileLink
                className="truncate after:absolute after:inset-0"
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
          <MetaRow className={META}>
            <CodeBadge
              className={single ? undefined : RANGE}
              code={row.range}
              size="meta"
            />
            {single ? (
              row.title ? (
                <span className="truncate">{row.title}</span>
              ) : null
            ) : (
              <CountToggle
                controls={listId}
                count={row.episodes.length}
                onToggle={toggle}
                open={open}
                show={row.show}
              />
            )}
            {row.bulk ? <BulkBadge /> : null}
          </MetaRow>
        </span>
        <span className="flex items-center gap-5 max-md:contents">
          {runAction}
          {runtime ? <span className={RUNTIME}>{runtime}</span> : null}
        </span>
        {slot}
      </div>
      {/* after the grid: the row's first child stays its grid (the e2e reads it) */}
      <DiaryGlow src={row.poster} />
      {open ? <DiaryEpisodes id={listId} row={row} /> : null}
    </m.div>
  );
}

const MemoDiaryRow = memo(DiaryRow);
MemoDiaryRow.displayName = 'DiaryRow';

export default MemoDiaryRow;
