// @vitest-environment jsdom
import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

const marking = vi.hoisted(() => ({
  markEpisodes: vi.fn(),
  markUpTo: vi.fn(),
  setWhen: vi.fn(),
  toggleScope: vi.fn(),
}));

vi.mock('@/lib/marking/useMarking', () => ({ default: () => marking }));
vi.mock('@/lib/marking/useIntentSeed', () => ({
  default: () => ({
    intent: () => {},
    isSeeded: true,
    pending: false,
    run: (action: () => unknown) => Promise.resolve(action()),
  }),
}));

import CatchUpRun from './CatchUpRun';
import type { RunChip, RunPlan } from './runway';

const chip = (episode: number): RunChip => ({
  code: `S05E0${episode}`,
  episode,
  hint: '',
  label: `E0${episode}`,
  season: 5,
});

const plan = (
  chips: ReadonlyArray<RunChip>,
  over: Partial<RunPlan> = {},
): RunPlan => ({
  chips,
  more: { narrow: 0, season: 5, small: 0, wide: 0 },
  narrow: chips.length,
  next: null,
  small: chips.length,
  ...over,
});

const HREF = '/9/the-chosen';

describe('CatchUpRun', () => {
  it('marks only the waiting chips up to the tapped one, one way', () => {
    const chips = [chip(5), chip(6), chip(7), chip(8)];
    render(
      <CatchUpRun
        href={HREF}
        nextUp="S05E05"
        plan={plan(chips)}
        runway={null}
        seriesId={9}
      />,
    );
    fireEvent.click(screen.getByLabelText('Mark up to S05E06 as watched'));
    expect(marking.markEpisodes).toHaveBeenCalledOnce();
    expect(marking.markEpisodes).toHaveBeenCalledWith(
      9,
      [
        { episodeNumber: 5, seasonNumber: 5 },
        { episodeNumber: 6, seasonNumber: 5 },
      ],
      { kind: 'now' },
      expect.any(String),
    );
    expect(marking.markUpTo).not.toHaveBeenCalled();
    expect(marking.setWhen).not.toHaveBeenCalled();
    expect(marking.toggleScope).not.toHaveBeenCalled();
  });

  it('keeps one row: the rest of the season is one +N link, the next season one chip', () => {
    const chips = [chip(3), chip(4), chip(5), chip(6)];
    render(
      <CatchUpRun
        href={HREF}
        nextUp="S05E03"
        plan={plan(chips, {
          more: { narrow: 9, season: 5, small: 9, wide: 8 },
          narrow: 3,
          next: {
            chip: 'S06',
            chipTitle: 'Season 6: 14 episodes waiting',
            hint: 'S06 next · 14 waiting',
            season: 6,
            waiting: 14,
          },
          small: 3,
        })}
        runway={null}
        seriesId={9}
      />,
    );
    expect(
      screen.getByRole('group', { name: 'Mark episodes as watched up to' }),
    ).toBeTruthy();
    // "+9" in a narrow card, "+8" in a wide one, both to the season on the show page
    for (const name of [
      '9 more waiting in season 5',
      '8 more waiting in season 5',
    ]) {
      expect(screen.getByRole('link', { name }).getAttribute('href')).toBe(
        `${HREF}?season=5`,
      );
    }
    expect(
      screen
        .getByRole('link', { name: 'Season 6: 14 episodes waiting' })
        .getAttribute('href'),
    ).toBe(`${HREF}?season=6`);
  });
});
