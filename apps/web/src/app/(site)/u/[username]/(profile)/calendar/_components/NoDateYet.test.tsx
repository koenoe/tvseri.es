// @vitest-environment jsdom

import { render, screen } from '@testing-library/react';
import type { WaitingForItem } from '@tvseri.es/schemas';
import { describe, expect, it } from 'vitest';

import NoDateYet from './NoDateYet';

const show = (seriesId: number, listedEpisodes?: number): WaitingForItem => ({
  ...(listedEpisodes && { listedEpisodes }),
  nextSeason: 2,
  posterImage: '',
  seriesId,
  slug: `show-${seriesId}`,
  state: 'renewed',
  title: `Show ${seriesId}`,
});

describe('No date yet', () => {
  it('folds a long Next season listed group as it folds Renewed: five tiles, then ten more a press', () => {
    const listed = Array.from({ length: 7 }, (_, index) => show(index + 1, 8));
    const renewed = [show(20), show(21)];
    render(<NoDateYet count={9} noDateYet={{ listed, renewed }} />);

    expect(screen.getAllByRole('link')).toHaveLength(7);
    expect(
      screen.getAllByRole('button', { name: /Show \d+ more/ }),
    ).toHaveLength(1);
    expect(screen.getByRole('button', { name: 'Show 2 more' })).toBeTruthy();
  });
});
