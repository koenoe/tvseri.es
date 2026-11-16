/** The toolbar's pill: sort, Select, the phone's Find */
export const PILL =
  'inline-flex h-9 shrink-0 cursor-pointer items-center gap-2 rounded-10 bg-white/6 pr-3 pl-3.5 text-[13px] leading-5 font-medium whitespace-nowrap text-white shadow-[inset_0_0_0_1px_rgb(255_255_255/0.08)] transition-colors hover:bg-white/10 disabled:cursor-default';

/** Select ↔ Done: Done is the white pill (`.sel.on`) */
export const PILL_ON =
  'bg-white text-[#171717] shadow-none hover:bg-white/90 [&_svg]:text-[#171717]';

/** The find field (`.fld`): 240px, the search glyph inside */
export const FIELD =
  'flex h-9 w-60 items-center gap-2 rounded-10 bg-white/4 px-3 text-[13px] leading-5 shadow-[inset_0_0_0_1px_rgb(255_255_255/0.1)] focus-within:shadow-[inset_0_0_0_1px_rgb(255_255_255/0.3)]';

/** A visitor's filter chip (`.chip`) */
export const CHIP =
  'inline-flex h-8 shrink-0 cursor-pointer items-center gap-1.5 rounded-full px-3 text-[13px] leading-5 font-medium whitespace-nowrap';
