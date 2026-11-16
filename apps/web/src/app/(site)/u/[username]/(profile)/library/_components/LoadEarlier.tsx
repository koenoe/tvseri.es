import { LIBRARY_LETTERS } from '@tvseri.es/schemas';

import { arrowUpGlyph } from '@/components/ui/icon/glyphs';
import Icon from '@/components/ui/icon/Icon';

type Letter = (typeof LIBRARY_LETTERS)[number];

/** "A–O · 131 series · load": the letters above, and how many shows */
export function earlierLabel(
  letters: ReadonlyArray<Letter>,
  firstShown: Letter | undefined,
  count: number,
): string {
  const shows = `${count.toLocaleString('en-GB')} series`;
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

/**
 * The row above an A–Z jump that loads the shows before it: the letters
 * above the first one shown and how many shows they hold.
 */
export default function LoadEarlier({
  above,
  firstShown,
  letters,
  loading,
  onLoad,
}: Readonly<{
  /** Shows above the loaded list */
  above: number;
  firstShown: Letter | undefined;
  letters: ReadonlyArray<Letter>;
  loading: boolean;
  onLoad: () => void;
}>) {
  return (
    <button
      className="mb-6 flex min-h-11 w-full cursor-pointer items-center justify-center gap-2 rounded-12 bg-white/4 text-[13px] leading-5 font-semibold transition-colors hover:bg-white/7"
      onClick={onLoad}
      type="button"
    >
      <Icon glyph={arrowUpGlyph} size={16} />
      {loading ? 'Loading…' : earlierLabel(letters, firstShown, above)}
    </button>
  );
}
