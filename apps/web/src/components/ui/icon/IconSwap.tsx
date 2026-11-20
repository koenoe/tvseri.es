'use client';

import { AnimatePresence } from 'motion/react';
import * as m from 'motion/react-m';
import { isValidElement, type ReactNode } from 'react';
import { ENTER, EXIT, HIDDEN, SHOWN } from '@/components/motion/iconSwap';
import { drawingOf, iconAttributes } from './Icon';
import type { Glyph, IconSize, ToggleGlyph } from './types';

/** A drawing as text: its elements and their attributes */
function signature(node: ReactNode): string {
  if (Array.isArray(node)) {
    return node.map(signature).join('');
  }
  if (!isValidElement(node)) {
    return typeof node === 'string' || typeof node === 'number'
      ? String(node)
      : '';
  }
  const { children, ...attributes } = node.props as Readonly<{
    children?: ReactNode;
  }>;
  const name = typeof node.type === 'string' ? node.type : '';
  return `<${name}${JSON.stringify(attributes)}>${signature(children)}`;
}

/**
 * The same drawing keeps its element; another one (or its filled drawing)
 * swaps. By drawing, not object: a glyph a server component passes arrives
 * as a new object on every render, and must not replay the swap.
 */
const signatures = new WeakMap<Glyph | ToggleGlyph, string>();
function keyOf(glyph: Glyph | ToggleGlyph, active?: boolean) {
  let drawing = signatures.get(glyph);
  if (drawing === undefined) {
    drawing = signature(glyph.outline);
    signatures.set(glyph, drawing);
  }
  return active && glyph.filled ? `${drawing}:on` : drawing;
}

type Props = Readonly<{
  /** A toggle glyph's filled drawing */
  active?: boolean;
  className?: string;
  /** `null`: no icon (the last one animates away) */
  glyph: Glyph | ToggleGlyph | null;
  label?: string;
  size: IconSize;
}>;

/**
 * The one swap for an icon that shows state (watched, watchlist, follow,
 * pending, copied): the leaving icon shrinks to a quarter, blurs and fades,
 * then the new one grows back (opacity, scale and blur only; a spring with
 * no bounce). The first icon is drawn without motion. The colour, fill or
 * label beside it stays the static cue; with reduced motion only the fade
 * and blur run.
 *
 * A glyph renders as Icon's own `<svg>`, with no wrapper, so a pill's
 * `>svg` selectors (its icon-side padding, a resized icon) still reach it.
 * That is why the two icons take turns (`mode="wait"`) rather than overlap
 * (`popLayout`): Motion pops only HTML elements out of the flow.
 *
 * @example
 * <IconSwap active={isOn} glyph={eyeGlyph} size={16} />
 * <IconSwap glyph={pending ? pendingGlyph : null} size={16} />
 *
 * Any other small state mark (a step's number → its check): `MarkSwap`.
 */
export default function IconSwap({
  active,
  className,
  glyph,
  label,
  size,
}: Props) {
  const key = glyph ? keyOf(glyph, active) : null;
  return (
    <AnimatePresence initial={false} mode="wait">
      {glyph ? (
        <m.svg
          {...iconAttributes(size, label)}
          animate={SHOWN}
          className={className}
          exit={EXIT}
          initial={HIDDEN}
          key={key}
          transition={ENTER}
        >
          {drawingOf(glyph, active)}
        </m.svg>
      ) : null}
    </AnimatePresence>
  );
}
