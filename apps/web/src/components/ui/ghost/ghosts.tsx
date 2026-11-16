import type { CSSProperties, ReactNode } from 'react';

import ButtonContent from '@/components/ui/button/ButtonContent';
import {
  BUTTON_ICON_SIZE,
  type ButtonVariantProps,
  buttonStyles,
  circleButtonStyles,
} from '@/components/ui/button/buttonStyles';
import Icon from '@/components/ui/icon/Icon';
import type { Glyph, IconSize } from '@/components/ui/icon/types';
import {
  GHOST_FILL,
  GHOST_FILL_OVER,
  GhostLine,
} from '@/components/ui/row/RowGhosts';
import cn from '@/lib/cn';

/**
 * The pieces Home's placeholders are built from (`Skeletons.tsx` and each
 * section's `…Ghost`), inside the section's own layout. Ghosts carry the fill
 * only: the block they sit in pulses once (`PULSE`), so a card pulses as one
 * layer, never per shape out of phase.
 */

/** The one pulsing layer of a placeholder block (globals.css `animate-ghost`) */
export const PULSE = 'animate-ghost';

/**
 * A finished surface or control reused for its box only (a
 * skeleton shows no glass, gradients, shadows, rings or real-looking
 * controls): the ghost fill, nothing else; its contents keep their size but
 * don't show.
 */
export const FLAT = cn(
  GHOST_FILL,
  GHOST_FILL_OVER,
  '!bg-none !shadow-none !ring-0 !border-transparent !backdrop-blur-none !text-transparent pointer-events-none [&_*]:!invisible',
);

/** A block of data still to come (an image, a poster, a logo) */
export function Ghost({
  className,
  style,
}: Readonly<{ className: string; style?: CSSProperties }>) {
  const classes = cn('block', GHOST_FILL, className);
  return <span className={classes} style={style} />;
}

/** A line of text still to come, as a bar in the text's line box (`className` sets the line's height) */
export function Line({
  className,
  width,
}: Readonly<{ className: string; width: string }>) {
  return (
    <GhostLine className={className} inPulse look="loading" width={width} />
  );
}

/** Gives an empty line its type style's line box */
const ZERO_WIDTH = '\u200b';

/**
 * A line of text still to come in the text's own type style (`className`,
 * the class the loaded text uses): its line box comes from the style, the
 * bar sits in it, so the line is as tall as the text that replaces it.
 */
export function TextLine({
  bar = 'h-3',
  className,
  width,
}: Readonly<{
  /** the bar's height (a big numeral's is taller) */
  bar?: string;
  className: string;
  width: string;
}>) {
  // the zero-width text gives the line box; the bar is a flex item, so its
  // width counts where the line is sized by its content
  const line = cn('flex items-center', className);
  const fill = cn('shrink-0 rounded-4', GHOST_FILL, bar, width);
  return (
    <span className={line}>
      {ZERO_WIDTH}
      <span className={fill} />
    </span>
  );
}

/** A round control still to come: a flat circle in the control's box */
export const ghostCircle = (className?: string) =>
  circleButtonStyles({ className: cn(className, FLAT) });

/**
 * A button still to come: a flat pill in the box the loaded button takes
 * (its static label sizes it, unseen), so the real one takes its place.
 */
export function ButtonFace({
  children,
  className,
  icon,
  iconSize,
  size = 'sm',
  trailingIcon,
  variant,
}: Readonly<{
  children: ReactNode;
  className?: string;
  icon?: Glyph;
  /** As `Button`'s: only where the loaded button draws its icon off the size's default */
  iconSize?: IconSize;
  size?: ButtonVariantProps['size'];
  /** After the label, as `Button`'s (a leading icon pads the pill differently) */
  trailingIcon?: Glyph;
  variant?: ButtonVariantProps['variant'];
}>) {
  const classes = buttonStyles({
    className: cn(className, FLAT),
    size,
    variant,
  });
  const resolvedIconSize = iconSize ?? BUTTON_ICON_SIZE[size ?? 'md'];
  return (
    <span className={classes}>
      <ButtonContent
        icon={icon}
        iconSize={resolvedIconSize}
        trailingIcon={trailingIcon}
      >
        {children}
      </ButtonContent>
    </span>
  );
}

/**
 * A 36px button whose label comes with the data ("Open Severance"): a flat
 * pill as wide as the icon and a typical label (`width`) would make it.
 */
export function ButtonGhost({
  className,
  icon,
  width,
}: Readonly<{
  className?: string;
  icon?: Glyph;
  width: string;
}>) {
  const classes = cn(
    'flex h-9 shrink-0 items-center gap-2 rounded-full pr-3.5 pl-3',
    FLAT,
    className,
  );
  const label = cn('h-3', width);
  return (
    <span className={classes}>
      {icon ? <Icon glyph={icon} size={16} /> : null}
      <span className={label} />
    </span>
  );
}
