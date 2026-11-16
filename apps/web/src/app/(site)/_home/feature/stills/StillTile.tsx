import Image from 'next/image';
import type { CSSProperties } from 'react';

import { PICTURE_LAYER } from '@/components/ui/picture/pictureSurface';
import TileLink from '@/components/ui/tile/TileLink';
import cn from '@/lib/cn';
import { shortCode } from '@/lib/marking/copy';

import { STILL_TILE } from './layout';

const TILE = cn('group/still', STILL_TILE);

/**
 * The foot shade under the number: 64px, 40 on a phone's small tiles, so
 * "E01" holds its contrast on a bright still
 */
const FOOT_SHADE =
  'absolute inset-0 bg-[linear-gradient(0deg,rgb(14_16_17/0.9)_0px,rgb(14_16_17/0.74)_26px,rgb(14_16_17/0)_64px)] max-md:bg-[linear-gradient(0deg,rgb(14_16_17/0.86)_0px,rgb(14_16_17/0.62)_22px,rgb(14_16_17/0)_40px)]';

const IMAGE =
  'object-cover transition-transform duration-250 ease-[cubic-bezier(.2,.8,.2,1)] group-hover/still:scale-103';

/**
 * One episode still (HMStillsVariants `.sv-still`): dimmed to 82%, full and
 * a little closer on hover, "E01" on its foot shade. The dimming is a black
 * layer whose opacity animates (not a filter), so the hover stays on the
 * compositor. The still, the dimming and the foot shade are one picture
 * layer (`PICTURE_LAYER`), so the tile's corners clip them together.
 * `style` places it in the grid (`stillsGridStyles`).
 */
export default function StillTile({
  href,
  label,
  number,
  src,
  style,
}: Readonly<{
  href: string;
  label: string;
  number: number;
  src: string;
  style?: CSSProperties;
}>) {
  const code = shortCode(number);
  return (
    <TileLink aria-label={label} className={TILE} href={href} style={style}>
      <span aria-hidden="true" className={PICTURE_LAYER}>
        <Image
          alt=""
          className={IMAGE}
          fill
          sizes="(min-width: 1024px) 200px, 33vw"
          src={src}
        />
        <span className="absolute inset-0 bg-black opacity-18 transition-opacity duration-250 group-hover/still:opacity-0" />
        <span className={FOOT_SHADE} />
      </span>
      <span className="absolute bottom-1.75 left-2.25 z-2 text-caption font-medium text-white tabular-nums [text-shadow:0_1px_6px_rgb(0_0_0/0.7)]">
        {code}
      </span>
    </TileLink>
  );
}
