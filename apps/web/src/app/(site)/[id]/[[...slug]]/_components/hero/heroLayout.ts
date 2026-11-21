/**
 * The hero's grid cells, shared by the hero and the page's loading shell so
 * both draw the same boxes. Phones and desktop stack the same rows: the
 * title group (title, facts, progress line), the first-tracking prompt, the
 * synopsis, then the rating and actions.
 * The spacer has a set height, so what streams into the title group never
 * moves the page below. Desktop: rows 1 and 2 share it, 72% of the window
 * (the title's foot where the site before the redesign had it), at least
 * 460px so a 720px laptop keeps the actions in the first screen. Phones:
 * row 1 alone (456px), so the title starts about 314px down, on the foot of
 * the 440px band of art (`PhoneBackdrop`), with the art's faces above it
 * (the phone framing study on the REDESIGN canvas, `EPHeroBackdrop`);
 * the prompt and synopsis follow it, so a hidden or leaving prompt never
 * moves the title. `md:row-start-1` again after `md:row-span-2`: the span is a
 * `grid-row` shorthand, which would otherwise reset the start and place the
 * spacer after the content.
 */
export const HERO_SPACER =
  'pointer-events-none col-start-1 row-start-1 min-h-[456px] md:row-span-2 md:row-start-1 md:h-[max(460px,calc(72svh-80px))] md:min-h-0 md:group-data-docked/hero:h-[calc(100svh-var(--admin-tray-height,240px)-63px)]';

/**
 * The phone hero's rhythm: 16px from the title to the facts and from the
 * facts' 28px row to the progress line's text, then 20px from that text to
 * whatever follows (prompt, synopsis or actions), each of those carrying its
 * own 20px below it. The progress line's box keeps 12px above its bar and
 * below its line on phones (44px for one row, a tap target), so those
 * count towards the gaps (`PROGRESS_LINE_SPACE`: it reaches 12px up into the facts' 16px
 * margin). Desktop has 24px under the title (a treatment's artwork often
 * reaches its box's foot), then 12px to the line's box and 16px under it,
 * which puts the line 36px from the facts' text and 36px from what follows.
 */
export const HERO_TITLE_SPACE = 'mb-4 md:mb-6';

export const HERO_TITLE_GROUP =
  'col-start-1 row-start-1 self-end md:w-[973px] md:max-w-full';

/** 28px tall at every width: the age rating box streaming in never grows it */
export const HERO_META_ROW =
  'mb-4 flex min-h-7 items-center md:mb-3 md:group-data-docked/hero:mb-px';

/** On the 24px gutter on phones too */
export const HERO_PROMPT_SLOT =
  'col-start-1 row-start-2 min-w-0 md:w-[973px] md:max-w-full';

/**
 * The synopsis' cell: four fifths of the 1216 page, wider than the progress
 * line and the prompt above it: fewer lines, so the hero stays short. It
 * holds the text clamped to three lines and, when the clamp cuts it, the
 * More toggle; the Storyline band below keeps the full text.
 */
export const HERO_DESCRIPTION =
  'col-start-1 row-start-3 max-w-[973px] max-md:mb-5 md:mb-6 md:group-data-docked/hero:hidden';

/** The synopsis' type: smaller lines on phones */
export const HERO_DESCRIPTION_TEXT =
  'max-md:text-body-sm/[22px] max-md:text-white/85 md:text-body md:text-white/80';

/**
 * The rating's cell in the actions row: on phones it pushes the buttons to
 * the right. Without a rating (none, or the read failed) it is empty and
 * collapses, so the row's gap goes with it and the buttons start at the
 * left edge (desktop and phone); while the rating loads its skeleton holds
 * the rating's box.
 */
export const HERO_RATING_CELL = 'empty:hidden max-md:mr-auto';

export const HERO_ACTIONS_ROW =
  'col-start-1 row-start-4 flex items-center md:mb-6 md:gap-12 md:group-data-docked/hero:hidden';
