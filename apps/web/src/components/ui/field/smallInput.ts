/**
 * A text field drawn at 13px beside 13px controls. iOS Safari zooms the
 * page into any field under 16px and leaves it zoomed, so on a phone the
 * input is 16px and drawn at 13/16 from its top left, sized 16/13 of its
 * slot so it fills the slot exactly (caret, selection and taps included).
 *
 * `<span className={cn(SMALL_INPUT_SLOT, 'h-5')}><input className={SMALL_INPUT} /></span>`:
 * the slot takes the place and height; the input fills it.
 */
export const SMALL_INPUT_SLOT = 'relative min-w-0 flex-1';

export const SMALL_INPUT =
  'absolute top-0 left-0 size-full bg-transparent text-[13px] text-white outline-hidden placeholder:text-white/60 max-md:size-[calc(100%*16/13)] max-md:origin-top-left max-md:scale-[calc(13/16)] max-md:text-[16px]';
