/**
 * One tile's width in Recently watched: a fifth of the row on desktop (42%
 * on a phone), 16px apart. Shared by the row's slots and its placeholder
 * (not a client module, so the server skeleton gets the string).
 */
export const SLOT_WIDTH =
  'min-w-0 shrink-0 basis-[42%] md:basis-[calc((100%-64px)/5)]';
