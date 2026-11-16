// The account's createdAt comes from the auth server's clock, the login's
// start from this server's; a minute covers the difference between them.
const CLOCK_SKEW_MS = 60_000;

/**
 * Whether this sign-in created the account: it was created after this
 * browser started the login (`startedAt`, from the login cookie). A
 * returning person's account is older than any login they start. Without a
 * start time (a login cookie from before this field existed) it's no.
 */
export function isFirstSignIn(
  createdAt: string,
  startedAt: number | null,
): boolean {
  const created = Date.parse(createdAt);
  return (
    startedAt !== null &&
    !Number.isNaN(created) &&
    created >= startedAt - CLOCK_SKEW_MS
  );
}
