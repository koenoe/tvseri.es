/**
 * The shade that rises from a picture's foot so what sits there reads on any
 * picture (the Discover landing's spotlight, Home's feature stills, the
 * Countdown's foot). Near-black, or `--picture-shade` where the card sets one
 * (its picture's colour, darkened: `_home/pictureCard.ts`).
 */
export const FOOT_SHADE =
  'absolute inset-0 bg-linear-to-t from-[color:var(--picture-shade,rgb(12_15_16))]/96 via-[color:var(--picture-shade,rgb(12_15_16))]/60 via-45% to-[color:var(--picture-shade,rgb(12_15_16))]/0 to-80% md:via-[color:var(--picture-shade,rgb(12_15_16))]/72 md:via-42% md:to-78%';
