import type { ReactNode } from 'react';
import { ROW_IMAGE_SIZES } from '@/components/ui/row/rowLayout';
import showPath from '@/lib/routing/showPath';

import PosterLink, { type PosterLinkLook } from './PosterLink';
import { TILE_HOVER } from './tileHover';

type Props = Readonly<{
  /**
   * The poster's alt, the title by default; it starts the link's name, so
   * the overlay's state still follows it ("1. Severance Watched")
   */
  alt?: string;
  /** under the poster: a meta line, a progress line… */
  children?: ReactNode;
  id: number | string;
  /**
   * Replaces the link's accessible name, which is otherwise the poster's alt
   * (the title) plus the overlay's text ("Severance Watched"). Use it when the
   * line below adds state: "The Bear, 6 of 10 watched".
   */
  label?: string;
  loading?: 'eager' | 'lazy';
  overlay?: ReactNode;
  poster: string | null | undefined;
  /** defaults to a poster row's */
  sizes?: string;
  slug?: string | null;
  title: string;
}>;

/** The poster over its line (12px apart on desktop, 8 on phones); placeholders use it too */
export const POSTER_TILE = 'group/ptile flex flex-col gap-2 md:gap-3';

const LINK = `block rounded-[var(--tile-radius,12px)] focus-visible:outline-offset-[var(--tile-focus-offset,4px)] ${TILE_HOVER}`;

/**
 * A show's poster linking to its page, with an optional line below
 * (12px below on desktop, 8 on phones). The one tile hover
 * (`tileHover`): it grows 4% (a press shrinks it on touch); keyboard focus
 * draws a 2px ring 4px out (`--tile-focus-offset`).
 * Width comes from the parent (a Row's `li`, a grid cell).
 *
 * @example
 * <PosterTile id={show.id} slug={show.slug} title={show.title} poster={show.poster} overlay={watched ? <WatchedLabel /> : null} />
 */
export default function PosterTile({
  alt,
  children,
  id,
  label,
  loading,
  overlay,
  poster,
  sizes = ROW_IMAGE_SIZES.poster,
  slug,
  title,
}: Props) {
  const href = showPath(id, slug);
  return (
    <div className={POSTER_TILE}>
      <PosterLink
        alt={alt}
        href={href}
        label={label}
        loading={loading}
        look={TILE_LINK}
        overlay={overlay}
        poster={poster}
        sizes={sizes}
        title={title}
      />
      {children}
    </div>
  );
}

// Each place keeps its own look on purpose; don't unify them.
/** A tile's: the one tile hover, the focus ring 4px out */
const TILE_LINK: PosterLinkLook = { link: LINK };
