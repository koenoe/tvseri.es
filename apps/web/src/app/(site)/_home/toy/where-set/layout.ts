/**
 * Where are they set?'s layout, shared by the toy (`WhereSet`, `MapPins`,
 * `PlaceDetail`) and its placeholder (`WhereSetGhost`). A plain module: the
 * explorer is a client island, the placeholder renders on the server.
 */

/**
 * The card: the map beside the place's show from lg (HMFinal), stacked as
 * HMFinalMobile draws it below that: the 680px map and its 28px gap need a
 * card over 1,000px wide before the show beside it has room (at 800 the
 * side-by-side card ran 164px past the page).
 */
export const WHERE_CARD =
  'flex flex-col gap-4 rounded-16 bg-black/25 p-4 md:px-7 md:py-6 lg:grid lg:grid-cols-[680px_minmax(0,1fr)] lg:gap-7';

/** The map (680 × 293 from lg; the card's width at that ratio below it) */
export const MAP_BOX = 'relative aspect-[680/293] w-full lg:w-[680px]';

/** The place's show: its backdrop, facts and actions */
export const DETAIL = 'flex min-w-0 flex-col gap-3';

/** The facts line: a little more air above and below than the column's gap */
export const DETAIL_META = 'my-1.5';

export const DETAIL_IMAGE =
  'relative h-[200px] overflow-hidden rounded-12 bg-[#14181a] md:h-[220px]';

/** The shade over the backdrops, in their own picture layer (`PICTURE_LAYER`) */
export const DETAIL_SHADE =
  'absolute inset-0 bg-[linear-gradient(0deg,rgb(14_16_17/0.75),rgb(14_16_17/0)_60%)]';

/** Where the show's title sits on its image: bottom left, 16px in on a phone, 20 from md */
export const DETAIL_TITLE =
  'absolute inset-x-4 bottom-4 z-2 flex md:inset-x-5 md:bottom-5';

/** The title written, when the show has no logo (HMFinal `e2-ml`) */
export const DETAIL_TITLE_TEXT = 'text-title-3 text-white';

/** The logo's limit (200 × 48, never past the image's inset): it sits on its bottom left */
export const DETAIL_LOGO = 'relative block h-12 w-[200px] max-w-full';
