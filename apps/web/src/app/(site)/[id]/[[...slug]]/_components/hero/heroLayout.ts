/**
 * The hero's grid cells, shared by the hero and the page's loading shell so
 * both draw the same boxes.
 * Rows 1 and 2 share a spacer of a set height (457 + 48px on desktop, 376px
 * on phones), so what streams into them never moves the page below. On a
 * tall window the desktop spacer grows with it (65% of its height), so the
 * backdrop keeps its room above the title.
 */
export const HERO_SPACER =
  'pointer-events-none col-start-1 row-span-2 row-start-1 min-h-[376px] md:h-[max(505px,calc(65svh-80px))] md:min-h-0 md:group-data-docked/hero:h-[calc(100svh-var(--admin-tray-height,240px)-63px)]';

/**
 * The phone hero's rhythm: 16px
 * from the title to the facts, 20px from the facts to the progress line's
 * text and 20px from it to the rating and actions. The progress line's box is
 * 44px tall on phones (a tap target), so its own 12px above and below the
 * text count towards those 20s (`PROGRESS_LINE_SPACE`: it reaches 12px up
 * into the facts' 20px margin). Desktop has 24px under the title (a
 * treatment's artwork often reaches its box's foot), then 12px to the
 * line's box and 16px under it, which puts the line 36px from the facts'
 * text and 36px from what follows.
 */
export const HERO_TITLE_SPACE = 'mb-4 md:mb-6';

export const HERO_TITLE_GROUP =
  'col-start-1 row-start-1 self-end md:w-[973px] md:max-w-full';

/** 28px tall at every width: the age rating box streaming in never grows it */
export const HERO_META_ROW =
  'mb-5 flex min-h-7 items-center md:mb-3 md:group-data-docked/hero:mb-px';

/** On the 24px gutter on phones too */
export const HERO_PROMPT_SLOT =
  'col-start-1 mt-1 min-w-0 max-md:row-start-3 md:row-start-2 md:mt-0 md:w-[973px] md:max-w-full';

/**
 * The synopsis: four fifths of the 1216 page, wider than
 * the progress line and the prompt above it: fewer lines, so the hero stays
 * short.
 */
export const HERO_DESCRIPTION =
  'col-start-1 row-start-3 mb-6 max-w-[973px] text-body text-white/80 max-md:hidden md:group-data-docked/hero:hidden';

/**
 * The rating's cell in the actions row: on phones it pushes the buttons to
 * the right. Without a rating (none, or the read failed) it is empty and
 * collapses, so the row's gap goes with it and the buttons start at the
 * left edge (desktop and phone); while the rating loads its skeleton holds
 * the rating's box.
 */
export const HERO_RATING_CELL = 'empty:hidden max-md:mr-auto';

export const HERO_ACTIONS_ROW =
  'col-start-1 flex items-center max-md:row-start-2 md:row-start-4 md:mb-6 md:gap-12 md:group-data-docked/hero:hidden';
