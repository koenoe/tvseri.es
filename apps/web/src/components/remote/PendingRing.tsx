import FillRing from '@/components/motion/FillRing';

/**
 * The pending ring: 20px, fills once over the request (`FillRing`). The
 * text colour on a key, white on a latched one. Drawn at the key glyphs'
 * 1.5 stroke, so nothing jumps as it swaps in for an icon; the thinner
 * track takes 20% to stay visible.
 */
export default function PendingRing() {
  return (
    <FillRing
      className="size-5 stroke-[1.5]"
      ink="stroke-rk-text in-aria-checked:stroke-white"
      size={20}
      track="stroke-[color-mix(in_srgb,var(--rk-text)_20%,transparent)] in-aria-checked:stroke-white/25"
    />
  );
}
