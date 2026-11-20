import { cva, type VariantProps } from 'class-variance-authority';

import { FILL_BEFORE } from '@/components/motion/glide';
import type { IconSize } from '@/components/ui/icon/types';
import cn from '@/lib/cn';

import { HIT_ALL, HIT_Y } from './hitArea';

/**
 * Class lists for every shared pressable control. Each takes an optional
 * `className` that wins over the variant (merged by `cn`), so a page can
 * express a one-off state without a new variant. Focus rings come from the
 * global `:focus-visible` rule. The style guide (ButtonSection) shows each
 * variant.
 *
 * A press scales a control to 0.96 (never while disabled); a place where
 * that would distract opts out with `active:scale-none` in its `className`.
 * `none`, not `scale-100`: any scale makes the control the containing block
 * of its absolute parts, so a reach drawn against an ancestor (a whole
 * header row) would shrink under the pointer mid-press.
 */

/** The press: 0.96, held at 1 while disabled */
const PRESS =
  'active:scale-96 disabled:active:scale-100 aria-disabled:active:scale-100';

const pill = cva(
  [
    'inline-flex max-w-full shrink-0 cursor-pointer items-center justify-center gap-2 whitespace-nowrap rounded-full font-medium select-none',
    'transition-[background-color,border-color,color,opacity,scale] duration-150',
    PRESS,
    'disabled:cursor-default aria-disabled:cursor-default',
    'aria-busy:cursor-progress aria-busy:opacity-50',
  ],
  {
    defaultVariants: { size: 'md', variant: 'outline' },
    variants: {
      /*
       * The icon side sits closer than the text side (an icon's box has air
       * in it), leading or trailing alike. Under 40px the target reaches
       * above and below the pill to 40.
       */
      size: {
        /** 44: phone targets and the Focus tile pill (0 20 0 16) */
        lg: 'h-11 gap-2.5 px-5 text-body-sm has-[>svg:first-child]:pl-4 has-[>svg:last-child]:pr-4',
        /** 40: the default (0 16 0 14) */
        md: 'h-10 px-4 text-body-sm has-[>svg:first-child]:pl-3.5 has-[>svg:last-child]:pr-3.5',
        /** 36: compact actions */
        sm: [
          'relative h-9 px-3.5 text-body-sm has-[>svg:first-child]:pl-3 has-[>svg:last-child]:pr-3',
          HIT_Y[2],
        ],
        /** 32: the eye pill on a still (0 14 0 10) */
        xs: [
          'relative h-8 px-3.5 text-caption has-[>svg:first-child]:pl-2.5 has-[>svg:last-child]:pr-2.5',
          HIT_Y[4],
        ],
      },
      variant: {
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

/** Icon size per button size: 16 with a label, 20 on the 44px pill. */
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
    'hover:border-white/45 hover:bg-white/6 hover:text-white active:scale-96 active:bg-white/10',
    'aria-pressed:border-white aria-pressed:text-white',
    'disabled:cursor-default disabled:opacity-30 disabled:hover:border-white/20 disabled:hover:bg-transparent disabled:active:scale-100',
    'aria-disabled:cursor-default aria-disabled:opacity-30 aria-disabled:hover:border-white/20 aria-disabled:hover:bg-transparent aria-disabled:active:scale-100',
  ],
  {
    defaultVariants: { size: 32, tone: 'outline' },
    variants: {
      size: {
        /** a dialog's ✕, a card's ⋯: 40px to the pointer (a dialog's tools sit 8px apart, so not 44) */
        32: ['size-8', HIT_ALL[6]],
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

/** Icon size per circle size: 16 in 32, 20 in 40/44, 24 in 48. */
export const CIRCLE_ICON_SIZE: Readonly<Record<CircleButtonSize, IconSize>> = {
  32: 16,
  40: 20,
  44: 20,
  48: 24,
};

const chip = cva(
  [
    'relative inline-flex shrink-0 cursor-pointer items-center gap-1.5 whitespace-nowrap rounded-full text-caption font-medium',
    'transition-[background-color,border-color,color,scale] duration-150 ease-out',
    PRESS,
    // 8px more above and below: a cloud's rows are 8px apart
    HIT_Y[4],
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

/**
 * The pressed fill is the item's `::before`, under its words, so it can
 * glide from the item pressed before (`SegmentedItem`) without moving them.
 * It has no fade of its own: the old fill goes as the new one sets off.
 * A caller's fill colour goes on `aria-pressed:before:`.
 */
export function segmentedItemStyles({ className }: WithClassName = {}) {
  return cn(
    FILL_BEFORE,
    'inline-flex h-7.5 cursor-pointer items-center gap-2 whitespace-nowrap rounded-full px-3 text-body-sm font-medium text-white/60',
    HIT_Y[5],
    'transition-colors duration-200 hover:text-white',
    'aria-pressed:text-white aria-pressed:before:bg-white/15',
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
 * chosen one filled. Its ground is 75% dark: the least that keeps the
 * unchosen names (white at 60%) at 4.5:1 over a white picture (4.52:1). A
 * row too long for its place scrolls
 * sideways inside it.
 */
export function pillSwitchStyles({ className }: WithClassName = {}) {
  return cn(
    'flex items-center gap-0.5 overflow-x-auto rounded-full bg-[rgb(8_11_12/0.75)] p-0.5 shadow-[inset_0_0_0_1px_rgb(255_255_255/0.06)] [scrollbar-width:none]',
    className,
  );
}

/**
 * One choice of the pill switch: 28px, a long name truncates (its max width
 * is the caller's). The label truncates, not the button: the pressed fill
 * slides in from the old choice and must not be clipped on its way.
 */
export function pillSwitchItemStyles({ className }: WithClassName = {}) {
  return cn(
    'relative flex h-7 shrink-0 cursor-pointer items-center whitespace-nowrap rounded-full px-3 text-body-sm font-medium transition-colors duration-150 ease-out',
    'text-white/60 hover:text-white/80 aria-pressed:text-white aria-pressed:hover:text-white',
    className,
  );
}
