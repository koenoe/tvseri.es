import type { Side } from './rows';

/**
 * The card's heading line: signed in, the deck has only
 * series the viewer has in none of their lists, so the line can say so;
 * signed out it can't.
 */
export const VERSUS_LINE = {
  signedIn: 'Similar, and you haven’t seen either. Which first?',
  signedOut: 'Similar. Which first?',
} as const;

/** Under the comparison until a poster is chosen */
export const VERSUS_HINT = 'Tap the one you would start';

export const ANOTHER_PAIR_LABEL = 'Another pair';

/** What a screen reader hears when the pair or the choice changes */
export function versusAnnouncement(
  titles: Readonly<Record<Side, string>>,
  chosen: Side | null,
): string {
  return chosen
    ? `You would start ${titles[chosen]}`
    : `${titles.left} or ${titles.right}`;
}
