/**
 * An external service (TMDB, MDBList, OMDb) can't be asked right now: its
 * circuit breaker is open after a 429 or repeated failures, or the call
 * couldn't get a slot of this instance's budget in time. Thrown instead of
 * calling, so it fails in microseconds and holds no Lambda.
 *
 * Callers handle it like any failed upstream call (they catch any error):
 * the Cache table serves a stale value where it holds one, partial answers
 * are short-cached, and an uncaught one becomes a 503 with `Retry-After`
 * (app.ts), which CloudFront keeps 10 s and the web treats as an outage.
 */
export class UpstreamUnavailableError extends Error {
  readonly source: string;
  /** When asking again makes sense, in whole seconds (at least 1) */
  readonly retryAfterSeconds: number;

  constructor(source: string, retryAfterSeconds: number, reason: string) {
    super(`${source} unavailable: ${reason}`);
    this.name = 'UpstreamUnavailable';
    this.source = source;
    this.retryAfterSeconds = Math.max(1, Math.ceil(retryAfterSeconds));
  }
}

/** The UpstreamUnavailableError behind `error`, also when wrapped as `cause` */
export const findUpstreamUnavailable = (
  error: unknown,
): UpstreamUnavailableError | undefined => {
  let current: unknown = error;
  for (let depth = 0; depth < 5 && current instanceof Error; depth++) {
    if (current instanceof UpstreamUnavailableError) {
      return current;
    }
    current = current.cause;
  }
  return undefined;
};
