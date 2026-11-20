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
 * A choice whose chosen fill is its `::before`, under its words, so the
 * fill glides (`glideFill`) without moving them. The caller paints the
 * fill on its chosen state (`aria-pressed:before:bg-white/15`). A plain
 * module (no React), so server-drawn class lists can use it.
 */
export const FILL_BEFORE =
  'relative isolate before:absolute before:inset-0 before:-z-1 before:rounded-[inherit]';

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
