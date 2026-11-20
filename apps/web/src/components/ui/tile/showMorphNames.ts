/*
 * The hand-off's names (`showMorph.ts`), in a plain module: the card's
 * client code and the show page's title (`TitleTreatment`, drawn on the
 * server too) both name their parts with them.
 */

export type ShowMorphPart = 'art' | 'logo';

/** The two parts' view-transition names, the same on the card and the page */
export const showMorphName = (part: ShowMorphPart, seriesId: number) =>
  `show-${part}-${seriesId}`;

/** The parts' view-transition classes (globals.css, "Opening a show") */
export const showMorphClass = (part: ShowMorphPart) => `show-${part}`;
