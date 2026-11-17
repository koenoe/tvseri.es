import {
  type EpisodeRef,
  episodeCode,
  type MarkWhen,
} from '@tvseri.es/schemas';

import {
  callsFor,
  createChains,
  type MarkingActions,
  markCalls,
  type Result,
  type Send,
  savedOps,
  sequence,
  settled,
  watchedOf,
} from './chain';
import {
  beforeTooLabel,
  beforeWhat,
  codeRange,
  ERROR_MESSAGE,
  episodeLabel,
  HIDDEN_MESSAGE,
  listMessage,
  markedMessage,
  neverAskMessage,
  PARTIAL_MESSAGE,
  SEEN_MESSAGE,
  STARTED_MESSAGE,
  seenMessage,
  skippedMessage,
  UNAVAILABLE_MESSAGE,
  unmarkedMessage,
  unmarkedRunMessage,
  unskippedMessage,
  WHOLE_SHOW,
} from './copy';
import {
  airedInSeason,
  airedRegularEpisodes,
  codeOf,
  episodeState,
  isWatched,
  nextEpisode,
  openBefore,
  parseCode,
  regularWatchedCount,
  unwatchedInSeason,
  unwatchedRegularEpisodes,
  watchedInSeason,
} from './progress';
import {
  libraryAfter,
  recordOf,
  recordsFrom,
  restoreOps,
  withMembership,
} from './state';
import type { MarkingStoreApi } from './store';
import {
  createMergeRun,
  markToast,
  reportFailure,
  runToast,
  type ToastInput,
  type Undoable,
} from './toasts';
import type { EpisodeCode, MarkingOp, SeriesBase, WatchRecord } from './types';
import { toMarkWhen, type WhenChoice } from './when';

/** The boundaries of the command layer; `useMarking` passes the real ones. */
export type MarkingDeps = Readonly<{
  actions: MarkingActions;
  isSignedIn: () => boolean;
  now: () => number;
  promptSignIn: () => void;
  store: MarkingStoreApi;
  toast: (input: ToastInput) => void;
}>;

/** What a command that writes starts with: its toast, then its requests */
type Write = Readonly<{ toast: ToastInput; send: () => Promise<unknown> }>;

/**
 * What `command` did: refused (no view, signed out), found nothing to write,
 * or started a write (its promise settles when the write has).
 */
type Started = 'refused' | 'nothing' | Promise<unknown>;

const SETTLED: Promise<void> = Promise.resolve();

/** A press command's result: resolves once its write settled (`pressMark`) */
const settledOf = (started: Started | undefined): Promise<unknown> =>
  started === undefined || typeof started === 'string' ? SETTLED : started;

/**
 * The marking commands: optimistic store change → server action → settle or
 * roll back, with the one toast (Undo, at most one more action) and the
 * sign-in prompt. Pure apart from its deps, so it is unit-tested.
 */
export function createMarkingCommands(deps: MarkingDeps) {
  const { actions, store } = deps;
  const merge = createMergeRun();
  const enqueue = createChains();

  const view = (seriesId: number) => store.getState().series[seriesId]?.view;

  /** The sign-in guard: false, with the sign-in prompt, when signed out */
  const signedIn = () => {
    if (deps.isSignedIn()) {
      return true;
    }
    deps.promptSignIn();
    return false;
  };

  const failureToast = (result: Extract<Result, { ok: false }>) =>
    reportFailure(deps, result.error);

  /**
   * The start every write command shares: nothing without the show's view,
   * the sign-in guard, then `build` decides from the show what to write
   * (null: nothing to do). A write ends any merge run, shows its toast and
   * sends. `'refused'`: no view, or signed out; `'nothing'`: `build` found
   * nothing to write; else the write's promise.
   */
  function command(
    seriesId: number,
    build: (prior: SeriesBase) => Write | null,
  ): Started {
    const prior = view(seriesId);
    if (!prior || !signedIn()) {
      return 'refused';
    }
    const write = build(prior);
    if (!write) {
      return 'nothing';
    }
    merge.end();
    deps.toast(write.toast);
    return write.send();
  }

  /**
   * Hide or unhide: the store's `hidden` changes at once (every list drops
   * or brings back the show), the pref is written, a refusal rolls back.
   */
  async function setHidden(
    seriesId: number,
    value: boolean,
    send: () => Promise<Result>,
  ): Promise<boolean> {
    if (!signedIn()) {
      return false;
    }
    const prior = store.getState().hidden[seriesId];
    store.getState().setHidden(seriesId, value);
    const result = await settled(send);
    if (!result.ok) {
      store.getState().setHidden(seriesId, prior);
      failureToast(result);
    }
    return result.ok;
  }

  /** The library ids follow the show's new state (In progress, Finished, lists) */
  function updateLibrary(seriesId: number) {
    const current = view(seriesId);
    if (current) {
      store
        .getState()
        .updateLibraryIds((ids) => libraryAfter(ids, seriesId, current));
    }
  }

  /**
   * A new watch of a regular episode brings a show hidden in this tab back
   * (the API unhides it in the same request): at once, and hidden again
   * when nothing of it saved. A show hidden before this tab is out of every
   * list it draws already. Returns the rollback.
   */
  function unhideFor(seriesId: number, ops: ReadonlyArray<MarkingOp>) {
    const watchesRegular = (list: ReadonlyArray<MarkingOp>) =>
      list.some(
        (op) =>
          op.kind === 'mark' &&
          regularWatchedCount({ watched: op.records }) > 0,
      );
    if (store.getState().hidden[seriesId] !== true || !watchesRegular(ops)) {
      return () => {};
    }
    store.getState().setHidden(seriesId, false);
    return (saved: ReadonlyArray<MarkingOp>) => {
      if (
        !watchesRegular(saved) &&
        store.getState().hidden[seriesId] === false
      ) {
        store.getState().setHidden(seriesId, true);
      }
    };
  }

  /**
   * Applies `ops` at once, sends, then settles (with the server's records).
   * On failure the store keeps exactly what the server saved (a multi-request
   * write can fail part-way) and rolls back the rest, with an error toast that
   * says which and offers Try again. `restore`: Undo putting marks back, no
   * new watching.
   */
  async function run(
    seriesId: number,
    ops: ReadonlyArray<MarkingOp>,
    send: Send,
    { restore = false }: Readonly<{ restore?: boolean }> = {},
  ): Promise<boolean> {
    if (!signedIn()) {
      return false;
    }
    const ids = ops.map((op) => store.getState().begin(seriesId, op));
    const rollBackUnhide = restore ? () => {} : unhideFor(seriesId, ops);
    const result = await enqueue(seriesId, send);
    if (result.ok) {
      const watched = watchedOf(result);
      const corrections: MarkingOp[] =
        watched.length > 0
          ? [{ kind: 'mark', records: recordsFrom(watched) }]
          : [];
      ids.forEach((id, index) => {
        store
          .getState()
          .settle(
            seriesId,
            id,
            index === ids.length - 1 ? corrections : [],
            result.at,
          );
      });
      updateLibrary(seriesId);
      return true;
    }
    const saved = result.partial ? savedOps(result.partial) : [];
    rollBackUnhide(saved);
    for (const id of ids) {
      store.getState().fail(seriesId, id);
    }
    store.getState().correct(seriesId, saved, result.at);
    if (saved.length > 0) {
      updateLibrary(seriesId);
    }
    merge.end();
    if (result.error === 'unauthenticated') {
      deps.promptSignIn();
    } else {
      deps.toast({
        action: {
          label: 'Try again',
          onClick: () => {
            void run(seriesId, ops, send, { restore });
          },
        },
        title: saved.length > 0 ? PARTIAL_MESSAGE : ERROR_MESSAGE,
        tone: 'error',
      });
    }
    return false;
  }

  /** `ops` sent as the calls that make the API match them (Undo, the picker) */
  const runOps = (seriesId: number, ops: ReadonlyArray<MarkingOp>) =>
    run(seriesId, ops, () => sequence(callsFor(actions, seriesId, ops)), {
      restore: true,
    });

  function undo({ codes, prior, seriesId }: Undoable) {
    merge.end();
    const current = view(seriesId);
    if (!current) {
      return;
    }
    const ops = restoreOps(prior, current, codes);
    if (ops.length > 0) {
      void runOps(seriesId, ops);
    }
  }

  /** Undo for a write to `refs` (and the later episodes it unmarked) */
  const markUndo = (
    seriesId: number,
    prior: SeriesBase,
    refs: ReadonlyArray<EpisodeRef>,
    unmarked: ReadonlyArray<EpisodeRef> = [],
  ) => {
    const codes = [...refs, ...unmarked].map(codeOf);
    return { label: 'Undo', onClick: () => undo({ codes, prior, seriesId }) };
  };

  /** A toast that names a change to `refs`, with Undo back to `prior` */
  const undoToast = (
    seriesId: number,
    prior: SeriesBase,
    refs: ReadonlyArray<EpisodeRef>,
    title: string,
    icon: NonNullable<ToastInput['icon']> = 'eye',
  ): ToastInput => ({
    action: markUndo(seriesId, prior, refs),
    icon,
    title,
  });

  /**
   * The toast of a mark of `refs` (`markToast`), with Undo back to `prior`
   * (`unmarked` included). `releaseDates`: offers "Use release dates", which
   * marks the same episodes again with their air dates.
   */
  const markedToast = (
    input: Readonly<{
      seriesId: number;
      prior: SeriesBase;
      refs: ReadonlyArray<EpisodeRef>;
      choice: WhenChoice;
      what: string;
      releaseDates?: boolean;
      unmarked?: ReadonlyArray<EpisodeRef>;
      extra?: Readonly<{ label: string; onClick: () => void }>;
    }>,
  ): ToastInput => {
    const { prior, refs, seriesId, unmarked, what } = input;
    return markToast({
      choice: input.choice,
      extra: input.extra,
      now: deps.now(),
      prior,
      refs,
      undo: markUndo(seriesId, prior, refs, unmarked),
      unmarked,
      useReleaseDates: input.releaseDates
        ? () =>
            markWith(seriesId, refs, { kind: 'release' }, what, {
              releaseDates: false,
            })
        : undefined,
      what,
    });
  };

  /** The store op and requests of a mark of `refs` with one date */
  function markWrite(
    seriesId: number,
    refs: ReadonlyArray<EpisodeRef>,
    when: MarkWhen,
  ) {
    const current = view(seriesId);
    const now = deps.now();
    const records: Record<EpisodeCode, WatchRecord> = {};
    for (const ref of refs) {
      const code = codeOf(ref);
      records[code] = recordOf(when, now, current?.watched[code]);
    }
    const op: MarkingOp = { kind: 'mark', records };
    const calls = markCalls(
      actions,
      seriesId,
      refs.map((ref) => ({ ...ref, when })),
    );
    return { calls, op };
  }

  /** Marks `refs` with one date; the core of every mark command. */
  function mark(
    seriesId: number,
    refs: ReadonlyArray<EpisodeRef>,
    when: MarkWhen,
  ) {
    const { calls, op } = markWrite(seriesId, refs, when);
    return run(seriesId, [op], () => sequence(calls));
  }

  function unmark(seriesId: number, refs: ReadonlyArray<EpisodeRef>) {
    return runOps(seriesId, [{ codes: refs.map(codeOf), kind: 'unmark' }]);
  }

  /** Marks `refs` with a picker answer and shows its toast. */
  function markWith(
    seriesId: number,
    refs: ReadonlyArray<EpisodeRef>,
    choice: WhenChoice,
    what: string,
    options: Readonly<{ releaseDates?: boolean }> = {},
  ): Promise<unknown> {
    // signed out, the picker always asks to sign in first
    if (!signedIn() || refs.length === 0) {
      return SETTLED;
    }
    return settledOf(
      command(seriesId, (prior) => ({
        send: () => mark(seriesId, refs, toMarkWhen(choice, deps.now())),
        toast: markedToast({
          choice,
          prior,
          refs,
          releaseDates: options.releaseDates !== false,
          seriesId,
          what,
        }),
      })),
    );
  }

  /**
   * One episode, Just now (the eye, a chip, the modal stub, Next up). Its
   * callers have guarded sign-in.
   */
  function markOne(
    seriesId: number,
    ref: EpisodeRef,
    label: string,
    where: 'page' | 'sheet',
  ): Promise<unknown> {
    const prior = view(seriesId);
    if (!prior) {
      return SETTLED;
    }
    const now = deps.now();
    const merged = merge.join(seriesId, ref, now);
    if (merged) {
      deps.toast(
        runToast(merged.refs, markUndo(seriesId, merged.prior, merged.refs)),
      );
      return mark(seriesId, [ref], { kind: 'now' });
    }
    const before =
      where === 'page' && !prior.prefs?.neverAskBefore
        ? openBefore(prior, ref)
        : [];
    deps.toast(
      markedToast({
        choice: { kind: 'now' },
        extra:
          before.length > 0
            ? {
                label: beforeTooLabel(before.length),
                onClick: () =>
                  markWith(
                    seriesId,
                    before,
                    { kind: 'now' },
                    beforeWhat(before.length),
                  ),
              }
            : undefined,
        prior,
        refs: [ref],
        seriesId,
        what: label,
      }),
    );
    merge.start(seriesId, ref, prior, now);
    return mark(seriesId, [ref], { kind: 'now' });
  }

  /** Unmarks `refs` with one toast ("Unmarked …") and Undo */
  function unmarkWith(
    seriesId: number,
    refs: ReadonlyArray<EpisodeRef>,
    title: string,
  ): Promise<unknown> {
    if (refs.length === 0) {
      return SETTLED;
    }
    return settledOf(
      command(seriesId, (prior) => ({
        send: () => unmark(seriesId, refs),
        toast: undoToast(seriesId, prior, refs, title),
      })),
    );
  }

  /**
   * The picker's Skipped: every episode it names becomes skipped, so a
   * watched one is unmarked first (an explicit choice in the picker, which
   * shows each episode's current state; Undo restores it).
   */
  function skipEpisodes(
    seriesId: number,
    refs: ReadonlyArray<EpisodeRef>,
    what: string,
  ) {
    if (refs.length === 0) {
      return;
    }
    command(seriesId, (prior) => {
      const watched = refs.filter((ref) => isWatched(prior, ref));
      const ops: MarkingOp[] = [
        ...(watched.length > 0
          ? [{ codes: watched.map(codeOf), kind: 'unmark' } as const]
          : []),
        { codes: refs.map(codeOf), kind: 'skip' },
      ];
      return {
        send: () => runOps(seriesId, ops),
        toast: undoToast(
          seriesId,
          prior,
          refs,
          skippedMessage(what),
          'skipped',
        ),
      };
    });
  }

  /** The picker's Not watched: unmarks the watched, unskips the skipped */
  function clearEpisodes(
    seriesId: number,
    refs: ReadonlyArray<EpisodeRef>,
    what: string,
  ) {
    if (refs.length === 0) {
      return;
    }
    command(seriesId, (prior) => {
      const watched = refs.filter((ref) => isWatched(prior, ref));
      const skipped = refs.filter(
        (ref) => episodeState(prior, ref) === 'skipped',
      );
      const ops: MarkingOp[] = [
        ...(watched.length > 0
          ? [{ codes: watched.map(codeOf), kind: 'unmark' } as const]
          : []),
        ...(skipped.length > 0
          ? [{ codes: skipped.map(codeOf), kind: 'unskip' } as const]
          : []),
      ];
      return ops.length === 0
        ? null
        : {
            send: () => runOps(seriesId, ops),
            toast: undoToast(
              seriesId,
              prior,
              refs,
              // Nothing was watched: it was never marked, only skipped
              watched.length === 0
                ? unskippedMessage(what)
                : unmarkedMessage(what),
            ),
          };
    });
  }

  const scopeName = (seasonNumber?: number) =>
    seasonNumber === undefined ? WHOLE_SHOW : `Season ${seasonNumber}`;

  /** A mark of every open episode in `refs` with no date ("I don't remember") */
  const markScopeUnknown = (
    seriesId: number,
    refs: ReadonlyArray<EpisodeRef>,
  ) =>
    run(
      seriesId,
      [
        {
          kind: 'mark',
          records: Object.fromEntries(
            refs.map((ref) => [
              codeOf(ref),
              recordOf({ kind: 'unknown' }, deps.now()),
            ]),
          ),
        },
      ],
      () => actions.markScope({ seriesId, when: { kind: 'unknown' } }),
    );

  /**
   * Marks what is open in a season or the whole show Just now (skipped
   * included). `'nothing'` when nothing is open.
   */
  function markOpenScope(seriesId: number, seasonNumber?: number): Started {
    return command(seriesId, (prior) => {
      const open =
        seasonNumber === undefined
          ? unwatchedRegularEpisodes(prior)
          : unwatchedInSeason(prior, seasonNumber);
      if (open.length === 0) {
        return null;
      }
      const what = scopeName(seasonNumber);
      return {
        send: () => {
          const records = Object.fromEntries(
            open.map((ref) => [
              codeOf(ref),
              recordOf({ kind: 'now' }, deps.now()),
            ]),
          );
          return run(seriesId, [{ kind: 'mark', records }], () =>
            actions.markScope({
              seasonNumber,
              seriesId,
              when: { kind: 'now' },
            }),
          );
        },
        toast: markedToast({
          choice: { kind: 'now' },
          prior,
          refs: open,
          releaseDates: true,
          seriesId,
          what,
        }),
      };
    });
  }

  const commands = {
    /**
     * The first-tracking prompt: Just starting / Not now save the answer;
     * "Finished it all" marks every aired episode "I don't remember".
     */
    answerFirstTracking(
      seriesId: number,
      answer: 'starting' | 'not-now' | 'finished',
    ) {
      const patch = { firstTrackingAnsweredAt: deps.now() };
      const saveAnswer = () =>
        run(seriesId, [{ kind: 'prefs', patch }], () =>
          actions.updateSeriesPrefs(seriesId, { firstTrackingAnswered: true }),
        );
      if (answer !== 'finished') {
        void saveAnswer();
        return;
      }
      command(seriesId, (prior) => {
        const refs = airedRegularEpisodes(prior);
        return {
          // Two writes, two runs: a failed mark never takes the answer back.
          send: () =>
            Promise.all([saveAnswer(), markScopeUnknown(seriesId, refs)]),
          toast: markedToast({
            choice: { kind: 'unknown' },
            prior,
            refs,
            releaseDates: true,
            seriesId,
            what: WHOLE_SHOW,
          }),
        };
      });
    },

    /**
     * A mark-only eye (Continue watching): marks one episode Just now, like
     * `toggleEpisode`, but leaves an episode that is already watched alone.
     */
    markEpisode(
      seriesId: number,
      ref: EpisodeRef,
      options: Readonly<{ title?: string; where?: 'page' | 'sheet' }> = {},
    ) {
      const current = view(seriesId);
      if (!current || isWatched(current, ref) || !signedIn()) {
        return SETTLED;
      }
      return markOne(
        seriesId,
        ref,
        episodeLabel(ref, options.title),
        options.where ?? 'page',
      );
    },

    /** Marks `refs` with one picker answer ("Marked S03E05 Children · Yesterday"). */
    markEpisodes: markWith,

    /**
     * Next up, Just now (the Remote's "Mark next"). Works on an unseeded show
     * too: the server finds Next up and the store picks it up when seeded.
     */
    async markNext(seriesId: number) {
      const current = view(seriesId);
      if (current) {
        const next = nextEpisode(current);
        if (next) {
          markOne(seriesId, next, episodeCode(next), 'page');
        }
        return next;
      }
      if (!signedIn()) {
        return null;
      }
      const result = await settled(() => actions.markNextEpisode({ seriesId }));
      if (!result.ok) {
        failureToast(result);
        return null;
      }
      // the show as the server has it after the write: the tile follows
      store.getState().seed(result.data.seed, JSON.stringify(result.data.seed));
      if (result.data.episode) {
        store.getState().countSaved(1);
        if (
          result.data.episode.seasonNumber > 0 &&
          store.getState().hidden[seriesId] === true
        ) {
          store.getState().setHidden(seriesId, false);
        }
        deps.toast({
          icon: 'eye',
          title: markedMessage({
            what: episodeCode(result.data.episode),
            when: 'Just now',
          }),
        });
        store
          .getState()
          .updateLibraryIds((ids) =>
            withMembership(ids, 'inProgress', [seriesId], true),
          );
      }
      return result.data.episode;
    },

    /**
     * "Seen it" and "Already seen": I have seen this, stop suggesting it.
     * Marks every aired episode that isn't watched yet with no date ("I
     * don't remember", as "Finished it all"), so nothing enters this year's
     * stats or the dated history; episodes already watched keep their dates
     * (the API adds only what is open). A finished show is left as it is,
     * never unmarked: the press says it is already seen. The toast names
     * the show; its Undo removes exactly what this press added.
     */
    markSeen(seriesId: number, title: string) {
      command(seriesId, (prior) => {
        const open = unwatchedRegularEpisodes(prior);
        if (open.length === 0) {
          // Nothing left to mark: say so, the button itself never changes
          deps.toast({ title: SEEN_MESSAGE });
          return null;
        }
        return {
          send: () => markScopeUnknown(seriesId, open),
          toast: undoToast(seriesId, prior, open, seenMessage(title)),
        };
      });
    },

    /**
     * "I'm up to…" (and the sheet's Up to here): marks every open episode up
     * to `ref` (earlier seasons included) and unmarks the later ones of its
     * season.
     */
    markUpTo(seriesId: number, ref: EpisodeRef, choice: WhenChoice) {
      command(seriesId, (prior) => {
        const all = airedRegularEpisodes(prior);
        const target = all.findIndex((item) => codeOf(item) === codeOf(ref));
        const refs = all
          .slice(0, target + 1)
          .filter((item) => !isWatched(prior, item));
        const later = watchedInSeason(prior, ref.seasonNumber).filter(
          (item) => item.episodeNumber > ref.episodeNumber,
        );
        if (refs.length === 0 && later.length === 0) {
          return null;
        }
        const what = `up to ${episodeCode(ref)}`;
        return {
          // One run: the unmark is sent only after the whole mark saved (a
          // failed press must not still remove progress), and Try again
          // redoes both
          send: () => {
            const marked =
              refs.length > 0
                ? [markWrite(seriesId, refs, toMarkWhen(choice, deps.now()))]
                : [];
            const unmarked: MarkingOp[] =
              later.length > 0
                ? [{ codes: later.map(codeOf), kind: 'unmark' }]
                : [];
            const ops = [...marked.map((write) => write.op), ...unmarked];
            const calls = [
              ...marked.flatMap((write) => write.calls),
              ...callsFor(actions, seriesId, unmarked),
            ];
            return run(seriesId, ops, () => sequence(calls));
          },
          toast: markedToast({
            choice,
            prior,
            refs,
            releaseDates: true,
            seriesId,
            unmarked: later,
            what,
          }),
        };
      });
    },

    /**
     * A drag on the season line or the chips: one toast, "Marked S03E06–S03E09 ·
     * Just now" or "Unmarked S03E02–S03E04". Only episodes that change are sent.
     */
    paintRun(
      seriesId: number,
      refs: ReadonlyArray<EpisodeRef>,
      direction: 'mark' | 'unmark',
    ) {
      const prior = view(seriesId);
      if (!prior) {
        return;
      }
      const todo = refs.filter((ref) =>
        direction === 'mark' ? !isWatched(prior, ref) : isWatched(prior, ref),
      );
      if (todo.length === 0) {
        return;
      }
      if (direction === 'unmark') {
        unmarkWith(seriesId, todo, unmarkedRunMessage(refs));
        return;
      }
      const what = codeRange(refs);
      command(seriesId, () => ({
        send: () => mark(seriesId, todo, { kind: 'now' }),
        toast: markedToast({
          choice: { kind: 'now' },
          prior,
          refs: todo,
          seriesId,
          what,
        }),
      }));
    },

    /**
     * Hide from in progress (a tile Remote's H): the `paused: 'hide'` pref.
     * The show stays on In progress (still yours) and leaves every list at
     * once (`hidden`); the toast's Undo brings it back in place. Resolves
     * whether the API took it.
     */
    removeFromInProgress(seriesId: number): Promise<boolean> {
      const done = setHidden(seriesId, true, () =>
        actions.removeFromInProgress({ seriesId }),
      );
      void done.then((ok) => {
        if (ok) {
          deps.toast({
            action: {
              label: 'Undo',
              onClick: () => {
                void commands.restoreToInProgress(seriesId);
              },
            },
            title: HIDDEN_MESSAGE,
          });
        }
      });
      return done;
    },

    /** Back to in progress (Hidden's latched H): clears the pref. */
    restoreToInProgress(seriesId: number): Promise<boolean> {
      return setHidden(seriesId, false, () =>
        actions.restoreToInProgress({ seriesId }),
      );
    },

    /**
     * "Never for this show" (with Undo); `value: false` is the sheet's quiet
     * "Ask again" (no toast).
     */
    setNeverAskBefore(seriesId: number, title: string, value = true) {
      const save = (neverAskBefore: boolean) =>
        run(seriesId, [{ kind: 'prefs', patch: { neverAskBefore } }], () =>
          actions.updateSeriesPrefs(seriesId, { neverAskBefore }),
        );
      if (!value) {
        void save(false);
        return;
      }
      deps.toast({
        action: {
          label: 'Undo',
          onClick: () => {
            void save(false);
          },
        },
        title: neverAskMessage(title),
      });
      void save(true);
    },

    /**
     * The date picker for one episode or a set: a When answer marks
     * (or re-dates) them all, Skipped makes them all skipped (watched ones
     * are unmarked first), Not watched clears them. `what` names them in the
     * toast ("S03E05 Children", "Season 3", "S03E06–S03E09").
     */
    setWhen(
      seriesId: number,
      refs: ReadonlyArray<EpisodeRef>,
      choice:
        | WhenChoice
        | Readonly<{ kind: 'skip' }>
        | Readonly<{ kind: 'unmark' }>,
      what: string,
    ) {
      if (choice.kind === 'skip') {
        skipEpisodes(seriesId, refs, what);
      } else if (choice.kind === 'unmark') {
        clearEpisodes(seriesId, refs, what);
      } else {
        markWith(seriesId, refs, choice, what);
      }
    },

    /**
     * The eye on a tile, a chip or the modal: watched → unmark; otherwise
     * (skipped included) mark Just now. On the page an out-of-order mark
     * offers "Mark the N before too"; quick marks merge into one toast.
     */
    toggleEpisode(
      seriesId: number,
      ref: EpisodeRef,
      options: Readonly<{ title?: string; where?: 'page' | 'sheet' }> = {},
    ) {
      const current = view(seriesId);
      if (!current || !signedIn()) {
        return SETTLED;
      }
      const label = episodeLabel(ref, options.title);
      if (isWatched(current, ref)) {
        return unmarkWith(seriesId, [ref], unmarkedMessage(label));
      }
      return markOne(seriesId, ref, label, options.where ?? 'page');
    },

    /**
     * Heart (favorites) or bookmark (watchlist). With `announce` (the show's
     * title) a toast names the change and offers Undo: for a control that
     * doesn't show the list's state as clearly as the heart or bookmark does.
     */
    toggleList(
      seriesId: number,
      list: 'favorites' | 'watchlist',
      announce?: string,
    ) {
      if (!signedIn()) {
        return;
      }
      const current = view(seriesId);
      const library = store.getState().library;
      const isOn = current?.status
        ? list === 'favorites'
          ? current.status.isFavorited
          : current.status.isWatchlisted
        : library.status === 'ready' && library.ids[list].includes(seriesId);
      const value = !isOn;
      // The API parks the watchlist entry of a show with a regular episode
      // watched, so saving one would silently undo itself at the next mark
      const started =
        (current ? regularWatchedCount(current) > 0 : false) ||
        (library.status === 'ready' &&
          (library.ids.inProgress.includes(seriesId) ||
            library.ids.watched.includes(seriesId)));
      if (list === 'watchlist' && value && started) {
        const seen =
          library.status === 'ready' && library.ids.watched.includes(seriesId);
        deps.toast({ title: seen ? SEEN_MESSAGE : STARTED_MESSAGE });
        return;
      }
      const setMembership = (on: boolean) =>
        store
          .getState()
          .updateLibraryIds((ids) => withMembership(ids, list, [seriesId], on));
      setMembership(value);
      if (announce) {
        deps.toast({
          action: {
            label: 'Undo',
            onClick: () => commands.toggleList(seriesId, list),
          },
          title: listMessage(announce, list, value),
        });
      }
      const send = () => actions.setInList({ list, seriesId, value });
      if (current) {
        void run(seriesId, [{ kind: 'list', list, value }], send).then((ok) => {
          if (!ok) {
            setMembership(!value);
          }
        });
        return;
      }
      void settled(send).then((result) => {
        if (!result.ok) {
          setMembership(!value);
          failureToast(result);
        }
      });
    },

    /**
     * A season (`seasonNumber`) or the whole show: marks everything open Just
     * now (skipped included), or unmarks it all when complete. Complete means
     * it has aired episodes and every one is watched: a scope the store knows
     * no aired episodes for (an unknown season, a show before its premiere)
     * is never unmarked from here.
     */
    toggleScope(seriesId: number, seasonNumber?: number): Promise<unknown> {
      const opened = markOpenScope(seriesId, seasonNumber);
      if (opened !== 'nothing') {
        return settledOf(opened);
      }
      // markOpenScope found the view and a signed-in viewer
      return settledOf(
        command(seriesId, (prior) => {
          const aired =
            seasonNumber === undefined
              ? airedRegularEpisodes(prior)
              : airedInSeason(prior, seasonNumber);
          // The whole show keeps its specials (the API's rule)
          const watched =
            seasonNumber === undefined
              ? Object.keys(prior.watched).flatMap((code) => {
                  const ref = parseCode(code);
                  return ref && ref.seasonNumber > 0 ? [ref] : [];
                })
              : watchedInSeason(prior, seasonNumber);
          if (aired.length === 0 || watched.length === 0) {
            return null;
          }
          return {
            send: () =>
              run(
                seriesId,
                [{ codes: watched.map(codeOf), kind: 'unmark' }],
                () => actions.unmarkScope({ seasonNumber, seriesId }),
              ),
            toast: undoToast(
              seriesId,
              prior,
              watched,
              unmarkedMessage(scopeName(seasonNumber)),
            ),
          };
        }),
      );
    },
  };

  /**
   * A show whose viewer read failed (`SeriesBase.unavailable`): every
   * command refuses it, so nothing writes against a guessed state (a toggle
   * could remove what is really there); the toast says why.
   */
  const blocked = (seriesId: number): boolean => {
    if (store.getState().series[seriesId]?.view.unavailable !== true) {
      return false;
    }
    deps.toast({ title: UNAVAILABLE_MESSAGE, tone: 'error' });
    return true;
  };
  return refuseUnavailable(commands, blocked);
}

/** What a refused command returns: its "nothing happened" value. */
const REFUSED: Readonly<Record<string, unknown>> = {
  markEpisode: SETTLED,
  markEpisodes: SETTLED,
  markNext: Promise.resolve(null),
  removeFromInProgress: Promise.resolve(false),
  restoreToInProgress: Promise.resolve(false),
  toggleEpisode: SETTLED,
  toggleScope: SETTLED,
};

/** Wraps every command (all take the show first) with the `blocked` check. */
function refuseUnavailable<T extends object>(
  commands: T,
  blocked: (seriesId: number) => boolean,
): T {
  const guarded: Record<string, unknown> = {};
  for (const [name, command] of Object.entries(commands)) {
    guarded[name] = (seriesId: number, ...rest: unknown[]) =>
      blocked(seriesId)
        ? REFUSED[name]
        : (command as (...args: unknown[]) => unknown)(seriesId, ...rest);
  }
  return guarded as T;
}

export type MarkingCommands = ReturnType<typeof createMarkingCommands>;
