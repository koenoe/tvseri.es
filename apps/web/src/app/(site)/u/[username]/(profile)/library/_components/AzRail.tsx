import { LIBRARY_LETTERS } from '@tvseri.es/schemas';
import Link from 'next/link';

import cn from '@/lib/cn';

type Letter = (typeof LIBRARY_LETTERS)[number];

/**
 * Plex's letter rail, right of the grid on an A–Z sort:
 * a live letter links to `?sort=az&from=<letter>`, one with no show is
 * dimmed and not a link, the letter jumped to is white. `#` (digits and
 * non-Latin titles) leads when the shelf has any. The letters stand 24px
 * apart, each 24px tall and 8px wider each side to the pointer (WCAG
 * 2.5.8), the white pill still 16px.
 */
export default function AzRail({
  active,
  hrefOf,
  letters,
  onJump,
}: Readonly<{
  active: Letter | null;
  hrefOf: (letter: Letter) => string;
  letters: ReadonlyArray<Letter>;
  /** A letter's click, before its navigation */
  onJump: () => void;
}>) {
  const shown = LIBRARY_LETTERS.filter(
    (letter) => letter !== '#' || letters.includes('#'),
  );
  return (
    <nav
      aria-label="Jump to a letter"
      className="absolute top-0 -right-10 flex flex-col items-center gap-2 text-[11px] leading-4 font-semibold max-[1359px]:hidden"
    >
      {shown.map((letter) => {
        const label = letter.toUpperCase();
        if (!letters.includes(letter)) {
          return (
            // contrast-exempt: letters with no series (disabled)
            <span className="text-white/22" key={letter}>
              {label}
            </span>
          );
        }
        const href = hrefOf(letter);
        const current = letter === active;
        const currentLocation = current ? 'location' : undefined;
        const jumpLabel = `Jump to ${label}`;
        const letterClass = cn(
          'relative rounded-4 px-[3px] transition-colors after:absolute after:-inset-x-2 after:-inset-y-1',
          current ? 'bg-white text-black' : 'text-white/60 hover:text-white',
        );
        return (
          <Link
            aria-current={currentLocation}
            aria-label={jumpLabel}
            className={letterClass}
            href={href}
            key={letter}
            onClick={onJump}
            replace
            scroll={false}
          >
            {label}
          </Link>
        );
      })}
    </nav>
  );
}
