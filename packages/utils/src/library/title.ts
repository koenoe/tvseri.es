import type { LIBRARY_LETTERS } from '@tvseri.es/schemas';

export type LibraryLetter = (typeof LIBRARY_LETTERS)[number];

const COMBINING_MARKS = /[̀-ͯ]/g;
const LEADING_PUNCTUATION = /^[^\p{L}\p{N}]+/u;
const LEADING_ARTICLE = /^(?:the|a|an)\s+(?=\S)/;

/** Lowercase, accents dropped (NFD), spaces collapsed: "Señor Café" → "senor cafe" */
export const foldTitle = (title: string): string =>
  title
    .normalize('NFD')
    .replace(COMBINING_MARKS, '')
    .toLowerCase()
    .replace(/\s+/g, ' ')
    .trim();

/**
 * The title A–Z sorts and the rail use, as Plex does: folded, leading
 * punctuation and a leading "The", "A" or "An" dropped. "The Bear" → "bear",
 * "A Very English Scandal" → "very english scandal"; "The" alone stays.
 */
export const sortTitle = (title: string): string =>
  foldTitle(title)
    .replace(LEADING_PUNCTUATION, '')
    .replace(LEADING_ARTICLE, '');

/** The rail letter of a title: `a` to `z`, or `#` for digits and non-Latin titles */
export const initialOf = (title: string): LibraryLetter => {
  const first = sortTitle(title).charAt(0);
  return first >= 'a' && first <= 'z' ? (first as LibraryLetter) : '#';
};

/** `#` first, then a to z (the rail's order and the A–Z sort's first key) */
export const letterRank = (letter: LibraryLetter): number =>
  letter === '#' ? 0 : letter.charCodeAt(0) - 96;

/**
 * Find in a shelf: a prefix of the folded title, with or without its
 * article. "white" and "the white" find "The White Lotus"; "lotus" doesn't.
 */
export const matchesFind = (title: string, query: string): boolean => {
  const needle = foldTitle(query);
  return (
    needle === '' ||
    foldTitle(title).startsWith(needle) ||
    sortTitle(title).startsWith(needle)
  );
};

const collator = new Intl.Collator('en', {
  numeric: true,
  sensitivity: 'base',
});

/** How sort titles compare: natural numbers ("2 Broke" before "11.22.63"), case and accents ignored */
export const compareTitles = (a: string, b: string): number =>
  collator.compare(a, b);
