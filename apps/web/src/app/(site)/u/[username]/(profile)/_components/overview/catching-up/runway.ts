import { type CatchingUpItem, parseEpisodeCode } from '@tvseri.es/schemas';
import { formatAirWeekdayDate } from '@/lib/format/airDate';
import { formatRuntime } from '@/lib/format/duration';
import { seasonCode, shortCode } from '@/lib/marking/copy';

/** One chip of the run: `E05` (always within one season) */
export type RunChip = Readonly<{
  code: string;
  label: string;
  season: number;
  episode: number;
  /** The hover line: "Watched up to E05 · 2h 52m left" */
  hint: string;
}>;

const parse = (code: string) => {
  const ref = parseEpisodeCode(code);
  return ref ? { episode: ref.episodeNumber, season: ref.seasonNumber } : null;
};

/** Four chips at most */
const MAX_RUN_CHIPS = 4;

/**
 * The widths the run is planned for: a lane (416px, so 284px
 * beside the poster), a 390 phone's (226px) and a 360 phone's (196px). A
 * container query on the run shows the plan for its width.
 */
const RUN_WIDE = 284;
const RUN_NARROW = 226;
const RUN_SMALL = 196;

/** A chip's width: 46px at least, 10px padding, 12px tabular digits */
const chipWidth = (label: string) => Math.max(46, 20 + label.length * 7.5);
const CHIP_GAP = 6;
/** "+N" sits beside the chips' group, 8px off */
const MORE_GAP = 8;
/** `.pr-run`: 8px either side of the 2px tick */
const TICK_WIDTH = 8 + 2 + 8;

/**
 * The minutes left once the episodes sent at `watched` (indices into
 * `episodes`) are watched: every waiting episode's time (`runtimeMinutes`)
 * less each watched one's own runtime (`episodeRuntimes`, the one rule of
 * `minutesFor`), never one runtime × the count. Null when a runtime it needs
 * is unknown.
 */
export function minutesLeftWithout(
  item: CatchingUpItem,
  watched: ReadonlyArray<number>,
): number | null {
  if (item.runtimeMinutes === null) {
    return null;
  }
  let left = item.runtimeMinutes;
  for (const index of watched) {
    const minutes = item.episodeRuntimes[index] ?? 0;
    if (minutes <= 0) {
      return null;
    }
    left -= minutes;
  }
  return Math.max(0, left);
}

/** The minutes left once the first `count` episodes sent are watched */
const minutesLeftAfter = (item: CatchingUpItem, count: number) =>
  minutesLeftWithout(
    item,
    Array.from({ length: count }, (_, index) => index),
  );

/**
 * The chips of a Catching up row and what each one's hover says:
 * the waiting episodes of the current season only, so a row never mixes
 * `E03` with `S02E01`. "Watched up to E05 · 2h 52m left" counts every
 * waiting episode by its own runtime; the run's very last one says "All
 * caught up before S06" (premiere ahead), "S05 done, S06 next" (it
 * premiered), "All caught up".
 */
export function runChips(item: CatchingUpItem): RunChip[] {
  const parsed = item.episodes.flatMap((code, sent) => {
    const ref = parse(code);
    return ref ? [{ code, sent, ...ref }] : [];
  });
  const first = parsed[0];
  const current = parsed.filter((ref) => ref.season === first?.season);
  const waiting = Math.max(item.waiting, parsed.length);
  return current.map(({ sent, ...ref }, index) => {
    const label = shortCode(ref.episode);
    const isLast = index === waiting - 1;
    const left = formatRuntime(minutesLeftAfter(item, sent + 1));
    const hint = isLast
      ? lastHint(item)
      : `Watched up to ${label}${left ? ` · ${left} left` : ''}`;
    return { ...ref, hint, label };
  });
}

/** The next season's chip after the tick: cyan, it is out */
export type RunNext = Readonly<{
  chip: string;
  chipTitle: string;
  hint: string;
  season: number;
  waiting: number;
}>;

export type RunPlan = Readonly<{
  /** The current season's chips the wide card shows (at most four) */
  chips: ReadonlyArray<RunChip>;
  /** How many of `chips` a narrow card (a 390 phone) shows */
  narrow: number;
  /** How many of `chips` a small card (a 360 phone) shows */
  small: number;
  /**
   * "+N": the rest of the current season (of the whole run when the API's
   * eight codes don't show where the season ends), in the wide, the narrow
   * and the small card; 0 when there is none
   */
  more: Readonly<{
    narrow: number;
    season: number;
    small: number;
    wide: number;
  }>;
  /** A later season with waiting episodes: the boundary, as the board draws it */
  next: RunNext | null;
}>;

/**
 * One row of chips, never wrapping: the current season's next
 * episodes, "+N" for the rest of it, then the tick and one season chip (the
 * next waiting season, else the premiere runway). As many chips as fit
 * beside the poster, up to four; a narrow card shows fewer.
 */
export function runPlan(item: CatchingUpItem): RunPlan {
  const chips = runChips(item);
  const parsed = item.episodes.flatMap((code) => {
    const ref = parse(code);
    return ref ? [ref] : [];
  });
  const later = parsed.find((ref) => ref.season !== chips[0]?.season);
  // where the current season ends is known once a later code shows up, or
  // when the API sent every waiting episode
  const seasonKnown = Boolean(later) || parsed.length >= item.waiting;
  const inSeason = seasonKnown ? chips.length : item.waiting;
  const laterWaiting = later ? item.waiting - chips.length : 0;
  const next: RunNext | null = later
    ? {
        chip: seasonCode(later.season),
        chipTitle: `Season ${later.season}: ${laterWaiting} ${laterWaiting === 1 ? 'episode' : 'episodes'} waiting`,
        hint: `${seasonCode(later.season)} next · ${laterWaiting} waiting`,
        season: later.season,
        waiting: laterWaiting,
      }
    : null;
  const tail =
    next?.chip ?? (item.runway ? seasonCode(item.runway.season) : null);
  const chipsFor = (width: number) => {
    for (let k = Math.min(MAX_RUN_CHIPS, chips.length); k > 1; k -= 1) {
      const rest = inSeason - k;
      const used =
        chips
          .slice(0, k)
          .reduce((sum, chip) => sum + chipWidth(chip.label), 0) +
        CHIP_GAP * (k - 1) +
        (rest > 0 ? MORE_GAP + chipWidth(`+${rest}`) : 0) +
        (tail ? TICK_WIDTH + chipWidth(tail) : 0);
      if (used <= width) {
        return k;
      }
    }
    return Math.min(1, chips.length);
  };
  const wide = chipsFor(RUN_WIDE);
  const narrow = chipsFor(RUN_NARROW);
  const small = chipsFor(RUN_SMALL);
  return {
    chips: chips.slice(0, wide),
    more: {
      narrow: Math.max(0, inSeason - narrow),
      season: chips[0]?.season ?? 0,
      small: Math.max(0, inSeason - small),
      wide: Math.max(0, inSeason - wide),
    },
    narrow,
    next,
    small,
  };
}

function lastHint(item: CatchingUpItem): string {
  const runway = item.runway;
  if (!runway) {
    return 'All caught up';
  }
  const next = seasonCode(runway.season);
  if (runway.state === 'out') {
    const current = parse(item.nextUp);
    return current
      ? `${seasonCode(current.season)} done, ${next} next`
      : `${next} next`;
  }
  return `All caught up before ${next}`;
}

export type RunwayView = Readonly<
  | {
      kind: 'upcoming';
      chip: string;
      chipTitle: string;
      hint: string;
      date: string;
      /** The date in pink: a day or less to go */
      tight: boolean;
      countdown: string;
    }
  | { kind: 'out'; chip: string; chipTitle: string; hint: string; date: string }
>;

/** The premiere chip and the line under the run */
export function runwayView(item: CatchingUpItem): RunwayView | null {
  const runway = item.runway;
  if (!runway) {
    return null;
  }
  const chip = seasonCode(runway.season);
  const day = formatAirWeekdayDate(runway.date);
  if (runway.state === 'out') {
    return {
      chip,
      chipTitle: `Season ${runway.season} is out`,
      date: `Premiered ${day}`,
      hint: `${chip} is out`,
      kind: 'out',
    };
  }
  const days = runway.daysToGo;
  return {
    chip,
    chipTitle: `Season ${runway.season} premieres ${day}`,
    countdown:
      days === 0
        ? 'The premiere is today'
        : `${days} ${days === 1 ? 'day' : 'days'} to the premiere`,
    date: day,
    hint: `${chip} premieres ${day}`,
    kind: 'upcoming',
    tight: days <= 1,
  };
}

/**
 * What tapping a chip marks: the chips up to and including it, in order,
 * and nothing else (no unmarking, no other episode). The chips are the
 * live run's (`liveCatchingUp`), so none is marked already and no date is
 * overwritten.
 */
export function refsUpTo(
  chips: ReadonlyArray<RunChip>,
  tapped: RunChip,
): Array<Readonly<{ episodeNumber: number; seasonNumber: number }>> {
  const end = chips.findIndex((chip) => chip.code === tapped.code);
  if (end === -1) {
    return [];
  }
  return chips.slice(0, end + 1).map((chip) => ({
    episodeNumber: chip.episode,
    seasonNumber: chip.season,
  }));
}
