import { cacheLife } from 'next/cache';
import { expect, vi } from 'vitest';

/**
 * Shared bits of the loader tests (mock `next/cache` and `apiFetch` in the
 * test file itself; `vi.mock` is hoisted per file).
 */
export const UNAVAILABLE = { unavailable: true };

/**
 * The profile of the run's only `cacheLife` call: a loader run sets exactly
 * one (Next uses one per run). Clear the mock between runs.
 */
export const onlyLife = () => {
  const { calls } = vi.mocked(cacheLife).mock;
  expect(calls).toHaveLength(1);
  return calls[0]?.[0];
};

/**
 * For a loader built on other cached loaders: in tests `'use cache'` scopes
 * don't separate, so the inner loaders' calls come first. Asserts the outer
 * loader set exactly one profile after `inner` calls, and returns it.
 */
export const ownLife = (inner: number) => {
  const { calls } = vi.mocked(cacheLife).mock;
  expect(calls).toHaveLength(inner + 1);
  return calls.at(-1)?.[0];
};

const series = (id: number) => ({
  backdropImage: 'b.jpg',
  firstAirDate: '2020-01-01',
  genres: [{ id: 80, name: 'Crime', slug: 'crime' }],
  id,
  originalTitle: `Show ${id}`,
  posterImage: 'p.jpg',
  slug: `show-${id}`,
  title: `Show ${id}`,
  voteAverage: 8,
  voteCount: 2000,
});

/** One `GET /discover` answer with these show ids */
export const discoverPage = (...ids: number[]) => ({
  items: ids.map(series),
  totalNumberOfItems: ids.length,
  totalNumberOfPages: 1,
});
