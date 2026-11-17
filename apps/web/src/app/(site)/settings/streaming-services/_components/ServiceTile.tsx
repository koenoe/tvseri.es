import type { WatchProvider } from '@tvseri.es/schemas';
import Image from 'next/image';
import { memo, useCallback } from 'react';

import { checkGlyph, plusGlyph } from '@/components/ui/icon/glyphs';
import Icon from '@/components/ui/icon/Icon';
import cn from '@/lib/cn';

import { isTmdbImage } from '@/lib/media/isTmdbImage';

export const SIZES = {
  /** "Your services": selected, big, with a check. */
  big: {
    badge: 'bg-white text-black/90',
    icon: checkGlyph,
    iconClass: 'size-[11px]',
    image: 72,
    // phones: 56px
    imageClass:
      'rounded-18 shadow-[0_12px_24px_-10px_rgb(0_0_0/0.6)] max-md:size-14 max-md:rounded-14',
    label: 'text-body-sm font-medium text-white',
    tile: 'gap-2 bg-[rgb(10_14_15/0.35)] px-2 pt-[18px] pb-3.5 shadow-[inset_0_0_0_1.5px_rgb(255_255_255/0.85)]',
  },
  /** "Popular in …": not selected, with a plus. */
  rest: {
    // the "+" shows on hover or keyboard focus only
    badge:
      'bg-white/10 text-white/80 opacity-0 transition-opacity group-hover:opacity-100 group-focus-visible:opacity-100',
    icon: plusGlyph,
    iconClass: 'size-3',
    image: 56,
    imageClass:
      'rounded-14 opacity-75 transition-opacity group-hover:opacity-100',
    label: 'text-caption font-medium text-white/80',
    tile: 'gap-2 bg-white/3 px-2 pt-4 pb-3 shadow-[inset_0_0_0_1px_rgb(255_255_255/0.07)] hover:bg-white/6',
  },
} as const;

type Props = Readonly<{
  onToggle: (provider: WatchProvider) => void;
  provider: WatchProvider;
  variant: keyof typeof SIZES;
}>;

/**
 * One service as a tile. A tap saves at once: "Add Netflix" from the
 * popular list, "Remove Netflix" from your services. An action that moves
 * the tile between the lists, not a toggle, so no `aria-pressed`.
 */
function ServiceTile({ onToggle, provider, variant }: Props) {
  const look = SIZES[variant];
  const selected = variant === 'big';
  const label = `${selected ? 'Remove' : 'Add'} ${provider.name}`;
  const classes = cn(
    'group relative flex min-w-0 cursor-pointer flex-col items-center rounded-16 text-center transition-[background-color,color]',
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
        unoptimized={!isTmdbImage(provider.logo)}
        width={look.image}
      />
      <span className={labelClasses}>{provider.name}</span>
      <span aria-hidden="true" className={badgeClasses}>
        <Icon className={look.iconClass} glyph={look.icon} size={13} />
      </span>
    </button>
  );
}

const MemoServiceTile = memo(ServiceTile);
MemoServiceTile.displayName = 'ServiceTile';

export default MemoServiceTile;
