// @vitest-environment jsdom
import { render } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import MarkingProvider from '@/lib/marking/MarkingProvider';
import type { SeriesBase } from '@/lib/marking/types';

import ShowProvider from '../../_lib/ShowProvider';
import type { ShowSummary } from '../../_lib/show';
import EpisodesView from './EpisodesView';
import { record, season, view } from './testData';

// focus on the season line loads "I'm up to…" (a chunk of its own)
vi.mock('../picker/UpToHost', async (importOriginal) => ({
  ...(await importOriginal<typeof import('../picker/UpToHost')>()),
  preloadUpTo: () => undefined,
}));
vi.mock('./Still', async (importOriginal) => ({
  ...(await importOriginal<typeof import('./Still')>()),
  default: () => null,
}));

const SEASON = season(1, 12);
const show: ShowSummary = {
  backdrop: '',
  id: 1,
  logo: '',
  nextEpisodeToAir: null,
  seasons: [
    {
      airDate: '2024-06-01',
      airedEpisodeCount: 12,
      episodeCount: 12,
      seasonNumber: 1,
      title: 'Season 1',
    },
  ],
  slug: 'show',
  status: 'Ended',
  title: 'Show',
};

const SEASON_ONE = [
  { airedEpisodeCount: 12, episodeCount: 12, seasonNumber: 1 },
] as const;
const watchedUpTo = (last: number) =>
  Object.fromEntries(
    Array.from({ length: last }, (_, index) => [
      `S01E${String(index + 1).padStart(2, '0')}`,
      record(index + 1),
    ]),
  );
// E01–E11 watched, E12 Next up: its mark completes the season
const nearly = view({ seasons: SEASON_ONE, watched: watchedUpTo(11) });
const complete = view({ seasons: SEASON_ONE, watched: watchedUpTo(12) });

function Wall({
  completed = null,
  marks,
}: Readonly<{ completed?: number | null; marks: SeriesBase }>) {
  return (
    <MarkingProvider>
      <ShowProvider show={show}>
        <EpisodesView
          completed={completed}
          personal
          season={{ episodes: SEASON, seasonNumber: 1 }}
          seasonNumber={1}
          seriesId={1}
          view={marks}
        />
      </ShowProvider>
    </MarkingProvider>
  );
}

const SWEEP = '[role="group"] i[style*="--sheen-ms"]';

/** Inside an inert part (jsdom keeps `inert` as the attribute or the property) */
const takesNoPress = (element: Element | null): boolean =>
  element instanceof HTMLElement &&
  (element.inert === true ||
    element.hasAttribute('inert') ||
    takesNoPress(element.parentElement));

describe('a season completes', () => {
  it('by the viewer’s own mark here: one light sweeps the season line', () => {
    const { container, rerender } = render(<Wall marks={nearly} />);
    expect(container.querySelector(SWEEP)).toBeNull();
    rerender(<Wall completed={1} marks={complete} />);
    expect(container.querySelectorAll(SWEEP)).toHaveLength(1);
  });

  it('any other way (a seed, Undo, opening it complete) sweeps nothing', () => {
    const { container, rerender } = render(<Wall marks={nearly} />);
    rerender(<Wall marks={complete} />);
    expect(container.querySelector(SWEEP)).toBeNull();
  });

  // Its tiles fold into the watched stacks: focus left on the eye just
  // pressed would fall to the page
  it('the open part folds away: focus moves to the season line, and it takes no press until an Undo', () => {
    const { container, rerender } = render(<Wall marks={nearly} />);
    const eyeOf = () =>
      container.querySelector<HTMLElement>(
        '[data-episode-tile="S01E12"] button[aria-pressed]',
      );
    const eye = eyeOf();
    eye?.focus();
    expect(document.activeElement).toBe(eye);
    rerender(<Wall completed={1} marks={complete} />);
    const line = container.querySelector('[data-season-header] [role="group"]');
    expect(line).not.toBeNull();
    expect(document.activeElement).toBe(line);
    expect(takesNoPress(eye)).toBe(true);
    rerender(<Wall marks={nearly} />);
    expect(eyeOf()?.isConnected).toBe(true);
    expect(takesNoPress(eyeOf())).toBe(false);
  });
});
