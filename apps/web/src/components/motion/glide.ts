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
  return [
    {
      borderRadius: `${radius / scale}px / ${corner}`,
      transform: `translateX(${from.left - to.left}px) scaleX(${scale})`,
    },
    { borderRadius: `${corner} / ${corner}`, transform: 'none' },
  ];
}
