// @vitest-environment jsdom
import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import RatingAndProvider from './RatingAndProvider';

vi.mock('next/image', () => ({
  default: ({
    alt,
    className,
    src,
  }: {
    alt: string;
    className: string;
    src: string;
  }) => (
    // biome-ignore lint/performance/noImgElement: test double
    <img alt={alt} className={className} src={src} />
  ),
}));
vi.mock('../../_data/region', () => ({
  getViewerRegion: async () => ({ region: 'GB', services: [] }),
}));
vi.mock('../../_data/loaders', () => ({
  loadContentRating: vi.fn(async () => '15'),
}));
vi.mock('@/lib/series/loaders', () => ({
  loadWatchProviders: vi.fn(async () => [
    { id: 337, logo: 'https://example.com/disney.png', name: 'Disney+' },
  ]),
}));

describe('RatingAndProvider', () => {
  it('draws the outlined age box and the 28px provider logo, desktop only, with no "where to watch" line', async () => {
    const { container } = render(await RatingAndProvider({ seriesId: 1 }));
    const box = screen.getByText('15');
    expect(box.className).toContain('size-7');
    expect(box.className).toContain('border-white/60');
    const logo = screen.getByAltText(/Disney\+/) as HTMLImageElement;
    expect(logo.className).toContain('size-7');
    expect(logo.className).toContain('rounded-4');
    expect(container.firstElementChild?.className).toContain('max-md:hidden');
    expect(container.textContent).not.toContain('JustWatch');
    // it says where to watch; it is not a link
    expect(container.querySelector('a')).toBeNull();
  });
});
