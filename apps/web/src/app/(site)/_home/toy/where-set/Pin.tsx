'use client';

import { type CSSProperties, memo, useCallback } from 'react';

import cn from '@/lib/cn';

import type { LabelSide } from './labelSide';
import type { MapPlace } from './types';

/** The label's corner of the pin (`labelSides`): 14px to the side, 2px above or below the centre */
const PHONE_SIDE: Readonly<Record<LabelSide, string>> = {
  'left-down': '-ml-3.5 mt-0.5 -translate-x-full',
  'left-up': '-ml-3.5 mt-[-22px] -translate-x-full',
  'right-down': 'ml-3.5 mt-0.5 translate-x-0',
  'right-up': 'ml-3.5 mt-[-22px] translate-x-0',
};

/** The same corners from md, where the map is at least 648px wide */
const WIDE_SIDE: Readonly<Record<LabelSide, string>> = {
  'left-down': 'md:-ml-3.5 md:mt-0.5 md:-translate-x-full',
  'left-up': 'md:-ml-3.5 md:mt-[-22px] md:-translate-x-full',
  'right-down': 'md:ml-3.5 md:mt-0.5 md:translate-x-0',
  'right-up': 'md:ml-3.5 md:mt-[-22px] md:translate-x-0',
};

/**
 * A place's name by its pin, shown while the place is
 * picked. By default 14px right of the pin and 22px above; on the free side
 * when that corner would cover another pin or leave the map.
 */
function PinLabel({ on, place }: Readonly<{ on: boolean; place: MapPlace }>) {
  const position: CSSProperties = { left: place.left, top: place.top };
  const classes = cn(
    'absolute text-caption font-medium whitespace-nowrap text-white opacity-0 transition-opacity duration-200 ease-[ease] [text-shadow:0_1px_6px_rgb(0_0_0/0.8)]',
    PHONE_SIDE[place.label.phone],
    WIDE_SIDE[place.label.wide],
    on && 'opacity-100',
  );
  return (
    <span aria-hidden="true" className={classes} style={position}>
      {place.name}
    </span>
  );
}

/**
 * A finger's 44px round target, reaching 8px past the 28px pin, only where
 * no other pin is within 44px (`roomyPins`): a crowded pin keeps 28px rather
 * than steal its neighbour's taps.
 */
const ROOMY_PHONE =
  "pointer-coarse:after:absolute pointer-coarse:after:-inset-2 pointer-coarse:after:rounded-full pointer-coarse:after:content-['']";
const ROOMY_WIDE =
  "md:pointer-coarse:after:absolute md:pointer-coarse:after:-inset-2 md:pointer-coarse:after:rounded-full md:pointer-coarse:after:content-['']";

/**
 * One place on the map: a 28px target with a 10px white
 * dot; a 2px ring on hover (white/35) and when picked (white, the dot 1.3×).
 * Its label is `PinLabel`, in the map's label layer. Pins and labels are
 * memoised: a pick re-renders only the two whose `on` changed.
 */
function Pin({
  index,
  on,
  onPick,
  onWarm,
  place,
}: Readonly<{
  index: number;
  on: boolean;
  onPick: (index: number) => void;
  onWarm: (image: number) => void;
  place: MapPlace;
}>) {
  const image = place.shows[0]?.image;
  const pick = useCallback(() => onPick(index), [index, onPick]);
  const warm = useCallback(() => {
    if (image !== undefined) {
      onWarm(image);
    }
  }, [image, onWarm]);
  const position: CSSProperties = { left: place.left, top: place.top };
  const label = `${place.name}: ${place.shows[0]?.title ?? ''}`;
  const classes = cn(
    'group absolute z-2 -mt-3.5 -ml-3.5 size-7 cursor-pointer rounded-full',
    // roomy on the phone's narrowest map is roomy on every wider one
    place.roomy.phone ? ROOMY_PHONE : place.roomy.wide && ROOMY_WIDE,
  );
  return (
    <button
      aria-label={label}
      aria-pressed={on}
      className={classes}
      onClick={pick}
      onFocus={warm}
      onPointerEnter={warm}
      style={position}
      type="button"
    >
      <span className="absolute top-1/2 left-1/2 -mt-1.25 -ml-1.25 size-2.5 rounded-full bg-white transition-transform duration-200 ease-[ease] group-aria-pressed:scale-130" />
      <span className="absolute top-1/2 left-1/2 -mt-3 -ml-3 size-6 rounded-full shadow-[inset_0_0_0_2px_rgb(255_255_255/0)] transition-shadow duration-200 ease-[ease] group-hover:shadow-[inset_0_0_0_2px_rgb(255_255_255/0.35)] group-aria-pressed:shadow-[inset_0_0_0_2px_#fff]" />
    </button>
  );
}

const MemoPinLabel = memo(PinLabel);
MemoPinLabel.displayName = 'PinLabel';

const MemoPin = memo(Pin);
MemoPin.displayName = 'Pin';

export { MemoPinLabel as PinLabel };
export default MemoPin;
