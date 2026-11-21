/**
 * Text arriving behind its picture, the favourites accordion's reveal (also
 * Did you know, the Countdown, From your circle, Where set and Versus): the
 * picture comes first, then the text rises 6px and fades in over 300ms,
 * 150ms behind it. Leaving text falls back 6px and fades over 300ms at
 * once. Tailwind's default curve; reduced motion makes it instant
 * (globals.css, `MotionProvider`). Class names stay literal so Tailwind sees
 * them.
 */

/**
 * On the layer that says whether its item is shown (`data-shown`): a deck's
 * layer, the accordion's slice. The text inside it takes `TEXT_ARRIVAL`.
 */
export const TEXT_ARRIVAL_GROUP = 'group/arrival';

/** The text inside a `TEXT_ARRIVAL_GROUP` layer */
export const TEXT_ARRIVAL =
  'transition-[opacity,translate] duration-300 group-data-[shown=false]/arrival:translate-y-1.5 group-data-[shown=false]/arrival:opacity-0 group-data-[shown=true]/arrival:delay-150';

/** The same, on text that is its own layer (it knows whether it is shown) */
export const textArrival = (shown: boolean) =>
  shown
    ? 'transition-[opacity,translate] duration-300 delay-150'
    : 'transition-[opacity,translate] duration-300 translate-y-1.5 opacity-0';

/** Tailwind's default transition curve, as the classes above use it */
const EASE = [0.4, 0, 0.2, 1] as const;

/**
 * The same in Motion, for text replaced in place rather than stacked (a
 * `CrossFade`'s `variants`): the leaving copy fades where it stood.
 */
export const TEXT_ARRIVAL_VARIANTS = {
  from: { opacity: 0, y: 6 },
  in: {
    opacity: 1,
    transition: { delay: 0.15, duration: 0.3, ease: EASE },
    y: 0,
  },
  out: { opacity: 0, transition: { duration: 0.3, ease: EASE }, y: 6 },
} as const;
