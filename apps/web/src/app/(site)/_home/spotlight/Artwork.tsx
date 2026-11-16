'use client';

import { type AnimationEvent, memo } from 'react';

import BackgroundImage from '@/components/background/BackgroundImage';
import { heroShade } from '@/components/background/heroShade';
import cn from '@/lib/cn';
import styles from './spotlight.module.css';
import type { StageLayer } from './stage';

const CLEAR = 'rgba(0,0,0,0)';

const IMAGE = 'absolute inset-0 object-[center_top] md:object-[center_25%]';

/** The slide's colour from below over the hero shade (HM header read A) */
const desktopShade = (color: string) => ({
  background: `linear-gradient(0deg, ${color} 0%, ${color} 10%, ${CLEAR} 52%), ${heroShade(color)}`,
});

/** From below, for the centred text, over the hero shade */
const phoneShade = (color: string) => ({
  background: `linear-gradient(0deg, ${color} 6%, ${CLEAR} 55%), ${heroShade(color)}`,
});

/**
 * One slide's artwork on the stage: its backdrop with the shade in its own
 * colour, as one layer, so the shade crossfades with the picture (and with
 * the page colour under it) instead of jumping to the new colour. Only the
 * slides on the stage are in the page; the first one is the LCP: eager,
 * high priority, no fade. Memoised: it re-renders only when its layer
 * changes, not on the carousel's pauses and pager presses.
 */
function Artwork({
  backdrop,
  color,
  layer,
  onLoaded,
  onSettled,
  priority,
}: Readonly<{
  backdrop: string;
  color: string;
  layer: StageLayer;
  /** its backdrop has loaded (or failed): a waiting layer can fade in */
  onLoaded: (key: number) => void;
  /** it is fully in: the layers under it can go */
  onSettled: (key: number) => void;
  priority: boolean;
}>) {
  const classes = cn(
    'absolute inset-0',
    layer.entering && (layer.waiting ? styles.waiting : styles.fadeIn),
  );
  const handleAnimationEnd = (event: AnimationEvent<HTMLDivElement>) => {
    if (event.target === event.currentTarget) {
      onSettled(layer.key);
    }
  };
  const handleLoad = layer.waiting ? () => onLoaded(layer.key) : undefined;
  const phoneStyle = phoneShade(color);
  const desktopStyle = desktopShade(color);

  return (
    <div
      className={classes}
      data-spotlight-layer={layer.index}
      onAnimationEnd={layer.entering ? handleAnimationEnd : undefined}
    >
      {backdrop ? (
        <BackgroundImage
          className={IMAGE}
          onError={handleLoad}
          onLoad={handleLoad}
          priority={priority}
          src={backdrop}
        />
      ) : null}
      <span
        aria-hidden="true"
        className="absolute inset-0 md:hidden"
        style={phoneStyle}
      />
      <span
        aria-hidden="true"
        className="absolute inset-0 hidden md:block"
        style={desktopStyle}
      />
    </div>
  );
}

const MemoArtwork = memo(Artwork);
MemoArtwork.displayName = 'Artwork';

export default MemoArtwork;
