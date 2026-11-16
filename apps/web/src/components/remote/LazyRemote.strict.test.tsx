// @vitest-environment jsdom
import {
  act,
  fireEvent,
  render,
  screen,
  waitFor,
} from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MotionGlobalConfig } from 'motion/react';
import { type ReactNode, StrictMode } from 'react';
import { afterAll, beforeAll, describe, expect, it, vi } from 'vitest';

import { createFakeMarking } from './fakeMarking';
import { LazyShowRemote, LazyTileRemote } from './LazyRemote';
import { RemoteMarkingProvider } from './marking';

/**
 * The first press on a ⋯ whose Remote isn't loaded yet, under StrictMode
 * (as `next dev` renders): it re-runs a new Remote's effects once, and the
 * Remote's "a re-shown Activity closes the menu" effect with them. The
 * press must open the Remote once that has settled, and keep it open.
 */

const { gates } = vi.hoisted(() => {
  const gate = () => {
    let open = () => {};
    const promise = new Promise<void>((resolve) => {
      open = resolve;
    });
    return { open: () => open(), promise };
  };
  return { gates: { show: gate(), tile: gate() } };
});

// Each Remote's chunk lands only when its test lets it
vi.mock('./ShowRemote', async (importOriginal) => {
  await gates.show.promise;
  return importOriginal();
});
vi.mock('./TileRemote', async (importOriginal) => {
  await gates.tile.promise;
  return importOriginal();
});
vi.mock('next/link', () => ({
  default: ({
    children,
    href,
    ...rest
  }: Readonly<{ children: ReactNode; href: string }>) => (
    <a href={href} {...rest}>
      {children}
    </a>
  ),
}));

beforeAll(() => {
  MotionGlobalConfig.skipAnimations = true;
  HTMLElement.prototype.showPopover = function showPopover() {
    this.removeAttribute('popover');
  };
  HTMLElement.prototype.hidePopover = () => {};
});

afterAll(() => {
  MotionGlobalConfig.skipAnimations = false;
});

const renderStrict = (node: ReactNode) =>
  render(
    <StrictMode>
      <RemoteMarkingProvider
        value={createFakeMarking({
          lastEpisode: 10,
          nextEpisode: { episodeNumber: 5, seasonNumber: 3 },
          status: { isFavorited: false, isWatchlisted: false },
        })}
      >
        {node}
      </RemoteMarkingProvider>
    </StrictMode>,
  );

const show = (
  <LazyShowRemote
    hasAired
    historyHref="/136315/the-bear?history"
    seriesId={136315}
    seriesName="The Bear"
    size={32}
  />
);

const trigger = () =>
  screen.getByRole('button', { name: 'More actions for The Bear' });

/** Past every effect and task the swap set off */
const settle = () =>
  act(() => new Promise((resolve) => setTimeout(resolve, 50)));

describe('LazyRemote under StrictMode, first press before the code', () => {
  it('a click shows the ⋯ busy, then opens the Remote, which stays open', async () => {
    renderStrict(show);
    fireEvent.click(trigger());
    expect(trigger().getAttribute('aria-busy')).toBe('true');
    expect(trigger().getAttribute('aria-expanded')).toBe('false');
    gates.show.open();
    await waitFor(() => expect(screen.getByRole('menu')).toBeTruthy());
    await settle();
    expect(screen.getByRole('menu')).toBeTruthy();
    expect(trigger().getAttribute('aria-expanded')).toBe('true');
    expect(trigger().hasAttribute('aria-busy')).toBe(false);
  });

  it('a click once the code is in opens it at once, and it stays open', async () => {
    renderStrict(show);
    fireEvent.click(trigger());
    await waitFor(() => expect(screen.getByRole('menu')).toBeTruthy());
    await settle();
    expect(screen.getByRole('menu')).toBeTruthy();
  });

  it('Enter opens it on the big key and keeps it open; Escape returns focus to the ⋯', async () => {
    renderStrict(
      <LazyTileRemote
        historyHref="/136315/the-bear?season=3&history"
        seriesId={136315}
        seriesName="The Bear"
      />,
    );
    trigger().focus();
    await userEvent.keyboard('{Enter}');
    expect(trigger().getAttribute('aria-busy')).toBe('true');
    gates.tile.open();
    await waitFor(() =>
      expect(document.activeElement).toBe(
        screen.getByRole('menuitem', { name: /Watched next episode/ }),
      ),
    );
    await settle();
    expect(screen.getByRole('menu')).toBeTruthy();
    await userEvent.keyboard('{Escape}');
    await waitFor(() => expect(screen.queryByRole('menu')).toBeNull());
    expect(document.activeElement).toBe(trigger());
  });
});
