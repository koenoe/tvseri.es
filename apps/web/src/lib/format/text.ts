import { formatCappedCount } from '@/lib/formatCount';

/**
 * `plural` for a TMDB count, which stops at its cap: `20,000+ series`
 * (`formatCappedCount`).
 */
export const pluralCapped = (count: number, one: string, many = `${one}s`) =>
  `${formatCappedCount(count)} ${count === 1 ? one : many}`;

/** "Executive Producer" → "Executive producer": the site writes job titles in sentence case. */
export const sentenceCase = (text: string) =>
  text.charAt(0).toUpperCase() + text.slice(1).toLowerCase();
