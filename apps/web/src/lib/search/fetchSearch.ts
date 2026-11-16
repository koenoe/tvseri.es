import { MemberHandleSchema, type MemberMatch } from '@tvseri.es/schemas';
import * as v from 'valibot';

import type { SearchView } from './searchView';

/** Answers kept per query while the page lives: going back a keystroke is instant. */
const MAX_CACHED = 50;

type Options = Readonly<{
  /**
   * Whether to look up a member by handle (signed in), read when a query
   * is sent. Without it (or signed out) only `/api/search` is asked.
   */
  members?: () => boolean;
}>;

async function getJson<T>(url: string, signal: AbortSignal): Promise<T> {
  const response = await fetch(url, { signal });
  if (!response.ok) {
    throw new Error(`Search failed with status ${response.status}`);
  }
  return (await response.json()) as T;
}

/** The member with exactly this handle, or none (`/api/me/member`). */
async function lookUpMember(
  key: string,
  signal: AbortSignal,
): Promise<ReadonlyArray<MemberMatch>> {
  const { member } = await getJson<{ member: MemberMatch | null }>(
    `/api/me/member?handle=${encodeURIComponent(key)}`,
    signal,
  );
  return member ? [member] : [];
}

/**
 * The overlay's client for `/api/search`. The key is already normalised
 * (`normalizeSearchQuery`), so every spelling hits one CDN entry. A failed
 * response rejects (never read as results); an abort rejects with the
 * AbortError.
 *
 * Signed in (`members`), a query that starts with `@` and is shaped like a
 * handle (`MemberHandleSchema`) asks only for the member with exactly that
 * handle, instead of the search. Any other query asks only `/api/search`:
 * search is the hottest typing path, so a bare word never costs a lookup.
 * A failed lookup is a failed search (the error row).
 */
export function createSearchClient({ members }: Options = {}) {
  const answers = new Map<string, SearchView>();

  const search = (key: string, signal: AbortSignal) =>
    getJson<SearchView>(`/api/search?q=${encodeURIComponent(key)}`, signal);

  async function answer(key: string, signal: AbortSignal): Promise<SearchView> {
    if (
      !key.startsWith('@') ||
      !members?.() ||
      !v.is(MemberHandleSchema, key)
    ) {
      return search(key, signal);
    }
    return {
      best: 'members',
      members: await lookUpMember(key, signal),
      people: [],
      series: [],
    };
  }

  async function fetchSearch(
    key: string,
    signal: AbortSignal,
  ): Promise<SearchView> {
    const results = await answer(key, signal);
    answers.delete(key);
    answers.set(key, results);
    if (answers.size > MAX_CACHED) {
      const oldest = answers.keys().next().value;
      if (oldest !== undefined) {
        answers.delete(oldest);
      }
    }
    return results;
  }

  const cached = (key: string) => answers.get(key);

  return { cached, fetchSearch };
}
