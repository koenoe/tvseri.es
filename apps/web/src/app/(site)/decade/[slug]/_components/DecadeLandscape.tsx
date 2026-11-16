'use client';

import dynamic from 'next/dynamic';
import { useCallback, useEffect, useState } from 'react';
import whenIdle from '@/lib/lazy/whenIdle';
import type { ControlStatesRead } from '@/lib/marking/controlState';
import { PHONE } from '@/lib/media/breakpoints';
import { matchesNow } from '@/lib/media/useMediaQuery';
import type { LandscapeShow } from '../_data/landscape';
import DecadeCard from './DecadeCard';
import DecadeListRow from './DecadeListRow';
import TreemapTile from './TreemapTile';

const loadSheet = () => import('./DecadeSheet');

/** The phone's sheet: its code is fetched while the phone is idle (`useSheetPreload`) */
// next/dynamic on purpose: this piece is also rendered on the server, which a client-only loader cannot do.
const DecadeSheet = dynamic(loadSheet);

/**
 * On a phone, fetches the sheet's code once the page has settled, so the
 * first tap opens it in the same frame instead of waiting for the file and
 * parsing it mid-animation (WebKit dropped a frame there). Desktop never
 * needs the sheet and never fetches it.
 */
function useSheetPreload() {
  useEffect(() => {
    if (!matchesNow(PHONE)) {
      return;
    }
    return whenIdle(() => void loadSheet(), { fallbackDelay: 1500 });
  }, []);
}

/**
 * The landscape's selection: the treemap and its card
 * on desktop, the ranked list and its sheet on a phone. Both come laid out
 * from the server; the island only keeps which show is selected (the first
 * at the start) and whether the phone's sheet is open, so a tap swaps the
 * card in the same frame.
 */
export default function DecadeLandscape({
  shows,
  states,
}: Readonly<{
  shows: ReadonlyArray<LandscapeShow>;
  /** the viewer's states for every tile (the card follows the selection) */
  states: ControlStatesRead;
}>) {
  const [selected, setSelected] = useState(0);
  // null until the first tap: the sheet's code loads only then
  const [sheet, setSheet] = useState<boolean | null>(null);
  useSheetPreload();
  const openSheet = useCallback((index: number) => {
    setSelected(index);
    setSheet(true);
  }, []);
  const show = shows[selected] ?? shows[0];
  if (!show) {
    return null;
  }
  return (
    <>
      <div
        aria-label="The decade by attention"
        className="relative mt-10 h-140 max-md:hidden"
        role="group"
      >
        {shows.map((tile, index) => (
          <TreemapTile
            index={index}
            key={tile.id}
            onSelect={setSelected}
            selected={index === selected}
            show={tile}
          />
        ))}
      </div>
      <DecadeCard show={show} states={states} />
      <ol
        aria-label="The decade by attention"
        className="-mx-2 mt-12 flex flex-col gap-0.5 md:hidden"
      >
        {shows.map((row, index) => (
          <DecadeListRow
            index={index}
            key={row.id}
            onOpen={openSheet}
            selected={index === selected}
            show={row}
          />
        ))}
      </ol>
      {sheet === null ? null : (
        <DecadeSheet
          onOpenChange={setSheet}
          open={sheet}
          show={show}
          states={states}
        />
      )}
    </>
  );
}
