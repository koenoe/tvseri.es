// @vitest-environment jsdom
import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import { loadRating } from '../../_data/loaders';
import ImdbRating from './ImdbRating';

vi.mock('../../_data/loaders', () => ({ loadRating: vi.fn() }));

const rated = (value: number, votes: number) =>
  vi.mocked(loadRating).mockResolvedValueOnce({ value, votes });

describe('ImdbRating', () => {
  it('draws the value, "/ 10" and the compact vote count under it', async () => {
    rated(8.1, 321_400);
    render(await ImdbRating({ imdbId: 'tt1', seriesId: 1 }));
    expect(screen.getByText('8.1')).toBeTruthy();
    expect(screen.getByText('321.4K').tagName).toBe('SMALL');
    expect(
      screen.getByLabelText('IMDb rating 8.1 out of 10, 321.4K votes'),
    ).toBeTruthy();
  });

  it('sits the vote count tight under the value: type-tall lines, no margin', async () => {
    rated(8.1, 321_400);
    render(await ImdbRating({ imdbId: 'tt1', seriesId: 1 }));
    const value = screen.getByText('8.1');
    const votes = screen.getByText('321.4K');
    // 18px value in an 18px line (24 in 22 from md), the votes 12 in 12:
    // about 4px of air between the digits.
    expect(value.className).toContain('leading-[18px]');
    expect(value.className).toContain('md:leading-[22px]');
    expect(votes.className).toContain('text-caption/none');
    expect(votes.className).not.toMatch(/(^|\s)m[ty]?-/);
    expect(screen.getByText('/ 10').className).toContain('/none');
  });

  it('keeps small counts and a perfect score as they are', async () => {
    rated(10, 742);
    render(await ImdbRating({ imdbId: null, seriesId: 1 }));
    expect(screen.getByText('10.0')).toBeTruthy();
    expect(screen.getByText('742')).toBeTruthy();
  });

  it('leaves the vote line out without votes, never "0"', async () => {
    rated(7.4, 0);
    const { container } = render(
      await ImdbRating({ imdbId: 'tt1', seriesId: 1 }),
    );
    expect(container.querySelector('small')).toBeNull();
    expect(screen.getByLabelText('IMDb rating 7.4 out of 10')).toBeTruthy();
  });

  it('greys the badge out without a rating, still a link to the title on IMDb', async () => {
    for (const answer of [null, { unavailable: true } as const]) {
      vi.mocked(loadRating).mockResolvedValueOnce(answer);
      const { unmount } = render(
        await ImdbRating({ imdbId: 'tt1', seriesId: 1 }),
      );
      const link = screen.getByRole('link', {
        name: 'Rating unavailable. Open on IMDb',
      });
      expect(link.getAttribute('href')).toBe('https://www.imdb.com/title/tt1/');
      expect(link.getAttribute('target')).toBe('_blank');
      // no number and no votes, in the rated badge's lines
      expect(link.textContent).not.toMatch(/\d\.\d/);
      expect(screen.getByText('No rating').tagName).toBe('SMALL');
      expect(link.className).toContain('text-white/60');
      unmount();
    }
  });

  it('renders nothing without a rating and without an IMDb id', async () => {
    vi.mocked(loadRating).mockResolvedValueOnce(null);
    expect(await ImdbRating({ imdbId: null, seriesId: 1 })).toBeNull();
    vi.mocked(loadRating).mockResolvedValueOnce({ unavailable: true });
    expect(await ImdbRating({ imdbId: null, seriesId: 1 })).toBeNull();
  });
});
