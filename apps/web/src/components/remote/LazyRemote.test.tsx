// @vitest-environment jsdom
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MotionGlobalConfig } from 'motion/react';
import type { ReactNode } from 'react';
import { afterAll, beforeAll, describe, expect, it, vi } from 'vitest';
import { LazyShowRemote, LazyTileRemote } from './LazyRemote';
import { RemoteMarkingProvider } from './marking';
import ShowRemote from './ShowRemote';
import { createFakeMarking } from './testing/fakeMarking';

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

const marking = () =>
  createFakeMarking({
    lastEpisode: 10,
    nextEpisode: { episodeNumber: 5, seasonNumber: 3 },
    status: { isFavorited: false, isWatchlisted: false },
  });

const show = (
  <LazyShowRemote
    hasAired
    historyHref="/136315/the-bear?history"
    seriesId={136315}
    seriesName="The Bear"
    size={32}
  />
);

const renderWith = (node: ReactNode) =>
  render(
    <RemoteMarkingProvider value={marking()}>{node}</RemoteMarkingProvider>,
  );

const trigger = () =>
  screen.getByRole('button', { name: 'More actions for The Bear' });

describe('LazyShowRemote', () => {
  it('draws the Remote’s own ⋯, closed, without the Remote', () => {
    const lazy = renderWith(show);
    const real = render(
      <RemoteMarkingProvider value={marking()}>
        <ShowRemote
          hasAired
          historyHref="/136315/the-bear?history"
          seriesId={136315}
          seriesName="The Bear"
          size={32}
        />
      </RemoteMarkingProvider>,
    );
    const [first, second] = screen.getAllByRole('button', {
      name: 'More actions for The Bear',
    });
    expect(first?.outerHTML).toBe(second?.outerHTML);
    expect(first?.getAttribute('aria-expanded')).toBe('false');
    // the ⋯ alone: nothing of the Remote around it
    expect(lazy.container.querySelectorAll('*').length).toBe(
      2 + (first?.querySelectorAll('*').length ?? 0),
    );
    real.unmount();
  });

  it('a click with no hover before it (a tap) opens the Remote at once', async () => {
    renderWith(show);
    fireEvent.click(trigger());
    await waitFor(() =>
      expect(
        screen.getByRole('menu', { name: 'Actions for The Bear' }),
      ).toBeTruthy(),
    );
    expect(trigger().getAttribute('aria-expanded')).toBe('true');
  });

  it('Enter opens it on the big key; Escape closes it and focus is back on the ⋯', async () => {
    renderWith(show);
    trigger().focus();
    await userEvent.keyboard('{Enter}');
    await waitFor(() =>
      expect(document.activeElement).toBe(
        screen.getByRole('menuitem', { name: /Watched next episode/ }),
      ),
    );
    await userEvent.keyboard('{Escape}');
    await waitFor(() => expect(screen.queryByRole('menu')).toBeNull());
    expect(document.activeElement).toBe(trigger());
  });

  it('a mouse passing over loads it without opening it; the click then opens it', async () => {
    renderWith(show);
    const before = trigger();
    fireEvent.pointerEnter(before, { pointerType: 'mouse' });
    await waitFor(() => expect(trigger()).not.toBe(before));
    expect(screen.queryByRole('menu')).toBeNull();
    await userEvent.click(trigger());
    expect(screen.getByRole('menu')).toBeTruthy();
  });

  it('a press while it loads keeps the ⋯ until the click, which opens it', async () => {
    renderWith(show);
    const button = trigger();
    fireEvent.pointerDown(button);
    await new Promise((resolve) => setTimeout(resolve, 20));
    expect(trigger()).toBe(button);
    fireEvent.click(button);
    await waitFor(() => expect(screen.getByRole('menu')).toBeTruthy());
  });

  // A touch: enter and down together, the Remote's code lands while the
  // finger is down, then up, leave (before the click, as touch sends it),
  // click
  it('a tap keeps the ⋯ through the touch’s leave, and its click opens the Remote', async () => {
    renderWith(show);
    const button = trigger();
    const touch = { pointerType: 'touch' };
    fireEvent.pointerEnter(button, touch);
    fireEvent.pointerDown(button, touch);
    await new Promise((resolve) => setTimeout(resolve, 20));
    fireEvent.pointerUp(button, touch);
    fireEvent.pointerLeave(button, touch);
    await new Promise((resolve) => setTimeout(resolve, 20));
    expect(trigger()).toBe(button);
    fireEvent.click(button);
    await waitFor(() => expect(screen.getByRole('menu')).toBeTruthy());
  });

  it('a touch that enters does not swap the ⋯ before its press', async () => {
    renderWith(show);
    const button = trigger();
    fireEvent.pointerEnter(button, { pointerType: 'touch' });
    await new Promise((resolve) => setTimeout(resolve, 20));
    expect(trigger()).toBe(button);
  });

  it('a touch that lifts without a click (a scroll) lets the Remote in, closed', async () => {
    vi.useFakeTimers({ shouldAdvanceTime: true });
    try {
      renderWith(show);
      const button = trigger();
      const touch = { pointerType: 'touch' };
      fireEvent.pointerDown(button, touch);
      await vi.advanceTimersByTimeAsync(20);
      fireEvent.pointerUp(button, touch);
      await vi.advanceTimersByTimeAsync(600);
      await waitFor(() => expect(trigger()).not.toBe(button));
      expect(screen.queryByRole('menu')).toBeNull();
    } finally {
      vi.useRealTimers();
    }
  });
});

describe('LazyTileRemote', () => {
  it('opens the tile Remote (N, E, H) on a click', async () => {
    renderWith(
      <LazyTileRemote
        historyHref="/136315/the-bear?season=3&history"
        seriesId={136315}
        seriesName="The Bear"
      />,
    );
    fireEvent.click(trigger());
    await waitFor(() =>
      expect(
        Array.from(document.querySelectorAll('[data-remote-key]')).map((key) =>
          key.getAttribute('aria-keyshortcuts'),
        ),
      ).toEqual(['N', 'E', 'H']),
    );
  });
});
