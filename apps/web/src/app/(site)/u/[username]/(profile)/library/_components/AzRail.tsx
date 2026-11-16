import { LIBRARY_LETTERS } from '@tvseri.es/schemas';
import Link from 'next/link';

import cn from '@/lib/cn';

type Letter = (typeof LIBRARY_LETTERS)[number];

/**
 * Plex's letter rail, right of the grid on an A–Z sort:
 * a live letter links to `?sort=az&from=<letter>`, one with no show is
 * dimmed and not a link, the letter jumped to is white. `#` (digits and
 * non-Latin titles) leads when the shelf has any.
 */
export default function AzRail({
  active,
  hrefOf,
  letters,
}: Readonly<{
  active: Letter | null;
  hrefOf: (letter: Letter) => string;
  letters: ReadonlyArray<Letter>;
}>) {
  const shown = LIBRARY_LETTERS.filter(
    (letter) => letter !== '#' || letters.includes('#'),
  );
  return (
    <nav
      aria-label="Jump to a letter"
      className="absolute top-0 -right-10 flex flex-col items-center gap-px text-[11px] leading-4 font-semibold max-[1359px]:hidden"
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
        return (
          <Link
            aria-current={letter === active ? 'location' : undefined}
            aria-label={`Jump to ${label}`}
            className={cn(
              'rounded-4 px-[3px] transition-colors',
              letter === active
                ? 'bg-white text-black'
                : 'text-white/60 hover:text-white',
            )}
            href={href}
            key={letter}
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
