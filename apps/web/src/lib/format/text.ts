import { formatGrouped } from '@/lib/formatCount';

/**
 * `1 episode`, `4,812 episodes` (grouped, the boards' number format); `many`
 * for irregular plurals: `plural(n, 'series', 'series')`.
 */
export const plural = (count: number, one: string, many = `${one}s`) =>
  `${formatGrouped(count)} ${count === 1 ? one : many}`;

/** "Executive Producer" → "Executive producer": one sentence, as the boards write job titles. */
export const sentenceCase = (text: string) =>
  text.charAt(0).toUpperCase() + text.slice(1).toLowerCase();
