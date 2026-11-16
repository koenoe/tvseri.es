// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { unseenShows } from './loadGetStarted';
import { SeenTile } from './SeenGrid';

/**
 * Already seen must never unmark or re-date anything: it marks a show
 * with no history once, through "Finished it all", and leaves every other
 * show alone.
 */

const commands = {
  markEpisodes: vi.fn(),
  markSeen: vi.fn(),
  setWhen: vi.fn(),
  toggleEpisode: vi.fn(),
  toggleScope: vi.fn(),
};

type View = Readonly<{ watched: Record<string, unknown> }>;
let view: View | undefined;
let complete = false;
let finished = false;

vi.mock('@/lib/marking/useMarking', () => ({ default: () => commands }));
vi.mock('@/lib/marking/hooks', () => ({
  useSeriesProgress: () =>
    view ? { isComplete: complete, isFinished: finished } : undefined,
}));
vi.mock('@/lib/marking/MarkingProvider', () => ({
  useMarkingStoreApi: () => ({
    getState: () => ({ series: view ? { 7: { view } } : {} }),
  }),
}));
// The show is loaded: queued actions run at once
vi.mock('@/lib/marking/useIntentSeed', () => ({
  default: () => ({ intent: () => {}, run: (action: () => void) => action() }),
}));

const show = { id: 7, posterImage: '', title: 'Severance' };

const tap = () =>
  fireEvent.click(screen.getByRole('button', { name: /Severance/ }));

beforeEach(() => {
  for (const command of Object.values(commands)) {
    command.mockReset();
  }
  view = { watched: {} };
  complete = false;
  finished = false;
});

afterEach(cleanup);

describe('Already seen', () => {
  it('marks a show with no history once, as "Finished it all"', () => {
    const onSeen = vi.fn();
    render(<SeenTile onSeen={onSeen} seen={false} show={show} />);
    tap();
    tap();
    expect(commands.markSeen).toHaveBeenCalledTimes(1);
    expect(commands.markSeen).toHaveBeenCalledWith(7, 'Severance');
    expect(onSeen).toHaveBeenCalledWith(7);
    expect(commands.toggleScope).not.toHaveBeenCalled();
  });

  it('leaves a complete show and its dated history untouched', () => {
    view = { watched: { S01E01: { watchedAt: 1_700_000_000_000 } } };
    complete = true;
    // every aired episode watched is finished too (`seriesProgress`)
    finished = true;
    render(<SeenTile onSeen={vi.fn()} seen={false} show={show} />);
    expect(screen.getByRole('button').getAttribute('aria-disabled')).toBe(
      'true',
    );
    tap();
    for (const command of Object.values(commands)) {
      expect(command).not.toHaveBeenCalled();
    }
  });

  it('a show finished through skips reads as seen, as the lists have it', () => {
    view = { watched: { S01E01: { watchedAt: 1_700_000_000_000 } } };
    finished = true;
    render(<SeenTile onSeen={vi.fn()} seen={false} show={show} />);
    expect(screen.getByRole('button').getAttribute('aria-disabled')).toBe(
      'true',
    );
    tap();
    expect(commands.markSeen).not.toHaveBeenCalled();
  });

  it('leaves a partly watched show alone', () => {
    view = { watched: { S01E01: { watchedAt: 1_700_000_000_000 } } };
    render(<SeenTile onSeen={vi.fn()} seen={false} show={show} />);
    tap();
    for (const command of Object.values(commands)) {
      expect(command).not.toHaveBeenCalled();
    }
  });
});

describe('unseenShows', () => {
  const shows = [1, 2, 3, 4].map((id) => ({
    id,
    posterImage: '',
    title: `Show ${id}`,
  }));

  it('never offers a show from one of your lists', () => {
    const library = {
      favorites: [1],
      inProgress: [2],
      watched: [],
      watchlist: [4],
    };
    expect(unseenShows(shows, library).map((item) => item.id)).toEqual([3]);
  });

  it('offers nothing when your lists could not be read', () => {
    expect(unseenShows(shows, null)).toEqual([]);
  });

  // A show appears in one day-one block only; this grid comes last
  it('leaves out the shows Up next and Start something new borrowed', () => {
    const empty = { favorites: [], inProgress: [], watched: [], watchlist: [] };
    expect(
      unseenShows(shows, empty, new Set([1, 3])).map((item) => item.id),
    ).toEqual([2, 4]);
  });

  it('hands the client only what a tile draws, not the whole show', () => {
    const empty = { favorites: [], inProgress: [], watched: [], watchlist: [] };
    const whole = [{ ...shows[0], overview: 'Long text', seasons: [] }];
    expect(unseenShows(whole as typeof shows, empty)).toEqual([
      { id: 1, posterImage: '', title: 'Show 1' },
    ]);
  });
});
