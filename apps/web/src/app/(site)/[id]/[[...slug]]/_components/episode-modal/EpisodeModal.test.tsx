// @vitest-environment jsdom
import { render, screen } from '@testing-library/react';
import type { ReactNode } from 'react';
import { describe, expect, it, vi } from 'vitest';

import EpisodeModal from './EpisodeModal';

// The dialog keeps its panel mounted through the exit animation: render the
// children whatever `open` says, as AnimatePresence does while exiting.
vi.mock('@/components/ui/dialog/LargeDialog', () => ({
  default: ({ children }: { children: ReactNode }) => <div>{children}</div>,
}));
vi.mock('../../_lib/ShowProvider', () => ({
  useShow: () => ({
    id: 136315,
    seasons: [],
    slug: 'the-bear',
    title: 'The Bear',
  }),
}));
vi.mock('@/lib/series/useSeasonEpisodes', () => ({ default: () => undefined }));
vi.mock('./useEpisodeStepping', () => ({ default: () => () => {} }));
vi.mock('./EpisodeView', () => ({
  default: ({
    episode,
  }: {
    episode: { seasonNumber: number; episodeNumber: number };
  }) => <p>{`episode ${episode.seasonNumber}x${episode.episodeNumber}`}</p>,
}));

describe('EpisodeModal', () => {
  it('keeps the episode drawn while it closes, so the exit shrinks a full card', () => {
    const { rerender } = render(
      <EpisodeModal episode={{ episodeNumber: 6, seasonNumber: 2 }} />,
    );
    expect(screen.getByText('episode 2x6')).toBeTruthy();
    rerender(<EpisodeModal episode={null} />);
    expect(screen.getByText('episode 2x6')).toBeTruthy();
  });
});
