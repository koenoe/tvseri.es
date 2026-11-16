import PositionLayout from '@/components/motion/PositionLayout';
import Badge from '@/components/ui/button/Badge';
import type { PosterLinkLook } from '@/components/ui/tile/PosterLink';

/** What a tile needs, all plain strings: it crosses into the stack's client island */
export type TileEpisode = Readonly<{ code: string; when: string }>;

export type TileData = Readonly<{
  /** Newest first */
  episodes: ReadonlyArray<TileEpisode>;
  href: string;
  /** The viewer has none of this show (visitors only) */
  isNew: boolean;
  key: string;
  poster: string | null;
  range: string;
  /** The newest episode's day */
  rangeWhen: string;
  title: string;
}>;

// Each place keeps its own look on purpose; don't unify them.
/** A recently watched poster's link: no hover of its own */
export const RECENT_POSTER: PosterLinkLook = { link: 'block' };

export const RECENT_POSTER_SIZES = '(min-width: 768px) 160px, 42vw';

/**
 * Where the green "New to you" tag sits on a poster, and fades when the pile
 * opens; a press on it opens the poster (it lies over the poster's link)
 */
export const NEW_TAG =
  'pointer-events-none absolute top-2 right-2 z-20 transition-opacity duration-200 group-data-[open=true]/slot:opacity-0';

/** The tag's words fit a poster from 112px (`Slot` is the container); narrower, the sparkle alone (its title says it) */
export const NEW_TAG_TEXT = 'hidden @min-[112px]/slot:inline';

/** The line under a poster: code chip left, day right */
export function TileLabel({
  className,
  code,
  when,
}: Readonly<{ className?: string; code: string; when: string }>) {
  return (
    <PositionLayout className={className}>
      {/* one line: the code stays, the day ends with an
          ellipsis on a narrow poster ("Thu 9 Oct 2025" beside S07E108) */}
      <span className="flex min-w-0 items-center justify-between gap-1.5">
        <Badge className="shrink-0" variant="code">
          {code}
        </Badge>
        <span
          className="min-w-0 truncate text-caption text-white/60"
          title={when}
        >
          {when}
        </span>
      </span>
    </PositionLayout>
  );
}
