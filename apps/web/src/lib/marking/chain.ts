import {
  type EpisodeRef,
  MAX_EPISODES_PER_MARK_ACTION,
  type RestoreWhen,
} from '@tvseri.es/schemas';
import { chunk } from '@tvseri.es/utils';

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

export const watchedOf = (result: Result): ReadonlyArray<ProgressItem> =>
  result.ok &&
  typeof result.data === 'object' &&
  result.data !== null &&
  'watched' in result.data
    ? (result.data as { watched: ReadonlyArray<ProgressItem> }).watched
    : [];

const unmarkedOf = (result: Result): ReadonlyArray<EpisodeRef> =>
  result.ok &&
  typeof result.data === 'object' &&
  result.data !== null &&
  'unmarked' in result.data
    ? (result.data as { unmarked: ReadonlyArray<EpisodeRef> }).unmarked
    : [];

/**
 * The skips the API refused: requested, but not in the skipped set it
 * answers with (an episode TMDB doesn't list is dropped).
 */
export const refusedOf = (result: Result): ReadonlyArray<EpisodeCode> =>
  result.ok &&
  typeof result.data === 'object' &&
  result.data !== null &&
  'refused' in result.data
    ? (result.data as { refused: ReadonlyArray<EpisodeCode> }).refused
    : [];

/** The store ops for what a failed write did save. */
export const savedOps = (
  partial: NonNullable<Extract<Result, { ok: false }>['partial']>,
): MarkingOp[] => [
  ...(partial.watched?.length
    ? [{ kind: 'mark', records: recordsFrom(partial.watched) } as const]
    : []),
  ...(partial.unmarked?.length
    ? [{ codes: partial.unmarked.map(codeOf), kind: 'unmark' } as const]
    : []),
];

/**
 * Runs calls in order and stops at the first failure; the watched records of
 * every call are passed on together (the corrections).
 */
export async function sequence(calls: ReadonlyArray<Send>): Promise<Result> {
  const watched: ProgressItem[] = [];
  const unmarked: EpisodeRef[] = [];
  const refused: EpisodeCode[] = [];
  for (const call of calls) {
    const result = await call();
    if (!result.ok) {
      // What the earlier calls saved stays saved: pass it on.
      return {
        ...result,
        partial: {
          unmarked: [...unmarked, ...(result.partial?.unmarked ?? [])],
          watched: [...watched, ...(result.partial?.watched ?? [])],
        },
      };
    }
    watched.push(...watchedOf(result));
    unmarked.push(...unmarkedOf(result));
    refused.push(...refusedOf(result));
  }
  return { data: { refused, unmarked, watched }, ok: true };
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
        calls.push(() => actions.updateSeriesPrefs(seriesId, { unskip: part }));
      }
    } else if (op.kind === 'skip') {
      for (const part of chunk(op.codes, MAX_EPISODES_PER_MARK_ACTION)) {
        calls.push(() =>
          actions.updateSeriesPrefs(seriesId, { skip: part }).then((result) => {
            if (!result.ok) {
              return result;
            }
            const kept = new Set(result.data.skipped);
            return {
              ...result,
              data: { refused: part.filter((code) => !kept.has(code)) },
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

/**
 * A server action's result, with a throw (the network, a new deployment's
 * actions) as a failed result: every caller rolls back and says so instead
 * of leaving its optimistic change in place.
 */
export const settled = <R extends Result>(
  send: () => Promise<R>,
): Promise<R | typeof THREW> => send().catch(() => THREW);

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
