import type { WatchProvider } from '@tvseri.es/schemas';
import Image from 'next/image';
import { memo, useCallback } from 'react';

import { plusGlyph } from '@/components/ui/icon/glyphs';
import Icon from '@/components/ui/icon/Icon';
import cn from '@/lib/cn';

import { isTmdbImage } from '@/lib/media/isTmdbImage';

/** A service in "Popular in …": tap to add; the "+" shows on hover or keyboard focus */
export const TILE_LOOK = {
  badge:
    'bg-white/10 text-white/80 opacity-0 transition-opacity group-hover:opacity-100 group-focus-visible:opacity-100',
  image: 56,
  imageClass:
    'image-outline rounded-14 opacity-75 transition-opacity group-hover:opacity-100',
  label: 'text-caption font-medium text-white/80',
  tile: 'gap-2 bg-white/3 px-2 pt-4 pb-3 shadow-[inset_0_0_0_1px_rgb(255_255_255/0.07)] hover:bg-white/6',
} as const;

type Props = Readonly<{
  onToggle: (provider: WatchProvider) => void;
  provider: WatchProvider;
}>;

/**
 * One service you can add, as a tile. A tap saves at once ("Add Netflix")
 * and moves it into your services: an action, not a toggle, so no
 * `aria-pressed`.
 */
function ServiceTile({ onToggle, provider }: Props) {
  const look = TILE_LOOK;
  const label = `Add ${provider.name}`;
  const classes = cn(
    'group relative flex min-w-0 cursor-pointer flex-col items-center rounded-16 text-center transition-[background-color,color,scale] duration-150 ease-out active:scale-96',
    look.tile,
  );
  const imageClasses = cn('aspect-square shrink-0', look.imageClass);
  const badgeClasses = cn(
    'absolute top-2 right-2 flex size-5 items-center justify-center rounded-full',
    look.badge,
  );
  const labelClasses = cn('max-w-full truncate', look.label);
  const handleClick = useCallback(
    () => onToggle(provider),
    [onToggle, provider],
  );
  const unoptimized = !isTmdbImage(provider.logo);
  return (
    <button
      aria-label={label}
      className={classes}
      onClick={handleClick}
      title={label}
      type="button"
    >
      <Image
        alt=""
        className={imageClasses}
        height={look.image}
        src={provider.logo}
        unoptimized={unoptimized}
        width={look.image}
      />
      <span className={labelClasses}>{provider.name}</span>
      <span aria-hidden="true" className={badgeClasses}>
        <Icon className="size-3" glyph={plusGlyph} size={13} />
      </span>
    </button>
  );
}

const MemoServiceTile = memo(ServiceTile);
MemoServiceTile.displayName = 'ServiceTile';

export default MemoServiceTile;
