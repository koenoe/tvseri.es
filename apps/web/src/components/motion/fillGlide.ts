import { type MouseEvent, useEffect, useLayoutEffect, useRef } from 'react';
import { REDUCED_MOTION } from '@/lib/media/breakpoints';
import { matchesNow } from '@/lib/media/useMediaQuery';
import { isPlainClick } from '@/lib/navigation/isPlainClick';
import { boxAt, GLIDE, type GlideBox, sidewaysGlide } from './glide';

/** A glide under way in a group: its animation and the boxes it runs between */
type Glide = Readonly<{ animation: Animation; from: GlideBox; to: GlideBox }>;
const glidingIn = new WeakMap<Element, Glide>();

const boxOf = (item: HTMLElement): GlideBox => ({
  left: item.offsetLeft,
  width: item.offsetWidth,
});

/**
 * Where the fill is drawn now: mid-glide, part way from its old box to its
 * new one (the glide is cancelled, the next starts from here); else on the
 * item it was on
 */
function drawnFill(group: Element, before: HTMLElement): GlideBox {
  const glide = glidingIn.get(group);
  glidingIn.delete(group);
  if (glide?.animation.playState !== 'running') {
    return boxOf(before);
  }
  const progress = glide.animation.effect?.getComputedTiming().progress ?? 1;
  glide.animation.cancel();
  return boxAt(glide.from, glide.to, progress);
}

/** The fill's resting corner: its own, at most half its height */
function cornerOf(item: HTMLElement): number {
  const half = item.offsetHeight / 2;
  const own = Number.parseFloat(
    getComputedStyle(item, '::before').borderTopLeftRadius,
  );
  return Number.isNaN(own) ? half : Math.min(own, half);
}

/**
 * A row of choices whose selected one is filled (a `Segmented`, the
 * profile's tabs): the fill, the item's `::before`, glides sideways from
 * the item selected before to the new one (`sidewaysGlide`, 240ms), without
 * moving either item's words. A change mid-glide glides on from where the
 * fill is drawn. Items share their offset parent (`group`). Nothing moves
 * without Web Animations (jsdom) or with reduced motion: the fill is simply
 * on its item. In a row that wraps, a choice on another line is a jump: a
 * sideways glide would run along the wrong line.
 */
export function glideFill(
  group: Element,
  before: HTMLElement,
  item: HTMLElement,
): void {
  if (
    before === item ||
    !before.isConnected ||
    typeof item.animate !== 'function' ||
    matchesNow(REDUCED_MOTION)
  ) {
    return;
  }
  if (before.offsetTop !== item.offsetTop) {
    glidingIn.get(group)?.animation.cancel();
    glidingIn.delete(group);
    return;
  }
  const from = drawnFill(group, before);
  const to = boxOf(item);
  const frames = sidewaysGlide(from, to, cornerOf(item));
  const animation = item.animate(frames, {
    ...GLIDE,
    pseudoElement: '::before',
  });
  glidingIn.set(group, { animation, from, to });
}

/**
 * Each group's pressed item, by the group's element. The item that becomes
 * pressed reads the one before it here, so the glide needs neither the
 * group to re-render (an item may follow a store by itself) nor the items
 * to commit in any order.
 */
const pressedIn = new WeakMap<Element, HTMLElement>();

/**
 * For an item that follows its own state (a `SegmentedItem`, a Discover
 * lens tab): its fill glides from the item pressed before in the same
 * group (not on mount); a press mid-glide glides on from where the fill is
 * drawn. The item is the ref's element; the group is its parent
 */
export function useFillGlide(pressed: boolean) {
  const ref = useRef<HTMLButtonElement>(null);
  useLayoutEffect(() => {
    const item = ref.current;
    const group = item?.parentElement;
    if (!pressed || !item || !group) {
      return;
    }
    const before = pressedIn.get(group);
    pressedIn.set(group, item);
    if (before) {
      glideFill(group, before, item);
    }
  }, [pressed]);
  return ref;
}

/**
 * For a row of links whose current one (`aria-current="page"`) follows the
 * URL (the profile's tabs, the Stats year pills, the phone's shelves): the
 * fill glides from the link that was current, only after a plain press on
 * another link. The first paint, Back and Forward put it on its link at
 * once. `row` finds the links' group when the active link changes; the
 * returned handler goes on each link's `onClick`.
 */
export function useLinkGlide(
  row: () => HTMLElement | null | undefined,
  active: unknown,
) {
  const current = useRef<HTMLElement | null>(null);
  const pressed = useRef(false);

  useEffect(() => {
    const restore = () => {
      pressed.current = false;
    };
    window.addEventListener('popstate', restore);
    return () => window.removeEventListener('popstate', restore);
  }, []);

  // biome-ignore lint/correctness/useExhaustiveDependencies: runs when the active link changes, reading the row it drew
  useLayoutEffect(() => {
    const group = row();
    const item = group?.querySelector<HTMLElement>('[aria-current="page"]');
    const before = current.current;
    current.current = item ?? null;
    const glide = pressed.current;
    pressed.current = false;
    if (glide && group && item && before) {
      glideFill(group, before, item);
    }
  }, [active]);

  return (event: MouseEvent<HTMLAnchorElement>) => {
    pressed.current =
      isPlainClick(event) &&
      event.currentTarget.getAttribute('aria-current') !== 'page';
  };
}
