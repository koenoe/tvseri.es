/**
 * Connected by's layout, shared by the toy (`ConnectedBy`, `PathSwitcher`)
 * and its placeholder (`ConnectedByGhost`). A plain module: the switcher is
 * a client island, the placeholder renders on the server.
 */

/**
 * The card, its height fixed from md so the placeholder holds it: 24px
 * above, the head, 40px of air (16 + the chain's 24), the 182px chain
 * (poster, name, roles) and 50px below the roles, so the path stands clear
 * of the head and the card's foot. 336px from lg (the head one row), 372px
 * at md (the label on its own row above the title).
 */
export const CONNECTED_CARD =
  'flex flex-col gap-4 rounded-16 bg-black/25 p-4 md:h-[372px] md:px-7 md:pt-6 md:pb-6.5 lg:h-[336px]';

/**
 * The card's head: the "Connected by" label, "{A} to {B}, in 2 steps" and
 * "Another path"; one row from lg, the label on its own row below that; on
 * a phone the three are stacked and centred
 */
export const PATH_HEAD =
  'flex flex-wrap items-center gap-4 max-md:justify-center max-md:text-center lg:flex-nowrap';

/** The label's place in the head */
export const PATH_LABEL = 'max-md:justify-center max-lg:basis-full';

export const PATH_TITLE = 'min-w-0 text-title-3 text-white';

/**
 * The title's place: its own row on a phone (the switch goes under it), the
 * room left beside the switch from md, however long it is
 */
export const PATH_TITLE_SLOT = 'max-md:basis-full md:flex-1 md:basis-0';

/**
 * On a phone the title takes its two lines' box, so the head is as tall
 * whatever the day's two series are called; from md it is one line (the
 * full text in its hover title)
 */
export const PATH_TITLE_BOX = `${PATH_TITLE_SLOT} max-md:line-clamp-2 max-md:min-h-12 md:line-clamp-1`;

/** "Another path", at the head's end (centred under the title on a phone) */
export const PATH_SWITCH = 'ml-auto max-md:mx-auto';

export const ANOTHER_PATH_LABEL = 'Another path';
