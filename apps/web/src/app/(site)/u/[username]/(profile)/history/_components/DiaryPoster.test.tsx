// @vitest-environment jsdom
import { fireEvent, render } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import DiaryPoster from './DiaryPoster';

const SRC = 'https://image.tmdb.org/t/p/w300_and_h450_bestv2/abc.jpg';

const poster = (container: HTMLElement) => container.querySelector('img')!;

describe('DiaryPoster', () => {
  it('loads with CORS under its own cache key, so the glow can read it', () => {
    const { container } = render(<DiaryPoster src={SRC} />);
    expect(poster(container).getAttribute('crossorigin')).toBe('anonymous');
    expect(poster(container).getAttribute('src')).toMatch(/\?cors$/);
  });

  it('loads once more the plain way when the CORS load fails, then stops', () => {
    const { container } = render(<DiaryPoster src={SRC} />);
    fireEvent.error(poster(container));
    expect(poster(container).hasAttribute('crossorigin')).toBe(false);
    expect(poster(container).getAttribute('src')).not.toMatch(/\?cors/);
    expect(poster(container).getAttribute('srcset')).not.toMatch(/\?cors/);
    // a poster that is really missing: no third try
    const src = poster(container).getAttribute('src');
    fireEvent.error(poster(container));
    expect(poster(container).getAttribute('src')).toBe(src);
  });
});
