'use client';

import { plural } from '@tvseri.es/utils';
import { AnimatePresence } from 'motion/react';
import { useState } from 'react';
import { flushSync } from 'react-dom';
import { HEAD_LINK } from '@/app/(site)/u/[username]/_lib/headLink';
import ArmedMaxMotion from '@/components/motion/ArmedMaxMotion';
import FoldPresence from '@/components/motion/FoldPresence';
import { isMaxLoaded, loadMax } from '@/components/motion/useMaxFeatures';
import { chevronRightGlyph } from '@/components/ui/icon/glyphs';
import Icon from '@/components/ui/icon/Icon';
import SectionHead from '@/components/ui/section/SectionHead';
import cn from '@/lib/cn';
import { WIDE } from '@/lib/media/breakpoints';
import { matchesNow } from '@/lib/media/useMediaQuery';
import Legend from './Legend';
import { MonthAxis, MonthGrid } from './MonthAxis';
import {
  PHONE_ROWS,
  rowsToShow,
  type SortOrder,
  type TimelineRow,
  TOP_ROWS,
} from './model';
import QuarterScroller from './QuarterScroller';
import SortSwitch from './SortSwitch';
import TimelineRowView from './TimelineRowView';

/** The link that opens the rest of the shows in place */
function MoreLink({
  className,
  expanded,
  iconSize = 13,
  label,
  onIntent,
  onToggle,
}: Readonly<{
  className?: string;
  expanded: boolean;
  iconSize?: 12 | 13;
  label: string;
  /** A pointer down or focus before the press: Motion loads (wide only) */
  onIntent?: () => void;
  onToggle: () => void;
}>) {
  const classes = cn(HEAD_LINK, 'cursor-pointer', className);
  // a transition, so a tap mid-turn turns it straight back
  const iconClass = cn(
    'transition-transform duration-200 ease-out',
    expanded && '-rotate-90',
  );
  return (
    <button
      aria-controls="year-in-shows-rows"
      aria-expanded={expanded}
      className={classes}
      onClick={onToggle}
      onFocus={onIntent}
      onPointerDown={onIntent}
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
 * the rest of the shows behind "All 71 shows". A phone shows the year a
 * quarter at a time under an overview of all of it (`QuarterScroller`).
 * Gets only the trimmed row models; the server did the rules.
 */
export default function TimelineBoard({
  moreEpisodes,
  moreShows,
  opening,
  rows,
  total,
  year,
}: Readonly<{
  moreEpisodes: number;
  moreShows: number;
  /** The quarter a phone opens on (0 to 3) */
  opening: number;
  rows: ReadonlyArray<TimelineRow>;
  total: number;
  year: number;
}>) {
  const [order, setOrder] = useState<SortOrder>('watched');
  const [expanded, setExpanded] = useState(false);
  // The rows are plain until the first re-sort arms Motion (ArmedMaxMotion)
  const [armed, setArmed] = useState(false);
  // The rows past the top 20 fold in and out on a wide screen with Motion
  // in; a phone shows them at once, as it does the rows its CSS hid
  const [folds, setFolds] = useState(false);
  const shown = rowsToShow(rows, order, expanded);
  const hasMore = total > TOP_ROWS;
  const summary = `${moreShows} more series, ${plural(moreEpisodes, 'episode')}`;
  const desktopLabel = expanded ? `Top ${TOP_ROWS}` : `All ${total} series`;
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
  // Opening the rest waits for Motion on a wide screen, as a first re-sort
  // does, so the fold has its renderer; it never waits on a phone
  const toggle = () => {
    const flip = () => setExpanded((value) => !value);
    if (!matchesNow(WIDE)) {
      setFolds(false);
      flip();
      return;
    }
    if (armed) {
      setFolds(isMaxLoaded());
      flip();
      return;
    }
    void loadMax().finally(() => {
      flushSync(() => setArmed(true));
      setFolds(isMaxLoaded());
      flip();
    });
  };
  // Armed on the pointer down or focus before the press, so the rows'
  // switch to Motion and the re-sort render in two frames, not one
  const arm = () => {
    if (armed) {
      return;
    }
    if (isMaxLoaded()) {
      setArmed(true);
    } else {
      void loadMax();
    }
  };
  const sort = (
    <SortSwitch onChange={changeOrder} onIntent={arm} value={order} />
  );
  // the overview draws the lines a phone lists before "All 71"
  const overview = shown.filter((row) => row.rank < PHONE_ROWS);
  const scrollerLabel = `Series in ${year}, week by week`;

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
        <QuarterScroller
          label={scrollerLabel}
          opening={opening}
          overview={overview}
          year={year}
        >
          <MonthAxis year={year} />
          <div
            className="group/tl relative flex flex-col"
            id="year-in-shows-rows"
          >
            <MonthGrid year={year} />
            <ArmedMaxMotion armed={armed}>
              <AnimatePresence custom={folds} initial={false}>
                {shown.map((row) => {
                  const phoneHidden = !expanded && row.rank >= PHONE_ROWS;
                  const view = (
                    <TimelineRowView
                      key={row.id}
                      phoneHidden={phoneHidden}
                      row={row}
                    />
                  );
                  // only the rows past the top 20 come and go
                  return row.rank < TOP_ROWS ? (
                    view
                  ) : (
                    <FoldPresence appear={folds} key={row.id} whenAsked>
                      {view}
                    </FoldPresence>
                  );
                })}
              </AnimatePresence>
            </ArmedMaxMotion>
          </div>
        </QuarterScroller>
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
          <div className="flex items-center justify-between pt-1 md:px-2.5 md:pt-4">
            <span className="text-caption text-white/60">{footnote}</span>
            <MoreLink
              className="max-md:hidden"
              expanded={expanded}
              label={desktopLabel}
              onIntent={arm}
              onToggle={toggle}
            />
          </div>
        ) : null}
      </div>
    </section>
  );
}
