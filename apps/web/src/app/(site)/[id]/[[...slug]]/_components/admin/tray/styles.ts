import { cva } from 'class-variance-authority';

/**
 * The tray controls (`.ad-btn`, `.ad-q`, `.ad-st`, `.ad-t1-b`): 10px
 * corners and the tray's own fills, which the app's pill buttons don't draw.
 */
export const trayButton = cva(
  'inline-flex shrink-0 cursor-pointer items-center justify-center gap-2 whitespace-nowrap rounded-10 px-4 text-body-sm font-medium aria-disabled:cursor-default',
  {
    defaultVariants: { size: 'md', tone: 'tonal' },
    variants: {
      size: {
        lg: 'h-12',
        md: 'h-10',
        sm: 'h-9 px-3.5',
      },
      tone: {
        solid:
          'bg-white text-[#171717] hover:bg-white/88 aria-disabled:opacity-40 aria-disabled:hover:bg-white aria-busy:bg-white/70',
        tonal: 'bg-white/10 text-white hover:bg-white/16',
      },
    },
  },
);

export const quietButton = cva(
  'inline-flex shrink-0 cursor-pointer items-center gap-1.5 whitespace-nowrap rounded-10 bg-transparent text-body-sm font-medium hover:bg-white/6 hover:text-white',
  {
    defaultVariants: { size: 'md' },
    variants: {
      size: {
        md: 'h-10 px-2.5 text-white/80',
        // The sheet draws its quiet buttons (Cancel, Reset) white
        phone: 'h-11 px-1 text-white',
      },
    },
  },
);

export const statusChip = cva(
  'inline-flex h-6 items-center gap-1.5 whitespace-nowrap rounded-full bg-white/8 px-[9px] text-caption font-medium',
  {
    variants: {
      kind: {
        busy: 'text-white/60',
        dirty:
          'text-white/80 before:size-1.5 before:rounded-full before:bg-white before:content-[""]',
        idle: 'text-white/80',
      },
    },
  },
);

/** The small filled button in a toast or the phone's error line. */
export const smallAction =
  'h-8 shrink-0 cursor-pointer whitespace-nowrap rounded-8 px-3 text-caption font-medium';
