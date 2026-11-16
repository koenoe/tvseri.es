// @vitest-environment jsdom

import { cleanup, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import type { EpisodeState } from '@/lib/marking/types';

import RecordStub from './RecordStub';

const toggle = vi.hoisted(() => ({
  state: undefined as EpisodeState | undefined,
}));

vi.mock('@/lib/marking/toggles', () => ({
  useEpisodeToggle: () => ({
    isWatched: false,
    state: toggle.state,
    toggle: async () => undefined,
  }),
}));
// the stub's toast clearance watches its box (no ResizeObserver in jsdom)
vi.mock('@/components/ui/toast/clearToast', () => ({
  clearToastOver: () => {},
}));
vi.mock('@/lib/marking/hooks', () => ({
  useEpisodeRecord: () => undefined,
  useNextEpisode: () => null,
}));

const EPISODE = { episodeNumber: 6, seasonNumber: 3 };
const step = () => {};

const renderStub = () =>
  render(
    <RecordStub
      airDate="2024-06-26"
      episode={EPISODE}
      hasNext
      hasPrev
      onStep={step}
      seriesId={136315}
      title="Napkins"
    />,
  );

afterEach(cleanup);

describe('RecordStub', () => {
  it('draws no eye and no status until the viewer’s marks have seeded the show', () => {
    toggle.state = undefined;
    renderStub();
    expect(screen.queryByRole('button', { name: /Mark watched/ })).toBeNull();
    expect(screen.queryByText('Not watched yet')).toBeNull();
    expect(screen.queryByRole('button', { name: 'Add a date' })).toBeNull();
  });

  it('draws the eye and the status once seeded', () => {
    toggle.state = 'none';
    renderStub();
    expect(
      screen.getByRole('button', { name: /Mark watched \(just now\)/ }),
    ).toBeTruthy();
    expect(screen.getAllByText('Not watched yet').length).toBeGreaterThan(0);
    expect(screen.getByRole('button', { name: 'Add a date' })).toBeTruthy();
  });
});
