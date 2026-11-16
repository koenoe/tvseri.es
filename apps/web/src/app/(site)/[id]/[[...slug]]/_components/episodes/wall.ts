import { shouldFold } from '@/lib/fold';
import { shortCode } from '@/lib/marking/copy';
import { codeOf } from '@/lib/marking/progress';
import { formatMonthYear } from './format';
import {
  fallbackRuntime,
  isWatchedMark,
  type MarkedEpisode,
  runtimeTotal,
} from './marks';

/**
 * The Focus wall's slotting: what you haven't
 * seen first. Next up is the Focus tile; the open and upcoming episodes
 * follow (Focus + 6, then "Show all N episodes", which shows every one of
 * them at once, never pages, not the board's windows of 9; it folds only when that hides more than 3, one row, or more than 2 on
 * a phone, so a short season shows whole); then the "N watched" heading with runs of 3+ watched folded into
 * stacks and the rest as compact tiles.
 */

/** Unwatched tiles shown before "Show all": 6 on desktop, 1 on a phone. */
const WALL_SHOW = 6;
const WALL_SHOW_PHONE = 1;
/** A run of this many watched episodes in a row folds into a stack. */
const STACK_MIN = 3;

export type WallView = Readonly<{
  /** "Show all" pressed: every open and upcoming episode, not the first 6. */
  expanded: boolean;
  /** Stacks opened with Show (keyed by their first episode number). */
  openStacks: ReadonlySet<number>;
}>;

export const INITIAL_WALL_VIEW: WallView = {
  expanded: false,
  openStacks: new Set(),
};

export type WallSlot = Readonly<
  | {
      kind: 'focus';
      key: string;
      item: MarkedEpisode;
      /** "6 left in Season 3 · 3h 46m": aired, open, not skipped. */
      left: number;
      leftMinutes: number;
    }
  | {
      kind: 'unwatched' | 'upcoming';
      key: string;
      item: MarkedEpisode;
      /** Folded away on a phone (only the first one shows there). */
      phoneHidden: boolean;
      /** Revealed by Show all: rendered when scrolled near (off-screen). */
      deferred: boolean;
    }
  | {
      kind: 'more';
      key: string;
      /** The desktop label, or null when everything fits there. */
      label: string | null;
      /** The phone label, or null when everything fits there. */
      phoneLabel: string | null;
      /** The first tile each button reveals (keyboard focus moves there). */
      reveals: Readonly<{ desktop: string | null; phone: string | null }>;
    }
  | {
      /** After Show all: "Show fewer", no pager. */
      kind: 'fewer';
      key: string;
      /** Desktop had something folded (more than 9 open); phones always. */
      desktop: boolean;
      /** The folded labels, kept so the button keeps its width. */
      label: string | null;
      phoneLabel: string;
    }
  | { kind: 'heading'; key: string; label: string }
  | { kind: 'compact'; key: string; item: MarkedEpisode }
  | {
      kind: 'stack';
      key: string;
      /** Its first episode number (what Show opens). */
      first: number;
      items: ReadonlyArray<MarkedEpisode>;
    }
>;

/**
 * How the Focus tile sits on a desktop row of three: `tall` is the board's
 * 2 × 2 tile with the next two episodes stacked beside it (two 364px tiles
 * and a gap are exactly its 752px); `wide` spans the row, the still over two
 * columns and the text in the third, when fewer than two tiles could stand
 * beside it (a lone 2 × 2 tile would leave a hole the height of a tile).
 */
export type FocusLayout = 'tall' | 'wide';

/** Unwatched tiles a tall Focus needs beside it on a desktop row. */
const FOCUS_BESIDE = 2;

export type WallPlan = Readonly<{
  slots: ReadonlyArray<WallSlot>;
  /** The Focus tile's desktop layout, or null without Focus. */
  focusLayout: FocusLayout | null;
}>;

const keyOf = (item: MarkedEpisode) => `e${item.episode.episodeNumber}`;

/**
 * Show all and Show fewer are one button that changes its label (one key, so
 * React keeps the element and its chevron turns instead of remounting).
 */
const FOLD_KEY = 'fold';

function foldWatched(
  seen: ReadonlyArray<MarkedEpisode>,
  openStacks: ReadonlySet<number>,
): ReadonlyArray<WallSlot> {
  const slots: WallSlot[] = [];
  let start = 0;
  while (start < seen.length) {
    const item = seen[start]!;
    if (item.mark === 'skipped') {
      slots.push({ item, key: keyOf(item), kind: 'compact' });
      start += 1;
      continue;
    }
    let end = start;
    while (
      end + 1 < seen.length &&
      seen[end + 1]!.mark !== 'skipped' &&
      seen[end + 1]!.episode.episodeNumber ===
        seen[end]!.episode.episodeNumber + 1
    ) {
      end += 1;
    }
    const run = seen.slice(start, end + 1);
    const first = item.episode.episodeNumber;
    if (run.length >= STACK_MIN && !openStacks.has(first)) {
      slots.push({ first, items: run, key: `s${first}`, kind: 'stack' });
    } else {
      for (const watched of run) {
        slots.push({ item: watched, key: keyOf(watched), kind: 'compact' });
      }
    }
    start = end + 1;
  }
  return slots;
}

function headingOf(seen: ReadonlyArray<MarkedEpisode>): string {
  const skipped = seen.filter((item) => item.mark === 'skipped').length;
  const watched = seen.length - skipped;
  return `${watched} watched${skipped ? ` · ${skipped} skipped` : ''}`;
}

export function planWall(
  episodes: ReadonlyArray<MarkedEpisode>,
  view: WallView,
): WallPlan {
  const focus = episodes.find((item) => item.mark === 'next') ?? null;
  const unwatched = episodes.filter(
    (item) =>
      item !== focus && (item.mark === 'open' || item.mark === 'unaired'),
  );
  const seen = episodes.filter(
    (item) => isWatchedMark(item.mark) || item.mark === 'skipped',
  );
  const slots: WallSlot[] = [];

  if (focus) {
    const fallback = fallbackRuntime(episodes.map((item) => item.episode));
    const rest = episodes.filter(
      (item) => item.mark === 'open' || item.mark === 'next',
    );
    slots.push({
      item: focus,
      key: keyOf(focus),
      kind: 'focus',
      left: rest.length,
      leftMinutes: runtimeTotal(rest, fallback),
    });
  }

  // The app's fold rule (lib/fold): more than 3 hidden, 2 on a phone. A
  // season without the Focus tile counts its first episode in that tile's
  // place, so two seasons of one length fold alike (10 episodes show whole
  // with Next up in the season and without it)
  const inFocusPlace = focus ? 0 : 1;
  const desktopFolds = shouldFold(
    unwatched.length - inFocusPlace - WALL_SHOW,
    'desktop',
  );
  const phoneFolds = shouldFold(unwatched.length - WALL_SHOW_PHONE, 'phone');
  const shown =
    view.expanded || !desktopFolds ? unwatched : unwatched.slice(0, WALL_SHOW);
  shown.forEach((item, index) => {
    slots.push({
      deferred: desktopFolds && index >= WALL_SHOW,
      item,
      key: keyOf(item),
      kind: item.mark === 'unaired' ? 'upcoming' : 'unwatched',
      phoneHidden: !view.expanded && phoneFolds && index >= WALL_SHOW_PHONE,
    });
  });

  const total = episodes.length;
  // A phone folds whenever a desktop does (its threshold is lower).
  if (phoneFolds) {
    // One wording on both: the phone's button reveals the
    // whole season too
    const all = `Show all ${total} episodes`;
    const labels = { label: desktopFolds ? all : null, phoneLabel: all };
    if (view.expanded) {
      slots.push({
        ...labels,
        desktop: desktopFolds,
        key: FOLD_KEY,
        kind: 'fewer',
      });
    } else {
      const codeAt = (index: number) => {
        const item = unwatched[index];
        return item ? codeOf(item.episode) : null;
      };
      slots.push({
        ...labels,
        key: FOLD_KEY,
        kind: 'more',
        reveals: {
          desktop: desktopFolds ? codeAt(WALL_SHOW) : null,
          phone: codeAt(WALL_SHOW_PHONE),
        },
      });
    }
  }

  if (seen.length) {
    slots.push({ key: 'heading', kind: 'heading', label: headingOf(seen) });
    slots.push(...foldWatched(seen, view.openStacks));
  }

  return {
    focusLayout: focus
      ? shown.length >= FOCUS_BESIDE
        ? 'tall'
        : 'wide'
      : null,
    slots,
  };
}

/** A stack's line: "4 episodes · Jul 2025" (or "Jul 2025 – Aug 2025"). */
export function stackLine(items: ReadonlyArray<MarkedEpisode>): string {
  const dates = items
    .filter((item) => item.record && !item.record.dateUnknown)
    .map((item) => item.record!.watchedAt)
    .sort((a, b) => a - b);
  const count = `${items.length} episodes`;
  if (!dates.length) {
    return count;
  }
  const first = formatMonthYear(dates[0]!);
  const last = formatMonthYear(dates[dates.length - 1]!);
  return `${count} · ${first}${first === last ? '' : ` – ${last}`}`;
}

/** A stack's title: "E01–E04 · watched". */
export function stackTitle(items: ReadonlyArray<MarkedEpisode>): string {
  const first = items[0]?.episode.episodeNumber ?? 0;
  const last = items[items.length - 1]?.episode.episodeNumber ?? 0;
  return `${shortCode(first)}–${shortCode(last)} · watched`;
}

export type WallAction = Readonly<
  | { type: 'expand' }
  | { type: 'collapse' }
  | { type: 'openStack'; first: number }
>;

/** The wall's own state changes: Show all / Show fewer, Show. */
export function wallReducer(view: WallView, action: WallAction): WallView {
  switch (action.type) {
    case 'expand':
      return { ...view, expanded: true };
    case 'collapse':
      return { ...view, expanded: false };
    case 'openStack':
      return {
        ...view,
        openStacks: new Set([...view.openStacks, action.first]),
      };
  }
}
