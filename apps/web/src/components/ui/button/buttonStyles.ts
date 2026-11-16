import { cva, type VariantProps } from 'class-variance-authority';

import type { IconSize } from '@/components/ui/icon/types';
import cn from '@/lib/cn';

/**
 * Class lists for every pressable control the boards draw. Each takes an
 * optional `className` that wins over the variant (merged by `cn`), so a page
 * can express a one-off state (the cyan edge of a Next up eye pill) without a
 * new variant. Focus rings come from the global `:focus-visible` rule.
 *
 * Board sources per variant are in the style guide (ButtonSection).
 */

const pill = cva(
  [
    'inline-flex max-w-full shrink-0 cursor-pointer items-center justify-center gap-2 whitespace-nowrap rounded-full font-medium select-none',
    'transition-[background-color,border-color,color,opacity] duration-150',
    'disabled:cursor-default aria-disabled:cursor-default',
    'aria-busy:cursor-progress aria-busy:opacity-50',
  ],
  {
    defaultVariants: { size: 'md', variant: 'outline' },
    variants: {
      size: {
        /** 44: phone targets and the Focus tile pill (0 20 0 16) */
        lg: 'h-11 gap-2.5 px-5 text-body-sm has-[>svg:first-child]:pl-4',
        /** 40: the default (0 16 0 14) */
        md: 'h-10 px-4 text-body-sm has-[>svg:first-child]:pl-3.5',
        /** 36: compact actions */
        sm: 'h-9 px-3.5 text-body-sm has-[>svg:first-child]:pl-3',
        /** 32: the eye pill on a still (0 14 0 10) */
        xs: 'h-8 px-3.5 text-caption has-[>svg:first-child]:pl-2.5',
      },
      variant: {
        /** the cyan Next up pill, the strongest action on a page */
        accent:
          'border-2 border-cyan bg-[rgb(0_180_190/0.38)] text-white disabled:opacity-30 aria-disabled:opacity-30',
        /** frosted, for buttons over a still */
        glass:
          'border-2 border-white/20 bg-white/8 text-white backdrop-blur-md hover:border-white/50 disabled:opacity-30 aria-disabled:opacity-30',
        /** transparent with a 2px edge */
        outline:
          'border-2 border-white/25 text-white hover:border-white/50 disabled:opacity-30 aria-disabled:opacity-30',
        /** solid white */
        primary: [
          'border-2 border-white bg-white text-[#171717] hover:bg-white/88',
          'disabled:border-transparent disabled:bg-white/20 disabled:text-white/60',
          'aria-disabled:border-transparent aria-disabled:bg-white/20 aria-disabled:text-white/60',
        ],
        /** text only until hovered: Cancel, Not now */
        quiet:
          'text-white/80 hover:bg-white/8 hover:text-white disabled:opacity-30 aria-disabled:opacity-30',
        /**
         * dark glass on a still: the eye pill. Pressed
         * (watched) gets the bright edge.
         */
        scrim: [
          'border-2 border-white/20 bg-black/50 text-white/80 backdrop-blur-[6px] hover:border-white/45 hover:text-white',
          'aria-pressed:border-white/75 aria-pressed:bg-black/60 aria-pressed:text-white',
          'disabled:opacity-55 aria-disabled:opacity-55',
        ],
        /** filled, no edge: sheet and card actions */
        tonal:
          'bg-white/8 text-white hover:bg-white/16 aria-pressed:bg-white aria-pressed:text-black/90 disabled:opacity-30 aria-disabled:opacity-30',
      },
    },
  },
);

export type ButtonVariantProps = VariantProps<typeof pill>;
export type ButtonSize = NonNullable<ButtonVariantProps['size']>;

type WithClassName = Readonly<{ className?: string }>;

export function buttonStyles({
  className,
  ...variants
}: ButtonVariantProps & WithClassName) {
  return cn(pill(variants), className);
}

/** Icon size per button size (icons_final.md: 16 with a label, 20 on the 44px pill). */
export const BUTTON_ICON_SIZE: Readonly<Record<ButtonSize, IconSize>> = {
  lg: 20,
  md: 16,
  sm: 16,
  xs: 16,
};

const circle = cva(
  [
    'relative inline-flex shrink-0 cursor-pointer items-center justify-center rounded-full border-2 border-white/20 text-white/80',
    'transition-[background-color,border-color,color,opacity,scale] duration-150',
    'hover:border-white/45 hover:bg-white/6 hover:text-white active:scale-94 active:bg-white/10',
    'aria-pressed:border-white aria-pressed:text-white',
    'disabled:cursor-default disabled:opacity-30 disabled:hover:border-white/20 disabled:hover:bg-transparent disabled:active:scale-100',
    'aria-disabled:cursor-default aria-disabled:opacity-30 aria-disabled:hover:border-white/20 aria-disabled:hover:bg-transparent aria-disabled:active:scale-100',
  ],
  {
    defaultVariants: { size: 32, tone: 'outline' },
    variants: {
      size: {
        /** a dialog's ✕, a card's ⋯ */
        32: 'size-8',
        /** episode paging */
        36: 'size-9',
        /** row arrows */
        40: 'size-10',
        /** the large ⋯ */
        44: 'size-11',
        /** hero actions */
        48: 'size-12',
      },
      tone: {
        /** on a still: the episode modal's tools */
        glass: 'bg-black/25 backdrop-blur-md',
        outline: '',
      },
    },
  },
);

export type CircleButtonVariantProps = VariantProps<typeof circle>;
export type CircleButtonSize = NonNullable<CircleButtonVariantProps['size']>;

export function circleButtonStyles({
  className,
  ...variants
}: CircleButtonVariantProps & WithClassName) {
  return cn(circle(variants), className);
}

/** Icon size per circle size (the boards: 16 in 32/36, 20 in 40/44, 24 in 48). */
export const CIRCLE_ICON_SIZE: Readonly<Record<CircleButtonSize, IconSize>> = {
  32: 16,
  36: 16,
  40: 20,
  44: 20,
  48: 24,
};

const chip = cva(
  [
    'inline-flex shrink-0 cursor-pointer items-center gap-1.5 whitespace-nowrap rounded-full text-caption font-medium',
    'transition-[background-color,border-color,color] duration-200',
    'aria-pressed:bg-white aria-pressed:text-black/90',
  ],
  {
    defaultVariants: { variant: 'subtle' },
    variants: {
      variant: {
        /** the quiet one beside them */
        outline:
          'h-7.5 px-3 text-white/80 shadow-[inset_0_0_0_1px_rgb(255_255_255/0.16)] hover:bg-white/8 hover:text-white',
        /** keyword and sub-genre chips */
        subtle:
          'h-8 border border-white/5 bg-white/3.5 px-3 text-white hover:border-white/18 aria-pressed:border-white',
        /** 30px chips in sheets and dialogs */
        tonal: 'h-7.5 bg-white/8 px-3 text-white hover:bg-white/16',
      },
    },
  },
);

export type ChipVariantProps = VariantProps<typeof chip>;

export function chipStyles({
  className,
  ...variants
}: ChipVariantProps & WithClassName) {
  return cn(chip(variants), className);
}

const badge = cva('inline-flex shrink-0 items-center whitespace-nowrap', {
  defaultVariants: { variant: 'new' },
  variants: {
    variant: {
      /** S04E02 */
      code: 'h-6 min-w-14 justify-center rounded-6 bg-white/10 px-1.5 text-caption font-medium text-white tabular-nums',
      /** a count beside a title */
      count:
        'h-5.5 min-w-5.5 justify-center rounded-full bg-white/10 px-1.75 text-caption font-medium text-white tabular-nums',
      /** "New" on an option */
      new: 'h-4.5 rounded-full bg-white/12 px-1.5 text-overline uppercase text-white/80',
    },
  },
});

export type BadgeVariantProps = VariantProps<typeof badge>;

export function badgeStyles({
  className,
  ...variants
}: BadgeVariantProps & WithClassName) {
  return cn(badge(variants), className);
}

/** The row switch. */
export function segmentedStyles({ className }: WithClassName = {}) {
  return cn(
    'inline-flex items-center gap-1 rounded-full bg-black/22 p-1',
    className,
  );
}

export function segmentedItemStyles({ className }: WithClassName = {}) {
  return cn(
    'inline-flex h-7.5 cursor-pointer items-center gap-2 whitespace-nowrap rounded-full px-3 text-body-sm font-medium text-white/60',
    'transition-[background-color,color] duration-200 hover:text-white',
    'aria-pressed:bg-white/15 aria-pressed:text-white',
    className,
  );
}

/** Underlined text action. */
export function textLinkStyles({ className }: WithClassName = {}) {
  return cn(
    'cursor-pointer text-body-sm font-medium text-white/80 underline underline-offset-2 transition-colors hover:text-white',
    className,
  );
}

/**
 * The pill switch on a picture (From your circle; the
 * Countdown's premieres): one dark rounded ground holding the choices, the
 * chosen one filled. Its ground is 75% dark, not the board's 42%: the least
 * that keeps the unchosen names (white at 60%) at 4.5:1 over a white
 * picture (4.52:1; 1.98:1 at 42%). A row too long for its place scrolls
 * sideways inside it.
 */
export function pillSwitchStyles({ className }: WithClassName = {}) {
  return cn(
    'flex items-center gap-0.5 overflow-x-auto rounded-full bg-[rgb(8_11_12/0.75)] p-0.5 shadow-[inset_0_0_0_1px_rgb(255_255_255/0.06)] [scrollbar-width:none]',
    className,
  );
}

/** One choice of the pill switch: 28px, a long name truncates (its max width is the caller's) */
export function pillSwitchItemStyles({ className }: WithClassName = {}) {
  return cn(
    'h-7 shrink-0 cursor-pointer truncate whitespace-nowrap rounded-full px-3 text-body-sm font-medium transition-colors duration-300',
    'text-white/60 hover:text-white/80 aria-pressed:bg-white/14 aria-pressed:text-white aria-pressed:hover:text-white',
    className,
  );
}
