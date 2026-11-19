import type { TasteMatchResponse } from '@tvseri.es/schemas';

/** The card's top line without the level word */
export function compatibilityLead(username: string, hasLevel: boolean): string {
  return hasLevel
    ? 'Your compatibility'
    : `Not enough shared yet to match you with ${username}.`;
}

/** How many shows the proof names */
export const PROOF_SHOWS = 3;

/** The words around the linked names of the proof line */
export type ProofParts = Readonly<{ before: string; after: string }>;

export function proofParts(
  match: Pick<
    TasteMatchResponse['match'],
    'level' | 'notEnough' | 'sharedCount'
  >,
): ProofParts {
  const { level, notEnough, sharedCount } = match;
  const shows = `${sharedCount} series`;
  if (notEnough || !level) {
    return {
      after: '.',
      before: `You share ${shows} so far, under the 5 a level needs: `,
    };
  }
  if (level === 'very-low') {
    return {
      after: '. Here’s what they’d show you.',
      before: `Different taste: you share ${shows}, like `,
    };
  }
  return { after: '.', before: 'You both watch ' };
}

/** The separators between linked names: ", " then " and " before the last */
export const separatorBefore = (index: number, total: number): string => {
  if (index === 0) {
    return '';
  }
  return index === total - 1 ? ' and ' : ', ';
};

/** The proof when no shared show can be named */
export const NO_SHARED_LINE = 'You share no series yet.';
