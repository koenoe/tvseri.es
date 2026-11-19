'use server';

import { createEpisodeMatcher, importItemOf } from '@tvseri.es/import';
import {
  type ConnectionService,
  ConnectionServiceSchema,
  type ConnectionUnresolved,
  type ConnectionUnresolvedPage,
  ConnectionUnresolvedPageSchema,
  type ImportBatch,
  UNRESOLVED_GROUPS,
  UNRESOLVED_KEYS_PER_CALL,
} from '@tvseri.es/schemas';
import { chunk, createLimiter } from '@tvseri.es/utils';
import { refresh } from 'next/cache';
import * as v from 'valibot';

import { getViewer } from '@/auth/viewer';
import { apiFailure } from '@/lib/actions/apiFailure';
import {
  type ActionError,
  type ActionResult,
  actionError,
  okResult,
} from '@/lib/actions/result';
import { apiFetch } from '@/lib/api/client';
import { searchSeries } from '@/lib/import/loaders';
import { loadSeriesForWrite } from '@/lib/series/forWrite';
import { loadSeason } from '@/lib/series/loaders';

import {
  CursorSchema,
  DismissInputSchema,
  type DismissOutcome,
  ResolveInputSchema,
  type ResolveOutcome,
  type ReviewEntry,
  type ReviewPick,
} from './_lib/serviceReview';

/**
 * A service card's review list: the next page, a fix (the viewer's pick,
 * matched again here exactly as the import matches, so a doubtful pick is
 * never written) and Skip, which closes entries for good. Each acts on the
 * signed-in viewer's own list only.
 */

/** The catalogue reads one fix may run at once (a series pick covers many) */
const CATALOG_CONCURRENCY = 4;
const UNRESOLVED = '/me/connections/:service/unresolved';

/** Where a failure is logged */
const labelOf = (service: ConnectionService) => `${service}-review`;

/** Next page of the list ("Show more"); without a cursor, the first again */
export async function moreUnresolved(
  serviceInput: unknown,
  cursor: unknown,
): Promise<ActionResult<ConnectionUnresolvedPage>> {
  const service = v.safeParse(ConnectionServiceSchema, serviceInput);
  const parsed = v.safeParse(CursorSchema, cursor);
  if (!service.success || !parsed.success) {
    return actionError('invalid');
  }
  const viewer = await getViewer();
  if (!viewer) {
    return actionError('unauthenticated');
  }
  try {
    const page = await apiFetch(UNRESOLVED, {
      accessToken: viewer.accessToken,
      params: { service: service.output },
      query: parsed.output === null ? undefined : { cursor: parsed.output },
      schema: ConnectionUnresolvedPageSchema,
    });
    return okResult(page);
  } catch (error) {
    return apiFailure(labelOf(service.output), error);
  }
}

type Chunked = Readonly<{
  closed: ReadonlyArray<string>;
  failed: ActionError | null;
  written: number;
}>;

/**
 * Posts `entries` to the API in its own chunks of 100 keys, in order; a
 * failure stops there, and the keys the earlier chunks closed stay closed.
 * The card is refreshed when anything closed.
 */
async function postInChunks<T>(
  label: string,
  entries: ReadonlyArray<T>,
  keyOf: (entry: T) => string,
  post: (chunk: ReadonlyArray<T>) => Promise<number>,
): Promise<Chunked> {
  const closed: Array<string> = [];
  let written = 0;
  let failed: ActionError | null = null;
  for (const part of chunk(entries, UNRESOLVED_KEYS_PER_CALL)) {
    try {
      written += await post(part);
    } catch (error) {
      failed = apiFailure(label, error).error;
      break;
    }
    closed.push(...part.map(keyOf));
  }
  if (closed.length > 0) {
    refresh();
  }
  return { closed, failed, written };
}

type Settled = Readonly<
  | { key: string; item: ImportBatch[number] }
  | { key: string; open: ConnectionUnresolved }
>;

/** One entry against the pick: a write, or the matcher's next question */
async function settle(
  match: ReturnType<typeof createEpisodeMatcher>['match'],
  entry: ReviewEntry,
  pick: ReviewPick,
  now: number,
): Promise<Settled> {
  const result = await match({
    ...entry.row,
    ...(pick.kind === 'episode'
      ? { episodeNumber: pick.episodeNumber, seasonNumber: pick.seasonNumber }
      : {}),
    seriesId: pick.seriesId,
  });
  if (result.kind === 'matched') {
    // The API marks it as watched on the service
    return { item: importItemOf(result, entry.watchedAt, now), key: entry.key };
  }
  const { problem } = result;
  const open: ConnectionUnresolved = {
    ...entry,
    kind: problem.kind,
    ...(problem.kind === 'ambiguous'
      ? { candidates: [...problem.candidates] }
      : {}),
    ...(problem.kind === 'episode-not-found'
      ? { episodes: [...problem.episodes], series: problem.series }
      : {}),
  };
  return { key: entry.key, open };
}

/**
 * A pick for one review item's entries (a series for all of them, or an
 * episode for one): what matched is written and leaves the list; what
 * didn't comes back open with the matcher's question (a series without that
 * episode asks which episode it was). Written in the API's chunks: a failure
 * part-way still answers with what closed, and why it stopped.
 */
export async function resolveEntries(
  serviceInput: unknown,
  input: unknown,
): Promise<ActionResult<ResolveOutcome>> {
  const service = v.safeParse(ConnectionServiceSchema, serviceInput);
  const parsed = v.safeParse(ResolveInputSchema, input);
  if (!service.success || !parsed.success) {
    return actionError('invalid');
  }
  const viewer = await getViewer();
  if (!viewer) {
    return actionError('unauthenticated');
  }
  const { entries, pick } = parsed.output;
  const label = labelOf(service.output);
  const limit = createLimiter(CATALOG_CONCURRENCY);
  const { match } = createEpisodeMatcher({
    getSeason: (id, season) => limit(() => loadSeason(id, season)),
    getTvSeries: (id) => limit(() => loadSeriesForWrite(id)),
    searchTvSeries: (title) => limit(() => searchSeries(title)),
  });
  const now = Date.now();
  let settled: ReadonlyArray<Settled>;
  try {
    settled = await Promise.all(
      entries.map((entry) => settle(match, entry, pick, now)),
    );
  } catch (error) {
    return apiFailure(label, error);
  }
  const toWrite = settled.flatMap((one) => ('item' in one ? [one] : []));
  const { closed, failed, written } = await postInChunks(
    label,
    toWrite,
    ({ key }) => key,
    async (part) => {
      const reply = await apiFetch<Readonly<{ written: number }>>(
        `${UNRESOLVED}/resolve`,
        {
          accessToken: viewer.accessToken,
          body: {
            items: part.map(({ item }) => item),
            keys: part.map(({ key }) => key),
          },
          method: 'POST',
          params: { service: service.output },
        },
      );
      return reply.written;
    },
  );
  if (failed && closed.length === 0) {
    return actionError(failed);
  }
  return okResult({
    closed,
    failed,
    open: settled.flatMap((one) => ('open' in one ? [one.open] : [])),
    written,
  });
}

/** Skip: the entries leave the list, and later syncs never bring them back */
export async function dismissEntries(
  serviceInput: unknown,
  input: unknown,
): Promise<ActionResult<DismissOutcome>> {
  const service = v.safeParse(ConnectionServiceSchema, serviceInput);
  const parsed = v.safeParse(DismissInputSchema, input);
  if (!service.success || !parsed.success) {
    return actionError('invalid');
  }
  const viewer = await getViewer();
  if (!viewer) {
    return actionError('unauthenticated');
  }
  const { closed, failed } = await postInChunks(
    labelOf(service.output),
    parsed.output.keys,
    (key) => key,
    async (keys) => {
      await apiFetch(`${UNRESOLVED}/dismiss`, {
        accessToken: viewer.accessToken,
        body: { keys },
        method: 'POST',
        params: { service: service.output },
      });
      return 0;
    },
  );
  if (failed && closed.length === 0) {
    return actionError(failed);
  }
  return okResult({ closed, failed });
}

/**
 * Skip all for one review group ("Which series?" or "Not found"): its open
 * entries closed for good on the server, the ones the card hasn't loaded
 * too; the refreshed card drops them.
 */
export async function skipAllEntries(
  serviceInput: unknown,
  groupInput: unknown,
): Promise<ActionResult<Readonly<{ closed: number }>>> {
  const service = v.safeParse(ConnectionServiceSchema, serviceInput);
  const group = v.safeParse(v.picklist(UNRESOLVED_GROUPS), groupInput);
  if (!service.success || !group.success) {
    return actionError('invalid');
  }
  const viewer = await getViewer();
  if (!viewer) {
    return actionError('unauthenticated');
  }
  try {
    const { closed } = await apiFetch<Readonly<{ closed: number }>>(
      `${UNRESOLVED}/dismiss-all`,
      {
        accessToken: viewer.accessToken,
        method: 'POST',
        params: { service: service.output },
        query: { group: group.output },
      },
    );
    refresh();
    return okResult({ closed });
  } catch (error) {
    return apiFailure(labelOf(service.output), error);
  }
}
