/**
 * The How it works dialog lives in the URL's hash. Opening and closing
 * replace the current entry, so Back never steps through dialog states.
 */

const HASH = '#how-it-works';

/** The deep link, for links from elsewhere (the Connected apps cards) */
export const HOW_IT_WORKS_HREF = `/extension${HASH}`;

const listeners = new Set<() => void>();

export const readHowItWorks = (): boolean => window.location.hash === HASH;

export function setHowItWorks(open: boolean): void {
  if (readHowItWorks() === open) {
    return;
  }
  const { pathname, search } = window.location;
  window.history.replaceState(
    null,
    '',
    `${pathname}${search}${open ? HASH : ''}`,
  );
  for (const listener of listeners) {
    listener();
  }
}

/** Our own changes, plus the hash changing under us (a link, Back, Forward) */
export function subscribeHowItWorks(listener: () => void): () => void {
  listeners.add(listener);
  window.addEventListener('hashchange', listener);
  window.addEventListener('popstate', listener);
  return () => {
    listeners.delete(listener);
    window.removeEventListener('hashchange', listener);
    window.removeEventListener('popstate', listener);
  };
}
