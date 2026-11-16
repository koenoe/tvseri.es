/**
 * How long a sent sign-in code works, in seconds. The patched code provider
 * expires codes after it (`CodeProvider({ ttl })`), and every place that
 * tells the person (the email, the code page) says it from this value.
 */
export const CODE_TTL = 60 * 10;

/** “10 minutes”, “1 minute”: a code lifetime as the copy says it */
export function formatCodeLifetime(seconds: number): string {
  const minutes = Math.max(1, Math.round(seconds / 60));
  return `${minutes} ${minutes === 1 ? 'minute' : 'minutes'}`;
}
