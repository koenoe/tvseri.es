// @vitest-environment jsdom
import { act, render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { openSearch } from '@/lib/search/openSearch';

import type { SearchOverlayProps } from './SearchOverlay';

const load = vi.hoisted(() => vi.fn());
vi.mock('./loadOverlay', () => ({ default: load }));

const FakeOverlay = ({ open }: SearchOverlayProps) =>
  open ? <div aria-label="Search" role="dialog" /> : null;

const loaded = () => Promise.resolve({ default: FakeOverlay });
const failed = () => Promise.reject(new Error('ChunkLoadError'));

const press = (key: string) => {
  const event = new KeyboardEvent('keydown', {
    bubbles: true,
    cancelable: true,
    ctrlKey: true,
    key,
  });
  document.dispatchEvent(event);
  return event;
};

const settle = () => act(() => new Promise((resolve) => setTimeout(resolve)));

describe('SearchLauncher when the overlay chunk fails to load', () => {
  beforeEach(() => {
    load.mockReset();
    vi.stubGlobal('requestIdleCallback', undefined);
  });

  it('leaves Ctrl+F to the browser while it can’t load, and opens once a retry works', async () => {
    load.mockImplementation(failed);
    const { default: SearchLauncher } = await import('./SearchLauncher');
    render(<SearchLauncher />);

    press('k');
    await settle();
    expect(screen.queryByRole('dialog')).toBeNull();

    // the browser's own find works while search can't load
    expect(press('f').defaultPrevented).toBe(false);
    await settle();

    load.mockImplementation(loaded);
    act(() => openSearch(null));
    await settle();
    expect(screen.getByRole('dialog', { name: 'Search' })).toBeTruthy();
  });

  it('a failed load clears the pending open, so the next open works', async () => {
    load.mockImplementationOnce(failed).mockImplementation(loaded);
    const { default: SearchLauncher } = await import('./SearchLauncher');
    render(<SearchLauncher />);

    act(() => openSearch(null));
    await settle();
    expect(screen.queryByRole('dialog')).toBeNull();

    act(() => openSearch(null));
    await settle();
    expect(screen.getByRole('dialog', { name: 'Search' })).toBeTruthy();
  });
});

describe('SearchLauncher while the overlay is still loading', () => {
  beforeEach(() => {
    load.mockReset();
    vi.stubGlobal('requestIdleCallback', undefined);
  });

  const QueryOverlay = ({ initialQuery, open }: SearchOverlayProps) =>
    open ? (
      <dialog aria-label="Search" open>
        <output>{initialQuery}</output>
      </dialog>
    ) : null;

  const type = (key: string) => {
    const event = new KeyboardEvent('keydown', {
      bubbles: true,
      cancelable: true,
      key,
    });
    document.body.dispatchEvent(event);
    return event;
  };

  it('keeps the keys typed before it opens, and opens with them', async () => {
    let arrive: (module: { default: typeof QueryOverlay }) => void = () => {};
    load.mockImplementation(
      () =>
        new Promise((resolve) => {
          arrive = resolve;
        }),
    );
    const { default: SearchLauncher } = await import('./SearchLauncher');
    render(<SearchLauncher />);

    act(() => openSearch(null));
    for (const key of ['t', 'h', 'x', 'Backspace', 'e']) {
      act(() => {
        expect(type(key).defaultPrevented).toBe(true);
      });
    }
    // not typing: left to the page
    expect(type('Tab').defaultPrevented).toBe(false);
    await act(async () => arrive({ default: QueryOverlay }));

    expect(screen.getByRole('dialog', { name: 'Search' }).textContent).toBe(
      'the',
    );
    // the overlay is on screen: keys are its field's again
    expect(type('a').defaultPrevented).toBe(false);
  });

  it('leaves typing alone when no search is opening', async () => {
    load.mockImplementation(loaded);
    const { default: SearchLauncher } = await import('./SearchLauncher');
    render(<SearchLauncher />);
    await settle();

    expect(type('a').defaultPrevented).toBe(false);
  });
});
