/**
 * The result of a marking action. Isomorphic (no server imports), so client
 * code can read it.
 */
export type ActionError =
  | 'unauthenticated'
  | 'invalid'
  | 'not-found'
  | 'failed';

/**
 * What a failed multi-request write did save before it failed (the server
 * keeps it): the watched records written and the episodes unmarked, so the
 * client can settle exactly that.
 */
export type PartialWrite = Readonly<{
  watched?: ReadonlyArray<
    Readonly<{
      seasonNumber: number;
      episodeNumber: number;
      watchedAt: number;
      dateUnknown?: true;
      runtime: number;
      watchProviderName?: string;
    }>
  >;
  unmarked?: ReadonlyArray<
    Readonly<{ seasonNumber: number; episodeNumber: number }>
  >;
}>;

/**
 * `at`: server time (epoch ms) when the write finished, so a page seed
 * fetched before it never undoes it (`store.seed`).
 */
export type ActionResult<T = undefined> = Readonly<
  | { ok: true; data: T; at?: number }
  | { ok: false; error: ActionError; partial?: PartialWrite; at?: number }
>;

export const okResult = <T>(data: T): ActionResult<T> => ({
  at: Date.now(),
  data,
  ok: true,
});

export const actionError = (error: ActionError, partial?: PartialWrite) =>
  partial
    ? ({ at: Date.now(), error, ok: false, partial } as const)
    : ({ error, ok: false } as const);
