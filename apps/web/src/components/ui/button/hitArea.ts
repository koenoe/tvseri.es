/**
 * A target larger than the drawn control: a transparent `::after` reaching
 * past its edge, so the look stays and the pointer gets more: the drawn
 * size plus twice the reach (a 32px pill with `HIT_Y[4]`: 40px), the same
 * for every pointer. The control must be positioned (`relative`, or `absolute`). The key is
 * how far it reaches on each side, in px; pick the reach that stops at the
 * neighbours' gap (two targets never overlap). Inside an `overflow-x-auto`
 * rail the reach is clipped (globals.css hides overflow-y there). The
 * pseudo-element starts inside a border, so a `border-2` control needs 2px
 * more reach.
 *
 * @example
 * cn('relative h-8', HIT_Y[4]) // a 32px pill, 40px to the pointer
 */

/** Above and below only: a pill in a row keeps its sides to its neighbours */
export const HIT_Y = {
  2: 'after:absolute after:inset-x-0 after:-inset-y-0.5',
  4: 'after:absolute after:inset-x-0 after:-inset-y-1',
  5: 'after:absolute after:inset-x-0 after:-inset-y-[5px]',
  6: 'after:absolute after:inset-x-0 after:-inset-y-1.5',
  7: 'after:absolute after:inset-x-0 after:-inset-y-[7px]',
  8: 'after:absolute after:inset-x-0 after:-inset-y-2',
  9: 'after:absolute after:inset-x-0 after:-inset-y-[9px]',
  12: 'after:absolute after:inset-x-0 after:-inset-y-3',
} as const;

/** All round, following the control's corners */
export const HIT_ALL = {
  4: 'after:absolute after:-inset-1 after:rounded-[inherit]',
  6: 'after:absolute after:-inset-1.5 after:rounded-[inherit]',
  8: 'after:absolute after:-inset-2 after:rounded-[inherit]',
  9: 'after:absolute after:-inset-[9px] after:rounded-[inherit]',
  10: 'after:absolute after:-inset-2.5 after:rounded-[inherit]',
} as const;
