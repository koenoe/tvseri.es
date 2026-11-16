'use client';

import Image from 'next/image';
import { memo, type SyntheticEvent, useCallback } from 'react';

import { FOOT_SHADE } from '@/components/ui/tile/footShade';
import cn from '@/lib/cn';
import { PICTURE_BLEED, pictureShade } from '../pictureCard';
import { COUNTDOWN_FADE } from './countdownLayout';

/**
 * The board's left-to-right shade from md; from the foot up on a phone. In
 * the picture's colour, darkened (`pictureShade`), near-black without one
 */
const SHADE =
  'absolute inset-0 bg-[linear-gradient(0deg,color-mix(in_srgb,var(--picture-shade,rgb(14_16_17))_97%,transparent)_0%,color-mix(in_srgb,var(--picture-shade,rgb(14_16_17))_82%,transparent)_50%,color-mix(in_srgb,var(--picture-shade,rgb(14_16_17))_25%,transparent)_82%),linear-gradient(180deg,color-mix(in_srgb,var(--picture-shade,rgb(14_16_17))_70%,transparent)_0%,color-mix(in_srgb,var(--picture-shade,rgb(14_16_17))_0%,transparent)_22%)] md:bg-[linear-gradient(90deg,color-mix(in_srgb,var(--picture-shade,rgb(14_16_17))_96%,transparent)_0%,color-mix(in_srgb,var(--picture-shade,rgb(14_16_17))_70%,transparent)_45%,color-mix(in_srgb,var(--picture-shade,rgb(14_16_17))_10%,transparent)_85%)]';

/**
 * From md, the landing tile's foot shade (`FOOT_SHADE`) under the foot, so
 * the pills and "Open" read on a bright picture
 */
const FOOT = cn(FOOT_SHADE, 'max-md:hidden');

/**
 * One premiere's backdrop layer under its shade, opaque while it is shown.
 * Memoised: a pill press re-renders only the layers whose `on` changed.
 */
function CountdownBackdrop({
  backdrop,
  color,
  index,
  on,
  onLoaded,
}: Readonly<{
  backdrop: string;
  /** The API's `backdropColor` ('#000000' when unknown) */
  color: string;
  index: number;
  on: boolean;
  /** decoded (or failed): its turn can come */
  onLoaded: (index: number) => void;
}>) {
  const onLoad = useCallback(
    (event: SyntheticEvent<HTMLImageElement>) => {
      // decoded before it fades in, so the fade never shows a half-drawn image
      event.currentTarget
        .decode()
        .catch(() => undefined)
        .then(() => onLoaded(index));
    },
    [index, onLoaded],
  );
  // a backdrop that can't load still gets its turn, on the shade alone
  const onError = useCallback(() => onLoaded(index), [index, onLoaded]);
  const shade = pictureShade(color);
  const layer = cn(
    PICTURE_BLEED,
    COUNTDOWN_FADE,
    on ? 'z-1 opacity-100' : 'z-0 opacity-0 delay-300',
  );
  return (
    <div
      aria-hidden="true"
      className={layer}
      data-countdown-backdrop={index}
      style={shade}
    >
      <Image
        alt=""
        className="object-cover object-[center_30%]"
        fill
        onError={onError}
        onLoad={onLoad}
        sizes="(min-width: 1280px) 1216px, calc(100vw - 32px)"
        src={backdrop}
      />
      <span className={SHADE} />
      <span className={FOOT} />
    </div>
  );
}

const MemoCountdownBackdrop = memo(CountdownBackdrop);
MemoCountdownBackdrop.displayName = 'CountdownBackdrop';

export default MemoCountdownBackdrop;
