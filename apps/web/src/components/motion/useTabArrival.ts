import { type TransitionEvent, useState } from 'react';

/**
 * A switched-to tab's arrival (`TAB_ARRIVE`) for a rail drawn by `Row`: the
 * tab keys its tiles, so a new tab's are inserted (and rise in, even a show
 * both tabs have). `arriving` from the viewer's switch until the first tile
 * has risen in; then it is dropped: a page Next keeps in a hidden
 * `<Activity>` re-applies `@starting-style` when Back shows it again. The
 * tab the page drew plays nothing, nor does a press on the tab shown.
 *
 * @example
 * const swap = useTabArrival(tab);
 * <Row swap={swap} …>
 */
export default function useTabArrival(tab: string) {
  const [played, setPlayed] = useState(tab);
  const arriving = tab !== played;
  const onTransitionEnd = (event: TransitionEvent<HTMLElement>) => {
    const target = event.target as Element;
    // a tile's own rise, not a fade inside it
    if (
      arriving &&
      event.propertyName === 'opacity' &&
      target.parentElement === event.currentTarget
    ) {
      setPlayed(tab);
    }
  };
  return { arriving, key: tab, onTransitionEnd };
}
