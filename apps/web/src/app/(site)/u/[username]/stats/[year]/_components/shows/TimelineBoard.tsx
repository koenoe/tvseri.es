'use client';

import { useState } from 'react';
import { flushSync } from 'react-dom';
import ArmedMaxMotion from '@/components/motion/ArmedMaxMotion';
import { loadMax } from '@/components/motion/useMaxFeatures';
import { chevronRightGlyph } from '@/components/ui/icon/glyphs';
import Icon from '@/components/ui/icon/Icon';
import SectionHead from '@/components/ui/section/SectionHead';
import cn from '@/lib/cn';
import { plural } from '@/lib/format/text';
import Legend from './Legend';
import { MonthAxis, MonthGrid } from './MonthAxis';
import {
  BOARD_ROWS,
  PHONE_ROWS,
  rowsToShow,
  type SortOrder,
  type TimelineRow,
} from './model';
import SortSwitch from './SortSwitch';
import TimelineRowView from './TimelineRowView';

/** The link that opens the rest of the shows in place */
function MoreLink({
  className,
  expanded,
  iconSize = 13,
  label,
  onToggle,
}: Readonly<{
  className?: string;
  expanded: boolean;
  iconSize?: 12 | 13;
  label: string;
  onToggle: () => void;
}>) {
  const classes = cn(
    'flex cursor-pointer items-center gap-1 whitespace-nowrap font-medium text-body-sm text-white/60',
    className,
  );
  const iconClass = expanded ? '-rotate-90' : undefined;
  return (
    <button
      aria-controls="year-in-shows-rows"
      aria-expanded={expanded}
      className={classes}
      onClick={onToggle}
      type="button"
    >
      {label}
      <Icon className={iconClass} glyph={chevronRightGlyph} size={iconSize} />
    </button>
  );
}

/**
 * The year in shows: the
 * sort control, the lane with the months, one row per show, the legend and
 * the rest of the shows behind "All 71 shows". Gets only the trimmed row
 * models; the server did the rules.
 */
export default function TimelineBoard({
  moreEpisodes,
  moreShows,
  rows,
  total,
  year,
}: Readonly<{
  moreEpisodes: number;
  moreShows: number;
  rows: ReadonlyArray<TimelineRow>;
  total: number;
  year: number;
}>) {
  const [order, setOrder] = useState<SortOrder>('watched');
  const [expanded, setExpanded] = useState(false);
  // The rows are plain until the first re-sort arms Motion (ArmedMaxMotion)
  const [armed, setArmed] = useState(false);
  const shown = rowsToShow(rows, order, expanded);
  const toggle = () => setExpanded((value) => !value);
  const hasMore = total > BOARD_ROWS;
  const summary = `${moreShows} more series, ${plural(moreEpisodes, 'episode')}`;
  const desktopLabel = expanded ? `Top ${BOARD_ROWS}` : `All ${total} series`;
  const phoneLabel = expanded ? `Top ${PHONE_ROWS}` : `All ${total}`;
  const footnote = expanded ? `Showing all ${total} series` : summary;
  // Motion's layout features load on the first re-sort; the order changes
  // once they are in (committed first, so that re-sort animates too), and
  // also when they failed to load: the sort never waits on an animation.
  const changeOrder = (next: SortOrder) => {
    if (armed) {
      // a load that failed is tried again; this sort doesn't wait for it
      void loadMax();
      setOrder(next);
      return;
    }
    void loadMax().finally(() => {
      flushSync(() => setArmed(true));
      setOrder(next);
    });
  };
  const sort = <SortSwitch onChange={changeOrder} value={order} />;

  return (
    <section
      aria-labelledby="year-in-shows-title"
      className="flex min-w-0 flex-col gap-6"
    >
      <SectionHead
        id="year-in-shows-title"
        link={<div className="hidden md:block">{sort}</div>}
        title="The year in series"
      />
      <div className="self-start md:hidden">{sort}</div>
      <div className="flex min-w-0 flex-col rounded-16 bg-black/22 px-3 py-3.5 md:px-2 md:pt-[18px] md:pb-3.5">
        <MonthAxis year={year} />
        <div
          className="group/tl relative mt-1.5 flex flex-col md:mt-0"
          id="year-in-shows-rows"
        >
          <MonthGrid year={year} />
          <ArmedMaxMotion armed={armed}>
            {shown.map((row) => {
              const phoneHidden = !expanded && row.rank >= PHONE_ROWS;
              return (
                <TimelineRowView
                  key={row.id}
                  phoneHidden={phoneHidden}
                  row={row}
                />
              );
            })}
          </ArmedMaxMotion>
        </div>
        <Legend>
          {hasMore ? (
            <MoreLink
              className="ml-auto text-body-sm md:hidden"
              expanded={expanded}
              iconSize={12}
              label={phoneLabel}
              onToggle={toggle}
            />
          ) : null}
        </Legend>
        {hasMore ? (
          <div className="hidden items-center justify-between px-2.5 pt-4 md:flex">
            <span className="text-caption text-white/60">{footnote}</span>
            <MoreLink
              expanded={expanded}
              label={desktopLabel}
              onToggle={toggle}
            />
          </div>
        ) : null}
      </div>
    </section>
  );
}
