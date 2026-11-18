// @vitest-environment jsdom
import { act, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { StrictMode, useLayoutEffect } from 'react';
import { afterEach, beforeAll, beforeEach, expect, it, vi } from 'vitest';

import MarkingProvider, {
  useMarkingStoreApi,
} from '@/lib/marking/MarkingProvider';
import { BRE } from '@/lib/search/testData';

import SearchOverlay from './SearchOverlay';

// one router for the page, as Next's useRouter returns
const router = vi.hoisted(() => ({ prefetch: vi.fn(), push: vi.fn() }));
vi.mock('next/navigation', () => ({ useRouter: () => router }));

/** How often a result block rendered (the real block, counted) */
const blockRenders = vi.hoisted(() => ({ count: 0 }));
vi.mock('./ResultBlock', async (importActual) => {
  const actual = await importActual<typeof import('./ResultBlock')>();
  const Block = actual.default;
  return {
    default: (props: Parameters<typeof Block>[0]) => {
      blockRenders.count += 1;
      return <Block {...props} />;
    },
  };
});

// jsdom 31 has HTMLDialogElement but no showModal/close.
beforeAll(() => {
  HTMLDialogElement.prototype.showModal = function (this: HTMLDialogElement) {
    this.setAttribute('open', '');
  };
  HTMLDialogElement.prototype.close = function (this: HTMLDialogElement) {
    this.removeAttribute('open');
    this.dispatchEvent(new Event('close'));
  };
});

const fetchSearch = vi.fn<(url: string) => Promise<Response>>();

beforeEach(() => {
  fetchSearch.mockReset();
  fetchSearch.mockImplementation(() =>
    Promise.resolve(Response.json(BRE, { status: 200 })),
  );
  vi.stubGlobal('fetch', fetchSearch);
});

afterEach(() => {
  vi.unstubAllGlobals();
});

const ignore = () => {};

/** What the root layout gives the overlay: the marking store, here with a library */
function Library({
  watched = [],
}: Readonly<{ watched?: ReadonlyArray<number> }>) {
  const store = useMarkingStoreApi();
  useLayoutEffect(() => {
    store.getState().setLibrary({
      ids: { favorites: [], inProgress: [], watched, watchlist: [] },
      status: 'ready',
    });
  }, [store, watched]);
  return null;
}

const field = () =>
  screen.getByRole('combobox', { name: 'Search series and people' });

/**
 * Strict Mode runs the dialog's ref cleanup and the ref again on mount, as
 * `next dev` does: the search must still take every keystroke and answer.
 */
it('takes typed text and shows results under Strict Mode', async () => {
  const user = userEvent.setup();
  render(
    <StrictMode>
      <MarkingProvider>
        <SearchOverlay onClose={ignore} onClosed={ignore} open trigger={null} />
      </MarkingProvider>
    </StrictMode>,
  );

  await user.type(field(), 'bre');

  expect(field()).toHaveProperty('value', 'bre');
  expect(
    await screen.findByRole('option', { name: /Breaking Bad/ }),
  ).toBeTruthy();
  // the mock answers every query with the same results, so they can come
  // from an earlier, shorter query when the keystrokes outrun the debounce
  // on a loaded machine: wait for the request of the full text
  await waitFor(() =>
    expect(fetchSearch).toHaveBeenCalledWith(
      '/api/search?q=bre',
      expect.anything(),
    ),
  );
});

// The overlay keeps its answers per query for as long as the module lives, so
// each test asks its own query: a repeat would be answered without a request,
// whichever test the shuffled order runs first.
it('searches a prefilled query (the 404 field) under Strict Mode', async () => {
  render(
    <StrictMode>
      <MarkingProvider>
        <SearchOverlay
          initialQuery="brea"
          onClose={ignore}
          onClosed={ignore}
          open
          trigger={null}
        />
      </MarkingProvider>
    </StrictMode>,
  );

  expect(field()).toHaveProperty('value', 'brea');
  expect(
    await screen.findByRole('option', { name: /Breaking Bad/ }),
  ).toBeTruthy();
});

it('draws the Watched label on a watched result, for this viewer only', async () => {
  render(
    <MarkingProvider>
      <Library watched={[1396]} />
      <SearchOverlay
        initialQuery="break"
        onClose={ignore}
        onClosed={ignore}
        open
        trigger={null}
      />
    </MarkingProvider>,
  );
  const watched = await screen.findByRole('option', { name: /Breaking Bad/ });
  expect(watched.textContent).toContain('Watched');
  const other = screen.getByRole('option', { name: /Prison Break/ });
  expect(other.textContent).not.toContain('Watched');
});

it('a keystroke re-renders the field, not the results, until its answer lands', async () => {
  const user = userEvent.setup();
  render(
    <MarkingProvider>
      <SearchOverlay onClose={ignore} onClosed={ignore} open trigger={null} />
    </MarkingProvider>,
  );
  await user.type(field(), 'bad');
  await waitFor(() =>
    expect(fetchSearch).toHaveBeenCalledWith(
      '/api/search?q=bad',
      expect.anything(),
    ),
  );
  expect(
    await screen.findByRole('option', { name: /Breaking Bad/ }),
  ).toBeTruthy();

  // every earlier answer has landed
  await act(() => new Promise((resolve) => setTimeout(resolve, 300)));

  blockRenders.count = 0;
  await user.type(field(), 'g');
  // inside the debounce: the field has the letter, the results are as they were
  await act(() => new Promise((resolve) => setTimeout(resolve, 50)));
  expect(field()).toHaveProperty('value', 'badg');
  expect(blockRenders.count).toBe(0);

  // its answer lands: the results draw again
  await waitFor(() => expect(blockRenders.count).toBeGreaterThan(0));
});
