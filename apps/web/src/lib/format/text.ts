import { formatCappedCount, formatGrouped } from '@/lib/formatCount';

/**
 * `1 episode`, `4,812 episodes` (grouped, the boards' number format); `many`
 * for irregular plurals: `plural(n, 'series', 'series')`.
 */
export const plural = (count: number, one: string, many = `${one}s`) =>
  `${formatGrouped(count)} ${count === 1 ? one : many}`;

/**
 * `plural` for a TMDB count, which stops at its cap: `20,000+ series`
 * (`formatCappedCount`).
 */
export const pluralCapped = (count: number, one: string, many = `${one}s`) =>
  `${formatCappedCount(count)} ${count === 1 ? one : many}`;

/** "Executive Producer" → "Executive producer": one sentence, as the boards write job titles. */
export const sentenceCase = (text: string) =>
  text.charAt(0).toUpperCase() + text.slice(1).toLowerCase();
