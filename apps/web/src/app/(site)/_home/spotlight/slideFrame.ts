/**
 * Where a slide's text sits (HMFinal `hx-spb`, HMFinalMobile `hx-mspc`),
 * shared by the slide and the spotlight's placeholder so the ghost stands
 * exactly where the text will: bottom left on the page container (desktop),
 * centred 18px above the stage's foot (phone).
 */
export const SLIDE_BODY =
  'absolute inset-x-gutter bottom-[18px] flex flex-col items-center gap-3 text-center md:inset-x-auto md:bottom-6 md:left-8 md:max-w-[720px] md:items-start md:gap-0 md:text-left';

/** The slide's buttons (and their ghosts): 10px apart, 12 from md; 12px more air above them on a phone */
export const SLIDE_ACTIONS = 'flex items-center gap-2.5 max-md:mt-3 md:gap-3';

/**
 * The stage: 788 on desktop (the text ends 24px above its foot, so with the
 * rows' 40px the first row sits one row gap, 64px, under the buttons), the
 * 513px phone stage + 23px pager
 */
export const SPOTLIGHT_STAGE = 'relative h-[536px] md:h-[788px]';

/** The text's frame inside the stage (the 47px under the header is not in the phone page) */
export const SPOTLIGHT_TEXT_FRAME =
  'pointer-events-none absolute inset-x-0 top-0 h-[513px] md:h-full';
