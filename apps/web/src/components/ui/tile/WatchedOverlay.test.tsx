// @vitest-environment jsdom
import { render, screen } from '@testing-library/react';
import { useLayoutEffect } from 'react';
import { describe, expect, it } from 'vitest';

import MarkingProvider, {
  useMarkingStoreApi,
} from '@/lib/marking/MarkingProvider';
import type { LibraryState } from '@/lib/marking/store';

import WatchedOverlay from './WatchedOverlay';

function Library({ library }: Readonly<{ library: LibraryState }>) {
  const store = useMarkingStoreApi();
  useLayoutEffect(() => {
    store.getState().setLibrary(library);
  }, [store, library]);
  return null;
}

const ready = (watched: ReadonlyArray<number>): LibraryState => ({
  ids: { favorites: [], inProgress: [], watched, watchlist: [] },
  status: 'ready',
});

describe('WatchedOverlay', () => {
  it('labels a show in the viewer’s watched list', () => {
    render(
      <MarkingProvider>
        <Library library={ready([7])} />
        <WatchedOverlay id={7} />
      </MarkingProvider>,
    );
    expect(screen.getByText('Watched')).toBeTruthy();
  });

  it('draws nothing for another show, signed out, or before the library is known', () => {
    const { container, rerender } = render(
      <MarkingProvider>
        <Library library={ready([7])} />
        <WatchedOverlay id={8} />
      </MarkingProvider>,
    );
    expect(container.textContent).toBe('');
    rerender(
      <MarkingProvider>
        <Library library={{ status: 'signed-out' }} />
        <WatchedOverlay id={7} />
      </MarkingProvider>,
    );
    expect(container.textContent).toBe('');
  });
});
