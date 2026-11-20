import { SHEET_EASE } from './ease';

/**
 * The pill glide: a selection's fill moves from the old choice to the new
 * one (FLIP) in 240ms. The profile's navs (the Library's shelves, the
 * calendar's months) and every `Segmented` share it. `backwards`: the
 * animation can start a fraction after the frame it was made in, which
 * would otherwise show the pill on the new choice for that frame.
 */
export const GLIDE: KeyframeAnimationOptions = {
  duration: 240,
  easing: 'cubic-bezier(0.2, 0.8, 0.2, 1)',
  fill: 'backwards',
};

/**
 * A glide's timing by how far it goes: a hop to a neighbour keeps the
 * shared pace (`GLIDE`); a longer jump gets 40ms more per extra step, up to
 * 360ms, on the sheet curve, so the fill is seen travelling instead of
 * arriving in a frame or two. `step` is one choice's size along the glide.
 */
export function glideTiming(
  distance: number,
  step: number,
): KeyframeAnimationOptions {
  const steps = step > 0 ? Math.abs(distance) / step : 1;
  if (steps <= 1.5) {
    return GLIDE;
  }
  return {
    ...GLIDE,
    duration: Math.min(360, Math.round(240 + (steps - 1) * 40)),
    easing: `cubic-bezier(${SHEET_EASE.join(', ')})`,
  };
}

export type GlideBox = Readonly<{ left: number; width: number }>;

/**
 * A row of choices of different widths: the new pill starts on the old
 * one's box (moved and scaled from its left edge) and settles on its own.
 * Its corners are drawn wider by the scale's inverse, so they stay round
 * instead of squashing mid-flight. `radius` is the pill's resting corner,
 * at most half its height.
 */
export function sidewaysGlide(
  from: GlideBox,
  to: GlideBox,
  radius: number,
): Keyframe[] {
  const scale = to.width > 0 ? from.width / to.width : 1;
  const corner = `${radius}px`;
  // scaled from its left edge whatever origin the caller's fill rests on
  return [
    {
      borderRadius: `${radius / scale}px / ${corner}`,
      transform: `translateX(${from.left - to.left}px) scaleX(${scale})`,
      transformOrigin: 'left center',
    },
    {
      borderRadius: `${corner} / ${corner}`,
      transform: 'none',
      transformOrigin: 'left center',
    },
  ];
}

/**
 * Where a glide from `from` to `to` draws its pill at `progress` (eased,
 * 0–1): the translate and the scale both run linearly in it, so the box
 * does too. A pick mid-glide starts the next glide from here.
 */
export function boxAt(
  from: GlideBox,
  to: GlideBox,
  progress: number,
): GlideBox {
  return {
    left: from.left + (to.left - from.left) * progress,
    width: from.width + (to.width - from.width) * progress,
  };
}
