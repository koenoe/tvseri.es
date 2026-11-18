import 'server-only';

import {
  SERIES_STATES_MAX_IDS,
  type SeriesStates,
  SeriesStatesSchema,
} from '@tvseri.es/schemas';
import { chunk } from '@tvseri.es/utils';
import { unstable_rethrow } from 'next/navigation';
import { connection } from 'next/server';
import { cache } from 'react';

import { getViewer } from '@/auth/viewer';
import { apiFetch } from '@/lib/api/client';

import {
  type ControlStates,
  NEW_TO_YOU,
  toControlState,
} from '../controlState';

/**
 * The viewer's state for the series a page has marking controls for
 * (`GET /me/series-states`, private): one read per request, however many
 * controls ask. Signed out: `null`, and nothing is read. Every asked id has
 * a state: a failed or unreadable answer gives the new-to-you pair, so a
 * control never crashes its page or keeps its ghost.
 *
 * Never in a `use cache`: the answer is the viewer's own. `React.cache`
 * dedupes it within the request only.
 */

type Deps = Readonly<{
  /** Per-request memoisation (React's `cache`) */
  dedupe: <A extends unknown[], R>(fn: (...args: A) => R) => (...args: A) => R;
  /** One call for at most `SERIES_STATES_MAX_IDS` ids */
  fetchStates: (
    accessToken: string,
    ids: ReadonlyArray<number>,
  ) => Promise<SeriesStates>;
  /** The verified viewer's token, null signed out */
  viewerToken: () => Promise<string | null>;
}>;

/** Distinct positive ids in ascending order, as one string (`React.cache` compares by identity) */
const keyOf = (ids: ReadonlyArray<number>) =>
  [...new Set(ids.filter((id) => Number.isInteger(id) && id > 0))]
    .sort((a, b) => a - b)
    .join(',');

const everyIdNew = (ids: ReadonlyArray<number>): ControlStates =>
  Object.fromEntries(ids.map((id) => [id, NEW_TO_YOU]));

export function createSeriesStatesLoader(deps: Deps) {
  const readChunk = async (
    accessToken: string,
    ids: ReadonlyArray<number>,
  ): Promise<ControlStates> => {
    try {
      const { states } = await deps.fetchStates(accessToken, ids);
      return Object.fromEntries(
        ids.map((id) => {
          const state = states[String(id)];
          return [id, state ? toControlState(state) : NEW_TO_YOU];
        }),
      );
    } catch (error) {
      // Next's own control flow (a prerender ending) is not a failure
      unstable_rethrow(error);
      return everyIdNew(ids);
    }
  };

  const loadKey = deps.dedupe(
    async (key: string): Promise<ControlStates | null> => {
      const accessToken = await deps.viewerToken().catch((error: unknown) => {
        unstable_rethrow(error);
        return null;
      });
      if (!accessToken) {
        return null;
      }
      const ids = key === '' ? [] : key.split(',').map(Number);
      const parts = await Promise.all(
        chunk(ids, SERIES_STATES_MAX_IDS).map((part) =>
          readChunk(accessToken, part),
        ),
      );
      return Object.assign({}, ...parts);
    },
  );

  return (ids: ReadonlyArray<number>) => loadKey(keyOf(ids));
}

/**
 * The states of `ids` for the signed-in viewer (null signed out). Start it
 * without awaiting and hand the promise to the controls: each reads it in
 * its own Suspense boundary.
 */
export const loadSeriesStates = createSeriesStatesLoader({
  dedupe: cache,
  fetchStates: (accessToken, ids) =>
    apiFetch('/me/series-states', {
      accessToken,
      query: { ids: ids.join(',') },
      schema: SeriesStatesSchema,
    }),
  viewerToken: async () => {
    // request-time, always: a prerender never settles it (a viewer that
    // resolves without the cookie, `isLocalWithoutSecret`, would bake the
    // signed-out pair into the shared shell)
    await connection();
    return (await getViewer())?.accessToken ?? null;
  },
});
