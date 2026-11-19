import type { Page } from '@playwright/test';

/**
 * Every document load and RSC navigation fetch the page makes, by URL: what
 * an overlay that lives on the History API alone (the episode modal, the
 * watch-history sheet) must never cause on Back or Forward. Link prefetches
 * (`next-router-prefetch`) are left out: the show page prefetches its
 * visible links (the hero's /genre/drama) on its own schedule, under load
 * as late as the Back, and a prefetch is not a navigation.
 */
export function recordNavigationFetches(page: Page): string[] {
  const fetches: string[] = [];
  page.on('request', (request) => {
    const headers = request.headers();
    const prefetch = 'next-router-prefetch' in headers;
    if (request.isNavigationRequest() || (headers.rsc && !prefetch)) {
      fetches.push(request.url());
    }
  });
  return fetches;
}
