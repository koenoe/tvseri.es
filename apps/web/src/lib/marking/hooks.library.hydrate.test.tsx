// @vitest-environment jsdom
import { act } from 'react';
import { hydrateRoot } from 'react-dom/client';
import { renderToString } from 'react-dom/server';
import { describe, expect, it } from 'vitest';

import { useLibraryIds } from './hooks';
import MarkingProvider, { useMarkingStoreApi } from './MarkingProvider';

/** The browser already holds the viewer's ids when a late boundary hydrates */
function PreloadLibrary() {
  useMarkingStoreApi()
    .getState()
    .setLibrary({
      ids: { favorites: [], inProgress: [], watched: [1, 2], watchlist: [] },
      status: 'ready',
    });
  return null;
}

function Count() {
  const library = useLibraryIds();
  return (
    <span>
      {library.status === 'ready' ? library.ids.watched.length : 'none'}
    </span>
  );
}

describe('the viewer’s library ids while hydrating', () => {
  it('draws nothing viewer-specific until hydrated, so the cached HTML matches', async () => {
    const container = document.createElement('div');
    container.innerHTML = renderToString(
      <MarkingProvider>
        <Count />
      </MarkingProvider>,
    );
    const errors: unknown[] = [];
    await act(async () => {
      hydrateRoot(
        container,
        <MarkingProvider>
          <PreloadLibrary />
          <Count />
        </MarkingProvider>,
        { onRecoverableError: (error) => errors.push(error) },
      );
    });

    expect(errors).toEqual([]);
    expect(container.textContent).toBe('2');
  });
});
