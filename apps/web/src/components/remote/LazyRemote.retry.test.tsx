// @vitest-environment jsdom
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { MotionGlobalConfig } from 'motion/react';
import type { ReactNode } from 'react';
import { afterAll, beforeAll, describe, expect, it, vi } from 'vitest';
import { LazyShowRemote, LazyTileRemote } from './LazyRemote';
import { RemoteMarkingProvider } from './marking';
import { createFakeMarking } from './testing/fakeMarking';

const { attempts, tileAttempts } = vi.hoisted(() => ({
  attempts: { count: 0 },
  tileAttempts: { count: 0 },
}));

// The Remote's chunk fails the first time (a flaky network, an old chunk
// after a deploy), then loads
vi.mock('./ShowRemote', async (importOriginal) => {
  attempts.count += 1;
  if (attempts.count === 1) {
    throw new Error('ChunkLoadError');
  }
  return importOriginal();
});
vi.mock('./TileRemote', async (importOriginal) => {
  tileAttempts.count += 1;
  if (tileAttempts.count === 1) {
    throw new Error('ChunkLoadError');
  }
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

const trigger = () =>
  screen.getByRole('button', { name: 'More actions for The Bear' });

const marking = () =>
  createFakeMarking({
    lastEpisode: 10,
    nextEpisode: { episodeNumber: 5, seasonNumber: 3 },
    status: { isFavorited: false, isWatchlisted: false },
  });

describe('LazyShowRemote after a failed chunk', () => {
  it('does nothing on the failed tap, and the next tap loads and opens the Remote', async () => {
    render(
      <RemoteMarkingProvider value={marking()}>
        <LazyShowRemote
          hasAired
          historyHref="/136315/the-bear?history"
          seriesId={136315}
          seriesName="The Bear"
          size={32}
        />
      </RemoteMarkingProvider>,
    );

    fireEvent.click(trigger());
    await waitFor(() => expect(attempts.count).toBe(1));
    await new Promise((resolve) => setTimeout(resolve, 20));
    expect(screen.queryByRole('menu')).toBeNull();

    fireEvent.click(trigger());
    await waitFor(() => expect(screen.getByRole('menu')).toBeTruthy());
    expect(attempts.count).toBe(2);
  });
});

describe('LazyTileRemote after a failed chunk', () => {
  it('forgets the failed tap: a mouse passing over later loads it, closed and not busy', async () => {
    render(
      <RemoteMarkingProvider value={marking()}>
        <LazyTileRemote
          historyHref="/136315/the-bear?season=3&history"
          seriesId={136315}
          seriesName="The Bear"
        />
      </RemoteMarkingProvider>,
    );
    fireEvent.click(trigger());
    await waitFor(() => expect(tileAttempts.count).toBe(1));
    await waitFor(() =>
      expect(trigger().hasAttribute('aria-busy')).toBe(false),
    );

    const before = trigger();
    fireEvent.pointerEnter(before, { pointerType: 'mouse' });
    await waitFor(() => expect(trigger()).not.toBe(before));
    await new Promise((resolve) => setTimeout(resolve, 20));
    expect(screen.queryByRole('menu')).toBeNull();
    expect(trigger().getAttribute('aria-expanded')).toBe('false');
    expect(trigger().hasAttribute('aria-busy')).toBe(false);
  });
});
