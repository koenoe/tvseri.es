import { LIBRARY_LETTERS } from '@tvseri.es/schemas';
import { plural } from '@tvseri.es/utils';

type Letter = (typeof LIBRARY_LETTERS)[number];

/** "A–O · 131 series · load": the letters above, and how many shows */
export function earlierLabel(
  letters: ReadonlyArray<Letter>,
  firstShown: Letter | undefined,
  count: number,
): string {
  const shows = plural(count, 'series', 'series');
  const at = firstShown ? LIBRARY_LETTERS.indexOf(firstShown) : -1;
  const above = letters.filter(
    (letter) => LIBRARY_LETTERS.indexOf(letter) < at,
  );
  const from = above[0];
  const to = above.at(-1);
  if (!from || !to) {
    return `${shows} · load`;
  }
  const range =
    from === to
      ? from.toUpperCase()
      : `${from.toUpperCase()}–${to.toUpperCase()}`;
  return `${range} · ${shows} · load`;
}
