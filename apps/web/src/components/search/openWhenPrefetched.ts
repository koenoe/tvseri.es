/**
 * The longest a search open waits for its page's prefetch before it
 * navigates anyway (then Next fetches the page whole, as it would have).
 */
export const PREFETCH_WAIT_MS = 1500;

type Watch = (pathname: string, onResponse: () => void) => () => void;

const isRscFor = (name: string, pathname: string) => {
  const url = new URL(name, location.origin);
  return url.pathname === pathname && url.searchParams.has('_rsc');
};

/** Calls `onResponse` once an RSC response (`?_rsc=`) for `pathname` has fully arrived. */
const watchRscResponses: Watch = (pathname, onResponse) => {
  if (typeof PerformanceObserver === 'undefined') {
    return () => {};
  }
  const observer = new PerformanceObserver((list) => {
    if (list.getEntries().some((entry) => isRscFor(entry.name, pathname))) {
      onResponse();
    }
  });
  observer.observe({ type: 'resource' });
  return () => observer.disconnect();
};

/** This tab already fetched the page's route (prefetched, or visited): Next has it */
const fetchedRscBefore = (pathname: string) =>
  typeof performance !== 'undefined' &&
  performance
    .getEntriesByType('resource')
    .some((entry) => isRscFor(entry.name, pathname));

type Options = Readonly<{
  fetchedBefore?: (pathname: string) => boolean;
  prefetch: (href: string) => void;
  push: (href: string) => void;
  watch?: Watch;
}>;

/**
 * Opens a search result once Next has its route. A push to a page whose
 * route was never prefetched makes Next wait for that page's whole dynamic
 * render before anything changes (seconds on a busy server); with the route
 * prefetched it shows the page's cached shell at once and streams the rest.
 * Results landing prefetch the first one (what Enter opens), but Enter-ahead
 * opens it in the same moment, before that prefetch is in: this prefetches
 * it and navigates when its first RSC response (the route tree) has
 * arrived, or after `PREFETCH_WAIT_MS` at most. A page this tab already
 * fetched navigates at once.
 */
export default function openWhenPrefetched(
  href: string,
  {
    fetchedBefore = fetchedRscBefore,
    prefetch,
    push,
    watch = watchRscResponses,
  }: Options,
) {
  const { pathname } = new URL(href, location.origin);
  if (fetchedBefore(pathname)) {
    push(href);
    return;
  }
  let done = false;
  const go = () => {
    if (done) {
      return;
    }
    done = true;
    stop();
    clearTimeout(timer);
    push(href);
  };
  // after the task that delivered the response, so Next has stored the route
  const stop = watch(pathname, () => setTimeout(go, 0));
  const timer = setTimeout(go, PREFETCH_WAIT_MS);
  prefetch(href);
}
