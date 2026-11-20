'use client';

import { firstEpisodeOf } from '@tvseri.es/utils';
import { type MouseEvent, memo, useCallback } from 'react';

import SwapIn from '@/components/motion/SwapIn';
import { PULSE, TextLine } from '@/components/ui/ghost/ghosts';
import type { ShowSeason } from '../../_lib/show';
import BeforeAsk from './BeforeAsk';
import ChipGrid, { ChipGridGhost } from './ChipGrid';
import { tally } from './chips';
import DateButton from './DateButton';
import DetailLine from './DetailLine';
import RunLabel from './RunLabel';
import SeasonToggles from './SeasonToggles';
import useSeasonSection from './useSeasonSection';

const COUNT_GHOST = `mr-auto ${PULSE}`;

/** Nothing to say (or an ask that hides itself) leaves no gap */
const FOOT = 'empty:hidden';

/**
 * `&season=N`: scrolls the sheet's body (only it, only vertically) to this
 * season. `scrollIntoView` would also scroll the dialog sideways while the
 * sheet slides in.
 */
const scrollToSection = (node: HTMLElement | null) => {
  let scroller = node?.parentElement ?? null;
  while (scroller && getComputedStyle(scroller).overflowY !== 'auto') {
    scroller = scroller.parentElement;
  }
  if (node && scroller) {
    scroller.scrollTop +=
      node.getBoundingClientRect().top - scroller.getBoundingClientRect().top;
  }
};

/**
 * Every answer to "before too?" takes the ask away with the button pressed,
 * so focus moves back to the chip it asked about rather than falling to the
 * page. Run on the answer's click, while the button is still there to say
 * focus was in the ask.
 */
const focusChipPastAsk = (
  event: MouseEvent<HTMLElement>,
  chipIndex: number,
) => {
  const slot = event.currentTarget;
  if (chipIndex < 0 || !slot.contains(document.activeElement)) {
    return;
  }
  slot
    .closest('section')
    ?.querySelector<HTMLElement>(`[data-chip="${chipIndex}"]`)
    ?.focus({ preventScroll: true });
};

/**
 * One season in the sheet: title, "9 of 10", the
 * calendar (one date for the season) and Mark / Unmark season, the chip grid
 * with its live run label, the inline "before too?" and the detail line of
 * the last chip touched here.
 */
function SeasonSection({
  initial,
  season,
}: Readonly<{ season: ShowSeason; initial: boolean }>) {
  const {
    ask,
    chips,
    dateSeason,
    episodes,
    handleCommit,
    handleTap,
    label,
    last,
    minutesOf,
    seeded,
    titles,
    toggleSeason,
  } = useSeasonSection(season);
  const { seasonNumber } = season;
  const first = firstEpisodeOf(season);
  const count = tally(chips);
  const lastChip = last
    ? chips.find((chip) => chip.ref.episodeNumber === last.episodeNumber)
    : undefined;
  const lastEpisode = last ? episodes.get(last.episodeNumber) : undefined;
  const calendarLabel = `When did you watch ${label}?`;
  const nothingAired = count.aired === 0;
  const detail = last && lastChip && !ask;
  const askChip = ask
    ? chips.findIndex((chip) => chip.ref.episodeNumber === ask.episodeNumber)
    : -1;
  const handOverFocus = useCallback(
    (event: MouseEvent<HTMLElement>) => focusChipPastAsk(event, askChip),
    [askChip],
  );

  return (
    <section
      aria-label={label}
      className="flex flex-col gap-3.5 rounded-16 bg-white/4 px-5 pt-6 pb-5 [contain-intrinsic-size:auto_160px] [content-visibility:auto] max-sm:gap-3 max-sm:p-3.5"
      ref={initial ? scrollToSection : undefined}
    >
      <div className="flex items-center gap-3.5 max-sm:gap-2.5">
        <b className="min-w-18 text-body-sm font-semibold">{label}</b>
        {seeded ? (
          <span className="mr-auto text-meta text-white/60 tabular-nums">
            {`${count.watched} of ${count.aired}`}
          </span>
        ) : (
          <span className={COUNT_GHOST}>
            <TextLine className="text-meta" width="w-12" />
          </span>
        )}
        <DateButton
          disabled={nothingAired}
          label={calendarLabel}
          onClick={dateSeason}
        />
        <SeasonToggles
          disabled={nothingAired}
          label={label}
          onToggle={toggleSeason}
          state={count.state}
        />
      </div>
      {seeded ? (
        <ChipGrid
          chips={chips}
          onCommit={handleCommit}
          onTap={handleTap}
          seasonNumber={seasonNumber}
          titles={titles}
        />
      ) : (
        <ChipGridGhost
          count={season.episodeCount}
          first={first}
          seasonNumber={seasonNumber}
        />
      )}
      <RunLabel
        chips={chips}
        minutesOf={minutesOf}
        seasonNumber={seasonNumber}
      />
      {/* the ask swaps in for the detail line (or for nothing) and back;
          a tap that only changes the detail plays nothing. A box-less
          wrapper, so an answer's click reaches the focus hand-over */}
      <div className="contents" onClick={handOverFocus}>
        <SwapIn className={FOOT} swapKey={ask ? 'ask' : 'detail'}>
          {ask ? (
            <BeforeAsk target={ask} />
          ) : detail ? (
            <DetailLine
              airDate={lastEpisode?.airDate}
              episode={last}
              state={lastChip.state}
              title={lastEpisode?.title}
            />
          ) : null}
        </SwapIn>
      </div>
    </section>
  );
}

const SeasonSectionMemo = memo(SeasonSection);
SeasonSectionMemo.displayName = 'SeasonSection';

export default SeasonSectionMemo;
