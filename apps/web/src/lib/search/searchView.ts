import type { MemberMatch } from '@tvseri.es/schemas';
import * as v from 'valibot';

const SearchShowSchema = v.object({
  id: v.number(),
  posterImage: v.string(),
  releaseYear: v.string(),
  slug: v.string(),
  title: v.string(),
});

const SearchPersonSchema = v.object({
  id: v.number(),
  image: v.string(),
  knownFor: v.array(v.string()),
  knownForDepartment: v.optional(v.string()),
  name: v.string(),
  slug: v.string(),
});

/**
 * What `/api/search` answers: the API's `SearchResults` trimmed to the fields
 * the overlay draws (poster, title, year; face, name, role, known for).
 * Valibot strips every other key, so the browser downloads only these.
 */
export const SearchViewSchema = v.object({
  best: v.nullable(v.picklist(['people', 'series'])),
  people: v.array(SearchPersonSchema),
  series: v.array(SearchShowSchema),
});

type SearchResultsView = v.InferOutput<typeof SearchViewSchema>;

/**
 * What the overlay draws: `/api/search`'s answer, or, for a signed-in
 * viewer's `@handle` query, the member with exactly that handle
 * (`/api/me/member`, `best: 'members'`).
 */
export type SearchView = Omit<SearchResultsView, 'best'> &
  Readonly<{
    best: SearchResultsView['best'] | 'members';
    members?: ReadonlyArray<MemberMatch>;
  }>;
export type SearchShow = SearchView['series'][number];
export type SearchPersonView = SearchView['people'][number];
