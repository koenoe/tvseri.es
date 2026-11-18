/**
 * The row's paging maths: pure, so the arrows island only
 * reads the rail and scrolls it. All values are in the rail's scroll
 * coordinates: an item's `left` is its `offsetLeft` inside the rail.
 */

/** Browsers report sub-pixel offsets; anything within a pixel is "there". */
const EDGE = 1;

type RailMetrics = Readonly<{
  clientWidth: number;
  scrollLeft: number;
  scrollWidth: number;
}>;

type RailLayout = RailMetrics &
  Readonly<{
    items: ReadonlyArray<Readonly<{ left: number; width: number }>>;
    /** the start gutter (scroll-padding), where a snapped first card sits */
    paddingStart: number;
  }>;

export type RowPosition = 'end' | 'fits' | 'middle' | 'start';

export type PageDirection = 'next' | 'previous';

const maxScroll = ({ clientWidth, scrollWidth }: RailMetrics) =>
  Math.max(0, scrollWidth - clientWidth);

/** Where the rail is: drives the arrows' dimmed ends, or no arrows at all. */
export function getRowPosition(rail: RailMetrics): RowPosition {
  const max = maxScroll(rail);
  if (max <= EDGE) {
    return 'fits';
  }
  if (rail.scrollLeft <= EDGE) {
    return 'start';
  }
  return rail.scrollLeft >= max - EDGE ? 'end' : 'middle';
}

/**
 * Next: the first card cut off at the right becomes the first card.
 * Previous, the mirror: scroll back as far as possible while the card just
 * before the current first one ends up fully visible.
 * Every target is a card's snap position (its left minus the gutter),
 * clamped to the scroll range.
 */
export function getPageTarget(
  direction: PageDirection,
  rail: RailLayout,
): number {
  const { clientWidth, items, paddingStart, scrollLeft } = rail;
  const max = maxScroll(rail);
  const clamp = (value: number) => Math.min(max, Math.max(0, value));

  if (direction === 'next') {
    const viewEnd = scrollLeft + clientWidth;
    const cut = items.find(
      (item) =>
        item.left + item.width > viewEnd + EDGE &&
        item.left - paddingStart > scrollLeft + EDGE,
    );
    return cut ? clamp(cut.left - paddingStart) : max;
  }

  const firstIndex = items.findIndex(
    (item) => item.left >= scrollLeft + paddingStart - EDGE,
  );
  const before = items[(firstIndex === -1 ? items.length : firstIndex) - 1];
  if (!before) {
    return 0;
  }
  const minLeft = before.left + before.width - (clientWidth - paddingStart);
  const first = items.find((item) => item.left >= minLeft - EDGE);
  return first ? clamp(first.left - paddingStart) : 0;
}
