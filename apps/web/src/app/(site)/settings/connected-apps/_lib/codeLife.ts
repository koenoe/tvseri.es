/**
 * How much of a link code's life is left, 1 (just minted) to 0 (expired):
 * the expiry bar under the code's digits.
 */
export function codeLifeLeft(
  now: number,
  mintedAt: number,
  expiresAt: number,
): number {
  const life = expiresAt - mintedAt;
  if (life <= 0) {
    return 0;
  }
  return Math.min(1, Math.max(0, (expiresAt - now) / life));
}
