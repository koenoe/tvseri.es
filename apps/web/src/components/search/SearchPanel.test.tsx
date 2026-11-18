// @vitest-environment jsdom
import { render } from '@testing-library/react';
import { createRef } from 'react';
import { describe, expect, it, vi } from 'vitest';

import MarkingProvider from '@/lib/marking/MarkingProvider';
import type { SearchCell } from '@/lib/search/sections';
import { INITIAL_SESSION, sessionView } from '@/lib/search/session';

import SearchPanel from './SearchPanel';
import type { OverlaySearch } from './useOverlaySearch';

const bodyRenders = vi.hoisted(() => ({ count: 0 }));
vi.mock('./StatusLine', () => ({
  default: () => {
    bodyRenders.count += 1;
    return null;
  },
}));
vi.mock('next/navigation', () => ({
  useRouter: () => ({ prefetch: vi.fn(), push: vi.fn() }),
}));

const RECENT: SearchCell = {
  href: '/136315/the-bear',
  id: 136315,
  image: 'https://image.tmdb.org/t/p/w300_and_h450_bestv2/the-bear.jpg',
  key: 'show-136315',
  kind: 'show',
  name: 'The Bear',
};

const view = sessionView(INITIAL_SESSION, {
  layout: 'desktop',
  recents: [RECENT],
});
const handlers = {
  choose: vi.fn(),
  close: vi.fn(),
  enter: vi.fn(),
  input: vi.fn(),
  move: vi.fn(),
  retry: vi.fn(),
};
const searchFor = (query: string) =>
  ({
    ...handlers,
    phone: false,
    state: { ...INITIAL_SESSION, query },
    view,
  }) as unknown as OverlaySearch;

describe('SearchPanel: the results render with the deferred view only', () => {
  it('a keystroke that leaves the view as it was does not re-render the results', () => {
    const inputRef = createRef<HTMLInputElement>();
    const panel = (query: string) => (
      <MarkingProvider>
        <SearchPanel
          inputRef={inputRef}
          onClose={handlers.close}
          search={searchFor(query)}
        />
      </MarkingProvider>
    );
    const { rerender } = render(panel(''));
    const first = bodyRenders.count;
    rerender(panel('b'));
    rerender(panel('br'));
    expect(bodyRenders.count).toBe(first);
  });
});
