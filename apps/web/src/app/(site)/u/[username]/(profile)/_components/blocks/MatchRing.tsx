import type { TasteLevel } from '@tvseri.es/schemas';

import cn from '@/lib/cn';

import { levelStyle } from '../visitor/match/levels';
import { arcDash } from '../visitor/match/matchCopy';
import type { CountedRingLook, RingLook, RingSize } from './matchRingLooks';

type Drawing = Readonly<{
  arc: number;
  level: TasteLevel | null;
  look: RingLook;
}>;

const TRACK = 'rgb(255 255 255 / 0.1)';

function RingSvgs({
  arc,
  level,
  look,
  size,
}: Drawing & Readonly<{ size: RingSize }>) {
  const { box, className, radius } = size;
  const middle = box / 2;
  const circle = {
    cx: middle,
    cy: middle,
    fill: 'none',
    pathLength: 100,
    r: radius,
    strokeWidth: look.stroke,
    transform: `rotate(-90 ${middle} ${middle})`,
  } as const;
  const viewBox = `0 0 ${box} ${box}`;
  const color = levelStyle(level).hex;
  const dash = arcDash(arc, level);
  const isSuper = level === 'super';
  const arcClass = isSuper && look.glow ? look.glow : undefined;
  const haloClass = cn(className, look.halo);
  return (
    <>
      {isSuper && look.halo ? (
        <svg
          aria-hidden="true"
          className={haloClass}
          height={box}
          viewBox={viewBox}
          width={box}
        >
          <circle
            {...circle}
            stroke={color}
            strokeDasharray={dash}
            strokeLinecap="round"
          />
        </svg>
      ) : null}
      <svg
        aria-hidden="true"
        className={className}
        height={box}
        viewBox={viewBox}
        width={box}
      >
        <circle {...circle} stroke={TRACK} />
        {level ? (
          <circle
            {...circle}
            className={arcClass}
            stroke={color}
            strokeDasharray={dash}
            strokeLinecap="round"
          />
        ) : null}
      </svg>
    </>
  );
}

/**
 * The compatibility ring's drawing: a white/10 track and the level's arc
 * (`arc` percent, from the top) in the level's colour. A Super ring adds its
 * look's halo or glow. Without a level only the track is drawn, at the same
 * size, so nothing jumps when one arrives. One set per size in the look.
 */
export function RingArcs({ arc, level, look }: Drawing) {
  return (
    <>
      {look.sizes.map((size) => (
        <RingSvgs
          arc={arc}
          key={size.box}
          level={level}
          look={look}
          size={size}
        />
      ))}
    </>
  );
}

/**
 * The ring as a picture with the shared count in its middle (the match card,
 * the Circle page's rows): `label` names it, the count is drawn only.
 */
export default function MatchRing({
  arc,
  className,
  count,
  label,
  level,
  look,
}: Readonly<{
  arc: number;
  /** The place's own box for the ring (its size and how it sits in a row) */
  className?: string;
  count: number;
  label: string;
  level: TasteLevel | null;
  look: CountedRingLook;
}>) {
  const frame = cn(look.frame, className);
  return (
    <div aria-label={label} className={frame} role="img">
      <RingArcs arc={arc} level={level} look={look} />
      <span aria-hidden="true" className={look.count}>
        <b className={look.number}>{count}</b>
      </span>
    </div>
  );
}
