'use client';

import type { ReactNode } from 'react';

import { MAP_BOX } from './layout';
import Pin, { PinLabel } from './Pin';
import type { MapPlace } from './types';

/**
 * The map (680 × 293 at desktop, the column's width on a
 * phone at the same ratio) with a pin and a label per place; only the picked
 * place's label shows. The labels sit in their own layer clipped to the map,
 * so none (shown or not) can reach past it and widen the page; the pins
 * are not clipped, their rings may overhang the map's edge.
 */
export default function MapPins({
  current,
  map,
  onPick,
  onWarm,
  places,
}: Readonly<{
  current: number;
  map: ReactNode;
  onPick: (index: number) => void;
  onWarm: (image: number) => void;
  places: ReadonlyArray<MapPlace>;
}>) {
  return (
    <div
      aria-label="Map of where series are set"
      className={MAP_BOX}
      role="group"
    >
      {map}
      {places.map((place, index) => {
        const on = index === current;
        return (
          <Pin
            index={index}
            key={place.slug}
            on={on}
            onPick={onPick}
            onWarm={onWarm}
            place={place}
          />
        );
      })}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 z-3 overflow-hidden"
      >
        {places.map((place, index) => {
          const on = index === current;
          return <PinLabel key={place.slug} on={on} place={place} />;
        })}
      </div>
    </div>
  );
}
