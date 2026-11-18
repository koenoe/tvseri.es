import { cva } from 'class-variance-authority';
import { memo, useMemo } from 'react';

import type { BackgroundProps } from './Background';
import BackgroundImage from './BackgroundImage';
import hexToRgb from './hexToRgb';

/**
 * The backdrop's layer. Only a crossfading one (`animated`, BackgroundDynamic)
 * is kept on its own compositor layer between fades; a static backdrop never
 * animates, so it holds no viewport-sized GPU layer for nothing.
 */
export const backgroundBaseStyles = cva(
  'absolute inset-0 z-0 h-screen w-screen [content-visibility:auto]',
  {
    defaultVariants: { animated: false },
    variants: {
      animated: { false: '', true: 'transform-gpu will-change-[opacity]' },
    },
  },
);

/**
 * Where the side fade's full part ends, from the right (the series page's
 * desktop hero): 60% (40% of the screen from the left), or
 * further right where the hero's text column reaches past that, so its
 * progress line ("45% · 21 of 47 watched · 14h 26m left") never sits where
 * the fade has thinned out over bright artwork. The line's box ends 720px
 * right of the page column's left edge (`PROGRESS_LINE_SPACE`, 730px from
 * 10px left of it); the column starts at the 32px gutter, or centred in
 * 1280px: `max(32px, 50vw - 608px) + 720px`.
 */
const SIDE_FADE_STOP = 'min(60%, calc(100% - max(752px, 50vw + 112px)))';

/**
 * The backdrop and its gradients, in the colour it is given (not the CSS
 * variable): during a crossfade the old layer keeps its own colour.
 */
function BackgroundBase({
  color,
  image,
  priority = false,
}: Pick<BackgroundProps, 'color' | 'image' | 'priority'>) {
  const rgbString = useMemo(() => hexToRgb(color).join(','), [color]);

  const overlayStyles = useMemo(
    () => ({
      backgroundImage: `linear-gradient(270deg, rgba(${rgbString}, 0) 0%, rgba(${rgbString}, 0.9) ${SIDE_FADE_STOP}, rgba(${rgbString}, 1) 100%)`,
    }),
    [rgbString],
  );

  const radialGradientStyles = useMemo(
    () => ({
      backgroundImage: `radial-gradient(rgba(${rgbString}, 0) 0%, rgba(${rgbString}, 1) 100%)`,
    }),
    [rgbString],
  );

  const bottomGradientStyles = useMemo(
    () => ({
      backgroundImage: `linear-gradient(to top, rgb(${rgbString}), transparent)`,
    }),
    [rgbString],
  );

  return (
    <>
      {image ? <BackgroundImage priority={priority} src={image} /> : null}
      <div className="absolute inset-0 opacity-70" style={overlayStyles} />
      <div className="absolute inset-0" style={radialGradientStyles} />
      <div
        className="absolute bottom-0 left-0 h-1/5 w-full"
        style={bottomGradientStyles}
      />
    </>
  );
}

BackgroundBase.displayName = 'BackgroundBase';

export default memo(BackgroundBase);
