import {
  type EpisodeRef,
  MAX_EPISODES_PER_MARK_ACTION,
  type RestoreWhen,
} from '@tvseri.es/schemas';
import { chunk } from '@tvseri.es/utils';
import { unstable_isUnrecognizedActionError } from 'next/navigation';

import type { ActionResult } from '@/lib/actions/result';

import type * as Actions from './actions';
import { codeOf, parseCode } from './progress';
import type { ProgressItem } from './server/api';
import { recordsFrom } from './state';
import type { EpisodeCode, MarkingOp, WatchRecord } from './types';

/**
 * The request side of the marking commands: the server calls that make the
 * API match a set of store ops, run in order per show.
 */

export type MarkingActions = Readonly<
  Pick<
    typeof Actions,
    | 'markEpisodes'
    | 'markNextEpisode'
    | 'markScope'
    | 'removeFromInProgress'
    | 'restoreToInProgress'
    | 'setInList'
    | 'unmarkEpisodes'
    | 'unmarkScope'
    | 'updateSeriesPrefs'
  >
>;

export type Result = ActionResult<unknown>;
export type Send = () => Promise<Result>;

/** One list of the data a marking call answers with (`watched`, `unmarked`…) */
const listOf = <T>(result: Result, key: string): ReadonlyArray<T> =>
  result.ok &&
  typeof result.data === 'object' &&
  result.data !== null &&
  key in result.data
    ? ((result.data as Record<string, unknown>)[key] as ReadonlyArray<T>)
    : [];

export const watchedOf = (result: Result): ReadonlyArray<ProgressItem> =>
  listOf(result, 'watched');

/**
 * The skips the API refused: requested, but not in the skipped set it
 * answers with (an episode TMDB doesn't list is dropped).
 */
export const refusedOf = (result: Result): ReadonlyArray<EpisodeCode> =>
  listOf(result, 'refused');

type SavedPart = NonNullable<Extract<Result, { ok: false }>['partial']>;

/** The store ops for what a failed write did save. */
export const savedOps = (partial: SavedPart): MarkingOp[] => [
  ...(partial.watched?.length
    ? [{ kind: 'mark', records: recordsFrom(partial.watched) } as const]
    : []),
  ...(partial.unmarked?.length
    ? [{ codes: partial.unmarked.map(codeOf), kind: 'unmark' } as const]
    : []),
  ...(partial.skipped?.length
    ? [{ codes: partial.skipped as EpisodeCode[], kind: 'skip' } as const]
    : []),
  ...(partial.unskipped?.length
    ? [{ codes: partial.unskipped as EpisodeCode[], kind: 'unskip' } as const]
    : []),
];

const latest = (a: number | undefined, b: number | undefined) =>
  a === undefined ? b : b === undefined ? a : Math.max(a, b);

/**
 * Runs calls in order and stops at the first failure. What every call saved
 * is passed on together (the corrections; on a failure, `partial`), with
 * the latest server time of them all (`at`): a seed fetched before the
 * write must not undo it.
 */
export async function sequence(calls: ReadonlyArray<Send>): Promise<Result> {
  const watched: ProgressItem[] = [];
  const unmarked: EpisodeRef[] = [];
  const skipped: string[] = [];
  const unskipped: string[] = [];
  const refused: EpisodeCode[] = [];
  let at: number | undefined;
  for (const call of calls) {
    const result = await call();
    at = latest(at, result.at);
    if (!result.ok) {
      // What the earlier calls saved stays saved: pass it on.
      const partial = result.partial ?? {};
      return {
        ...result,
        ...(at === undefined ? {} : { at }),
        partial: {
          skipped: [...skipped, ...(partial.skipped ?? [])],
          unmarked: [...unmarked, ...(partial.unmarked ?? [])],
          unskipped: [...unskipped, ...(partial.unskipped ?? [])],
          watched: [...watched, ...(partial.watched ?? [])],
        },
      };
    }
    watched.push(...watchedOf(result));
    unmarked.push(...listOf<EpisodeRef>(result, 'unmarked'));
    skipped.push(...listOf<string>(result, 'skipped'));
    unskipped.push(...listOf<string>(result, 'unskipped'));
    refused.push(...refusedOf(result));
  }
  return {
    data: { refused, unmarked, watched },
    ok: true,
    ...(at === undefined ? {} : { at }),
  };
}

type MarkEpisodes = Parameters<MarkingActions['markEpisodes']>[0]['episodes'];

/** The mark requests for `episodes`, at most a request's worth each */
export const markCalls = (
  actions: MarkingActions,
  seriesId: number,
  episodes: MarkEpisodes,
): Send[] =>
  chunk(episodes, MAX_EPISODES_PER_MARK_ACTION).map(
    (part) => () => actions.markEpisodes({ episodes: part, seriesId }),
  );

const restoreOf = (record: WatchRecord): RestoreWhen => ({
  kind: 'restore',
  watchedAt: record.watchedAt,
  ...(record.runtime > 0 ? { runtime: record.runtime } : {}),
  ...(record.dateUnknown ? { dateUnknown: true } : {}),
  ...(record.source ? { source: record.source } : {}),
  ...(record.importId ? { importId: record.importId } : {}),
});

/** Server calls that make the API match `ops` (Undo, picker, toggles). */
export function callsFor(
  actions: MarkingActions,
  seriesId: number,
  ops: ReadonlyArray<MarkingOp>,
): Send[] {
  const calls: Send[] = [];
  for (const op of ops) {
    if (op.kind === 'mark') {
      // Only Undo sends records it has: each goes back exactly as it was
      const episodes = Object.entries(op.records).flatMap(([code, record]) => {
        const ref = parseCode(code);
        return ref ? [{ ...ref, when: restoreOf(record) }] : [];
      });
      calls.push(...markCalls(actions, seriesId, episodes));
    } else if (op.kind === 'unmark') {
      const episodes = op.codes.flatMap((code) => parseCode(code) ?? []);
      for (const part of chunk(episodes, MAX_EPISODES_PER_MARK_ACTION)) {
        calls.push(() =>
          actions
            .unmarkEpisodes({ episodes: part, seriesId })
            .then((result) =>
              result.ok ? { ...result, data: { unmarked: part } } : result,
            ),
        );
      }
    } else if (op.kind === 'unskip') {
      for (const part of chunk(op.codes, MAX_EPISODES_PER_MARK_ACTION)) {
        calls.push(() =>
          actions
            .updateSeriesPrefs(seriesId, { unskip: part })
            .then((result) =>
              result.ok ? { ...result, data: { unskipped: part } } : result,
            ),
        );
      }
    } else if (op.kind === 'skip') {
      for (const part of chunk(op.codes, MAX_EPISODES_PER_MARK_ACTION)) {
        calls.push(() =>
          actions.updateSeriesPrefs(seriesId, { skip: part }).then((result) => {
            if (!result.ok) {
              return result;
            }
            const kept = new Set<string>(result.data.skipped);
            return {
              ...result,
              data: {
                refused: part.filter((code) => !kept.has(code)),
                skipped: part.filter((code) => kept.has(code)),
              },
            };
          }),
        );
      }
    } else if (op.kind === 'list') {
      calls.push(() =>
        actions.setInList({ list: op.list, seriesId, value: op.value }),
      );
    } else if (op.kind === 'prefs') {
      calls.push(() =>
        actions.updateSeriesPrefs(seriesId, {
          ...(op.patch.neverAskBefore !== undefined
            ? { neverAskBefore: op.patch.neverAskBefore }
            : {}),
          ...(op.patch.firstTrackingAnsweredAt !== undefined
            ? {
                firstTrackingAnswered:
                  op.patch.firstTrackingAnsweredAt !== null,
              }
            : {}),
        }),
      );
    }
  }
  return calls;
}

const THREW = { error: 'failed', ok: false } as const;
const OUTDATED = { error: 'outdated', ok: false } as const;

/**
 * A server action's result, with a throw as a failed result: every caller
 * rolls back and says so instead of leaving its optimistic change in place.
 * A tab older than the site (a deployment since it loaded, past Skew
 * Protection's window) is `outdated`: trying again can't help, a reload can.
 */
export const settled = <R extends Result>(
  send: () => Promise<R>,
): Promise<R | typeof THREW | typeof OUTDATED> =>
  send().catch((error: unknown) =>
    unstable_isUnrecognizedActionError(error) ? OUTDATED : THREW,
  );

/**
 * One chain per show: a run's requests never interleave with another run's
 * for the same show, so the server applies them in the order the store
 * settles them. A send that throws is a failed result.
 */
export function createChains() {
  const chains = new Map<number, Promise<unknown>>();
  return (seriesId: number, send: Send): Promise<Result> => {
    const result = (chains.get(seriesId) ?? Promise.resolve()).then(() =>
      settled(send),
    );
    chains.set(seriesId, result);
    return result;
  };
}
