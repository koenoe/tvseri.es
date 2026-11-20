/**
 * Callback refs for a control that takes focus as it mounts, where the
 * control that was pressed has gone (Cancel in a confirm that replaced its
 * trigger, a code's Cancel after Connect). Module constants: a ref made in
 * render would focus again on every render.
 *
 * @example
 * <Button ref={focusOnMount}>Cancel</Button>
 */
export const focusOnMount = (node: HTMLElement | null) => {
  node?.focus();
};

/**
 * The same without scrolling, for a control that mounts inside a part still
 * folding open from 0 tall: a scroll then would shift the fold's content (or
 * the page) for the length of the fold.
 */
export const focusOnMountInPlace = (node: HTMLElement | null) => {
  node?.focus({ preventScroll: true });
};
