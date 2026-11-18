/**
 * The success screen's traffic light:
 * imported ÷ importable rows. Rows skipped on purpose (films, specials,
 * repeats) are not in the denominator.
 */

export type Outcome = 'good' | 'mid' | 'low';

/** ≥ 95% green, 75–94% amber, < 75% red (exact fractions, not the rounded %) */
export const outcomeOf = (rate: number): Outcome =>
  rate >= 0.95 ? 'good' : rate >= 0.75 ? 'mid' : 'low';

/** 0 to 1; an empty import counts as complete. */
export const rateOf = (imported: number, importable: number): number =>
  importable > 0 ? Math.min(1, imported / importable) : 1;

/**
 * "98%": rounded, but never across a threshold, so an amber 94.6% reads
 * "94%", not a green-looking "95%".
 */
export const percentOf = (rate: number): string => {
  const rounded = Math.round(rate * 100);
  const capped =
    rate < 0.75
      ? Math.min(rounded, 74)
      : rate < 0.95
        ? Math.min(rounded, 94)
        : rounded;
  return `${capped}%`;
};

/** The tones as `r g b` (rgb(52 179 106 / 0.24) in CSS). */
export const OUTCOME_RGB: Readonly<Record<Outcome, string>> = {
  good: '52 179 106',
  low: '222 88 88',
  mid: '222 154 44',
};

/** The pill's bold word and the line under the number. */
export const OUTCOME_COPY: Readonly<
  Record<Outcome, Readonly<{ head: string; sub: string }>>
> = {
  good: {
    head: 'Imported',
    sub: 'Everything that could come in, came in.',
  },
  low: {
    head: 'A lot didn’t match',
    sub: 'Have a look below: most of it is fixable in a few taps.',
  },
  mid: {
    head: 'Most of it came in',
    sub: 'Sort out the rest below: each fix adds to the number.',
  },
};
