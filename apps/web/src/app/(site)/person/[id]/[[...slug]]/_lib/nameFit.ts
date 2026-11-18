import type { CSSProperties } from 'react';

/** The display face's average advance per character (em), capitals included */
const AVERAGE = 0.61;

/** A word this wide (em) fits the narrowest column at the display size */
const FITS = 4.5;

/**
 * A person's name wraps between words, so its longest word decides: when
 * that word is wider than the column at the display size ("Attenborough"
 * in the 300px sidebar), the whole name is set smaller so the word fits the
 * column (`100cqw`: the heading's box is a container). Short names keep the
 * display size untouched.
 */
export function nameFit(name: string): CSSProperties | undefined {
  const longest = Math.max(
    0,
    ...name.split(/[\s-]+/).map((word) => word.length),
  );
  const em = longest * AVERAGE;
  if (em <= FITS) {
    return undefined;
  }
  return {
    fontSize: `min(var(--t-display-size), calc(100cqw / ${em.toFixed(2)}))`,
    lineHeight: 1.15,
  };
}
