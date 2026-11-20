'use client';

import { type ComponentProps, useLayoutEffect, useRef } from 'react';

import Icon from '@/components/ui/icon/Icon';
import IconSwap from '@/components/ui/icon/IconSwap';
import type { Glyph, IconSize, ToggleGlyph } from '@/components/ui/icon/types';
import { REDUCED_MOTION } from '@/lib/media/breakpoints';
import { matchesNow } from '@/lib/media/useMediaQuery';

import {
  CIRCLE_ICON_SIZE,
  type CircleButtonVariantProps,
  circleButtonStyles,
} from './buttonStyles';

type Props = Omit<ComponentProps<'button'>, 'aria-label' | 'children'> &
  CircleButtonVariantProps &
  Readonly<{
    icon: Glyph | ToggleGlyph;
    /** Overrides the glyph size the circle's size gives (e.g. a 14px ✕). */
    iconSize?: IconSize;
    /** Required: the button has no visible text. */
    label: string;
    /** A toggle: sets `aria-pressed`, brightens the ring, fills the glyph. */
    pressed?: boolean;
  }>;

/** A toggle's icon shrinks while it is held: the press is the gesture, so it goes past the button's own 0.96 */
const TOGGLE_ICON =
  'inline-flex transition-[scale] duration-150 ease-out group-active/circle:scale-60 group-disabled/circle:scale-100';

/** The burst's disc: behind the icon, the button's size, unseen at rest */
const BURST =
  'pointer-events-none absolute inset-0 -z-1 rounded-full bg-white opacity-0';

/** A white disc grows to twice the button and fades */
const BURST_FRAMES: Keyframe[] = [
  { opacity: 1, scale: 0 },
  { opacity: 0, scale: 2 },
];

const BURST_TIMING: KeyframeAnimationOptions = {
  duration: 600,
  easing: 'ease-out',
};

/**
 * The round icon button (close, row arrows, the hero's watchlist/favourite
 * circles, the eye): white/20 ring, brighter on hover, white when on. A
 * toggle (`pressed` given) also moves: the icon shrinks while held, and
 * turning it on sends a white disc out from behind it. The burst plays only
 * on the change from off to on, never for a button that is drawn already
 * on, and not at all with reduced motion.
 *
 * @example
 * <CircleButton icon={closeGlyph} label="Close" onClick={close} />
 * <CircleButton icon={heartGlyph} label="Favourite" pressed={isFav} size={48} />
 */
export default function CircleButton({
  className,
  icon,
  iconSize: iconSizeOverride,
  label,
  pressed,
  size,
  tone,
  type = 'button',
  ...rest
}: Props) {
  const isToggle = pressed !== undefined;
  const burst = useRef<HTMLSpanElement>(null);
  const wasPressed = useRef(pressed);
  // An effect, not the click: the burst follows the state (an optimistic
  // mark, an Undo, a refused press), whoever changed it
  useLayoutEffect(() => {
    const turnedOn = pressed === true && wasPressed.current === false;
    wasPressed.current = pressed;
    if (!turnedOn || matchesNow(REDUCED_MOTION)) {
      return;
    }
    const animation = burst.current?.animate(BURST_FRAMES, BURST_TIMING);
    return () => animation?.cancel();
  }, [pressed]);

  const classes = circleButtonStyles({
    className: isToggle ? `group/circle isolate ${className ?? ''}` : className,
    size,
    tone,
  });
  const iconSize = iconSizeOverride ?? CIRCLE_ICON_SIZE[size ?? 32];
  // A toggle's icon swaps with its state (outline ↔ filled, + ↔ check)
  const glyph = isToggle ? (
    <IconSwap active={pressed} glyph={icon} size={iconSize} />
  ) : (
    <Icon glyph={icon} size={iconSize} />
  );
  return (
    <button
      aria-label={label}
      aria-pressed={pressed}
      className={classes}
      title={label}
      type={type}
      {...rest}
    >
      {isToggle ? (
        <>
          <span aria-hidden="true" className={BURST} ref={burst} />
          <span className={TOGGLE_ICON}>{glyph}</span>
        </>
      ) : (
        glyph
      )}
    </button>
  );
}
