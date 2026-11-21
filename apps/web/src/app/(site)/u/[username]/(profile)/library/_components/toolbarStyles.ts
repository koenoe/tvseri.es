import { HIT_Y } from '@/components/ui/button/hitArea';

/**
 * The toolbar's pill: sort, Select, the phone's Find. An icon side sits 2px
 * closer than a text side; an icon alone (Find) keeps its own padding.
 * 36px, 44px to the pointer.
 */
export const PILL = `${HIT_Y[4]} relative inline-flex h-9 shrink-0 cursor-pointer items-center gap-2 rounded-10 bg-white/6 px-3.5 text-meta font-medium whitespace-nowrap text-white shadow-[inset_0_0_0_1px_rgb(255_255_255/0.08)] transition-[background-color,color,scale] duration-150 ease-out hover:bg-white/10 active:scale-96 disabled:cursor-default disabled:active:scale-100 has-[>svg:first-child:not(:last-child)]:pl-3 has-[>svg:last-child:not(:first-child)]:pr-3`;

/** Marks Select ↔ Done, where focus goes back as the select bar leaves */
export const SELECT_PILL = 'data-select-pill';

/** Select ↔ Done: Done is the white pill */
export const PILL_ON =
  'bg-white text-[#171717] shadow-none hover:bg-white/90 [&_svg]:text-[#171717]';

/**
 * The find field: 240px, the search glyph inside; 36px, 44 to the pointer
 * like the pills. The reach sits under the input (its own stacking context,
 * `-z-1`), so a press in the text places the caret, drags a selection or
 * picks a word; above and below the field it still focuses the input.
 */
export const FIELD = `${HIT_Y[4]} relative isolate after:-z-1 flex h-9 w-60 items-center gap-2 rounded-10 bg-white/4 px-3 text-[13px] leading-5 shadow-[inset_0_0_0_1px_rgb(255_255_255/0.1)] focus-within:shadow-[inset_0_0_0_1px_rgb(255_255_255/0.35)]`;

/**
 * A shelf chip (the phone's shelves and their skeleton): 32px, 44px to the
 * thumb (the shelves' rail leaves room for the reach)
 */
export const SHELF_CHIP = `${HIT_Y[6]} relative inline-flex h-8 shrink-0 items-center gap-1.5 rounded-full px-3 text-meta font-medium whitespace-nowrap transition-[background-color,color,scale] duration-150 ease-out active:scale-96 has-[>svg:first-child]:pl-2.5`;

/** A visitor's filter chip: a shelf chip that is a button */
export const CHIP = `${SHELF_CHIP} cursor-pointer`;
