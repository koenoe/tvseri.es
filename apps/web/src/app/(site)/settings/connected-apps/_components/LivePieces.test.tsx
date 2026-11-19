// @vitest-environment jsdom
import { render, screen } from '@testing-library/react';
import type { RecentScrobble } from '@tvseri.es/schemas';
import { describe, expect, it, vi } from 'vitest';

// The days are counted after hydration; a fixed day keeps the bars drawn
vi.mock('@/lib/viewer/useLocalDay', () => ({
  useLocalDay: () => '2025-11-14',
}));

import LastScrobble from './LastScrobble';
import RecentList from './RecentList';
import { ScrobbleWeek, WeekMarks } from './ScrobbleWeek';
import WeekBars from './WeekBars';

const MARK: RecentScrobble = {
  episodeNumber: 2,
  seasonNumber: 4,
  seriesId: 62852,
  title: 'Billions',
  watchedAt: Date.UTC(2025, 10, 14, 12),
};

const SHOW = { backdrop: null, logo: null, title: 'Billions' };

/**
 * The live pieces are Plex's first: asked for Plex they keep the Plex card
 * exactly as it was, and Netflix gets its own words and colour.
 */
describe('the live card’s pieces', () => {
  it('say Plex for Plex', () => {
    render(
      <ScrobbleWeek app="plex" latest={1} marks={[MARK]}>
        <LastScrobble
          episode={2}
          season={4}
          show={SHOW}
          watchedAt={MARK.watchedAt}
          week={<WeekBars />}
        />
        <WeekMarks />
      </ScrobbleWeek>,
    );
    expect(screen.getByText('Last scrobble')).toBeTruthy();
    expect(
      screen.getByRole('group', { name: 'Your week on Plex' }),
    ).toBeTruthy();
    const list = screen.getByRole('list', { name: 'Latest Plex marks' });
    expect(list.querySelector('li')?.className).toContain('border-plex/18');
  });

  it('say Netflix when asked', () => {
    render(
      <ScrobbleWeek app="netflix" latest={1} marks={[MARK]}>
        <LastScrobble
          episode={2}
          heading="Last watched"
          season={4}
          show={SHOW}
          watchedAt={MARK.watchedAt}
          week={<WeekBars />}
        />
        <WeekMarks />
      </ScrobbleWeek>,
    );
    expect(screen.getByText('Last watched')).toBeTruthy();
    expect(
      screen.getByRole('group', { name: 'Your week on Netflix' }),
    ).toBeTruthy();
    const list = screen.getByRole('list', { name: 'Latest Netflix marks' });
    const row = list.querySelector('li')?.className ?? '';
    expect(row).toContain('border-netflix/18');
    expect(row).not.toContain('border-plex');
  });

  it('keeps the recent list’s Plex hairline', () => {
    render(
      <RecentList brand="plex" label="Latest Plex marks" recent={[MARK]} />,
    );
    const row = screen.getByRole('listitem').className;
    expect(row).toContain('border-plex/18');
  });
});
