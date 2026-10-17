/**
 * One page of a cursor-paginated collection.
 *
 * Wire protocol shared by every "load more" endpoint: request with `?cursor=<nextCursor>`,
 * stop when `nextCursor` is `null`.
 */
export type Page<T> = Readonly<{
  items: ReadonlyArray<T>;
  nextCursor: string | null;
}>;
