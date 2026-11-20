/**
 * What every server action answers: `ok` with its data, or one error word
 * (never the API's own text). Isomorphic (no server imports), so client code
 * can read it. An action with errors of its own widens `E`
 * (`ActionResult<T, ActionError | 'taken'>`); `apiFailure` maps API errors
 * to these words.
 */
export type ActionError =
  | 'unauthenticated'
  | 'invalid'
  | 'not-found'
  | 'failed'
  /** client-side only: the site was deployed since this tab loaded and no
   * longer has the action it called (`settled`) */
  | 'outdated';

/**
 * What a failed multi-request write did save before it failed (the server
 * keeps it): the watched records written, the episodes unmarked, skipped
 * and un-skipped, so the client can settle exactly that.
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
  /** Episode codes skipped (the API kept them) and un-skipped */
  skipped?: ReadonlyArray<string>;
  unskipped?: ReadonlyArray<string>;
}>;

/**
 * `at`: server time (epoch ms) when the write finished, so a marking page
 * seed fetched before it never undoes it (`store.seed`). `partial`: what a
 * failed marking write did save.
 */
export type ActionResult<
  T = undefined,
  E extends string = ActionError,
> = Readonly<
  | { ok: true; data: T; at?: number }
  | { ok: false; error: E; partial?: PartialWrite; at?: number }
>;

export const okResult = <T>(data: T): ActionResult<T, never> => ({
  at: Date.now(),
  data,
  ok: true,
});

export const actionError = <E extends string>(
  error: E,
  partial?: PartialWrite,
) =>
  partial
    ? ({ at: Date.now(), error, ok: false, partial } as const)
    : ({ error, ok: false } as const);
