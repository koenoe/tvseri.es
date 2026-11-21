import { quietFocus } from '@/components/ui/dialog/focusReturn';
import { FOCUSABLE } from '@/lib/a11y/focusable';

/** Marks each of `CrossFade`'s copies, so focus can find its counterpart */
export const CROSS_FADE_LAYER = 'data-cross-fade';

/**
 * The same control in the copy arriving (by its place among the controls,
 * or the first) for an element in a copy that is leaving, which is inert:
 * focus given to it would fall to the page. Null when it isn't leaving.
 */
function crossFadeCounterpart(element: Element): HTMLElement | null {
  const leaving = element.closest(`[${CROSS_FADE_LAYER}]`);
  if (!leaving?.hasAttribute('inert')) {
    return null;
  }
  const arriving = Array.from(leaving.parentElement?.children ?? [])
    .filter((layer) => layer !== leaving && !layer.hasAttribute('inert'))
    .at(-1);
  if (!arriving) {
    return null;
  }
  const place = Array.from(leaving.querySelectorAll(FOCUSABLE)).indexOf(
    element,
  );
  const targets = arriving.querySelectorAll<HTMLElement>(FOCUSABLE);
  return targets[place] ?? targets[0] ?? null;
}

/**
 * Focuses a control in an arriving copy, and keeps the focus in its place
 * for a frame: a stand-in that swaps in its real control as it's focused
 * (a lazy ⋯, `LazyRemote`) would drop it to the page
 */
function focusInCopy(target: HTMLElement) {
  target.focus({ preventScroll: true });
  const layer = target.closest(`[${CROSS_FADE_LAYER}]`);
  if (!layer) {
    return;
  }
  const place = Array.from(layer.querySelectorAll(FOCUSABLE)).indexOf(target);
  requestAnimationFrame(() => {
    const active = document.activeElement;
    if (target.isConnected || (active && active !== document.body)) {
      return;
    }
    const controls = layer.querySelectorAll<HTMLElement>(FOCUSABLE);
    (controls[place] ?? controls[0])?.focus({ preventScroll: true });
  });
}

/** Focus held in a copy that has just started leaving moves to the new one */
export function handOverFocus(leaving: HTMLElement | null) {
  const active = document.activeElement;
  const target =
    leaving && active && leaving.contains(active)
      ? crossFadeCounterpart(active)
      : null;
  if (target) {
    focusInCopy(target);
  }
}

/**
 * An overlay giving focus back to a trigger that has left a cross-fade (the
 * ⋯ of a card that swapped to the next show while its menu was open): the
 * new copy's same control takes it instead. Whether it did; a trigger
 * that's still in place is the caller's `returnFocus`. Kept out of
 * `returnFocus` itself, so every dialog doesn't carry it.
 */
export function returnFocusToCopy(
  trigger: Element | null | undefined,
  ring: boolean,
): boolean {
  const copy = trigger ? crossFadeCounterpart(trigger) : null;
  if (!copy) {
    return false;
  }
  if (!ring) {
    quietFocus(copy);
  }
  focusInCopy(copy);
  return true;
}
