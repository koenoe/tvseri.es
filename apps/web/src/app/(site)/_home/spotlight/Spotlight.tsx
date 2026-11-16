import type { TvSeries } from '@tvseri.es/schemas';

import type { ControlStatesRead } from '@/lib/marking/controlState';

import { HOME_GROUND } from './ground';
import SpotlightCarousel from './SpotlightCarousel';
import { toSlide } from './slide';

/**
 * HMFinal's trending spotlight, the page header of `/`: the API's trending
 * top 10 as slides. The server keeps the client island small: each show is
 * reduced to what a slide draws (hook line, labels, safe colour) here.
 */
export default function Spotlight({
  day,
  items,
  states,
}: Readonly<{
  /** the page's day (`YYYY-MM-DD`), for the hook line */
  day?: string;
  items: ReadonlyArray<TvSeries>;
  /** the viewer's states for the slides' controls; none: the pair (a preview) */
  states?: ControlStatesRead;
}>) {
  if (items.length === 0) {
    return null;
  }
  const slides = items.map((series, index) => toSlide(series, index, day));
  // The first slide's colour paints with the streamed HTML, before any JS
  // (validated hex: toSlide runs toPageColor)
  const ground = `:root{${HOME_GROUND}:${slides[0]?.color}}`;
  return (
    <>
      <style>{ground}</style>
      <SpotlightCarousel slides={slides} states={states} />
    </>
  );
}
