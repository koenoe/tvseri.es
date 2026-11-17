// @vitest-environment jsdom
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import SlideBody from './SlideBody';
import type { Slide } from './slide';

vi.mock('@/components/marking/MarkControl', () => ({
  default: () => null,
}));

const SLIDE: Slide = {
  backdrop: '',
  color: '#101010',
  genre: 'Drama',
  hook: '',
  href: '/1/show',
  id: 1,
  logo: 'https://image.tmdb.org/t/p/w500/logo.png',
  logoRatio: 4,
  rank: '#1 trending this week',
  seasons: '2 seasons',
  title: 'The Show',
  year: '2024',
};

const draw = (slide: Slide) =>
  render(<SlideBody hook="" label="1 of 10" slide={slide} />);

describe('the spotlight logo holds its box', () => {
  it('keeps the held ratio after the logo loads, so a small file does not shrink it', async () => {
    draw(SLIDE);
    const logo = screen.getByRole('img', { name: 'The Show' });
    fireEvent.load(logo);
    await new Promise((resolve) => setTimeout(resolve, 20));
    expect(logo.style.getPropertyValue('--logo-ratio')).toBe('4');
  });

  it('without the API ratio, holds the intrinsic one until the file loads', async () => {
    draw({ ...SLIDE, logoRatio: null });
    const logo = screen.getByRole('img', { name: 'The Show' });
    expect(Number(logo.style.getPropertyValue('--logo-ratio'))).toBeCloseTo(
      920 / 300,
    );
    fireEvent.load(logo);
    await waitFor(() =>
      expect(logo.style.getPropertyValue('--logo-ratio')).toBe(''),
    );
  });

  it('writes the title in the same held box when the logo fails', () => {
    draw(SLIDE);
    fireEvent.error(screen.getByRole('img', { name: 'The Show' }));
    expect(screen.queryByRole('img', { name: 'The Show' })).toBeNull();
    const title = screen.getByText('The Show');
    expect(title.parentElement?.style.getPropertyValue('--logo-ratio')).toBe(
      '4',
    );
  });
});
