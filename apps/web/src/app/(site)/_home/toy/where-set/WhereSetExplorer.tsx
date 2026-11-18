'use client';

import { type ReactNode, useCallback, useState } from 'react';

import useWarmSet from '../useWarmSet';
import MapPins from './MapPins';
import PlaceDetail from './PlaceDetail';
import type { MapPlace } from './types';

/**
 * Which place is picked and which of its shows is up. A pin picks its place
 * (first show); "More set in {place}" steps to the place's next show. Images
 * and logos mount when their pin or button is hovered or focused, so a pick
 * shows ones that are already loading.
 */
export default function WhereSetExplorer({
  images,
  map,
  metas,
  places,
  start,
  titles,
}: Readonly<{
  images: ReadonlyArray<ReactNode>;
  map: ReactNode;
  metas: ReadonlyArray<ReactNode>;
  places: ReadonlyArray<MapPlace>;
  start: number;
  /** each show's logo or written title, by the same index as `images` */
  titles: ReadonlyArray<ReactNode>;
}>) {
  const [current, setCurrent] = useState({ place: start, step: 0 });
  const [warm, addWarm] = useWarmSet([places[start]?.shows[0]?.image ?? 0]);
  // stable, so a pick re-renders only the two pins whose state changed
  const pick = useCallback(
    (index: number) => {
      const image = places[index]?.shows[0]?.image;
      if (image !== undefined) {
        addWarm(image);
      }
      setCurrent({ place: index, step: 0 });
    },
    [addWarm, places],
  );
  const place = places[current.place] ?? places[0];
  if (!place) {
    return null;
  }

  const next = (current.step + 1) % place.shows.length;
  const warmNext = () => {
    const image = place.shows[next]?.image;
    if (image !== undefined) {
      addWarm(image);
    }
  };
  const stepOn = () => {
    warmNext();
    setCurrent({ place: current.place, step: next });
  };
  const onMore = place.shows.length > 1 ? stepOn : undefined;
  const show = place.shows[current.step] ?? place.shows[0];

  return (
    <>
      <MapPins
        current={current.place}
        map={map}
        onPick={pick}
        onWarm={addWarm}
        places={places}
      />
      <PlaceDetail
        images={images}
        metas={metas}
        onMore={onMore}
        onWarmMore={warmNext}
        place={place}
        show={show}
        titles={titles}
        warm={warm}
      />
    </>
  );
}
