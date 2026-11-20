/** A box in viewport px (a DOMRect fits) */
export type Rect = Readonly<{
  bottom: number;
  left: number;
  right: number;
  top: number;
}>;

export type Size = Readonly<{ height: number; width: number }>;

/** How close a popover comes to the viewport's edges */
export const MARGIN = 16;

export const clamp = (value: number, min: number, max: number) =>
  Math.max(min, Math.min(value, max));

/** A panel's left edge kept 16px inside the viewport (the left edge wins when it is too wide) */
export const clampLeft = (left: number, width: number, viewport: number) =>
  clamp(left, MARGIN, Math.max(MARGIN, viewport - width - MARGIN));

export type VerticalFit = Readonly<{
  /** Px; `null` when the panel fits as it is */
  maxHeight: number | null;
  side: 'above' | 'below';
}>;

/**
 * Which side of its anchor a panel that can shrink opens on: below when it
 * fits there, else on the side with more room, capped to that room (its
 * list scrolls inside). Pure: the caller measures.
 */
export function fitVertically({
  anchorBottom,
  anchorTop,
  gap,
  natural,
  viewport,
}: Readonly<{
  anchorBottom: number;
  anchorTop: number;
  /** Between the anchor and the panel */
  gap: number;
  /** The panel's height as drawn, uncapped */
  natural: number;
  /** The viewport's height */
  viewport: number;
}>): VerticalFit {
  const below = Math.floor(viewport - anchorBottom - gap - MARGIN);
  const above = Math.floor(anchorTop - gap - MARGIN);
  if (natural <= below) {
    return { maxHeight: null, side: 'below' };
  }
  if (above > below) {
    return { maxHeight: natural <= above ? null : above, side: 'above' };
  }
  return { maxHeight: Math.max(0, below), side: 'below' };
}

type ArrowedPlace = VerticalFit &
  Readonly<{
    /** The arrow's centre from the panel's left edge */
    arrow: number;
    left: number;
    top: number;
  }>;

/**
 * A panel with an arrow on its anchor, against the viewport: centred on the
 * anchor and kept 16px inside the window, on the side `fitVertically`
 * picks. The arrow stays on the anchor's centre, `arrowInset` clear of the
 * panel's corners.
 */
export function placeArrowed({
  anchor,
  arrowInset,
  gap,
  panel,
  viewport,
}: Readonly<{
  anchor: Rect;
  arrowInset: number;
  gap: number;
  /** Its natural size (unscaled, uncapped) */
  panel: Size;
  viewport: Size;
}>): ArrowedPlace {
  const fit = fitVertically({
    anchorBottom: anchor.bottom,
    anchorTop: anchor.top,
    gap,
    natural: panel.height,
    viewport: viewport.height,
  });
  const centre = (anchor.left + anchor.right) / 2;
  const left = clampLeft(centre - panel.width / 2, panel.width, viewport.width);
  const height = fit.maxHeight ?? panel.height;
  return {
    ...fit,
    arrow: clamp(centre - left, arrowInset, panel.width - arrowInset),
    left,
    top: fit.side === 'below' ? anchor.bottom + gap : anchor.top - gap - height,
  };
}
