import cn from '@/lib/cn';

import { APP_TILES, type AppBrand } from './appTiles';

/** The tile's box (the placeholder draws the same); the rim edges a dark logo tile on the dark card */
export const APP_TILE_CLASS =
  'image-rim relative flex size-12 shrink-0 items-center justify-center overflow-hidden rounded-[13px] shadow-[0_12px_24px_-12px_rgb(0_0_0/0.7)] md:size-15 md:rounded-16';

/**
 * `muted` (can't be connected here) greys and dims it; it is decoration, so
 * it has no contrast to keep.
 */
export default function AppTile({
  app,
  className,
  glyphClassName,
  muted = false,
}: Readonly<{
  app: AppBrand;
  className?: string;
  glyphClassName?: string;
  muted?: boolean;
}>) {
  const { Logo, tile } = APP_TILES[app];
  const tileClass = cn(
    APP_TILE_CLASS,
    tile.ground,
    muted && 'opacity-50 shadow-none grayscale',
    className,
  );
  const glyphClass = cn(tile.glyph, glyphClassName);
  return (
    <span className={tileClass}>
      <Logo className={glyphClass} />
    </span>
  );
}
