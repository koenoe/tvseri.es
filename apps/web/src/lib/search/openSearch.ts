/**
 * The one way to open the search overlay (Phase 2 listens for it; there is no
 * search page): the header's search button (bar and pill) and
 * the 404's search field dispatch this window event. `detail.trigger` is the
 * element to return focus to; `detail.query` prefills the field.
 *
 * @example
 * window.addEventListener(OPEN_SEARCH_EVENT, (event) => open(event.detail));
 */
export const OPEN_SEARCH_EVENT = 'tvseries:open-search';

export type OpenSearchDetail = Readonly<{
  query?: string;
  trigger: HTMLElement | null;
}>;

declare global {
  interface WindowEventMap {
    [OPEN_SEARCH_EVENT]: CustomEvent<OpenSearchDetail>;
  }
}

export function openSearch(trigger: HTMLElement | null, query?: string): void {
  window.dispatchEvent(
    new CustomEvent<OpenSearchDetail>(OPEN_SEARCH_EVENT, {
      detail: query === undefined ? { trigger } : { query, trigger },
    }),
  );
}
