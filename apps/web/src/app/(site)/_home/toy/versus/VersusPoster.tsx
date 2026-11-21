import type { VersusSide } from '@tvseri.es/schemas';
import Image from 'next/image';

import { textArrival } from '@/components/motion/textArrival';
import cn from '@/lib/cn';

import {
  VERSUS_NAME,
  VERSUS_NAMES,
  VERSUS_POSTER,
  VERSUS_POSTER_STACK,
} from './layout';

export type PosterState = 'chosen' | 'idle' | 'out';

const SHADOW = 'shadow-[0_10px_18px_rgb(0_0_0/0.35)]';
const HOVER =
  'group-hover/vp:shadow-[0_10px_18px_rgb(0_0_0/0.35),0_0_0_2px_rgb(255_255_255/0.4)]';
const CHOSEN = 'shadow-[0_10px_18px_rgb(0_0_0/0.35),0_0_0_3px_#fff]';

const IMAGE =
  'rounded-12 object-cover transition-opacity duration-300 ease-[ease]';

/** One pair's poster on this side: shown, or mounted out of sight */
function Poster({ shown, src }: Readonly<{ shown: boolean; src: string }>) {
  const classes = cn(IMAGE, shown ? 'opacity-100' : 'opacity-0');
  return <Image alt="" className={classes} fill sizes="150px" src={src} />;
}

/**
 * One pair's name on this side: shown, or out of sight and out of the
 * button's name. It arrives just behind its poster (`textArrival`).
 */
function Name({ shown, title }: Readonly<{ shown: boolean; title: string }>) {
  const classes = cn(VERSUS_NAME, '[grid-area:1/1]', textArrival(shown));
  return (
    <span aria-hidden={!shown} className={classes} data-shown={shown}>
      {title}
    </span>
  );
}

/**
 * One side of the pair: the poster over its name, a real
 * button (`aria-pressed`): pressed, it carries the white ring; while the
 * other side is chosen its picture dims to 40%, the name staying at full
 * white so the dim never costs contrast (the poster can still be pressed).
 * Every pair the viewer has looked at
 * (or is about to) keeps its image mounted, cross-faded, so going back and
 * forth shows images already loaded.
 */
export default function VersusPoster({
  current,
  onTap,
  sides,
  state,
  warm,
}: Readonly<{
  /** the pair on screen (an index into `sides`) */
  current: number;
  onTap: () => void;
  /** this side of every pair in the deck */
  sides: ReadonlyArray<VersusSide>;
  state: PosterState;
  warm: ReadonlySet<number>;
}>) {
  const side = sides[current];
  if (!side) {
    return null;
  }
  const button = cn(
    'group/vp flex w-full cursor-pointer rounded-12 transition-[scale] duration-150 ease-[ease] active:scale-96',
  );
  const box = cn(
    VERSUS_POSTER,
    'bg-white/5 transition-[box-shadow,opacity] duration-[200ms,250ms] ease-[ease]',
    state === 'chosen' ? CHOSEN : cn(SHADOW, HOVER),
    state === 'out' && 'opacity-40',
  );
  const isChosen = state === 'chosen';
  return (
    <button
      aria-pressed={isChosen}
      className={button}
      onClick={onTap}
      type="button"
    >
      <span className={VERSUS_POSTER_STACK}>
        <span className={box}>
          {sides.map((each, index) => {
            const shown = index === current;
            return warm.has(index) ? (
              <Poster key={each.id} shown={shown} src={each.posterImage} />
            ) : null;
          })}
        </span>
        <span className={VERSUS_NAMES}>
          {sides.map((each, index) => {
            const shown = index === current;
            return warm.has(index) ? (
              <Name key={each.id} shown={shown} title={each.title} />
            ) : null;
          })}
        </span>
      </span>
    </button>
  );
}
