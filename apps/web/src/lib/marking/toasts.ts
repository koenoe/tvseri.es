import { compareEpisodes, type EpisodeRef } from '@tvseri.es/schemas';
import type { ActionError } from '@/lib/actions/result';
import {
  ERROR_MESSAGE,
  markedMessage,
  runMessage,
  USE_RELEASE_DATES,
} from './copy';
import { codeOf } from './progress';
import type { EpisodeCode, SeriesBase } from './types';
import { type WhenChoice, whenLabel } from './when';

/** The toast side of the marking commands: what each toast says and offers. */

export type ToastInput = Readonly<{
  id?: string;
  title: string;
  tone?: 'default' | 'error';
  icon?: 'eye' | 'skipped';
  action?: Readonly<{ label: string; onClick: () => void }>;
  secondaryAction?: Readonly<{ label: string; onClick: () => void }>;
}>;

type ToastAction = NonNullable<ToastInput['action']>;

/**
 * What a refused write says: the sign-in prompt when the session is gone,
 * else the error toast. For writes whose failure offers nothing more.
 */
export function reportFailure(
  deps: Readonly<{
    promptSignIn: () => void;
    toast: (input: ToastInput) => void;
  }>,
  error: ActionError | undefined,
): void {
  if (error === 'unauthenticated') {
    deps.promptSignIn();
  } else {
    deps.toast({ title: ERROR_MESSAGE, tone: 'error' });
  }
}

/** What an Undo puts back: the show as it was before, for these episodes */
export type Undoable = Readonly<{
  seriesId: number;
  prior: SeriesBase;
  codes: ReadonlyArray<EpisodeCode>;
}>;

/** Single Just-now marks within this window merge into one toast. */
const MERGE_WINDOW_MS = 2 * 60 * 1000;

type Run = {
  seriesId: number;
  refs: EpisodeRef[];
  prior: SeriesBase;
  at: number;
};

const sortRefs = (refs: ReadonlyArray<EpisodeRef>) =>
  [...refs].sort(compareEpisodes);

/**
 * Whether `ref` extends the run at either end in its season: the toast shows
 * the run as a range, which must not claim episodes in a gap or a special
 */
const nextTo = (refs: ReadonlyArray<EpisodeRef>, ref: EpisodeRef) => {
  const first = refs[0];
  const last = refs.at(-1);
  return (
    !!first &&
    !!last &&
    first.seasonNumber === ref.seasonNumber &&
    last.seasonNumber === ref.seasonNumber &&
    (ref.episodeNumber === first.episodeNumber - 1 ||
      ref.episodeNumber === last.episodeNumber + 1)
  );
};

/**
 * Quick Just-now marks of next-door episodes of one show merge into one
 * toast ("Marked E5–E7 · Just now") with one Undo back to before the first.
 * Any other command, or a mark away from the run, ends it.
 */
export function createMergeRun() {
  let run: Run | null = null;
  return {
    end: () => {
      run = null;
    },
    /** The merged run's refs and its prior, or null when `ref` starts a new one */
    join(seriesId: number, ref: EpisodeRef, now: number) {
      const merging =
        run &&
        run.seriesId === seriesId &&
        now - run.at < MERGE_WINDOW_MS &&
        nextTo(run.refs, ref)
          ? run
          : null;
      if (!merging) {
        return null;
      }
      merging.refs = sortRefs([...merging.refs, ref]);
      merging.at = now;
      return { prior: merging.prior, refs: merging.refs };
    },
    start(seriesId: number, ref: EpisodeRef, prior: SeriesBase, now: number) {
      run = { at: now, prior, refs: [ref], seriesId };
    },
  };
}

/** The merged run's toast: "Marked S03E05–S03E07 · Just now", with Undo */
export const runToast = (
  refs: ReadonlyArray<EpisodeRef>,
  undo: ToastAction,
): ToastInput => ({ action: undo, icon: 'eye', title: runMessage(refs) });

const skippedAmong = (series: SeriesBase, refs: ReadonlyArray<EpisodeRef>) => {
  const skipped = new Set(series.skipped);
  return refs.filter((ref) => skipped.has(codeOf(ref))).length;
};

/**
 * The toast for a mark of `refs` with `choice`, with Undo and, for a bulk
 * Just-now / no-date mark given `useReleaseDates`, "Use release dates"
 * (unless `extra` takes that slot).
 */
export function markToast(
  input: Readonly<{
    prior: SeriesBase;
    refs: ReadonlyArray<EpisodeRef>;
    what: string;
    choice: WhenChoice;
    now: number;
    undo: ToastAction;
    useReleaseDates?: () => void;
    unmarked?: ReadonlyArray<EpisodeRef>;
    extra?: Readonly<{ label: string; onClick: () => void }>;
  }>,
): ToastInput {
  const bulk = input.refs.length > 1 || !/^S\d+E\d+( |$)/.test(input.what);
  const releaseDates =
    input.refs.length > 1 &&
    (input.choice.kind === 'now' || input.choice.kind === 'unknown')
      ? input.useReleaseDates
      : undefined;
  return {
    action: input.undo,
    icon: 'eye',
    secondaryAction:
      input.extra ??
      (releaseDates
        ? { label: USE_RELEASE_DATES, onClick: releaseDates }
        : undefined),
    title: markedMessage({
      bulk,
      skipped: skippedAmong(input.prior, input.refs),
      unmarked: input.unmarked,
      what: input.what,
      when: whenLabel(input.choice, input.now),
    }),
  };
}
