/** The scroll a viewer starts themselves: the hold lets go at once */
const VIEWER_SCROLL = ['wheel', 'touchstart', 'keydown'] as const;

/**
 * Keeps an element where it is on screen while the layout above it moves
 * (a card above shutting as the pressed one opens): every frame for `ms`,
 * the window scrolls by however far the element moved. Instant scrolls, so
 * it never animates on top of the fold; not CSS `overflow-anchor`, which
 * WebKit doesn't do and which picks its own anchor. It lets go early when
 * the viewer scrolls.
 */
export default function holdInPlace(element: Element, ms: number): void {
  const top = element.getBoundingClientRect().top;
  const start = performance.now();
  let frame = 0;
  const release = () => {
    cancelAnimationFrame(frame);
    for (const type of VIEWER_SCROLL) {
      window.removeEventListener(type, release);
    }
  };
  const hold = () => {
    if (!element.isConnected) {
      release();
      return;
    }
    const moved = element.getBoundingClientRect().top - top;
    if (Math.abs(moved) >= 0.5) {
      window.scrollBy({ behavior: 'instant', top: moved });
    }
    if (performance.now() - start < ms) {
      frame = requestAnimationFrame(hold);
    } else {
      release();
    }
  };
  for (const type of VIEWER_SCROLL) {
    window.addEventListener(type, release, { passive: true });
  }
  frame = requestAnimationFrame(hold);
}
