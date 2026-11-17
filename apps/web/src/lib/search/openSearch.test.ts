// @vitest-environment jsdom
import { describe, expect, it, vi } from 'vitest';

import {
  OPEN_SEARCH_EVENT,
  type OpenSearchDetail,
  openSearch,
} from './openSearch';

describe('openSearch', () => {
  it('asks the search overlay to open, passing the button that asked', () => {
    const trigger = document.createElement('button');
    const listener = vi.fn(
      (event: CustomEvent<OpenSearchDetail>) => event.detail,
    );
    window.addEventListener(OPEN_SEARCH_EVENT, listener);

    openSearch(trigger);

    window.removeEventListener(OPEN_SEARCH_EVENT, listener);
    expect(listener).toHaveBeenCalledTimes(1);
    expect(listener.mock.results[0]?.value).toEqual({ trigger });
  });

  it('passes a query to prefill the field (the 404 search)', () => {
    const trigger = document.createElement('input');
    const listener = vi.fn(
      (event: CustomEvent<OpenSearchDetail>) => event.detail,
    );
    window.addEventListener(OPEN_SEARCH_EVENT, listener);

    openSearch(trigger, 'the bear');

    window.removeEventListener(OPEN_SEARCH_EVENT, listener);
    expect(listener.mock.results[0]?.value).toEqual({
      query: 'the bear',
      trigger,
    });
  });
});
