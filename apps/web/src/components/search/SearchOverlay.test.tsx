// @vitest-environment jsdom
import { act, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import {
  type MouseEvent,
  type ReactNode,
  StrictMode,
  useCallback,
  useLayoutEffect,
  useState,
} from 'react';
import { afterEach, beforeAll, beforeEach, expect, it, vi } from 'vitest';

import MarkingProvider, {
  useMarkingStoreApi,
} from '@/lib/marking/MarkingProvider';
import { resetIntents } from '@/lib/navigation/useLinkIntent';
import { BRE } from '@/lib/search/testData';

import SearchOverlay from './SearchOverlay';
import { TARGET_SETTLE_MS } from './targetPrefetch';

// one router for the page, as Next's useRouter returns
const router = vi.hoisted(() => ({ prefetch: vi.fn(), push: vi.fn() }));
vi.mock('next/navigation', () => ({ useRouter: () => router }));
// Next's Link without the router: the anchor, its prefetch policy as data,
// and a plain click kept on the page (Link navigates client-side)
vi.mock('next/link', () => ({
  default: ({
    children,
    onClick,
    prefetch: policy,
    transitionTypes: _types,
    ...rest
  }: Readonly<{
    children?: ReactNode;
    onClick?: (event: MouseEvent<HTMLAnchorElement>) => void;
    prefetch?: unknown;
    transitionTypes?: unknown;
  }>) => {
    const click = (event: MouseEvent<HTMLAnchorElement>) => {
      onClick?.(event);
      event.preventDefault();
    };
    return (
      <a data-prefetch={String(policy)} onClick={click} {...rest}>
        {children}
      </a>
    );
  },
}));

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
  HTMLDialogElement.prototype.show = function (this: HTMLDialogElement) {
    this.setAttribute('open', '');
  };
  // an arrow keeps the marked result in view
  Element.prototype.scrollIntoView = () => undefined;
});

const fetchSearch = vi.fn<(url: string) => Promise<Response>>();

beforeEach(() => {
  resetIntents();
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

/**
 * Closing hands the page back at once (the modal is released as the panel
 * starts to shrink, so a click lands), and unmounts after the shrink.
 */
it('releases the page as it starts to close, and unmounts after the close', () => {
  vi.useFakeTimers();
  try {
    const onClosed = vi.fn();
    const view = (open: boolean) => (
      <MarkingProvider>
        <SearchOverlay
          onClose={ignore}
          onClosed={onClosed}
          open={open}
          trigger={null}
        />
      </MarkingProvider>
    );
    const { rerender } = render(view(true));
    const dialog = screen.getByRole('dialog', {
      hidden: true,
    }) as HTMLDialogElement;
    const close = vi.spyOn(dialog, 'close');

    rerender(view(false));
    // the modal ends; the dialog stays drawn, inert, for the shrink
    expect(close).toHaveBeenCalledTimes(1);
    expect(dialog.inert).toBe(true);
    expect(dialog.hasAttribute('open')).toBe(true);
    expect(onClosed).not.toHaveBeenCalled();

    act(() => {
      vi.advanceTimersByTime(300);
    });
    expect(onClosed).toHaveBeenCalledTimes(1);
  } finally {
    vi.useRealTimers();
  }
});

it('unmounts at once when the browser closes it while open', () => {
  const onClosed = vi.fn();
  render(
    <MarkingProvider>
      <SearchOverlay onClose={ignore} onClosed={onClosed} open trigger={null} />
    </MarkingProvider>,
  );
  const dialog = screen.getByRole('dialog', {
    hidden: true,
  }) as HTMLDialogElement;
  act(() => dialog.close());
  expect(onClosed).toHaveBeenCalledTimes(1);
});

/** The overlay as the launcher holds it: closed by its own close asks */
function Launcher({ initialQuery }: Readonly<{ initialQuery: string }>) {
  const [open, setOpen] = useState(true);
  const close = useCallback(() => setOpen(false), []);
  return (
    <MarkingProvider>
      <SearchOverlay
        initialQuery={initialQuery}
        onClose={close}
        onClosed={ignore}
        open={open}
        trigger={null}
      />
    </MarkingProvider>
  );
}

const panel = () =>
  screen.getByRole('dialog', { hidden: true }).querySelector('.remote-surface');

it('opening a result fades the overlay where it is; dismissing it shrinks it back into the icon', async () => {
  const opened = render(<Launcher initialQuery="breaki" />);
  const result = await screen.findByRole('option', { name: /Breaking Bad/ });
  await userEvent.setup().click(result);
  expect(panel()?.getAttribute('data-closing')).toBe('open');
  opened.unmount();

  render(<Launcher initialQuery="breakin" />);
  await screen.findByRole('option', { name: /Breaking Bad/ });
  // a click on the dim (Escape and the cross close the same way)
  const dim = screen
    .getByRole('dialog', { hidden: true })
    .querySelector<HTMLElement>('[data-dialog-backdrop]');
  await userEvent.setup().click(dim!);
  expect(panel()?.getAttribute('data-closing')).toBe('cancel');
});

it('a result an arrow rests on opens whole; a landed answer only its shell', async () => {
  vi.useFakeTimers({ shouldAdvanceTime: true });
  try {
    router.prefetch.mockClear();
    render(<Launcher initialQuery="breakingb" />);
    const option = (name: RegExp) => screen.getByRole('option', { name });
    await screen.findByRole('option', { name: /Breaking Bad/ });
    const first = option(/Breaking Bad/);
    // the answer marks its first result: its shell, never its page, even
    // once it has rested past the settle window
    await waitFor(() =>
      expect(router.prefetch).toHaveBeenCalledWith(first.getAttribute('href')),
    );
    await waitFor(() =>
      expect(option(/Breaking Bad/).getAttribute('aria-selected')).toBe('true'),
    );
    act(() => vi.advanceTimersByTime(TARGET_SETTLE_MS * 3));
    expect(option(/Breaking Bad/).dataset.prefetch).toBe('false');

    const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime });
    await user.keyboard('{ArrowRight}');
    // the results draw the mark when the browser has time (deferred)
    await waitFor(() =>
      expect(option(/Breathe/).getAttribute('aria-selected')).toBe('true'),
    );
    act(() => vi.advanceTimersByTime(TARGET_SETTLE_MS));
    await waitFor(() =>
      expect(option(/Breathe/).dataset.prefetch).toBe('true'),
    );
    // only while marked: the arrow moving on drops it
    await user.keyboard('{ArrowLeft}');
    await waitFor(() =>
      expect(option(/Breaking Bad/).getAttribute('aria-selected')).toBe('true'),
    );
    expect(option(/Breathe/).dataset.prefetch).toBe('false');
    expect(option(/Breaking Bad/).dataset.prefetch).toBe('false');
  } finally {
    vi.useRealTimers();
  }
});
