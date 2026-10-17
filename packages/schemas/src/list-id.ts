import * as v from 'valibot';

/**
 * Lists that can be read through the API (`GET /user/:id/list/:list`).
 *
 * Note: `RESUMING_SOON` exists in the database but the API doesn't expose it for reading,
 * so it is deliberately not part of this list.
 */
export const LIST_IDS = [
  'FAVORITES',
  'IN_PROGRESS',
  'WATCHED',
  'WATCHLIST',
] as const;

export const ListIdSchema = v.picklist(LIST_IDS);

export type ListId = v.InferOutput<typeof ListIdSchema>;

/**
 * Accepts a list id in any casing (URLs use lower case) and outputs the canonical `ListId`.
 */
export const ListIdParamSchema = v.pipe(
  v.string(),
  v.toUpperCase(),
  ListIdSchema,
);

/**
 * Parses a list id from a URL segment. Returns `null` for unknown lists.
 */
export function parseListIdParam(value: string): ListId | null {
  const result = v.safeParse(ListIdParamSchema, value);
  return result.success ? result.output : null;
}
